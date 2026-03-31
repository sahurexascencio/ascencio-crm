from fastapi import APIRouter, HTTPException, status, Depends
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.config import settings
from app.db import get_db
from app.models.user import UserCreate, UserOut, Token
from app.middleware.auth import require_admin, TokenData

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
def register(user_data: UserCreate, _: TokenData = Depends(require_admin)):
    """Admin only — creates team members."""
    db = get_db()
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
