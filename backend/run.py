import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

import uvicorn
from backend.config import HOST, PORT

if __name__ == "__main__":
    print(f"Starting Python Supermarket API Server on http://{HOST}:{PORT}")
    print(f"Socket.IO listening on http://{HOST}:{PORT}/socket.io")
    print(f"OpenAPI documentation available at http://{HOST}:{PORT}/docs")
    uvicorn.run(
        "backend.main:combined_asgi_app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
