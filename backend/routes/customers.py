from fastapi import APIRouter, Depends
from backend.database import get_db, fix_id
from backend.auth_utils import get_current_admin

router = APIRouter(prefix="/admin/customers", tags=["customers"])

@router.get("")
async def get_customers(admin: dict = Depends(get_current_admin)):
    db = get_db()
    users_col = db["users"]
    orders_col = db["orders"]

    customers = await users_col.find({"role": {"$ne": "admin"}}).sort("createdAt", -1).to_list(length=1000)
    all_orders = await orders_col.find({}).to_list(length=5000)

    # Pre-aggregate orders by user identifiers
    user_stats = {}
    for o in all_orders:
        cust = o.get("customer") or {}
        uid = str(cust.get("userId", ""))
        mobile = cust.get("mobile", "")
        email = cust.get("email", "")
        total = float(o.get("grandTotal", 0))

        keys = [k for k in [uid, mobile, email] if k]
        for k in keys:
            if k not in user_stats:
                user_stats[k] = {"count": 0, "spent": 0.0}
            user_stats[k]["count"] += 1
            if o.get("orderStatus") == "COMPLETED":
                user_stats[k]["spent"] += total

    enriched = []
    for c in customers:
        cid = str(c["_id"])
        cmobile = c.get("mobile", "")
        cemail = c.get("email", "")

        stat = user_stats.get(cid) or user_stats.get(cmobile) or user_stats.get(cemail) or {"count": 0, "spent": 0.0}
        
        c_clean = fix_id(c)
        c_clean.pop("password", None)
        c_clean["ordersCount"] = stat["count"]
        c_clean["totalSpent"] = round(stat["spent"], 2)
        enriched.append(c_clean)

    return {
        "success": True,
        "count": len(enriched),
        "customers": enriched,
    }
