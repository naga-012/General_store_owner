import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add parent directory to sys.path so 'backend' package imports work cleanly
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio

from backend.config import UPLOAD_DIR
from backend.database import seed_defaults
from backend.socket_server import sio
from backend.routes import (
    auth,
    products,
    categories,
    orders,
    settings,
    dashboard,
    notifications,
    customers,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed admin and default configurations if not present
    try:
        await seed_defaults()
    except Exception as e:
        print(f"Warning: Could not run database seed on startup (check MongoDB connection): {e}")
    yield
    # Shutdown logic if needed

# 1. Initialize FastAPI
app = FastAPI(
    title="Manikanta Supermarket & Store Owner API",
    version="2.0.0",
    description="Python FastAPI backend with MongoDB and Socket.IO real-time alerts",
    lifespan=lifespan,
)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount Static Uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# 4. API Routers
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(categories.router)
api_router.include_router(orders.router)
api_router.include_router(settings.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(customers.router)

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "service": "python-fastapi-backend"}

app.include_router(api_router)

# 5. Wrap FastAPI app with Socket.IO ASGI app
# This handles both Socket.IO (/socket.io/) and FastAPI (/api, /uploads, etc.) on port 5000
combined_asgi_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="socket.io",
)
