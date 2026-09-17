import datetime
from collections import defaultdict
from fastapi import APIRouter, Depends
from backend.database import get_db, fix_id
from backend.auth_utils import get_current_admin

router = APIRouter(prefix="/admin", tags=["dashboard"])

@router.get("/dashboard-stats")
async def get_dashboard_stats(admin: dict = Depends(get_current_admin)):
    db = get_db()
    orders_col = db["orders"]
    products_col = db["products"]
    users_col = db["users"]

    now = datetime.datetime.utcnow()
    today_start = datetime.datetime(now.year, now.month, now.day)
    seven_days_ago = today_start - datetime.timedelta(days=6)
    month_start = datetime.datetime(now.year, now.month, 1)

    # 1. Orders and Sales Metrics
    all_orders = await orders_col.find({}).to_list(length=5000)

    total_sales = 0.0
    today_sales = 0.0
    week_sales = 0.0
    month_sales = 0.0

    order_counts = defaultdict(int)

    # For top products calculation
    product_revenue = defaultdict(float)

    # For daily sales (last 7 days)
    daily_sales_map = {}
    for i in range(7):
        day_date = seven_days_ago + datetime.timedelta(days=i)
        day_str = day_date.strftime("%d %b")
        daily_sales_map[day_str] = 0.0

    for o in all_orders:
        st = o.get("orderStatus", "ORDER_PLACED")
        order_counts[st] += 1

        created = o.get("createdAt")
        if isinstance(created, str):
            try:
                created = datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))
            except Exception:
                created = now
        elif not isinstance(created, datetime.datetime):
            created = now

        # Only completed orders count towards sales revenue
        if st == "COMPLETED":
            tot = float(o.get("grandTotal", 0))
            total_sales += tot

            if created >= today_start:
                today_sales += tot
            if created >= seven_days_ago:
                week_sales += tot
                day_key = created.strftime("%d %b")
                if day_key in daily_sales_map:
                    daily_sales_map[day_key] += tot
            if created >= month_start:
                month_sales += tot

            # Top products
            for it in o.get("items", []):
                p_name = it.get("productName", "Item")
                p_tot = float(it.get("lineTotal", 0))
                product_revenue[p_name] += p_tot

    daily_sales_chart = [
        {"date": k, "sales": round(v, 2)} for k, v in daily_sales_map.items()
    ]

    top_products_sorted = sorted(
        product_revenue.items(), key=lambda x: x[1], reverse=True
    )[:5]
    top_products_chart = [
        {"name": k, "value": round(v, 2)} for k, v in top_products_sorted
    ]

    # 2. Product Metrics
    all_products = await products_col.find({}).to_list(length=2000)
    total_products = len(all_products)
    active_products = 0
    inactive_products = 0
    out_of_stock_count = 0
    low_stock_count = 0
    low_stock_products_list = []

    for p in all_products:
        if p.get("status") == "active":
            active_products += 1
        else:
            inactive_products += 1

        variants = p.get("variants", [])
        threshold = p.get("lowStockThreshold", 10)
        tot_stock = sum(int(v.get("stock", 0)) for v in variants) if variants else 0

        if tot_stock == 0:
            out_of_stock_count += 1
            low_stock_products_list.append(p)
        elif any(int(v.get("stock", 0)) <= threshold for v in variants):
            low_stock_count += 1
            low_stock_products_list.append(p)

    # 3. Customer Metrics
    customer_count = await users_col.count_documents({"role": {"$ne": "admin"}})

    # 4. Recent Orders (last 10)
    recent_orders = await orders_col.find({}).sort("createdAt", -1).limit(10).to_list(length=10)

    stats = {
        "todaySales": round(today_sales, 2),
        "weekSales": round(week_sales, 2),
        "monthSales": round(month_sales, 2),
        "totalSales": round(total_sales, 2),
        "newOrders": order_counts["ORDER_PLACED"],
        "acceptedOrders": order_counts["ORDER_ACCEPTED"],
        "packedOrders": order_counts["PACKED"],
        "completedOrders": order_counts["COMPLETED"],
        "rejectedOrders": order_counts["REJECTED"] + order_counts["CANCELLED"],
        "totalOrders": len(all_orders),
        "totalProducts": total_products,
        "activeProducts": active_products,
        "inactiveProducts": inactive_products,
        "outOfStock": out_of_stock_count,
        "lowStock": low_stock_count,
        "totalCustomers": customer_count,
    }

    return {
        "success": True,
        "stats": stats,
        "charts": {
            "dailySales": daily_sales_chart,
            "topProducts": top_products_chart,
        },
        "lowStockProducts": fix_id(low_stock_products_list[:20]),
        "recentOrders": fix_id(recent_orders),
    }
