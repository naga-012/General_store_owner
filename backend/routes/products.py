import datetime
import os
import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from backend.database import get_db, fix_id, to_object_id
from backend.auth_utils import get_current_admin
from backend.config import UPLOAD_DIR
from backend.socket_server import emit_product_updated

router = APIRouter(prefix="/products", tags=["products"])

class VariantModel(BaseModel):
    unit: str
    price: float
    stock: int

class ProductCreateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[Any] = None
    description: Optional[str] = ""
    image: Optional[str] = ""
    status: Optional[str] = "active"
    isFeatured: Optional[bool] = False
    lowStockThreshold: Optional[int] = 10
    variants: Optional[List[VariantModel]] = None

@router.get("")
async def get_products(
    includeInactive: Optional[bool] = False,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = 200,
    skip: Optional[int] = 0
):
    db = get_db()
    query = {}

    if not includeInactive:
        query["status"] = "active"

    if category:
        cat_id = to_object_id(category)
        if cat_id:
            query["$or"] = [{"category": cat_id}, {"category": category}]
        else:
            query["category"] = category

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}}
        ]

    cursor = db["products"].find(query).sort("createdAt", -1).skip(skip).limit(limit)
    products = await cursor.to_list(length=limit)

    # Populate category details if stored as ObjectId or string
    categories_list = await db["categories"].find({}).to_list(length=500)
    cat_map = {str(c["_id"]): fix_id(c) for c in categories_list}

    for p in products:
        raw_cat = p.get("category")
        if raw_cat:
            cat_key = str(raw_cat)
            if cat_key in cat_map:
                p["category"] = cat_map[cat_key]

    return {
        "success": True,
        "count": len(products),
        "products": fix_id(products),
    }

@router.get("/{prod_id}")
async def get_product(prod_id: str):
    obj_id = to_object_id(prod_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    db = get_db()
    prod = await db["products"].find_one({"_id": obj_id})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    # Populate category
    if prod.get("category"):
        cat_id = to_object_id(prod["category"])
        if cat_id:
            cat = await db["categories"].find_one({"_id": cat_id})
            if cat:
                prod["category"] = fix_id(cat)

    return {
        "success": True,
        "product": fix_id(prod),
    }

@router.post("")
async def create_product(payload: ProductCreateUpdate, admin: dict = Depends(get_current_admin)):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Product name is required.")

    db = get_db()
    now = datetime.datetime.utcnow()

    # Category handling
    cat_val = payload.category
    if cat_val and to_object_id(cat_val):
        cat_val = to_object_id(cat_val)

    doc = {
        "name": payload.name.strip(),
        "category": cat_val,
        "description": payload.description.strip() if payload.description else "",
        "image": payload.image.strip() if payload.image else "",
        "status": payload.status or "active",
        "isFeatured": bool(payload.isFeatured),
        "lowStockThreshold": payload.lowStockThreshold if payload.lowStockThreshold is not None else 10,
        "variants": [v.model_dump() for v in payload.variants] if payload.variants else [],
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db["products"].insert_one(doc)
    doc["_id"] = result.inserted_id

    serialized = fix_id(doc)
    await emit_product_updated({"action": "create", "product": serialized})

    return {
        "success": True,
        "product": serialized,
    }

@router.put("/{prod_id}")
async def update_product(prod_id: str, payload: ProductCreateUpdate, admin: dict = Depends(get_current_admin)):
    obj_id = to_object_id(prod_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    db = get_db()
    existing = await db["products"].find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    update_fields = {"updatedAt": datetime.datetime.utcnow()}

    if payload.name is not None and payload.name.strip():
        update_fields["name"] = payload.name.strip()
    if payload.category is not None:
        cat_val = payload.category
        if cat_val and to_object_id(cat_val):
            cat_val = to_object_id(cat_val)
        update_fields["category"] = cat_val
    if payload.description is not None:
        update_fields["description"] = payload.description.strip()
    if payload.image is not None:
        update_fields["image"] = payload.image.strip()
    if payload.status is not None:
        update_fields["status"] = payload.status
    if payload.isFeatured is not None:
        update_fields["isFeatured"] = bool(payload.isFeatured)
    if payload.lowStockThreshold is not None:
        update_fields["lowStockThreshold"] = int(payload.lowStockThreshold)
    if payload.variants is not None:
        update_fields["variants"] = [v.model_dump() for v in payload.variants]

    updated = await db["products"].find_one_and_update(
        {"_id": obj_id},
        {"$set": update_fields},
        return_document=True
    )

    serialized = fix_id(updated)
    await emit_product_updated({"action": "update", "product": serialized})

    return {
        "success": True,
        "product": serialized,
    }

@router.patch("/{prod_id}/toggle-status")
async def toggle_product_status(prod_id: str, admin: dict = Depends(get_current_admin)):
    obj_id = to_object_id(prod_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    db = get_db()
    existing = await db["products"].find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    new_status = "inactive" if existing.get("status") == "active" else "active"

    updated = await db["products"].find_one_and_update(
        {"_id": obj_id},
        {"$set": {"status": new_status, "updatedAt": datetime.datetime.utcnow()}},
        return_document=True
    )

    serialized = fix_id(updated)
    await emit_product_updated({"action": "status_toggle", "product": serialized})

    return {
        "success": True,
        "product": serialized,
    }

@router.delete("/{prod_id}")
async def delete_product(prod_id: str, admin: dict = Depends(get_current_admin)):
    obj_id = to_object_id(prod_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    db = get_db()
    res = await db["products"].delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    await emit_product_updated({"action": "delete", "productId": prod_id})

    return {
        "success": True,
        "message": "Product deleted successfully",
    }

@router.post("/upload-image")
async def upload_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None)
):
    upload_file = file or image or photo
    if not upload_file:
        raise HTTPException(status_code=400, detail="No image file provided")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = upload_file.filename or "image.jpg"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".jfif"]:
        ext = ".jpg"

    unique_name = f"{int(datetime.datetime.utcnow().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOAD_DIR / unique_name

    contents = await upload_file.read()
    with open(dest_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "imageUrl": f"/uploads/{unique_name}",
    }
