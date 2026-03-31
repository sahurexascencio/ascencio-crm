import httpx
import asyncio
from typing import Optional
from app.db import get_db


async def scrape_website(url: str) -> dict:
    """Basic website health check."""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            has_website = response.status_code == 200
            # Rough score: penalise slow/broken sites
            score = 80 if has_website else 0
            if has_website and response.elapsed.total_seconds() > 3:
                score -= 20
            return {"has_website": has_website, "website_score": score}
    except Exception:
        return {"has_website": False, "website_score": 0}


async def scrape_google_places(business_name: str, city: str) -> dict:
    """Fetch Google Places data via public Places API."""
    try:
        query = f"{business_name} {city}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={"query": query, "key": "GOOGLE_PLACES_API_KEY"},
            )
            data = resp.json()
            if data.get("results"):
                place = data["results"][0]
                return {
                    "google_rating": place.get("rating"),
                    "google_reviews_count": place.get("user_ratings_total"),
                }
    except Exception:
        pass
    return {"google_rating": None, "google_reviews_count": None}


def score_pain_points(intel: dict) -> list[str]:
    """Generate human-readable pain points for the caller's pre-call brief."""
    points = []
    if not intel.get("has_website"):
        points.append("No website — missing local search presence entirely")
    elif intel.get("website_score", 100) < 50:
        points.append("Website exists but scores poorly — likely slow or outdated")
    if intel.get("google_rating") and intel["google_rating"] < 4.0:
        points.append(f"Google rating {intel['google_rating']} — below competitor average")
    if not intel.get("google_reviews_count") or intel["google_reviews_count"] < 20:
        points.append("Low Google review count — poor social proof for new patients")
    if intel.get("social_engagement_score", 100) < 30:
        points.append("Weak social media presence — not building an audience")
    if not intel.get("is_running_ads"):
        points.append("No active ad footprint — competitor opportunity")
    return points


async def run_scrape(lead_id: str, website_url: Optional[str], business_name: str, city: str):
    """Full scrape pipeline. Runs in background on lead creation."""
    db = get_db()

    website_data = {}
    if website_url:
        website_data = await scrape_website(website_url)
    else:
        website_data = {"has_website": False, "website_score": 0}

    places_data = await scrape_google_places(business_name, city)

    intel = {
        **website_data,
        **places_data,
        "social_engagement_score": 0,  # Phase 2: social scraper
        "is_running_ads": False,        # Phase 2: ad library scraper
        "seo_score": 0,                 # Phase 2: SEO signal scraper
        "raw_data": {
            "website": website_data,
            "places": places_data,
        },
    }

    pain_points = score_pain_points(intel)
    intel["raw_data"]["pain_points"] = pain_points

    # Upsert intelligence record
    existing = db.table("intelligence").select("id").eq("lead_id", lead_id).execute()
    if existing.data:
        db.table("intelligence").update(intel).eq("lead_id", lead_id).execute()
    else:
        db.table("intelligence").insert({"lead_id": lead_id, **intel}).execute()


def trigger_scrape(lead_id: str, website_url: Optional[str], business_name: str, city: str):
    """Sync wrapper so FastAPI BackgroundTasks can call the async scraper."""
    asyncio.run(run_scrape(lead_id, website_url, business_name, city))
