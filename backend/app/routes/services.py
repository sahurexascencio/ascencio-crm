from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/services", tags=["services"])

PRESET_SERVICES = [
    "Booking Management",
    "SEO",
    "Google Ads",
    "CRM Setup",
    "Social Media",
    "WhatsApp Marketing",
    "Website Design",
    "Facebook Ads",
    "Instagram Ads",
    "Email Marketing",
]


class ServiceCreate(BaseModel):
    lead_id: UUID
    name: str
    price: Optional[float] = None
    notes: Optional[str] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None


@router.get("/presets")
def get_presets():
    return PRESET_SERVICES


@router.get("/lead/{lead_id}")
def get_services_for_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("services").select("*").eq("lead_id", str(lead_id)).order("created_at").execute()
    return result.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_service(data: ServiceCreate, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("services").insert({
        "lead_id": str(data.lead_id),
        "name": data.name,
        "price": data.price,
        "notes": data.notes,
    }).execute()
    return result.data[0]


@router.patch("/{service_id}")
def update_service(service_id: UUID, data: ServiceUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = db.table("services").update(payload).eq("id", str(service_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return result.data[0]


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    db.table("services").delete().eq("id", str(service_id)).execute()
