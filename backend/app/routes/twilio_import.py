from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.db import get_db
from app.middleware.auth import decode_token, TokenData
import pandas as pd
import io
import math

router = APIRouter(prefix="/twilio", tags=["twilio"])


def clean_phone(val) -> str | None:
    if not val:
        return None
    s = str(val).strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not s.startswith("+"):
        if s.startswith("44"):
            s = "+" + s
        elif s.startswith("0"):
            s = "+44" + s[1:]
        else:
            s = "+" + s
    return s


@router.post("/import-calls")
async def import_twilio_calls(
    file: UploadFile = File(...),
    token: TokenData = Depends(decode_token),
):
    """
    Import call logs from Twilio CSV export.
    Go to Twilio console → Monitor → Logs → Calls → Export CSV
    Expected columns: CallSid, From, To, Direction, Duration, StartTime, Status
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv export from Twilio")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {str(e)}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    results = {
        "total": len(df),
        "matched": 0,
        "unmatched": 0,
        "skipped": 0,
        "errors": [],
    }

    db = get_db()

    for idx, row in df.iterrows():
        try:
            call_sid = str(row.get("callsid", "") or row.get("call_sid", "") or "").strip()
            direction = str(row.get("direction", "outbound")).lower()
            duration = row.get("duration", 0)
            status_val = str(row.get("status", "")).lower()
            start_time = row.get("starttime", None) or row.get("start_time", None)

            # Get the external number (the non-Twilio number)
            from_num = clean_phone(str(row.get("from", "") or ""))
            to_num = clean_phone(str(row.get("to", "") or ""))

            # Find lead by matching phone number in contacts
            external_num = to_num if "outbound" in direction else from_num
            if not external_num:
                results["skipped"] += 1
                continue

            # Skip if already imported
            if call_sid:
                existing = db.table("calls").select("id").eq("twilio_call_sid", call_sid).execute()
                if existing.data:
                    results["skipped"] += 1
                    continue

            # Find matching contact
            contact = db.table("contacts").select("id, lead_id").eq("phone", external_num).execute()
            if not contact.data:
                results["unmatched"] += 1
                results["errors"].append(f"Row {idx+2}: no lead found for {external_num}")
                continue

            lead_id = contact.data[0]["lead_id"]
            contact_id = contact.data[0]["id"]

            # Map Twilio status to our outcome
            outcome_map = {
                "completed": "callback_scheduled",
                "no-answer": "no_answer",
                "busy": "no_answer",
                "failed": "no_answer",
                "canceled": "no_answer",
            }
            outcome = outcome_map.get(status_val, "no_answer")

            # Insert call record
            db.table("calls").insert({
                "lead_id": lead_id,
                "contact_id": contact_id,
                "caller_id": token.user_id,
                "twilio_call_sid": call_sid or None,
                "direction": "outbound" if "outbound" in direction else "inbound",
                "duration_seconds": int(float(duration)) if duration and not (isinstance(duration, float) and math.isnan(duration)) else 0,
                "outcome": outcome,
                "called_at": str(start_time) if start_time else None,
            }).execute()

            # Update last_contacted_at on lead
            db.table("leads").update({
                "last_contacted_at": str(start_time) if start_time else None,
            }).eq("id", lead_id).execute()

            results["matched"] += 1

        except Exception as e:
            results["errors"].append(f"Row {idx+2}: {str(e)}")
            results["skipped"] += 1

    return results
