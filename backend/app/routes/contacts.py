from fastapi import APIRouter, HTTPException, status, Depends
from uuid import UUID
from app.db import get_db
from app.models.contact import ContactCreate, ContactUpdate, ContactOut
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("/", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_contact(data: ContactCreate, token: TokenData = Depends(decode_token)):
    db = get_db()

    # If marked primary, demote existing primary for this lead
    if data.is_primary:
        db.table("contacts").update({"is_primary": False}).eq("lead_id", str(data.lead_id)).execute()

    result = db.table("contacts").insert(data.model_dump()).execute()
    return result.data[0]


@router.get("/lead/{lead_id}", response_model=list[ContactOut])
def get_contacts_for_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("contacts").select("*").eq("lead_id", str(lead_id)).order("is_primary", desc=True).execute()
    return result.data


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: UUID, data: ContactUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}

    if payload.get("is_primary"):
        contact = db.table("contacts").select("lead_id").eq("id", str(contact_id)).single().execute()
        if contact.data:
            db.table("contacts").update({"is_primary": False}).eq("lead_id", contact.data["lead_id"]).execute()

    result = db.table("contacts").update(payload).eq("id", str(contact_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return result.data[0]


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    db.table("contacts").delete().eq("id", str(contact_id)).execute()
