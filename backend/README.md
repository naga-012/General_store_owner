# Manikanta Supermarket & Store Owner — Python Backend

Fast, modern, and asynchronous Python backend built with **FastAPI**, **Motor (Async MongoDB)**, and **python-socketio (ASGI)**.

---

## Architecture & Features

- **FastAPI**: Modern async REST API with automatic OpenAPI Swagger UI at `http://localhost:5000/docs`.
- **Motor + PyMongo**: Non-blocking async MongoDB client connecting to `kirana_store`.
- **Socket.IO (ASGI)**: Real-time bi-directional messaging mounted on `http://localhost:5000/socket.io`:
  - `join_admin_room`: Automatically places the shop owner in the notification room.
  - `new_order_received`: Triggers the incoming order notification and repeating audio alarm.
  - `order_status_updated`: Real-time order progression sync across tabs.
  - `low_stock_alert`: Live inventory alert when variant stock falls to threshold.
  - `product_updated`: Instant catalog refresh on edits or status toggles.
- **JWT & Bcrypt Security**: Multi-role authentication (`admin`, `customer`) with bcrypt hashing.
- **Multi-Unit Inventory Deduction**: Automatically reduces variant quantity when status is changed to `COMPLETED`.

---

## Setup & Running

### 1. Prerequisites
- Python 3.11+ (Python 3.13 tested)
- MongoDB running locally on `localhost:27017` or MongoDB Atlas.

### 2. Environment Setup
Create and activate a virtual environment:
```bash
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Configuration
Check or edit `.env`:
```env
PORT=5000
HOST=0.0.0.0
MONGO_URI=mongodb://localhost:27017/kirana_store
JWT_SECRET=kirana_secret_jwt_key_2026_supermarket
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
```

### 4. Start Server
```bash
python run.py
```
The server starts on `http://localhost:5000`.
