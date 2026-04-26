"""
Promo code router for partner/affiliate trial activations.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Body
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/promo", tags=["promo"])


class PromoActivateRequest(BaseModel):
    code: str


async def _ensure_promo_tables(db):
    """Self-healing: ensure promo tables exist."""
    await db.execute("""
        CREATE TABLE IF NOT EXISTS promo_codes (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            partner_name VARCHAR(100),
            max_uses INTEGER DEFAULT NULL,
            current_uses INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            trial_days INTEGER DEFAULT 7,
            trial_tier VARCHAR(20) DEFAULT 'pro',
            discount_percent INTEGER DEFAULT 0,
            discount_applies_to VARCHAR(20) DEFAULT NULL,
            is_referral_linked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_codes_partner ON promo_codes(partner_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_until)")

    await db.execute("""
        CREATE TABLE IF NOT EXISTS promo_code_activations (
            id SERIAL PRIMARY KEY,
            promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            converted_to_tier VARCHAR(20) DEFAULT NULL,
            converted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            ip_address INET,
            user_agent TEXT,
            UNIQUE(user_id)
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_activations_user ON promo_code_activations(user_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_activations_code ON promo_code_activations(promo_code_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_promo_activations_status ON promo_code_activations(status, expires_at)")

    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMP DEFAULT NULL")
    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP DEFAULT NULL")
    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_source VARCHAR(50) DEFAULT NULL")


async def validate_promo_code(code: str, user_id: int) -> dict:
    """Check if a promo code is valid for a given user."""
    db = get_db()
    await _ensure_promo_tables(db)

    promo_rows = await db.query(
        "SELECT * FROM promo_codes WHERE code = $1 LIMIT 1",
        [code.upper().strip()]
    )
    if not promo_rows:
        return {"valid": False, "error": "PROMO_NOT_FOUND"}

    promo = promo_rows[0]

    if not promo.get("is_active"):
        return {"valid": False, "error": "PROMO_INACTIVE"}

    valid_until = promo.get("valid_until")
    if valid_until and valid_until < datetime.utcnow():
        return {"valid": False, "error": "PROMO_EXPIRED"}

    max_uses = promo.get("max_uses")
    current_uses = promo.get("current_uses", 0)
    if max_uses is not None and current_uses >= max_uses:
        return {"valid": False, "error": "PROMO_LIMIT_REACHED"}

    # Check if user already has any active promo activation
    existing = await db.query(
        "SELECT id FROM promo_code_activations WHERE user_id = $1 AND status = 'active' LIMIT 1",
        [user_id]
    )
    if existing:
        return {"valid": False, "error": "USER_ALREADY_HAS_ACTIVE_PROMO"}

    # Check if user already used a referral (mutual exclusion with referral)
    referral = await db.query(
        "SELECT referred_by_code FROM users WHERE id = $1 AND referred_by_code IS NOT NULL LIMIT 1",
        [user_id]
    )
    if referral:
        return {"valid": False, "error": "USER_ALREADY_HAS_REFERRAL"}

    return {
        "valid": True,
        "promo": promo,
        "trial_days": promo.get("trial_days", 7),
        "trial_tier": promo.get("trial_tier", "pro"),
    }


@router.post("/activate")
async def activate_promo(
    req: PromoActivateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Activate a promo code for the current user."""
    db = get_db()
    await _ensure_promo_tables(db)

    validation = await validate_promo_code(req.code, current_user["id"])
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=validation["error"])

    promo = validation["promo"]
    expires_at = datetime.utcnow() + timedelta(days=validation["trial_days"])

    # Get client info
    ip_address = None
    user_agent = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip_address = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
        user_agent = request.headers.get("User-Agent")

    # Create activation
    await db.execute(
        """INSERT INTO promo_code_activations
           (promo_code_id, user_id, expires_at, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5)""",
        [promo["id"], current_user["id"], expires_at, ip_address, user_agent]
    )

    # Update usage counter
    await db.execute(
        "UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1",
        [promo["id"]]
    )

    # Update user with temporary tier
    await db.execute(
        """UPDATE users
           SET subscription_tier = $1,
               trial_activated_at = NOW(),
               trial_expires_at = $2,
               trial_source = 'promo_code'
           WHERE id = $3""",
        [validation["trial_tier"], expires_at, current_user["id"]]
    )

    # Optional: link to referral if configured
    if promo.get("is_referral_linked") and promo.get("partner_id"):
        # Create a synthetic referral connection for commission tracking
        try:
            await db.execute(
                """INSERT INTO referrals (referrer_code_id, referred_user_id, status, joined_at)
                   SELECT rc.id, $1, 'registered', NOW()
                   FROM referral_codes rc
                   WHERE rc.user_id = $2
                   ON CONFLICT (referred_user_id) DO NOTHING""",
                [current_user["id"], promo["partner_id"]]
            )
        except Exception as e:
            logger.warning(f"Failed to link promo to referral: {e}")

    return {
        "success": True,
        "message": f"Промокод активирован. Доступ к {validation['trial_tier']} на {validation['trial_days']} дней.",
        "tier": validation["trial_tier"],
        "expires_at": expires_at.isoformat(),
    }


@router.get("/validate/{code}")
async def check_promo_code(code: str):
    """Public endpoint to validate a promo code before registration."""
    db = get_db()
    await _ensure_promo_tables(db)

    rows = await db.query(
        "SELECT * FROM promo_codes WHERE code = $1 AND is_active = TRUE LIMIT 1",
        [code.upper().strip()]
    )
    if not rows:
        return {"valid": False}

    promo = rows[0]

    valid_until = promo.get("valid_until")
    if valid_until and valid_until < datetime.utcnow():
        return {"valid": False}

    max_uses = promo.get("max_uses")
    current_uses = promo.get("current_uses", 0)
    if max_uses is not None and current_uses >= max_uses:
        return {"valid": False}

    return {
        "valid": True,
        "trial_days": promo.get("trial_days", 7),
        "trial_tier": promo.get("trial_tier", "pro"),
        "partner_name": promo.get("partner_name"),
        "discount_percent": promo.get("discount_percent", 0),
    }


@router.get("/stats")
async def get_partner_stats(current_user: dict = Depends(get_current_user)):
    """Dashboard stats for partners (users who own promo codes)."""
    db = get_db()
    await _ensure_promo_tables(db)

    stats = await db.query(
        """SELECT
            pc.id,
            pc.code,
            pc.description,
            pc.max_uses,
            pc.current_uses,
            pc.is_active,
            pc.valid_until,
            pc.created_at,
            pc.trial_days,
            pc.trial_tier,
            pc.discount_percent,
            COUNT(DISTINCT pa.user_id) as total_activations,
            COUNT(DISTINCT CASE WHEN pa.status = 'active' THEN pa.user_id END) as active_trials,
            COUNT(DISTINCT CASE WHEN pa.status = 'converted' THEN pa.user_id END) as conversions,
            COUNT(DISTINCT CASE WHEN pa.status = 'expired' THEN pa.user_id END) as expired
        FROM promo_codes pc
        LEFT JOIN promo_code_activations pa ON pc.id = pa.promo_code_id
        WHERE pc.partner_id = $1
        GROUP BY pc.id
        ORDER BY pc.created_at DESC""",
        [current_user["id"]]
    )

    return {"promo_codes": [dict(s) for s in stats]}


@router.get("/me")
async def get_my_promo_status(current_user: dict = Depends(get_current_user)):
    """Get current user's promo activation status."""
    db = get_db()
    await _ensure_promo_tables(db)

    rows = await db.query(
        """SELECT pa.*, pc.code, pc.partner_name, pc.trial_tier
           FROM promo_code_activations pa
           JOIN promo_codes pc ON pa.promo_code_id = pc.id
           WHERE pa.user_id = $1
           ORDER BY pa.activated_at DESC LIMIT 1""",
        [current_user["id"]]
    )

    if not rows:
        return {"has_promo": False}

    activation = rows[0]
    now = datetime.utcnow()
    is_active = activation.get("status") == "active" and activation.get("expires_at") > now

    return {
        "has_promo": True,
        "status": activation.get("status"),
        "is_active": is_active,
        "tier": activation.get("trial_tier"),
        "expires_at": activation.get("expires_at").isoformat() if activation.get("expires_at") else None,
        "code": activation.get("code"),
        "partner_name": activation.get("partner_name"),
    }
