import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from bson import ObjectId
from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_DAYS
from backend.database import get_db, fix_id

security = HTTPBearer(auto_error=False)

def create_access_token(user_id: str, email: str, role: str) -> str:
    now = datetime.datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "id": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(days=JWT_EXPIRATION_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials.",
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    db = get_db()
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db["users"].find_one({"_id": user_id})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )
    return fix_id(user)

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required.",
        )
    return current_user
