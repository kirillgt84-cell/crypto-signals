"""
Macro correlations router: SPX500, Gold, VIX vs BTC.
Open to all users (not Pro-restricted for now).
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter
from database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/macro", tags=["macro"])


async def _get_macro_map(db, asset_id: int, cutoff: datetime) -> Dict[str, float]:
    if not asset_id:
        return {}
    rows = await db.query(
        """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, close_price
           FROM macro_prices WHERE asset_id = $1 AND time > $2
           ORDER BY DATE(time), time DESC""",
        [asset_id, cutoff],
    )
    return {str(r["day"]): float(r["close_price"]) for r in rows}


async def _compute_monthly_correlations_fallback(db, limit: int = 60) -> List[Dict[str, Any]]:
    """Compute monthly correlations from macro_prices + oi_history when macro_correlations is empty."""
    import numpy as np
    from collections import defaultdict

    assets = await db.query("SELECT id, key FROM macro_assets WHERE key IN ('spx500', 'gold', 'vix')", [])
    asset_map = {a["key"]: a["id"] for a in assets}
    spx_id = asset_map.get("spx500")
    gold_id = asset_map.get("gold")
    vix_id = asset_map.get("vix")

    btc_rows = await db.query(
        """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, price
           FROM oi_history
           WHERE symbol = 'BTCUSDT' AND time > NOW() - INTERVAL '5 years'
           ORDER BY DATE(time), time DESC""",
        [],
    )
    if len(btc_rows) < 5:
        return []

    all_days = sorted([str(r["day"]) for r in btc_rows])
    btc_map = {str(r["day"]): r["price"] for r in btc_rows}

    spx_map = await _get_macro_map(db, spx_id, datetime.utcnow() - timedelta(days=1825))
    gold_map = await _get_macro_map(db, gold_id, datetime.utcnow() - timedelta(days=1825))
    vix_map = await _get_macro_map(db, vix_id, datetime.utcnow() - timedelta(days=1825))

    month_days = defaultdict(list)
    for day in all_days:
        month_days[day[:7]].append(day)

    result = []
    for month_str in sorted(month_days.keys())[-limit:]:
        days = month_days[month_str]
        end_day = max(days)
        end_idx = all_days.index(end_day)
        start_idx = max(0, end_idx - 29)
        window = all_days[start_idx:end_idx + 1]

        btc_vals = [btc_map[d] for d in window if d in btc_map]
        spx_vals = [spx_map[d] for d in window if d in spx_map]
        gold_vals = [gold_map[d] for d in window if d in gold_map]
        vix_vals = [vix_map[d] for d in window if d in vix_map]

        if len(btc_vals) < 5 or len(spx_vals) < 5 or len(gold_vals) < 5:
            continue

        btc_r = [(btc_vals[i] - btc_vals[i - 1]) / btc_vals[i - 1] for i in range(1, len(btc_vals)) if btc_vals[i - 1] != 0]
        spx_r = [(spx_vals[i] - spx_vals[i - 1]) / spx_vals[i - 1] for i in range(1, len(spx_vals)) if spx_vals[i - 1] != 0]
        gold_r = [(gold_vals[i] - gold_vals[i - 1]) / gold_vals[i - 1] for i in range(1, len(gold_vals)) if gold_vals[i - 1] != 0]
        vix_r = [(vix_vals[i] - vix_vals[i - 1]) / vix_vals[i - 1] for i in range(1, len(vix_vals)) if vix_vals[i - 1] != 0] if len(vix_vals) == len(btc_vals) else []

        btc_spx_corr = float(np.corrcoef(btc_r, spx_r)[0, 1]) if len(btc_r) == len(spx_r) and len(btc_r) > 2 else None
        gold_btc_corr = float(np.corrcoef(gold_r, btc_r)[0, 1]) if len(gold_r) == len(btc_r) and len(gold_r) > 2 else None
        vix_btc_corr = float(np.corrcoef(vix_r, btc_r)[0, 1]) if len(vix_r) == len(btc_r) and len(vix_r) > 2 else None

        vix_price = vix_map.get(end_day)

        result.append({
            "date": end_day,
            "btc_spx_correlation": btc_spx_corr,
            "gold_btc_correlation": gold_btc_corr,
            "vix_btc_correlation": vix_btc_corr,
            "vix_level": vix_price,
            "btc_price": btc_map.get(end_day),
            "spx_price": spx_map.get(end_day),
            "gold_price": gold_map.get(end_day),
        })

    return result


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
        # Fallback: compute from raw prices if table is empty
        if len(rows) < 2:
            rows = await _compute_monthly_correlations_fallback(db, limit)
    else:
        rows = await db.query(
            """SELECT * FROM macro_correlations ORDER BY date DESC LIMIT $1""",
            [limit],
        )
        if len(rows) < 2:
            fallback = await _compute_monthly_correlations_fallback(db, limit)
            rows = fallback[:limit]
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

    # M2 history from DB
    m2_rows = await db.query(
        """SELECT computed_at::date as date, value
           FROM fundamental_metrics
           WHERE symbol = 'GLOBAL' AND metric_name = 'm2'
           AND computed_at > $1
           ORDER BY computed_at ASC""",
        [cutoff]
    )

    # Fallback: if DB has sparse M2 history, fetch directly from FRED
    expected_weeks = days // 7
    if len(m2_rows) < expected_weeks * 0.5:
        try:
            from services.macro_pulse.fred_client import FREDClient
            client = FREDClient()
            fred_obs = await client.get_series_observations(
                "M2SL",
                start_date=cutoff.strftime("%Y-%m-%d"),
                limit=10000
            )
            fred_rows = []
            for obs in (fred_obs or []):
                val = obs.get("value")
                if val is not None and val != ".":
                    fred_rows.append({"date": obs.get("date"), "value": float(val)})
            # FRED returns desc; reverse to ascending
            fred_rows.reverse()
            m2_rows = fred_rows
        except Exception as e:
            logger.warning(f"M2 FRED fallback failed: {e}")

    dates = [str(r["date"]) for r in m2_rows]
    result = {
        "dates": dates,
        "series": {
            "m2": [float(r["value"]) for r in m2_rows]
        }
    }

    asset_keys = [k.strip().lower() for k in assets.split(",") if k.strip()]

    # BTC from oi_history, fallback to macro_prices
    if "btc" in asset_keys:
        btc_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, price as close_price
               FROM oi_history
               WHERE symbol = 'BTCUSDT' AND time > $1
               ORDER BY DATE(time), time DESC""",
            [cutoff]
        )
        if len(btc_rows) < 10:
            # Fallback to macro_prices if BTC is tracked there
            btc_asset = await db.query("SELECT id FROM macro_assets WHERE key = 'btc' LIMIT 1", [])
            if btc_asset:
                btc_rows = await db.query(
                    """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, close_price
                       FROM macro_prices WHERE asset_id = $1 AND time > $2
                       ORDER BY DATE(time), time DESC""",
                    [btc_asset[0]["id"], cutoff]
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
