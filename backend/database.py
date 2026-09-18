import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from backend.config import MONGO_URI

client = None
db = None

def get_db():
    global client, db
    if client is None:
        client = AsyncIOMotorClient(MONGO_URI)
        # Parse database name from URI, default to 'kirana_store'
        db_name = "kirana_store"
        if "/" in MONGO_URI.replace("mongodb://", "").replace("mongodb+srv://", ""):
            path_part = MONGO_URI.split("/")[-1].split("?")[0]
            if path_part:
                db_name = path_part
        db = client[db_name]
    return db

def fix_id(doc):
    """Recursively convert ObjectId instances to string representations."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [fix_id(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, (dict, list)):
                new_doc[k] = fix_id(v)
            elif isinstance(v, datetime.datetime):
                new_doc[k] = v.isoformat()
            else:
                new_doc[k] = v
        return new_doc
    return doc

def to_object_id(id_val):
    if isinstance(id_val, ObjectId):
        return id_val
    try:
        return ObjectId(str(id_val))
    except Exception:
        return None

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

async def seed_defaults():
    database = get_db()
    users_col = database["users"]
    settings_col = database["settings"]
    categories_col = database["categories"]

    # 1. Seed Admin Account
    admin_email = "mykalanagarjun09@gmail.com"
    existing_admin = await users_col.find_one({"$or": [{"email": admin_email}, {"role": "admin"}]})
    if not existing_admin:
        admin_doc = {
            "name": "Nagarjun Myakala",
            "email": admin_email,
            "mobile": "9121792433",
            "password": hash_password("naga@012"),
            "role": "admin",
            "address": "Main Bazar, Near Clock Tower",
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        }
        await users_col.insert_one(admin_doc)
        print("[OK] Default admin account seeded:", admin_email)

    # 2. Seed Settings
    existing_settings = await settings_col.find_one({})
    if not existing_settings:
        settings_doc = {
            "shopName": "Manikanta Superstore",
            "tagline": "Fresh Staples & Daily Groceries",
            "phone": "9121792433",
            "whatsapp": "9121792433",
            "email": admin_email,
            "address": "Shop #4-12, Main Road, Market Area, Hyderabad",
            "openingTime": "07:00 AM",
            "closingTime": "10:00 PM",
            "isOpen": True,
            "pickupInstructions": "Counter pickup available immediately once status changes to Ready for Pickup.",
            "minOrderAmount": 0,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow(),
        }
        await settings_col.insert_one(settings_doc)
        print("[OK] Default store settings seeded")

    # 3. Seed Default Categories if none
    cat_count = await categories_col.count_documents({})
    if cat_count == 0:
        default_cats = [
            {"name": "Rice & Grains", "description": "Basmati, Sona Masoori, Dals and Cereals", "image": ""},
            {"name": "Oils & Ghee", "description": "Sunflower oil, Mustard, Groundnut, Pure Ghee", "image": ""},
            {"name": "Flours & Atta", "description": "Wheat Atta, Maida, Besan, Rice Flour", "image": ""},
            {"name": "Spices & Masalas", "description": "Chili, Turmeric, Cumin, Garam Masala", "image": ""},
            {"name": "Snacks & Beverages", "description": "Biscuits, Tea, Coffee, Namkeen", "image": ""},
        ]
        now = datetime.datetime.utcnow()
        for cat in default_cats:
            cat["createdAt"] = now
            cat["updatedAt"] = now
        await categories_col.insert_many(default_cats)
        print("[OK] Default categories seeded")
