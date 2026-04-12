from supabase import create_client, Client
from app.config import settings


def get_db() -> Client:
    """Create a fresh Supabase client per request — avoids HTTP/2 connection drops."""
    url = settings.supabase_url
    key = settings.supabase_service_key or settings.supabase_key
    return create_client(url, key)