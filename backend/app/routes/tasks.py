from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from app.db import get_db
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/tasks", tags=["tasks"])


def serialize(data: dict) -> dict:
    return {k: str(v) if isinstance(v, UUID) else v for k, v in data.items()}


class TaskCreate(BaseModel):
    lead_id: UUID
    title: str
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[UUID] = None
    completed: Optional[bool] = None


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = serialize(data.model_dump())
    payload["created_by"] = token.user_id
    result = db.table("tasks").insert(payload).execute()
    return result.data[0]


@router.get("/lead/{lead_id}")
def get_tasks_for_lead(lead_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("tasks").select("*").eq("lead_id", str(lead_id)).order("due_date").execute()
    return result.data


@router.get("/upcoming")
def get_upcoming_tasks(token: TokenData = Depends(decode_token)):
    db = get_db()
    now = datetime.utcnow().isoformat()
    result = db.table("tasks").select("*").eq("completed", False).gte("due_date", now).order("due_date").limit(20).execute()
    return result.data


@router.patch("/{task_id}")
def update_task(task_id: UUID, data: TaskUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if payload.get("completed"):
        payload["completed_at"] = datetime.utcnow().isoformat()
    result = db.table("tasks").update(serialize(payload)).eq("id", str(task_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    db.table("tasks").delete().eq("id", str(task_id)).execute()
