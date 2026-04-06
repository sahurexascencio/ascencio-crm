from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData
from app.services.twilio_service import get_twilio
from app.config import settings

router = APIRouter(prefix="/messages", tags=["messages"])


class SMSCreate(BaseModel):
    lead_id: UUID
    contact_id: Optional[UUID] = None
    body: str
    template_id: Optional[UUID] = None


@router.post("/sms", status_code=status.HTTP_201_CREATED)
def send_sms(data: SMSCreate, token: TokenData = Depends(decode_token)):
    db = get_db()

    # Get contact phone
    if data.contact_id:
        contact = db.table("contacts").select("phone").eq("id", str(data.contact_id)).single().execute()
    else:
        contact = db.table("contacts").select("phone").eq("lead_id", str(data.lead_id)).eq("is_primary", True).single().execute()

    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    to_number = contact.data["phone"]

    # Send via Twilio
    client = get_twilio()
    message = client.messages.create(
        to=to_number,
        from_=settings.twilio_phone_number,
        body=data.body,
    )

    # Log the message
    result = db.table("messages").insert({
        "lead_id": str(data.lead_id),
        "contact_id": str(data.contact_id) if data.contact_id else None,
        "sent_by": token.user_id,
        "direction": "outbound",
        "body": data.body,
        "twilio_message_sid": message.sid,
        "status": message.status,
    }).execute()

    return result.data[0]


@router.get("/lead/{lead_id}")
def get_messages_for_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("messages").select("*").eq("lead_id", str(lead_id)).order("created_at", desc=True).execute()
    return result.data


@router.post("/webhook/sms")
async def sms_webhook(request: Request):
    """Twilio posts inbound SMS here."""
    form = await request.form()
    from_number = form.get("From")
    body = form.get("Body")
    message_sid = form.get("MessageSid")

    if from_number and body:
        db = get_db()
        # Find contact by phone
        contact = db.table("contacts").select("id, lead_id").eq("phone", from_number).execute()
        if contact.data:
            db.table("messages").insert({
                "lead_id": contact.data[0]["lead_id"],
                "contact_id": contact.data[0]["id"],
                "direction": "inbound",
                "body": body,
                "twilio_message_sid": message_sid,
                "status": "received",
            }).execute()

    return Response(content="<?xml version='1.0' encoding='UTF-8'?><Response></Response>", media_type="application/xml")
