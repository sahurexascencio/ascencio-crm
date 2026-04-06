from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.db import get_db
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    name: str
    type: str  # sms, email, whatsapp
    subject: Optional[str] = None
    body: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


@router.get("/")
def list_templates(type: Optional[str] = None, token: TokenData = Depends(decode_token)):
    db = get_db()
    query = db.table("templates").select("*")
    if type:
        query = query.eq("type", type)
    result = query.order("name").execute()
    return result.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_template(data: TemplateCreate, token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("templates").insert({
        **data.model_dump(),
        "created_by": token.user_id,
    }).execute()
    return result.data[0]


@router.patch("/{template_id}")
def update_template(template_id: UUID, data: TemplateUpdate, token: TokenData = Depends(decode_token)):
    db = get_db()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = db.table("templates").update(payload).eq("id", str(template_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: UUID, token: TokenData = Depends(decode_token)):
    db = get_db()
    db.table("templates").delete().eq("id", str(template_id)).execute()
