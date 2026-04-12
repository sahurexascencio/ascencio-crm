from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from app.db import get_db
from app.middleware.auth import require_caller, TokenData
from app.services.scraper_service import trigger_scrape
import pandas as pd
import io
import math

router = APIRouter(prefix="/import", tags=["import"])


def clean_phone(val) -> str | None:
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        s = str(int(float(val))).strip()
        if s.startswith("44"):
            return "+" + s
        if s.startswith("0"):
            return "+44" + s[1:]
        return "+44" + s
    except Exception:
        return None


def clean_address(val) -> str | None:
    if not val or (isinstance(val, float) and math.isnan(val)):
        return None
    return str(val).replace("، المملكة المتحدة", "").replace("United Kingdom", "").strip()


def clean_rating(val) -> float | None:
    try:
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return round(float(val), 1)
    except Exception:
        return None


@router.post("/leads")
async def import_leads(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    city_override: str = None,
    industry: str = "clinic",
    token: TokenData = Depends(require_caller),
):
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="File must be .xlsx, .xls, or .csv")

    content = await file.read()

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    df.columns = [c.strip().lower() for c in df.columns]

    col_map = {
        "title": "business_name", "name": "business_name",
        "business": "business_name", "clinic": "business_name",
        "phone": "phone", "telephone": "phone", "tel": "phone", "mobile": "phone",
        "city": "city", "town": "city", "location": "city",
        "address": "address",
        "rating": "rating", "score": "rating", "google rating": "rating",
        "url": "url", "link": "url", "google maps": "url", "maps": "url",
        "website": "website_url",
    }
    df.rename(columns=col_map, inplace=True)

    results = {
        "total": len(df),
        "imported": 0,
        "skipped": 0,
        "errors": [],
        "missing_phone": 0,
        "missing_rating": 0,
    }

    db = get_db()

    for idx, row in df.iterrows():
        row_num = idx + 2
        try:
            business_name = str(row.get("business_name", "")).strip()
            if not business_name:
                results["skipped"] += 1
                results["errors"].append(f"Row {row_num}: missing business name — skipped")
                continue

            city = city_override or str(row.get("city", "")).strip()
            if not city:
                results["skipped"] += 1
                results["errors"].append(f"Row {row_num}: {business_name} — missing city, skipped")
                continue

            address = clean_address(row.get("address"))
            phone = clean_phone(row.get("phone"))
            rating = clean_rating(row.get("rating"))
            maps_url = str(row.get("url", "")).strip() or None
            website_url = str(row.get("website_url", "")).strip() or None

            if not phone:
                results["missing_phone"] += 1
            if rating is None:
                results["missing_rating"] += 1

            existing = db.table("leads").select("id").eq("business_name", business_name).eq("city", city).execute()
            if existing.data:
                results["skipped"] += 1
                results["errors"].append(f"Row {row_num}: {business_name} ({city}) already exists — skipped")
                continue

            lead_result = db.table("leads").insert({
                "business_name": business_name,
                "city": city,
                "country": "UK",
                "industry": industry,
                "address": address,
                "website_url": website_url,
                "maps_url": maps_url,
                "status": "new",
                "assigned_to": token.user_id,
                "tags": [],
                "follow_up_count": 0,
            }).execute()

            lead_id = lead_result.data[0]["id"]

            if phone:
                db.table("contacts").insert({
                    "lead_id": lead_id,
                    "name": business_name,
                    "phone": phone,
                    "is_primary": True,
                }).execute()

            if rating is not None or maps_url:
                db.table("intelligence").insert({
                    "lead_id": lead_id,
                    "google_rating": rating,
                    "has_website": bool(website_url),
                    "website_score": 0,
                    "raw_data": {"source": "import", "maps_url": maps_url},
                }).execute()

            background_tasks.add_task(trigger_scrape, lead_id, website_url, business_name, city)
            results["imported"] += 1

        except Exception as e:
            results["errors"].append(f"Row {row_num}: unexpected error — {str(e)}")
            results["skipped"] += 1

    return results
