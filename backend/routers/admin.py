"""
Admin router for user management
"""
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("subscription_tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    """List all users with basic info"""
    db = get_db()
    users = await db.query(
        "SELECT id, email, username, subscription_tier, is_active, created_at FROM users ORDER BY id DESC",
        []
    )
    return {"users": [dict(u) for u in users]}


@router.patch("/users/{user_id}")
async def update_user(user_id: int, updates: dict, admin: dict = Depends(require_admin)):
    """Update user fields (subscription_tier, is_active, username)"""
    allowed_fields = ["subscription_tier", "is_active", "username"]
    user_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not user_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Prevent removing your own admin access accidentally
    if user_id == admin["id"] and user_updates.get("subscription_tier") != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    db = get_db()
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(user_updates.keys()))
    await db.execute(
        f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = $1",
        [user_id] + list(user_updates.values())
    )
    
    return {"message": "User updated"}
