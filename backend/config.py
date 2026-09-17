import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/kirana_store")
JWT_SECRET = os.getenv("JWT_SECRET", "kirana_secret_jwt_key_2026_supermarket")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000")
CORS_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
