import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from bson import ObjectId
from backend.database import get_db, fix_id, hash_password, verify_password
from backend.auth_utils import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    identifier: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    mobile: str
    password: str
    address: Optional[str] = ""

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

@router.post("/login")
async def login(req: LoginRequest):
    identifier = req.identifier.strip()
    db = get_db()
    users_col = db["users"]

    # Match by email or mobile
    user = await users_col.find_one({
        "$or": [
            {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
            {"mobile": identifier}
        ]
    })

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password",
        )

    # Password check
    is_valid = verify_password(req.password, user.get("password", ""))
    # Fallback for plain text passwords in existing test databases
    if not is_valid and user.get("password") == req.password:
        is_valid = True
        # Re-hash password for future security
        await users_col.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hash_password(req.password)}}
        )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=str(user["_id"]),
        email=user.get("email", ""),
        role=user.get("role", "customer"),
    )

    clean_user = fix_id(user)
    clean_user.pop("password", None)

    return {
        "success": True,
        "token": token,
        "user": clean_user,
    }

@router.post("/register")
async def register(req: RegisterRequest):
    db = get_db()
    users_col = db["users"]

    email = req.email.strip().lower()
    mobile = req.mobile.strip()

    # Check if existing user
    existing = await users_col.find_one({
        "$or": [{"email": email}, {"mobile": mobile}]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email or mobile number already exists.",
        )

    new_user = {
        "name": req.name.strip(),
        "email": email,
        "mobile": mobile,
        "password": hash_password(req.password),
        "role": "customer",
        "address": req.address.strip() if req.address else "",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow(),
    }

    result = await users_col.insert_one(new_user)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id=user_id, email=email, role="customer")
    clean_user = fix_id(new_user)
    clean_user.pop("password", None)

    return {
        "success": True,
        "token": token,
        "user": clean_user,
    }

@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    users_col = db["users"]
    user_id = ObjectId(current_user["_id"])

    user = await users_col.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = {"updatedAt": datetime.datetime.utcnow()}

    if req.name is not None and req.name.strip():
        update_fields["name"] = req.name.strip()
    if req.email is not None and req.email.strip():
        update_fields["email"] = req.email.strip().lower()
    if req.mobile is not None and req.mobile.strip():
        update_fields["mobile"] = req.mobile.strip()
    if req.address is not None:
        update_fields["address"] = req.address.strip()

    if req.newPassword and req.newPassword.strip():
        if not req.currentPassword:
            raise HTTPException(status_code=400, detail="Current password is required to change password.")
        
        valid = verify_password(req.currentPassword, user.get("password", ""))
        if not valid and user.get("password") == req.currentPassword:
            valid = True

        if not valid:
            raise HTTPException(status_code=400, detail="Current password does not match.")
        
        update_fields["password"] = hash_password(req.newPassword.strip())

    await users_col.update_one({"_id": user_id}, {"$set": update_fields})
    updated_user = await users_col.find_one({"_id": user_id})
    clean_user = fix_id(updated_user)
    clean_user.pop("password", None)

    return {
        "success": True,
        "user": clean_user,
    }
