"""
Macro correlations router: SPX500, Gold, VIX vs BTC.
Open to all users (not Pro-restricted for now).
"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/api/v1/macro", tags=["macro"])


@router.get("/assets")
async def list_macro_assets():
    db = get_db()
    rows = await db.query("SELECT * FROM macro_assets WHERE is_active = TRUE ORDER BY id", [])
    return [dict(r) for r in rows]


@router.get("/prices/{asset_key}")
async def get_macro_prices(asset_key: str, limit: int = 90, interval: str = "daily"):
    db = get_db()
    asset = await db.query("SELECT id FROM macro_assets WHERE key = $1 LIMIT 1", [asset_key])
    if not asset:
        return {"error": "Asset not found"}

    if interval == "monthly":
        rows = await db.query(
            """SELECT DISTINCT ON (DATE_TRUNC('month', time))
                      time as month,
                      time,
                      close_price,
                      volume
               FROM macro_prices
               WHERE asset_id = $1
               ORDER BY DATE_TRUNC('month', time), time DESC
               LIMIT $2""",
            [asset[0]["id"], limit],
        )
    else:
        rows = await db.query(
            """SELECT time, close_price, volume FROM macro_prices
               WHERE asset_id = $1 ORDER BY time DESC LIMIT $2""",
            [asset[0]["id"], limit],
        )
    return [dict(r) for r in rows]


@router.get("/correlations")
async def get_correlations(limit: int = 90, interval: str = "daily"):
    db = get_db()
    if interval == "monthly":
        rows = await db.query(
            """SELECT DISTINCT ON (DATE_TRUNC('month', date))
                      date as month,
                      date,
                      btc_spx_correlation,
                      gold_btc_correlation,
                      vix_btc_correlation,
                      vix_level,
                      btc_price,
                      spx_price,
                      gold_price,
                      calculated_at
               FROM macro_correlations
               ORDER BY DATE_TRUNC('month', date), date DESC
               LIMIT $1""",
            [limit],
        )
    else:
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


@router.get("/m2-comparison")
async def get_m2_comparison(assets: str = "btc,spx,gold", days: int = 365):
    """Get M2 Global Liquidity history aligned with selected asset prices for chart overlay.
    Assets: comma-separated list of keys (btc, spx, gold, vix). M2 is always included."""
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(days=days)

    # M2 history
    m2_rows = await db.query(
        """SELECT computed_at::date as date, value
           FROM fundamental_metrics
           WHERE symbol = 'GLOBAL' AND metric_name = 'm2'
           AND computed_at > $1
           ORDER BY computed_at ASC""",
        [cutoff]
    )

    dates = [str(r["date"]) for r in m2_rows]
    result = {
        "dates": dates,
        "series": {
            "m2": [float(r["value"]) for r in m2_rows]
        }
    }

    asset_keys = [k.strip().lower() for k in assets.split(",") if k.strip()]

    # BTC from oi_history
    if "btc" in asset_keys:
        btc_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, price as close_price
               FROM oi_history
               WHERE symbol = 'BTCUSDT' AND time > $1
               ORDER BY DATE(time), time DESC""",
            [cutoff]
        )
        btc_map = {str(r["date"]): float(r["close_price"]) for r in btc_rows}
        result["series"]["btc"] = [btc_map.get(d) for d in dates]

    # Other assets from macro_prices
    for key in asset_keys:
        if key in ("btc", "m2"):
            continue

        asset = await db.query("SELECT id FROM macro_assets WHERE key = $1 LIMIT 1", [key])
        if not asset:
            continue

        rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, close_price
               FROM macro_prices WHERE asset_id = $1 AND time > $2
               ORDER BY DATE(time), time DESC""",
            [asset[0]["id"], cutoff]
        )
        price_map = {str(r["date"]): float(r["close_price"]) for r in rows}
        result["series"][key] = [price_map.get(d) for d in dates]

    return result
