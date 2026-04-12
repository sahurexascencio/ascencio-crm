from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData
import os, httpx, json

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

SCHEMA = {
    "business_name": "", "email": "", "owner_name": "", "owner_background": "",
    "website": {"url": "", "quality_score": 0, "has_online_booking": False,
                "booking_platform": "", "mobile_friendly": True,
                "has_price_list": False, "has_gallery": False, "notes": ""},
    "google": {"rating": 0.0, "review_count": 0, "recent_reviews_sentiment": ""},
    "social_media": {"instagram_handle": "", "instagram_followers": "",
                     "instagram_last_post": "", "instagram_post_frequency": "",
                     "instagram_content_type": "", "facebook_url": "",
                     "facebook_followers": 0, "facebook_last_post": "", "facebook_active": False},
    "ads": {"running_google_ads": False, "running_facebook_ads": False,
            "running_instagram_ads": False, "ad_quality_notes": ""},
    "services": [], "price_range": "",
    "pain_points": ["", "", ""],
    "opportunities": {"seo": "", "google_ads": "", "social_media": "",
                      "booking_system": "", "crm": "", "whatsapp": ""},
    "talking_points": ["", "", ""],
    "recommended_services": [],
    "overall_digital_score": 0,
    "call_difficulty": "easy",
    "summary": ""
}


class RawTextInput(BaseModel):
    text: str


class ManualIntelligence(BaseModel):
    raw_data: dict


@router.get("/{lead_id}")
def get_intelligence(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("intelligence").select("*").eq("lead_id", str(lead_id)).execute()
    return result.data[0] if result.data else None


@router.get("/{lead_id}/brief")
def get_brief(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    lead = db.table("leads").select("*").eq("id", str(lead_id)).single().execute()
    intel = db.table("intelligence").select("*").eq("lead_id", str(lead_id)).execute()
    contacts = db.table("contacts").select("*").eq("lead_id", str(lead_id)).execute()
    services = db.table("services").select("*").eq("lead_id", str(lead_id)).execute()
    tasks = db.table("tasks").select("*").eq("lead_id", str(lead_id)).eq("completed", False).execute()
    calls = db.table("calls").select("*").eq("lead_id", str(lead_id)).order("called_at", desc=True).limit(5).execute()
    return {
        "lead": lead.data,
        "intelligence": intel.data[0] if intel.data else None,
        "contacts": contacts.data,
        "services": services.data,
        "tasks": tasks.data,
        "recent_calls": calls.data,
    }


@router.post("/{lead_id}/manual")
def save_manual_intelligence(lead_id: UUID, data: ManualIntelligence, token: TokenData = Depends(decode_token)):
    db = get_db()
    raw = data.raw_data
    website = raw.get("website", {})
    google = raw.get("google", {})
    social = raw.get("social_media", {})
    ads = raw.get("ads", {})

    payload = {
        "lead_id": str(lead_id),
        "has_website": bool(website.get("url")),
        "website_score": website.get("quality_score", 0),
        "google_rating": google.get("rating"),
        "google_reviews_count": google.get("review_count"),
        "social_instagram_url": social.get("instagram_handle"),
        "social_facebook_url": social.get("facebook_url"),
        "is_running_ads": ads.get("running_google_ads") or ads.get("running_facebook_ads"),
        "raw_data": raw,
    }

    existing = db.table("intelligence").select("id").eq("lead_id", str(lead_id)).execute()
    if existing.data:
        db.table("intelligence").update(payload).eq("lead_id", str(lead_id)).execute()
    else:
        db.table("intelligence").insert(payload).execute()

    return {"status": "saved"}


@router.post("/{lead_id}/refresh")
def refresh_intelligence(lead_id: UUID, token: TokenData = Depends(decode_token)):
    return {"status": "manual mode — use Perplexity workflow"}


@router.post("/extract")
async def extract_intelligence(data: RawTextInput, token: TokenData = Depends(decode_token)):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set in .env")

    prompt = f"""Extract business intelligence data from the text below and return it as valid JSON matching the schema exactly.
Return ONLY the JSON object, nothing else.

Schema:
{json.dumps(SCHEMA, indent=2)}

Text:
{data.text}"""

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-haiku-4-5-20251001", "max_tokens": 2000,
                  "messages": [{"role": "user", "content": prompt}]},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Claude API error: {response.text}")

    raw_text = response.json()["content"][0]["text"].strip()
    raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Parse error: {e.msg}")