from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from passlib.context import CryptContext
from app.db import get_db
from app.middleware.auth import decode_token, require_admin, TokenData
from app.models.user import UserRole

router = APIRouter(prefix="/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserInvite(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("users").select("id, name, email, role, phone, created_at").eq("id", token.user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data


@router.patch("/me")
def update_me(data: ProfileUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = db.table("users").update(payload).eq("id", token.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.post("/me/password")
def change_password(data: PasswordChange, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("users").select("password_hash").eq("id", token.user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(data.current_password, result.data["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    new_hash = pwd_context.hash(data.new_password)
    db.table("users").update({"password_hash": new_hash}).eq("id", token.user_id).execute()
    return {"message": "Password updated"}


# ── Team management (admin only) ──────────────────────────────────────────────

@router.get("")
def list_users(token: TokenData = Depends(require_admin)):
    db = get_db()
    result = db.table("users").select("id, name, email, role, created_at").order("created_at").execute()
    return result.data


@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_user(data: UserInvite, token: TokenData = Depends(require_admin)):
    db = get_db()
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    hashed = pwd_context.hash(data.password)
    result = db.table("users").insert({
        "name": data.name,
        "email": data.email,
        "role": data.role.value,
        "password_hash": hashed,
    }).execute()
    return result.data[0]


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(user_id: UUID, token: TokenData = Depends(require_admin)):
    if str(user_id) == token.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    db = get_db()
    db.table("users").delete().eq("id", str(user_id)).execute()
