from fastapi import APIRouter, Depends
from app.db import get_db
from app.middleware.auth import decode_token, TokenData

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
def list_users(token: TokenData = Depends(decode_token)):
    db = get_db()
    result = db.table("users").select("id, name, email, role").order("name").execute()
    return result.data
