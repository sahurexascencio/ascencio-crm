from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData
import os, httpx

router = APIRouter(prefix="/messages", tags=["messages"])


# ── Send SMS ──────────────────────────────────────────────────────────────────
class SMSPayload(BaseModel):
    lead_id: UUID
    to_number: str
    body: str


@router.post("/sms")
async def send_sms(data: SMSPayload, token: TokenData = Depends(decode_token)):
    account_sid  = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token   = os.getenv("TWILIO_AUTH_TOKEN")
    from_number  = os.getenv("TWILIO_PHONE_NUMBER", "+16624934617")

    if not account_sid or not auth_token:
        raise HTTPException(status_code=500, detail="Twilio credentials not set in .env")

    # Send via Twilio REST API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
            auth=(account_sid, auth_token),
            data={
                "From": from_number,
                "To":   data.to_number,
                "Body": data.body,
            }
        )

    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Twilio error: {response.text}")

    twilio_data = response.json()

    # Log to database
    db = get_db()
    result = db.table("messages").insert({
        "lead_id":      str(data.lead_id),
        "channel":      "sms",
        "direction":    "outbound",
        "from_address": from_number,
        "to_address":   data.to_number,
        "body":      data.body,
        "twilio_sid":   twilio_data.get("sid"),
        "status":       twilio_data.get("status", "sent"),
    }).execute()

    return result.data[0]


# ── Send Email (log only for now — attach SMTP later) ────────────────────────
class EmailPayload(BaseModel):
    lead_id: UUID
    to_email: str
    subject: str
    body: str


@router.post("/email")
async def send_email(data: EmailPayload, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("messages").insert({
        "lead_id":      str(data.lead_id),
        "channel":      "email",
        "direction":    "outbound",
        "to_address":   data.to_email,
        "subject":      data.subject,
        "body":      data.body,
        "status":       "draft",  # change to "sent" once SMTP is wired
    }).execute()
    return result.data[0]


# ── Internal note ─────────────────────────────────────────────────────────────
class NotePayload(BaseModel):
    lead_id: UUID
    body: str


@router.post("/note")
async def add_note(data: NotePayload, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("messages").insert({
        "lead_id":   str(data.lead_id),
        "channel":   "note",
        "direction": "outbound",
        "body":   data.body,
        "status":    "sent",
    }).execute()
    return result.data[0]


# ── Twilio incoming SMS webhook ───────────────────────────────────────────────
@router.post("/incoming")
async def incoming_sms(request: Request):
    form = await request.form()
    from_number = form.get("From", "")
    to_number   = form.get("To", "")
    body        = form.get("Body", "")
    twilio_sid  = form.get("MessageSid", "")

    db = get_db()

    # Try to match to a lead via contact phone
    lead_id = None
    contact = db.table("contacts").select("lead_id").eq("phone", from_number).execute()
    if contact.data:
        lead_id = contact.data[0]["lead_id"]
    else:
        # Try leads table directly
        lead = db.table("leads").select("id").eq("phone", from_number).execute()
        if lead.data:
            lead_id = lead.data[0]["id"]

    if lead_id:
        db.table("messages").insert({
            "lead_id":      lead_id,
            "channel":      "sms",
            "direction":    "inbound",
            "from_address": from_number,
            "to_address":   to_number,
            "body":      body,
            "twilio_sid":   twilio_sid,
            "status":       "received",
        }).execute()
        # Update last_contacted_at
        db.table("leads").update({"last_contacted_at": "now()"}).eq("id", lead_id).execute()

    # Twilio expects XML response
    return Response(
    content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    media_type="application/xml"
)


# ── Get all messages for a lead ───────────────────────────────────────────────
@router.get("/lead/{lead_id}")
def get_messages(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("messages").select("*").eq("lead_id", str(lead_id)).order("created_at").execute()
    return result.data


# ── Get all conversations (latest message per lead) ───────────────────────────
@router.get("/conversations")
def get_conversations(token: TokenData = Depends(decode_token)):
    db = get_db()
    # Get latest message per lead
    messages = db.table("messages").select("lead_id, body, channel, direction, created_at, status").order("created_at", desc=True).execute()
    seen = {}
    for msg in messages.data:
        lid = msg["lead_id"]
        if lid not in seen:
            seen[lid] = msg

    lead_ids = list(seen.keys())
    if not lead_ids:
        return []

    leads = db.table("leads").select("id, business_name, city").in_("id", lead_ids).execute()
    lead_map = {l["id"]: l for l in leads.data}

    result = []
    for lid, msg in seen.items():
        lead = lead_map.get(lid, {})
        result.append({
            "lead_id":       lid,
            "business_name": lead.get("business_name", "Unknown"),
            "city":          lead.get("city", ""),
            "last_message":  msg["body"],
            "channel":       msg["channel"],
            "direction":     msg["direction"],
            "created_at":    msg["created_at"],
            "status":        msg["status"],
        })

    result.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return result


# ── Mark messages as read ────────────────────────────────────────────────────
@router.post("/lead/{lead_id}/read")
def mark_read(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    db.table("messages").update({"read_at": "now()"}).eq("lead_id", str(lead_id)).is_("read_at", "null").execute()
    return {"status": "ok"}