import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db, fix_id, to_object_id
from backend.auth_utils import get_current_admin

router = APIRouter(prefix="/categories", tags=["categories"])

class CategoryPayload(BaseModel):
    name: str
    description: Optional[str] = ""
    image: Optional[str] = ""

@router.get("")
async def get_categories():
    db = get_db()
    cursor = db["categories"].find({}).sort("name", 1)
    categories = await cursor.to_list(length=200)
    return {
        "success": True,
        "categories": fix_id(categories),
    }

@router.post("")
async def create_category(payload: CategoryPayload, admin: dict = Depends(get_current_admin)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required.")
    
    db = get_db()
    now = datetime.datetime.utcnow()
    doc = {
        "name": name,
        "description": payload.description.strip() if payload.description else "",
        "image": payload.image.strip() if payload.image else "",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db["categories"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return {
        "success": True,
        "category": fix_id(doc),
    }

@router.put("/{cat_id}")
async def update_category(cat_id: str, payload: CategoryPayload, admin: dict = Depends(get_current_admin)):
    obj_id = to_object_id(cat_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    db = get_db()
    update_data = {
        "name": payload.name.strip(),
        "description": payload.description.strip() if payload.description else "",
        "image": payload.image.strip() if payload.image else "",
        "updatedAt": datetime.datetime.utcnow(),
    }
    res = await db["categories"].find_one_and_update(
        {"_id": obj_id},
        {"$set": update_data},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "success": True,
        "category": fix_id(res),
    }

@router.delete("/{cat_id}")
async def delete_category(cat_id: str, admin: dict = Depends(get_current_admin)):
    obj_id = to_object_id(cat_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    db = get_db()
    res = await db["categories"].delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "success": True,
        "message": "Category deleted successfully",
    }
