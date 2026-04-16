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


@router.get("/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    """Dashboard stats for admin panel"""
    db = get_db()
    
    total = await db.query("SELECT COUNT(*) as c FROM users", [])
    pro = await db.query("SELECT COUNT(*) as c FROM users WHERE subscription_tier = 'pro'", [])
    free = await db.query("SELECT COUNT(*) as c FROM users WHERE subscription_tier = 'free'", [])
    new_7d = await db.query("SELECT COUNT(*) as c FROM users WHERE created_at > NOW() - INTERVAL '7 days'", [])
    
    registrations = await db.query(
        """SELECT DATE(created_at) as date, COUNT(*) as count
           FROM users
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at)
           ORDER BY date ASC""",
        []
    )
    
    # Fill missing days with 0
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    dates = {str((today - timedelta(days=i))): 0 for i in range(29, -1, -1)}
    for r in registrations:
        dates[str(r["date"])] = r["count"]
    
    registrations_by_day = [
        {"date": d, "count": c}
        for d, c in sorted(dates.items())
    ]
    
    return {
        "total_users": total[0]["c"] if total else 0,
        "pro_users": pro[0]["c"] if pro else 0,
        "free_users": free[0]["c"] if free else 0,
        "new_users_7d": new_7d[0]["c"] if new_7d else 0,
        "registrations_by_day": registrations_by_day,
    }


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
