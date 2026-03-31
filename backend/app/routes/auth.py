from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings
from app.db import get_db
from app.models.user import UserCreate, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, token: Optional[str] = None):
    """
    First user can register freely (bootstraps the admin).
    After that requires admin JWT passed as ?token=<jwt>
    """
    db = get_db()

    all_users = db.table("users").select("id").execute()
    is_first_user = len(all_users.data) == 0

    if not is_first_user:
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            if payload.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin only")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    existing = db.table("users").select("id").eq("email", user_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user_data.password)
    result = db.table("users").insert({
        "name": user_data.name,
        "email": user_data.email,
        "role": user_data.role.value,
        "password_hash": hashed,
    }).execute()

    return result.data[0]


@router.post("/login", response_model=Token)
def login(email: str, password: str):
    db = get_db()
    result = db.table("users").select("*").eq("email", email).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user["id"]), user["role"])
    return Token(access_token=token, user=UserOut(**user))