import time
from typing import Optional, Tuple
from supabase import Client, create_client
from app.core.config import settings


_anon_client: Optional[Client] = None
_admin_client: Optional[Client] = None


def get_supabase_anon_client() -> Client:
    """
    Get or initialize the shared anonymous Supabase client.
    Used for unauthenticated or public API queries.
    """
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY,
        )
    return _anon_client


def get_supabase_user_client(access_token: str) -> Client:
    """
    Create a Supabase client authenticated on behalf of a specific user.
    Applies the user's Bearer JWT to PostgREST queries, strictly enforcing Supabase RLS.
    """
    client = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_ANON_KEY,
    )
    if access_token:
        client.postgrest.auth(access_token)
    return client


def get_supabase_admin_client() -> Client:
    """
    Get or initialize the elevated Supabase client with service-role privileges.
    
    WARNING: Bypasses Row Level Security (RLS).
    MUST ONLY be used for trusted server-side system maintenance and background tasks.
    NEVER use this client directly for end-user requests or expose it to clients.
    """
    global _admin_client
    if not settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY == "your-supabase-service-role-key-here":
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured on this server.")
    
    if _admin_client is None:
        _admin_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _admin_client


def ping_supabase_database() -> Tuple[bool, str, Optional[float]]:
    """
    Execute a connectivity health check against Supabase PostgREST / PostgreSQL.
    
    Returns:
        (is_healthy: bool, details: str, latency_ms: Optional[float])
    """
    start_time = time.perf_counter()
    try:
        # Prefer service client if configured; otherwise use anon client
        if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_SERVICE_ROLE_KEY != "your-supabase-service-role-key-here":
            client = get_supabase_admin_client()
        else:
            client = get_supabase_anon_client()

        # Query user_profiles limit 1 as a lightweight health check ping
        response = client.table("user_profiles").select("id").limit(1).execute()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return True, "Supabase PostgreSQL connection operational", latency_ms
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return False, f"Database connectivity check failed: {str(exc)}", latency_ms
