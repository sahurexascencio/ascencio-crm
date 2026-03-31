from pydantic import BaseModel
from enum import Enum
from datetime import datetime, date
from uuid import UUID
from typing import Optional
from decimal import Decimal


class BookingStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


class BookingCreate(BaseModel):
    lead_id: UUID
    contact_id: Optional[UUID] = None
    booking_date: Optional[date] = None
    service_type: Optional[str] = None
    booking_value: Decimal
    commission_rate: Decimal = Decimal("0.20")
    ad_spend: Optional[Decimal] = None
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    booking_date: Optional[date] = None
    service_type: Optional[str] = None
    booking_value: Optional[Decimal] = None
    commission_rate: Optional[Decimal] = None
    ad_spend: Optional[Decimal] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = None


class BookingOut(BaseModel):
    id: UUID
    lead_id: UUID
    contact_id: Optional[UUID]
    confirmed_by: UUID
    booking_date: Optional[date]
    service_type: Optional[str]
    booking_value: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    ad_spend: Optional[Decimal]
    status: BookingStatus
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BookingSummary(BaseModel):
    total_bookings: int
    total_value: Decimal
    total_commission: Decimal
    total_ad_spend: Decimal
    roi: Optional[float]
