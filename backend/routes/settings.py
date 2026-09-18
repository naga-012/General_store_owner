import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db, fix_id
from backend.auth_utils import get_current_admin

router = APIRouter(prefix="/admin/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    shopName: Optional[str] = None
    tagline: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    openingTime: Optional[str] = None
    closingTime: Optional[str] = None
    isOpen: Optional[bool] = None
    pickupInstructions: Optional[str] = None
    minOrderAmount: Optional[float] = None

@router.get("")
async def get_settings():
    db = get_db()
    settings = await db["settings"].find_one({})
    if not settings:
        # Default fallback
        settings = {
            "shopName": "Manikanta Superstore",
            "tagline": "Fresh Staples & Daily Groceries",
            "phone": "9121792433",
            "whatsapp": "9121792433",
            "email": "mykalanagarjun09@gmail.com",
            "address": "Shop #4-12, Main Road, Market Area, Hyderabad",
            "openingTime": "07:00 AM",
            "closingTime": "10:00 PM",
            "isOpen": True,
            "pickupInstructions": "Counter pickup available immediately once status changes to Ready for Pickup.",
            "minOrderAmount": 0,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        }
        await db["settings"].insert_one(settings)

    return {
        "success": True,
        "settings": fix_id(settings),
    }

@router.put("")
async def update_settings(payload: SettingsUpdate, admin: dict = Depends(get_current_admin)):
    db = get_db()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.datetime.utcnow()

    settings = await db["settings"].find_one_and_update(
        {},
        {"$set": update_data},
        upsert=True,
        return_document=True
    )

    return {
        "success": True,
        "settings": fix_id(settings),
    }
