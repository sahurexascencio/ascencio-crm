from fastapi import APIRouter, HTTPException, status, Depends, Request, Form
from fastapi.responses import Response
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.models.call import CallCreate, CallUpdate, CallOut, TwilioCallbackPayload
from app.middleware.auth import decode_token, require_caller, TokenData
from app.services.twilio_service import initiate_call, build_connect_twiml
from app.config import settings

router = APIRouter(prefix="/calls", tags=["calls"])

WEBHOOK_BASE = "https://your-railway-app.up.railway.app"  # update post-deploy


@router.post("/initiate", response_model=CallOut, status_code=status.HTTP_201_CREATED)
def start_call(data: CallCreate, token: TokenData = Depends(require_caller)):
    """
    Click-to-call. Fetches contact phone, bridges via Twilio,
    creates a call record and returns it.
    """
    db = get_db()

    # Get contact phone
    if not data.contact_id:
        # Fall back to primary contact for the lead
        contact_result = db.table("contacts").select("phone").eq("lead_id", str(data.lead_id)).eq("is_primary", True).single().execute()
    else:
        contact_result = db.table("contacts").select("phone").eq("id", str(data.contact_id)).single().execute()

    if not contact_result.data:
        raise HTTPException(status_code=404, detail="Contact not found or no phone number")

    lead_phone = contact_result.data["phone"]

    # Get caller phone from user profile
    caller_result = db.table("users").select("phone").eq("id", token.user_id).single().execute()
    if not caller_result.data or not caller_result.data.get("phone"):
        raise HTTPException(status_code=400, detail="Caller has no phone number on file")

    caller_phone = caller_result.data["phone"]

    # Initiate via Twilio
    call_sid = initiate_call(lead_phone, caller_phone, WEBHOOK_BASE)

    # Create call record
    result = db.table("calls").insert({
        "lead_id": str(data.lead_id),
        "contact_id": str(data.contact_id) if data.contact_id else None,
        "caller_id": token.user_id,
        "twilio_call_sid": call_sid,
        "direction": data.direction.value,
        "outcome": "in_progress",
        "notes": data.notes,
    }).execute()

    return result.data[0]


@router.get("/lead/{lead_id}", response_model=list[CallOut])
def get_calls_for_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("calls").select("*").eq("lead_id", str(lead_id)).order("called_at", desc=True).execute()
    return result.data


@router.patch("/{call_id}", response_model=CallOut)
def update_call(call_id: UUID, data: CallUpdate, token: TokenData = Depends(decode_token)):
    """Manually update outcome/notes after a call ends."""
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = db.table("calls").update(payload).eq("id", str(call_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Call not found")
    return result.data[0]


# ── Twilio TwiML endpoint ──────────────────────────────────────────────────

@router.get("/twiml/connect")
def twiml_connect(to: str):
    """Returns TwiML that bridges caller to lead number."""
    twiml = build_connect_twiml(to)
    return Response(content=twiml, media_type="application/xml")


# ── Twilio Webhooks ────────────────────────────────────────────────────────

@router.post("/webhook/status")
async def twilio_call_status(request: Request):
    """
    Twilio posts here on call status changes.
    Updates call record when call completes.
    """
    form = await request.form()
    call_sid = form.get("CallSid")
    call_status = form.get("CallStatus")
    duration = form.get("CallDuration")

    if not call_sid:
        return Response(status_code=200)

    db = get_db()
    update_payload = {}

    if call_status in ("completed", "busy", "failed", "no-answer", "canceled"):
        if duration:
            update_payload["duration_seconds"] = int(duration)
        if call_status == "no-answer":
            update_payload["outcome"] = "no_answer"
        elif call_status == "busy":
            update_payload["outcome"] = "no_answer"
        elif call_status == "completed" and not update_payload.get("outcome"):
            update_payload["outcome"] = "in_progress"  # caller updates manually

    if update_payload:
        db.table("calls").update(update_payload).eq("twilio_call_sid", call_sid).execute()

    return Response(status_code=200)


@router.post("/webhook/recording")
async def twilio_recording(request: Request):
    """Saves recording URL when Twilio finishes processing."""
    form = await request.form()
    call_sid = form.get("CallSid")
    recording_url = form.get("RecordingUrl")

    if call_sid and recording_url:
        db = get_db()
        db.table("calls").update({"recording_url": f"{recording_url}.mp3"}).eq("twilio_call_sid", call_sid).execute()

    return Response(status_code=200)
