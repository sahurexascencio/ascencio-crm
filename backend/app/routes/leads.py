from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from uuid import UUID
from typing import Optional
from datetime import datetime
from app.db import get_db
from app.models.lead import LeadCreate, LeadUpdate, LeadOut, LeadStatusUpdate, LeadStatus
from app.middleware.auth import decode_token, require_caller, TokenData
from app.services.scraper_service import trigger_scrape

router = APIRouter(prefix="/leads", tags=["leads"])


def serialize(data: dict) -> dict:
    from uuid import UUID
    return {k: str(v) if isinstance(v, UUID) else v for k, v in data.items()}


@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    background_tasks: BackgroundTasks,
    token: TokenData = Depends(require_caller),
):
    db = get_db()
    payload = serialize(data.model_dump())
    if not payload.get("assigned_to"):
        payload["assigned_to"] = token.user_id
    result = db.table("leads").insert(payload).execute()
    lead = result.data[0]
    background_tasks.add_task(trigger_scrape, lead["id"], lead.get("website_url"), lead["business_name"], lead["city"])
    return lead


@router.get("/cities")
def list_cities(token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("uk_cities").select("name").order("name").execute()
    return [r["name"] for r in result.data]


@router.get("/cities/counts")
def city_lead_counts(token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("leads").select("city").execute()
    counts = {}
    for row in result.data:
        c = row["city"]
        counts[c] = counts.get(c, 0) + 1
    return counts


@router.get("/", response_model=list[LeadOut])
def list_leads(
    status: Optional[LeadStatus] = None,
    city: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    opportunity_source: Optional[str] = None,
    campaign_type: Optional[str] = None,
    value_min: Optional[float] = None,
    value_max: Optional[float] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    updated_after: Optional[datetime] = None,
    updated_before: Optional[datetime] = None,
    contacted_after: Optional[datetime] = None,
    contacted_before: Optional[datetime] = None,
    won_after: Optional[datetime] = None,
    won_before: Optional[datetime] = None,
    lost_after: Optional[datetime] = None,
    lost_before: Optional[datetime] = None,
    sort_by: Optional[str] = Query("created_at"),
    sort_dir: Optional[str] = Query("desc"),
    limit: int = Query(200, le=500),
    offset: int = Query(0, ge=0),
    token: TokenData = Depends(decode_token),
):
    db = get_db()
    query = db.table("leads").select("*")

    if token.role == "caller":
        query = query.eq("assigned_to", token.user_id)
    elif assigned_to:
        query = query.eq("assigned_to", str(assigned_to))

    if status:             query = query.eq("status", status.value)
    if city:               query = query.eq("city", city)
    if industry:           query = query.eq("industry", industry)
    if opportunity_source: query = query.eq("opportunity_source", opportunity_source)
    if campaign_type:      query = query.eq("campaign_type", campaign_type)
    if value_min is not None: query = query.gte("opportunity_value", value_min)
    if value_max is not None: query = query.lte("opportunity_value", value_max)
    if created_after:   query = query.gte("created_at", created_after.isoformat())
    if created_before:  query = query.lte("created_at", created_before.isoformat())
    if updated_after:   query = query.gte("updated_at", updated_after.isoformat())
    if updated_before:  query = query.lte("updated_at", updated_before.isoformat())
    if contacted_after:  query = query.gte("last_contacted_at", contacted_after.isoformat())
    if contacted_before: query = query.lte("last_contacted_at", contacted_before.isoformat())
    if won_after:   query = query.gte("won_at", won_after.isoformat())
    if won_before:  query = query.lte("won_at", won_before.isoformat())
    if lost_after:  query = query.gte("lost_at", lost_after.isoformat())
    if lost_before: query = query.lte("lost_at", lost_before.isoformat())

    allowed_sort = {"created_at", "updated_at", "last_contacted_at", "opportunity_value", "business_name"}
    sort_field = sort_by if sort_by in allowed_sort else "created_at"
    query = query.order(sort_field, desc=(sort_dir == "desc"))
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    leads = result.data

    if search:
        s = search.lower()
        leads = [l for l in leads if
            s in (l.get("business_name") or "").lower() or
            s in (l.get("city") or "").lower() or
            s in (l.get("address") or "").lower() or
            s in (l.get("notes") or "").lower()
        ]

    if tag:
        leads = [l for l in leads if tag in (l.get("tags") or [])]

    return leads


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("leads").select("*").eq("id", str(lead_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result.data


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: UUID, data: LeadUpdate, token: TokenData = Depends(require_caller)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = db.table("leads").update(serialize(payload)).eq("id", str(lead_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result.data[0]


@router.post("/{lead_id}/status", response_model=LeadOut)
def update_lead_status(lead_id: UUID, data: LeadStatusUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    current = db.table("leads").select("status").eq("id", str(lead_id)).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_payload = {"status": data.status.value}
    if data.status.value == "confirmed":
        update_payload["won_at"] = datetime.utcnow().isoformat()
    elif data.status.value == "dead":
        update_payload["lost_at"] = datetime.utcnow().isoformat()

    result = db.table("leads").update(update_payload).eq("id", str(lead_id)).execute()

    db.table("lead_status_history").insert({
        "lead_id": str(lead_id),
        "from_status": current.data["status"],
        "to_status": data.status.value,
        "changed_by": token.user_id,
        "notes": data.notes,
    }).execute()

    return result.data[0]


@router.get("/{lead_id}/history")
def get_lead_history(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("lead_status_history").select("*").eq("lead_id", str(lead_id)).order("changed_at", desc=True).execute()
    return result.data


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: UUID, token: TokenData = Depends(require_caller)):
    db = get_db()
    db.table("leads").delete().eq("id", str(lead_id)).execute()
