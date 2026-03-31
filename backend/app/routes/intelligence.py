from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from uuid import UUID
from app.db import get_db
from app.models.intelligence import IntelligenceOut, ScrapeSummary
from app.middleware.auth import decode_token, TokenData
from app.services.scraper_service import trigger_scrape

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/{lead_id}", response_model=IntelligenceOut)
def get_intelligence(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("intelligence").select("*").eq("lead_id", str(lead_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No intelligence data yet for this lead")
    return result.data


@router.post("/{lead_id}/refresh")
def refresh_intelligence(
    lead_id: UUID,
    background_tasks: BackgroundTasks,
    token: TokenData = Depends(decode_token),
):
    """Manually trigger a fresh scrape for a lead."""
    db = get_db()
    lead = db.table("leads").select("website_url, business_name, city").eq("id", str(lead_id)).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    background_tasks.add_task(
        trigger_scrape,
        str(lead_id),
        lead.data.get("website_url"),
        lead.data["business_name"],
        lead.data["city"],
    )
    return {"message": "Scrape triggered", "lead_id": str(lead_id)}


@router.get("/{lead_id}/brief")
def get_pre_call_brief(lead_id: UUID, token: TokenData = Depends(decode_token)):
    """
    Returns a structured pre-call brief for the caller.
    Pain points, quick stats, suggested talking points.
    """
    db = get_db()

    lead = db.table("leads").select("*").eq("id", str(lead_id)).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    intel = db.table("intelligence").select("*").eq("lead_id", str(lead_id)).single().execute()
    contacts = db.table("contacts").select("*").eq("lead_id", str(lead_id)).order("is_primary", desc=True).execute()

    pain_points = []
    if intel.data and intel.data.get("raw_data"):
        pain_points = intel.data["raw_data"].get("pain_points", [])

    return {
        "lead": lead.data,
        "primary_contact": contacts.data[0] if contacts.data else None,
        "all_contacts": contacts.data,
        "intelligence": intel.data,
        "pain_points": pain_points,
        "talking_points": _build_talking_points(lead.data, intel.data),
    }


def _build_talking_points(lead: dict, intel: dict | None) -> list[str]:
    points = []
    business = lead.get("business_name", "your business")
    industry = lead.get("industry", "clinic")

    if not intel:
        points.append(f"Ask if {business} is currently running any advertising")
        points.append("Ask about their current main source of new clients")
        return points

    if not intel.get("has_website"):
        points.append(f"{business} has no website — lead with digital presence as step one")
    if intel.get("google_rating") and intel["google_rating"] < 4.2:
        points.append(f"Google rating is {intel['google_rating']} — mention reputation management as quick win")
    if not intel.get("is_running_ads"):
        points.append("Not running ads — frame as untapped growth, competitors are ahead")
    if (intel.get("google_reviews_count") or 0) < 20:
        points.append("Few Google reviews — review generation campaign is an easy first sell")

    points.append(f"Ask: what's the current cost of acquiring a new {industry} client?")
    points.append("Close on: we only charge per confirmed booking — zero risk to you")

    return points