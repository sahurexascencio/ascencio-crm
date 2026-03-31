from pydantic import BaseModel, HttpUrl
from enum import Enum
from datetime import datetime
from uuid import UUID
from typing import Optional


class LeadStatus(str, Enum):
    new = "new"
    in_progress = "in_progress"
    callback = "callback"
    confirmed = "confirmed"
    dead = "dead"


class LeadIndustry(str, Enum):
    clinic = "clinic"
    dental = "dental"
    aesthetics = "aesthetics"
    ecommerce = "ecommerce"
    other = "other"


class LeadBase(BaseModel):
    business_name: str
    industry: LeadIndustry
    city: str
    country: str = "UK"
    website_url: Optional[str] = None


class LeadCreate(LeadBase):
    assigned_to: Optional[UUID] = None


class LeadUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[LeadIndustry] = None
    city: Optional[str] = None
    country: Optional[str] = None
    website_url: Optional[str] = None
    status: Optional[LeadStatus] = None
    assigned_to: Optional[UUID] = None


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
    notes: Optional[str] = None


class LeadOut(LeadBase):
    id: UUID
    status: LeadStatus
    assigned_to: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
