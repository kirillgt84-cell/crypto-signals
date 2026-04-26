"""
Partner / Referral program router.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
import logging
import secrets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/partner", tags=["partner"])


async def _ensure_referral_tables(db):
    """Auto-create referral tables if they don't exist (self-healing for new deployments)."""
    await db.execute("""
        CREATE TABLE IF NOT EXISTS referral_codes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code VARCHAR(20) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW(),
            total_referrals INTEGER DEFAULT 0,
            active_referrals INTEGER DEFAULT 0,
            total_earned DECIMAL(10,2) DEFAULT 0.00,
            available_balance DECIMAL(10,2) DEFAULT 0.00,
            withdrawn_balance DECIMAL(10,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT TRUE
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id)")

    await db.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id SERIAL PRIMARY KEY,
            referrer_code_id INTEGER NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
            referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'registered',
            joined_at TIMESTAMP DEFAULT NOW(),
            converted_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            revenue_generated DECIMAL(10,2) DEFAULT 0.00,
            reward_earned DECIMAL(10,2) DEFAULT 0.00,
            UNIQUE(referred_user_id)
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_code_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(referred_user_id)")

    await db.execute("""
        CREATE TABLE IF NOT EXISTS referral_transactions (
            id SERIAL PRIMARY KEY,
            referral_code_id INTEGER REFERENCES referral_codes(id) ON DELETE CASCADE,
            referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES users(id),
            type VARCHAR(20) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            description TEXT,
            paypal_transaction_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    await db.execute("CREATE INDEX IF NOT EXISTS idx_ref_tx_code ON referral_transactions(referral_code_id)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_ref_tx_user ON referral_transactions(user_id)")

    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20)")
    await db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount_used BOOLEAN DEFAULT FALSE")


class GenerateCodeResponse(BaseModel):
    code: str
    referral_link: str


@router.post("/generate-code")
async def generate_referral_code(current_user: dict = Depends(get_current_user)):
    """Create a referral code for the current user."""
    db = get_db()
    await _ensure_referral_tables(db)

    existing = await db.query(
        "SELECT * FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )

    if existing:
        code = existing[0]["code"]
    else:
        username = current_user.get("username", "user")
        suffix = secrets.token_hex(3).upper()
        code = f"MIRKASO_{username}_{suffix}"
        code = code[:20]

        await db.execute(
            "INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)",
            [current_user["id"], code]
        )

    return {
        "code": code,
        "referral_link": f"https://mirkaso.com/?ref={code}",
    }


@router.get("/stats")
async def partner_stats(current_user: dict = Depends(get_current_user)):
    """Partner dashboard stats."""
    db = get_db()
    await _ensure_referral_tables(db)

    code_row = await db.query(
        "SELECT * FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )

    if not code_row:
        return {
            "code": None,
            "referral_link": None,
            "total_referrals": 0,
            "active_referrals": 0,
            "total_earned": 0.00,
            "available_balance": 0.00,
            "referrals": [],
            "transactions": [],
        }

    code = dict(code_row[0])

    refs = await db.query(
        """SELECT r.*, u.username, u.email
           FROM referrals r
           JOIN users u ON u.id = r.referred_user_id
           WHERE r.referrer_code_id = $1
           ORDER BY r.joined_at DESC""",
        [code["id"]]
    )

    txs = await db.query(
        """SELECT * FROM referral_transactions
           WHERE referral_code_id = $1
           ORDER BY created_at DESC LIMIT 50""",
        [code["id"]]
    )

    return {
        "code": code["code"],
        "referral_link": f"https://mirkaso.com/?ref={code['code']}",
        "total_referrals": code["total_referrals"],
        "active_referrals": code["active_referrals"],
        "total_earned": float(code["total_earned"] or 0),
        "available_balance": float(code["available_balance"] or 0),
        "referrals": [dict(r) for r in refs],
        "transactions": [dict(t) for t in txs],
    }


@router.get("/balance")
async def get_balance(current_user: dict = Depends(get_current_user)):
    """Current referral balance."""
    db = get_db()
    await _ensure_referral_tables(db)
    row = await db.query(
        "SELECT available_balance FROM referral_codes WHERE user_id = $1 LIMIT 1",
        [current_user["id"]]
    )
    return {"balance": float(row[0]["available_balance"] or 0) if row else 0.00}


@router.get("/check-eligibility")
async def check_referral_eligibility(current_user: dict = Depends(get_current_user)):
    """Check if current user can use referral discount."""
    db = get_db()
    await _ensure_referral_tables(db)
    user = await db.query(
        "SELECT referred_by_code, referral_discount_used FROM users WHERE id = $1",
        [current_user["id"]]
    )

    if not user:
        return {"eligible": False}

    eligible = (
        user[0]["referred_by_code"] is not None
        and not user[0]["referral_discount_used"]
    )

    return {
        "eligible": eligible,
        "code": user[0]["referred_by_code"] if eligible else None,
        "discount_percent": 20 if eligible else 0,
    }
