"""
Macro correlations router: SPX500, Gold, VIX vs BTC.
Open to all users (not Pro-restricted for now).
"""
from typing import Optional
from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/api/v1/macro", tags=["macro"])


@router.get("/assets")
async def list_macro_assets():
    db = get_db()
    rows = await db.query("SELECT * FROM macro_assets WHERE is_active = TRUE ORDER BY id", [])
    return [dict(r) for r in rows]


@router.get("/prices/{asset_key}")
async def get_macro_prices(asset_key: str, limit: int = 90):
    db = get_db()
    asset = await db.query("SELECT id FROM macro_assets WHERE key = $1 LIMIT 1", [asset_key])
    if not asset:
        return {"error": "Asset not found"}
    rows = await db.query(
        """SELECT time, close_price, volume FROM macro_prices
           WHERE asset_id = $1 ORDER BY time DESC LIMIT $2""",
        [asset[0]["id"], limit],
    )
    return [dict(r) for r in rows]


@router.get("/correlations")
async def get_correlations(limit: int = 90):
    db = get_db()
    rows = await db.query(
        """SELECT * FROM macro_correlations ORDER BY date DESC LIMIT $1""",
        [limit],
    )
    return [dict(r) for r in rows]


@router.get("/latest")
async def get_latest_macro():
    db = get_db()
    corr = await db.query("SELECT * FROM macro_correlations ORDER BY date DESC LIMIT 1", [])
    assets = await db.query("SELECT key, name FROM macro_assets WHERE is_active = TRUE", [])
    prices = {}
    for a in assets:
        row = await db.query(
            """SELECT close_price, time FROM macro_prices
               WHERE asset_id = (SELECT id FROM macro_assets WHERE key = $1)
               ORDER BY time DESC LIMIT 1""",
            [a["key"]],
        )
        if row:
            prices[a["key"]] = {
                "price": row[0]["close_price"],
                "time": row[0]["time"],
            }
    return {
        "correlation": dict(corr[0]) if corr else None,
        "prices": prices,
    }
