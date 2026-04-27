"""
Scanner router: anomaly signals for Pro users.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
from scanners.anomaly_scanner import scan_anomalies

router = APIRouter(prefix="/api/v1/scanner", tags=["scanner"])


class AnomalySignalOut(BaseModel):
    id: int
    symbol: str
    base_asset: str
    category: str
    direction: str
    score: int
    volume_ratio: float
    oi_change_pct: float
    price_change_24h_pct: float
    price: float
    quote_volume_24h: float
    confidence: str
    details: Optional[str] = None
    triggered_at: str
    expires_at: str


class AnomalySettings(BaseModel):
    min_score: int = 8
    email_alerts: bool = False
    telegram_alerts: bool = False
    push_alerts: bool = False


from core.tiers import require_tier

_require_trader = require_tier("trader")


def _serialize_signal(row: dict) -> dict:
    """Convert asyncpg datetime fields to ISO strings for JSON response."""
    out = dict(row)
    for key in ("triggered_at", "expires_at", "created_at", "updated_at"):
        val = out.get(key)
        if val is not None:
            from datetime import datetime
            if isinstance(val, datetime):
                out[key] = val.isoformat()
    return out


@router.get("/anomalies", response_model=List[AnomalySignalOut])
async def get_anomalies(
    min_score: int = Query(8, ge=0, le=13),
    direction: Optional[str] = Query(None, pattern="^(LONG|SHORT)$"),
    confidence: Optional[str] = Query(None, pattern="^(high|medium|low)$"),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(_require_trader),
):
    """Get active anomaly signals (Pro only)."""
    db = get_db()
    conditions = ["expires_at > NOW()"]
    params: list = []

    if min_score is not None:
        params.append(min_score)
        conditions.append(f"score >= ${len(params)}")
    if direction:
        params.append(direction)
        conditions.append(f"direction = ${len(params)}")
    if confidence:
        params.append(confidence)
        conditions.append(f"confidence = ${len(params)}")
    if category:
        params.append(category)
        conditions.append(f"category = ${len(params)}")

    where_clause = " AND ".join(conditions)
    params.append(limit)

    rows = await db.query(
        f"""SELECT * FROM anomaly_signals
            WHERE {where_clause}
            ORDER BY score DESC, triggered_at DESC
            LIMIT ${len(params)}""",
        params,
    )
    return [_serialize_signal(r) for r in rows]


@router.get("/anomalies/history")
async def get_anomaly_history(
    symbol: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(_require_trader),
):
    """Get historical anomaly signals (including expired)."""
    db = get_db()
    if symbol:
        rows = await db.query(
            """SELECT * FROM anomaly_signals
               WHERE symbol = $1
               ORDER BY triggered_at DESC LIMIT $2""",
            [symbol, limit],
        )
    else:
        rows = await db.query(
            """SELECT * FROM anomaly_signals
               ORDER BY triggered_at DESC LIMIT $1""",
            [limit],
        )
    return [_serialize_signal(r) for r in rows]


@router.post("/scan-now")
async def trigger_scan(
    min_score: int = Query(8, ge=0, le=13),
    current_user: dict = Depends(_require_trader),
):
    """Manually trigger a scan (Pro only). Returns found signals without persisting."""
    signals = await scan_anomalies(min_score=min_score)
    return {"count": len(signals), "signals": signals}


@router.get("/status")
async def scanner_status(current_user: dict = Depends(_require_trader)):
    """Get scanner run status (last scan time, counts)."""
    db = get_db()
    last_run = await db.query(
        "SELECT * FROM scanner_run_logs ORDER BY run_at DESC LIMIT 1",
        [],
    )
    runs_24h = await db.query(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(anomalies_found), 0) as total_found FROM scanner_run_logs WHERE run_at > NOW() - INTERVAL '24 hours'",
        [],
    )
    return {
        "last_run": _serialize_signal(last_run[0]) if last_run else None,
        "runs_24h": runs_24h[0]["cnt"] if runs_24h else 0,
        "anomalies_24h": int(runs_24h[0]["total_found"]) if runs_24h else 0,
        "is_active": True,
    }


@router.get("/settings")
async def get_scanner_settings(current_user: dict = Depends(_require_trader)):
    """Get user's scanner alert settings."""
    db = get_db()
    rows = await db.query(
        "SELECT * FROM user_scanner_settings WHERE user_id = $1",
        [current_user["id"]],
    )
    if rows:
        return dict(rows[0])
    return {
        "user_id": current_user["id"],
        "min_score": 8,
        "email_alerts": False,
        "telegram_alerts": False,
        "push_alerts": False,
    }


@router.patch("/settings")
async def update_scanner_settings(
    settings: AnomalySettings,
    current_user: dict = Depends(_require_trader),
):
    """Update user's scanner alert settings."""
    db = get_db()
    await db.execute(
        """INSERT INTO user_scanner_settings
           (user_id, min_score, email_alerts, telegram_alerts, push_alerts, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             min_score = EXCLUDED.min_score,
             email_alerts = EXCLUDED.email_alerts,
             telegram_alerts = EXCLUDED.telegram_alerts,
             push_alerts = EXCLUDED.push_alerts,
             updated_at = NOW()""",
        [
            current_user["id"],
            settings.min_score,
            settings.email_alerts,
            settings.telegram_alerts,
            settings.push_alerts,
        ],
    )
    return {"message": "Settings updated"}
