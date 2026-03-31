from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional


class ContactBase(BaseModel):
    name: str
    role: Optional[str] = None
    phone: str
    email: Optional[EmailStr] = None
    is_primary: bool = False


class ContactCreate(ContactBase):
    lead_id: UUID


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_primary: Optional[bool] = None


class ContactOut(ContactBase):
    id: UUID
    lead_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
