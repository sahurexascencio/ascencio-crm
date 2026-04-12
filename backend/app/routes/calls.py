from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData
import os, httpx
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(prefix="/calls", tags=["calls"])


def twilio_client():
    from twilio.rest import Client
    return Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))


# ── Access token — works WITHOUT a TwiML App SID ─────────────────────────────
@router.get("/token")
def get_access_token(token: TokenData = Depends(decode_token)):
    try:
        from twilio.jwt.access_token import AccessToken
        from twilio.jwt.access_token.grants import VoiceGrant

        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        api_key     = os.getenv("TWILIO_API_KEY")
        api_secret  = os.getenv("TWILIO_API_SECRET")

        if not all([account_sid, api_key, api_secret]):
            raise HTTPException(
                status_code=500,
                detail="Missing TWILIO_ACCOUNT_SID, TWILIO_API_KEY or TWILIO_API_SECRET in .env"
            )

        twiml_app_sid = os.getenv("TWILIO_TWIML_APP_SID", "")

        access_token = AccessToken(
            account_sid, api_key, api_secret,
            identity=str(token.user_id), ttl=3600
            # no region — use US-Default key only
        )
        voice_grant = VoiceGrant(
            outgoing_application_sid=twiml_app_sid if twiml_app_sid else None,
            incoming_allow=False
        )
        access_token.add_grant(voice_grant)
        jwt = access_token.to_jwt()
        # to_jwt() may return bytes in some versions
        if isinstance(jwt, bytes):
            jwt = jwt.decode('utf-8')

        return {
            "token": jwt,
            "identity": str(token.user_id),
            "has_twiml_app": bool(twiml_app_sid),
        }

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Run: py -3.12 -m pip install twilio --break-system-packages"
        )


# ── TwiML — Twilio calls this when a browser call connects ────────────────────
@router.post("/twiml")
async def twiml_handler(request: Request):
    form = await request.form()
    to_number   = form.get("To", "")
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "+16624934617")

    if not to_number:
        xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No number provided.</Say></Response>'
    else:
        xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="{from_number}">
    <Number>{to_number}</Number>
  </Dial>
</Response>'''

    return Response(content=xml, media_type="application/xml")


# ── Log a call ────────────────────────────────────────────────────────────────
class CallLog(BaseModel):
    lead_id: UUID
    contact_id: Optional[UUID] = None
    twilio_call_sid: Optional[str] = None
    direction: str = "outbound"
    duration_seconds: int = 0
    outcome: str = "no_answer"
    notes: Optional[str] = None
    called_at: Optional[str] = None


@router.post("/log")
def log_call(data: CallLog, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("calls").insert({
        "lead_id":          str(data.lead_id),
        "contact_id":       str(data.contact_id) if data.contact_id else None,
        "caller_id":        str(token.user_id),
        "twilio_call_sid":  data.twilio_call_sid,
        "direction":        data.direction,
        "duration_seconds": data.duration_seconds,
        "outcome":          data.outcome,
        "notes":            data.notes,
        "called_at":        data.called_at or "now()",
    }).execute()
    db.table("leads").update({"last_contacted_at": "now()"}).eq("id", str(data.lead_id)).execute()
    return result.data[0]


# ── Get calls for a lead ──────────────────────────────────────────────────────
@router.get("/lead/{lead_id}")
def get_calls(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("calls").select("*").eq("lead_id", str(lead_id)).order("called_at", desc=True).execute()
    return result.data


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats")
def call_stats(token: TokenData = Depends(decode_token)):
    db = get_db()
    calls = db.table("calls").select("duration_seconds").execute().data
    total_seconds = sum(c.get("duration_seconds", 0) or 0 for c in calls)
    total_minutes = round(total_seconds / 60, 1)
    cost_usd = round(total_minutes * 0.045, 2)  # ~$0.045/min to UK mobiles
    remaining = round(14.34 - cost_usd, 2)
    return {
        "total_calls": len(calls),
        "total_minutes": total_minutes,
        "total_seconds": total_seconds,
        "cost_estimate_usd": cost_usd,
        "trial_credit_remaining_estimate": max(0, remaining),
    }


# ── Import Twilio CSV ─────────────────────────────────────────────────────────
@router.post("/import")
async def import_calls(request: Request, token: TokenData = Depends(decode_token)):
    import pandas as pd, io
    body = await request.body()
    try:
        df = pd.read_csv(io.BytesIO(body))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    db = get_db()
    matched = 0
    for _, row in df.iterrows():
        try:
            phone = str(row.get("to", "") or row.get("from", "") or "").strip()
            if not phone:
                continue
            contact = db.table("contacts").select("id, lead_id").eq("phone", phone).execute()
            if not contact.data:
                continue
            lead_id = contact.data[0]["lead_id"]
            db.table("calls").insert({
                "lead_id": lead_id,
                "twilio_call_sid": str(row.get("callsid", "") or ""),
                "direction": "outbound",
                "duration_seconds": int(float(row.get("duration", 0) or 0)),
                "outcome": "completed" if str(row.get("status", "")).lower() == "completed" else "no_answer",
                "called_at": str(row.get("starttime", "")) or None,
            }).execute()
            db.table("leads").update({"last_contacted_at": "now()"}).eq("id", lead_id).execute()
            matched += 1
        except Exception:
            continue
    return {"matched": matched, "total": len(df)}