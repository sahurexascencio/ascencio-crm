from supabase import create_client, Client
from app.config import settings
import threading

_client = None
_lock = threading.Lock()

def get_db() -> Client:
    """Return a cached Supabase client — recreate only if connection is stale."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                url = settings.supabase_url
                key = settings.supabase_service_key or settings.supabase_key
                _client = create_client(url, key)
    return _client

def reset_db():
    """Force reconnect — call this if you get connection errors."""
    global _client
    with _lock:
        _client = None
