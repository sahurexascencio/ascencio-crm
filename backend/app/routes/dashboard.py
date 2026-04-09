from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from app.db import get_db
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(token: TokenData = Depends(decode_token)):
    db = get_db()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    tomorrow_start = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat()

    # ── Stat counts ──────────────────────────────────────────────────────────
    leads_result = db.table("leads").select("id", count="exact").execute()
    total_leads = leads_result.count or 0

    callbacks_result = db.table("leads").select("id", count="exact").eq("status", "callback").execute()
    callbacks_pending = callbacks_result.count or 0

    calls_result = (
        db.table("calls")
        .select("id", count="exact")
        .gte("called_at", today_start)
        .lte("called_at", tomorrow_start)
        .execute()
    )
    calls_today = calls_result.count or 0

    bookings_result = db.table("bookings").select("id", count="exact").eq("status", "completed").execute()
    confirmed_bookings = bookings_result.count or 0

    # ── Recent leads (last 5) ────────────────────────────────────────────────
    recent_leads_result = (
        db.table("leads")
        .select("id, business_name, status, city, created_at")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    recent_leads = recent_leads_result.data or []

    # ── Tasks due today (not completed) ─────────────────────────────────────
    tasks_result = (
        db.table("tasks")
        .select("*, leads(business_name)")
        .eq("completed", False)
        .gte("due_date", today_start)
        .lte("due_date", tomorrow_start)
        .order("due_date")
        .limit(5)
        .execute()
    )
    tasks_today = []
    for row in (tasks_result.data or []):
        flat = dict(row)
        lead = flat.pop("leads", None)
        flat["business_name"] = lead.get("business_name") if lead else None
        tasks_today.append(flat)

    # ── Recent activity (last 5 status changes) ──────────────────────────────
    activity_result = (
        db.table("lead_status_history")
        .select("id, lead_id, from_status, to_status, changed_at, leads(business_name)")
        .order("changed_at", desc=True)
        .limit(5)
        .execute()
    )
    activity = []
    for row in (activity_result.data or []):
        flat = dict(row)
        lead = flat.pop("leads", None)
        flat["business_name"] = lead.get("business_name") if lead else "Unknown lead"
        activity.append(flat)

    return {
        "stats": {
            "total_leads": total_leads,
            "calls_today": calls_today,
            "callbacks_pending": callbacks_pending,
            "confirmed_bookings": confirmed_bookings,
        },
        "recent_leads": recent_leads,
        "tasks_today": tasks_today,
        "activity": activity,
    }
