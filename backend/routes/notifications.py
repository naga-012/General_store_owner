from fastapi import APIRouter, HTTPException, Depends
from backend.database import get_db, fix_id, to_object_id
from backend.auth_utils import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db["notifications"].find({}).sort("createdAt", -1).limit(100)
    notifications = await cursor.to_list(length=100)
    return {
        "success": True,
        "notifications": fix_id(notifications),
    }

@router.put("/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    obj_id = to_object_id(notif_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    db = get_db()
    res = await db["notifications"].update_one({"_id": obj_id}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True}

@router.put("/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db["notifications"].update_many({}, {"$set": {"read": True}})
    return {"success": True}
