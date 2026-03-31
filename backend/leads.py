from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.models.lead import LeadCreate, LeadUpdate, LeadOut, LeadStatusUpdate, LeadStatus
from app.middleware.auth import decode_token, require_caller, TokenData
from app.services.scraper_service import trigger_scrape

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate,
    background_tasks: BackgroundTasks,
    token: TokenData = Depends(require_caller),
):
    db = get_db()
    payload = data.model_dump()
    if not payload.get("assigned_to"):
        payload["assigned_to"] = token.user_id

    result = db.table("leads").insert(payload).execute()
    lead = result.data[0]

    # Fire scrape in background immediately on creation
    background_tasks.add_task(trigger_scrape, lead["id"], lead.get("website_url"), lead["business_name"], lead["city"])

    return lead


@router.get("/", response_model=list[LeadOut])
def list_leads(
    status: Optional[LeadStatus] = None,
    assigned_to: Optional[UUID] = None,
    token: TokenData = Depends(decode_token),
):
    db = get_db()
    query = db.table("leads").select("*")

    if status:
        query = query.eq("status", status.value)
    if assigned_to:
        query = query.eq("assigned_to", str(assigned_to))

    # Callers only see their own leads
    if token.role == "caller":
        query = query.eq("assigned_to", token.user_id)

    result = query.order("created_at", desc=True).execute()
    return result.data


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
    result = db.table("leads").update(payload).eq("id", str(lead_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result.data[0]


@router.post("/{lead_id}/status", response_model=LeadOut)
def update_lead_status(
    lead_id: UUID,
    data: LeadStatusUpdate,
    token: TokenData = Depends(decode_token),
):
    """Move a lead between buckets. Logs the transition."""
    db = get_db()

    # Get current status for history log
    current = db.table("leads").select("status").eq("id", str(lead_id)).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = current.data["status"]

    # Update lead status
    result = db.table("leads").update({"status": data.status.value}).eq("id", str(lead_id)).execute()

    # Log status history
    db.table("lead_status_history").insert({
        "lead_id": str(lead_id),
        "from_status": old_status,
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
