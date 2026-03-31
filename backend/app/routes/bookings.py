from fastapi import APIRouter, HTTPException, status, Depends
from uuid import UUID
from typing import Optional
from decimal import Decimal
from app.db import get_db
from app.models.booking import BookingCreate, BookingUpdate, BookingOut, BookingSummary, BookingStatus
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/bookings", tags=["bookings"])

def serialize(data: dict) -> dict:
    from uuid import UUID
    return {k: str(v) if isinstance(v, UUID) else v for k, v in data.items()}



@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, token: TokenData = Depends(decode_token)):
    commission_amount = (data.booking_value * data.commission_rate).quantize(Decimal("0.01"))

    result = get_db().table("bookings").insert({
        **data.model_dump(),
        "confirmed_by": token.user_id,
        "commission_amount": str(commission_amount),
        "status": BookingStatus.pending.value,
        "lead_id": str(data.lead_id),
        "contact_id": str(data.contact_id) if data.contact_id else None,
    }).execute()

    # Auto-update lead status to confirmed
    get_db().table("leads").update({"status": "confirmed"}).eq("id", str(data.lead_id)).execute()

    return result.data[0]


@router.get("/", response_model=list[BookingOut])
def list_bookings(
    status: Optional[BookingStatus] = None,
    lead_id: Optional[UUID] = None,
    token: TokenData = Depends(decode_token),
):
    db = get_db()
    query = db.table("bookings").select("*")
    if status:
        query = query.eq("status", status.value)
    if lead_id:
        query = query.eq("lead_id", str(lead_id))
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.get("/summary", response_model=BookingSummary)
def booking_summary(token: TokenData = Depends(decode_token)):
    """Aggregate stats — total value, commission, ad spend, ROI."""
    db = get_db()
    result = db.table("bookings").select("booking_value, commission_amount, ad_spend").eq("status", "completed").execute()
    rows = result.data

    total_value = sum(Decimal(str(r["booking_value"])) for r in rows)
    total_commission = sum(Decimal(str(r["commission_amount"])) for r in rows)
    total_ad_spend = sum(Decimal(str(r["ad_spend"] or 0)) for r in rows)

    roi = None
    if total_ad_spend > 0:
        roi = float((total_value - total_ad_spend) / total_ad_spend * 100)

    return BookingSummary(
        total_bookings=len(rows),
        total_value=total_value,
        total_commission=total_commission,
        total_ad_spend=total_ad_spend,
        roi=roi,
    )


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: UUID, data: BookingUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}

    # Recalculate commission if value or rate changed
    if "booking_value" in payload or "commission_rate" in payload:
        current = db.table("bookings").select("booking_value, commission_rate").eq("id", str(booking_id)).single().execute()
        if current.data:
            value = Decimal(str(payload.get("booking_value", current.data["booking_value"])))
            rate = Decimal(str(payload.get("commission_rate", current.data["commission_rate"])))
            payload["commission_amount"] = str((value * rate).quantize(Decimal("0.01")))

    result = db.table("bookings").update(serialize(payload)).eq("id", str(booking_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result.data[0]