import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db, fix_id, to_object_id
from backend.auth_utils import get_current_user, get_current_admin
from backend.socket_server import emit_new_order, emit_order_status_updated, emit_low_stock_alert

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderStatusUpdate(BaseModel):
    status: str
    rejectionReason: Optional[str] = ""

class OrderItem(BaseModel):
    productId: str
    productName: str
    unit: str
    price: float
    quantity: int
    lineTotal: float
    image: Optional[str] = ""

class CustomerInfo(BaseModel):
    model_config = {"extra": "allow"}
    name: Optional[str] = "Customer"
    mobile: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    landmark: Optional[str] = ""
    city: Optional[str] = ""
    pincode: Optional[str] = ""
    houseNo: Optional[str] = ""
    area: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location: Optional[Any] = None
    coordinates: Optional[Any] = None
    mapsUrl: Optional[str] = ""
    googleMapsUrl: Optional[str] = ""

class OrderCreate(BaseModel):
    model_config = {"extra": "allow"}
    items: List[OrderItem]
    grandTotal: float
    customer: Optional[CustomerInfo] = None
    customerName: Optional[str] = ""
    customerMobile: Optional[str] = ""
    customerAddress: Optional[str] = ""
    deliveryAddress: Optional[Any] = None
    deliveryLocation: Optional[Any] = None
    location: Optional[Any] = None
    coordinates: Optional[Any] = None
    orderType: Optional[str] = "DELIVERY"
    paymentMethod: Optional[str] = "COD"
    notes: Optional[str] = ""

def generate_order_id() -> str:
    now = datetime.datetime.utcnow()
    rand = random.randint(1000, 9999)
    return f"ORD-{now.strftime('%y%m%d')}-{rand}"

@router.get("/admin/all")
async def get_admin_orders(
    status: Optional[str] = "ALL",
    search: Optional[str] = None,
    limit: Optional[int] = 200,
    skip: Optional[int] = 0,
    admin: dict = Depends(get_current_admin)
):
    db = get_db()
    query = {}

    if status and status.upper() != "ALL":
        status_norm = status.lower()
        if status_norm in ["completed", "delivered"]:
            query["orderStatus"] = {"$in": ["COMPLETED", "DELIVERED"]}
            seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
            query["$or"] = [
                {"completedAt": {"$gte": seven_days_ago}},
                {"updatedAt": {"$gte": seven_days_ago}},
                {"createdAt": {"$gte": seven_days_ago}}
            ]
        elif status_norm in ["new", "order_placed"]:
            query["orderStatus"] = "ORDER_PLACED"
        elif status_norm in ["accepted", "order_accepted"]:
            query["orderStatus"] = "ORDER_ACCEPTED"
        elif status_norm in ["packed", "ready_for_pickup"]:
            query["orderStatus"] = {"$in": ["PACKED", "READY_FOR_PICKUP"]}
        elif status_norm in ["rejected"]:
            query["orderStatus"] = "REJECTED"
        elif status_norm in ["cancelled"]:
            query["orderStatus"] = "CANCELLED"
        else:
            query["orderStatus"] = status.upper()

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"orderId": {"$regex": term, "$options": "i"}},
            {"customer.name": {"$regex": term, "$options": "i"}},
            {"customer.mobile": {"$regex": term, "$options": "i"}},
            {"customer.email": {"$regex": term, "$options": "i"}},
        ]

    cursor = db["orders"].find(query).sort("createdAt", -1).skip(skip).limit(limit)
    orders = await cursor.to_list(length=limit)

    return {
        "success": True,
        "count": len(orders),
        "orders": fix_id(orders),
    }

@router.put("/admin/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    admin: dict = Depends(get_current_admin)
):
    obj_id = to_object_id(order_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    db = get_db()
    orders_col = db["orders"]
    products_col = db["products"]
    notifications_col = db["notifications"]

    existing = await orders_col.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    prev_status = existing.get("orderStatus")
    new_status = payload.status.upper()

    now = datetime.datetime.utcnow()
    update_fields = {
        "orderStatus": new_status,
        "updatedAt": now,
    }
    if new_status == "COMPLETED":
        update_fields["completedAt"] = now
    if payload.rejectionReason:
        update_fields["rejectionReason"] = payload.rejectionReason.strip()

    updated = await orders_col.find_one_and_update(
        {"_id": obj_id},
        {"$set": update_fields},
        return_document=True
    )

    # If transitioning to COMPLETED (and wasn't already completed), deduct variant stock
    if new_status == "COMPLETED" and prev_status != "COMPLETED":
        items = existing.get("items", [])
        for item in items:
            prod_id = to_object_id(item.get("productId"))
            unit = item.get("unit")
            qty = int(item.get("quantity", 1))

            if prod_id and unit:
                prod = await products_col.find_one({"_id": prod_id})
                if prod:
                    threshold = prod.get("lowStockThreshold", 10)
                    variants = prod.get("variants", [])
                    updated_variants = []
                    for v in variants:
                        if v.get("unit") == unit:
                            new_stock = max(0, int(v.get("stock", 0)) - qty)
                            v["stock"] = new_stock
                            
                            # Check low stock threshold
                            if new_stock <= threshold:
                                alert_payload = {
                                    "productId": str(prod["_id"]),
                                    "productName": prod.get("name", "Product"),
                                    "unit": unit,
                                    "remainingStock": new_stock,
                                }
                                await emit_low_stock_alert(alert_payload)
                                # Record notification
                                await notifications_col.insert_one({
                                    "type": "LOW_STOCK",
                                    "title": "Low Stock Warning",
                                    "message": f"⚠️ Low stock: {prod.get('name')} ({unit}) has only {new_stock} left!",
                                    "read": False,
                                    "createdAt": datetime.datetime.utcnow(),
                                })
                        updated_variants.append(v)

                    await products_col.update_one(
                        {"_id": prod_id},
                        {"$set": {"variants": updated_variants, "updatedAt": datetime.datetime.utcnow()}}
                    )

    serialized = fix_id(updated)
    await emit_order_status_updated(serialized)

    return {
        "success": True,
        "order": serialized,
    }

@router.post("")
async def create_order(
    payload: OrderCreate,
    current_user: Optional[dict] = Depends(get_current_user)
):
    db = get_db()
    now = datetime.datetime.utcnow()
    order_id = generate_order_id()

    customer_data = payload.customer.model_dump() if payload.customer else {}
    if current_user:
        customer_data["userId"] = current_user.get("_id")
        if not customer_data.get("name"):
            customer_data["name"] = current_user.get("name")
        if not customer_data.get("mobile"):
            customer_data["mobile"] = current_user.get("mobile")
        if not customer_data.get("email"):
            customer_data["email"] = current_user.get("email")
        if not customer_data.get("address"):
            customer_data["address"] = current_user.get("address")

    # Location and Coordinates normalization
    lat = customer_data.get("latitude") if customer_data.get("latitude") is not None else customer_data.get("lat")
    lng = customer_data.get("longitude") if customer_data.get("longitude") is not None else customer_data.get("lng")
    if lat is None and payload.coordinates and isinstance(payload.coordinates, dict):
        lat = payload.coordinates.get("lat") or payload.coordinates.get("latitude")
        lng = payload.coordinates.get("lng") or payload.coordinates.get("longitude")
    if lat is None and payload.deliveryLocation and isinstance(payload.deliveryLocation, dict):
        lat = payload.deliveryLocation.get("lat") or payload.deliveryLocation.get("latitude")
        lng = payload.deliveryLocation.get("lng") or payload.deliveryLocation.get("longitude")

    full_addr = (
        payload.customerAddress or
        payload.deliveryAddress or
        customer_data.get("address") or
        ""
    )
    if isinstance(full_addr, dict):
        full_addr = full_addr.get("address") or full_addr.get("formattedAddress") or str(full_addr)

    landmark = customer_data.get("landmark") or (payload.deliveryAddress.get("landmark") if isinstance(payload.deliveryAddress, dict) else "") or ""
    pincode = customer_data.get("pincode") or (payload.deliveryAddress.get("pincode") if isinstance(payload.deliveryAddress, dict) else "") or ""
    city = customer_data.get("city") or (payload.deliveryAddress.get("city") if isinstance(payload.deliveryAddress, dict) else "") or ""

    maps_url = customer_data.get("googleMapsUrl") or customer_data.get("mapsUrl") or ""
    if not maps_url:
        if lat is not None and lng is not None:
            maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
        elif full_addr:
            import urllib.parse
            maps_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(str(full_addr))}"

    doc = {
        "orderId": order_id,
        "orderStatus": "ORDER_PLACED",
        "items": [item.model_dump() for item in payload.items],
        "grandTotal": float(payload.grandTotal),
        "customer": customer_data,
        "customerName": customer_data.get("name") or payload.customerName or "Customer",
        "customerMobile": customer_data.get("mobile") or payload.customerMobile or "",
        "customerAddress": full_addr,
        "deliveryAddress": full_addr,
        "landmark": landmark,
        "pincode": pincode,
        "city": city,
        "latitude": lat,
        "longitude": lng,
        "coordinates": {"lat": lat, "lng": lng} if (lat is not None and lng is not None) else None,
        "googleMapsUrl": maps_url,
        "orderType": payload.orderType or "DELIVERY",
        "paymentMethod": payload.paymentMethod or "COD",
        "notes": payload.notes or "",
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db["orders"].insert_one(doc)
    doc["_id"] = result.inserted_id

    # Create notification for store owner
    cust_name = customer_data.get("name", "A customer")
    await db["notifications"].insert_one({
        "type": "ORDER",
        "title": "New Order Received",
        "message": f"🔔 {cust_name} placed an order #{order_id} (₹{payload.grandTotal})",
        "orderId": order_id,
        "read": False,
        "createdAt": now,
    })

    serialized = fix_id(doc)
    # Broadcast to trigger loud alarm on owner frontend
    await emit_new_order(serialized)

    return {
        "success": True,
        "order": serialized,
    }

@router.get("/my-orders")
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    cursor = db["orders"].find({
        "$or": [
            {"customer.userId": user_id},
            {"customer.mobile": current_user.get("mobile")},
            {"customer.email": current_user.get("email")},
        ]
    }).sort("createdAt", -1)
    orders = await cursor.to_list(length=100)
    return {
        "success": True,
        "orders": fix_id(orders),
    }
