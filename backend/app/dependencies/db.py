from typing import Optional
from fastapi import Depends
from supabase import Client
from app.dependencies.auth import get_current_active_user
from app.schemas.user import UserContext
from app.services.supabase import get_supabase_admin_client, get_supabase_user_client


def get_user_db(current_user: UserContext = Depends(get_current_active_user)) -> Client:
    """
    Returns a Supabase client authenticated on behalf of the requesting user.
    PostgREST carries the user's JWT Bearer token, strictly enforcing Row Level Security (RLS).
    """
    return get_supabase_user_client(current_user.access_token)


def get_admin_db() -> Optional[Client]:
    """
    Returns the elevated Supabase service-role client, or None if not configured.
    WARNING: Bypasses RLS. Restricted to trusted internal background operations.
    """
    try:
        return get_supabase_admin_client()
    except Exception:
        return None
