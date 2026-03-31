from pydantic import BaseModel, EmailStr
from enum import Enum
from datetime import datetime
from uuid import UUID


class UserRole(str, Enum):
    admin = "admin"
    caller = "caller"
    success_manager = "success_manager"
    junior = "junior"


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    user_id: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
