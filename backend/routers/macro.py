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
    return {str(r["day"]): float(r["close_price"]) for r in rows if r["close_price"] is not None}


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
        # Fallback 1: macro_prices if BTC is tracked there
        btc_asset = await db.query("SELECT id FROM macro_assets WHERE key = 'btc' LIMIT 1", [])
        if btc_asset:
            btc_rows = await db.query(
                """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, close_price as price
                   FROM macro_prices WHERE asset_id = $1 AND time > NOW() - INTERVAL '5 years'
                   ORDER BY DATE(time), time DESC""",
                [btc_asset[0]["id"]],
            )
    if len(btc_rows) < 5:
        # Fallback 2: Binance spot API
        binance_rows = await _fetch_btc_from_binance(datetime.utcnow() - timedelta(days=1825))
        btc_rows = [{"day": r["date"], "price": r["close_price"]} for r in binance_rows]
    if len(btc_rows) < 5:
        # Fallback 3: CoinGecko
        cg_rows = await _fetch_from_coingecko("bitcoin", days=1825)
        btc_rows = [{"day": r["date"], "price": r["close_price"]} for r in cg_rows]
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

        # Build aligned day-by-day series so returns match the same dates
        aligned_btc_spx = []
        aligned_gold_btc = []
        aligned_vix_btc = []
        for d in window:
            if d in btc_map:
                if d in spx_map:
                    aligned_btc_spx.append((btc_map[d], spx_map[d]))
                if d in gold_map:
                    aligned_gold_btc.append((gold_map[d], btc_map[d]))
                if d in vix_map:
                    aligned_vix_btc.append((vix_map[d], btc_map[d]))

        def _calc_corr(pairs: list) -> Optional[float]:
            if len(pairs) < 5:
                return None
            a = [p[0] for p in pairs]
            b = [p[1] for p in pairs]
            a_r = [(a[i] - a[i - 1]) / a[i - 1] for i in range(1, len(a)) if a[i - 1] != 0]
            b_r = [(b[i] - b[i - 1]) / b[i - 1] for i in range(1, len(b)) if b[i - 1] != 0]
            if len(a_r) != len(b_r) or len(a_r) < 2:
                return None
            return float(np.corrcoef(a_r, b_r)[0, 1])

        btc_spx_corr = _calc_corr(aligned_btc_spx)
        gold_btc_corr = _calc_corr(aligned_gold_btc)
        vix_btc_corr = _calc_corr(aligned_vix_btc)

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
               ORDER BY DATE_TRUNC('month', date) DESC, date DESC
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


async def _fetch_btc_from_binance(cutoff: datetime) -> list:
    """Fetch BTC daily closes from Binance spot API as fallback."""
    import httpx
    start_ms = int(cutoff.timestamp() * 1000)
    end_ms = int(datetime.utcnow().timestamp() * 1000)
    all_candles = []
    current_start = start_ms
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            while current_start < end_ms:
                resp = await client.get(
                    "https://api.binance.com/api/v3/klines",
                    params={
                        "symbol": "BTCUSDT",
                        "interval": "1d",
                        "startTime": current_start,
                        "limit": 1000,
                    }
                )
                candles = resp.json()
                if not isinstance(candles, list) or len(candles) == 0:
                    break
                all_candles.extend(candles)
                current_start = candles[-1][0] + 1
        results = []
        for c in all_candles:
            dt = datetime.utcfromtimestamp(c[0] / 1000).strftime("%Y-%m-%d")
            results.append({"date": dt, "close_price": float(c[4])})
        return results
    except Exception as e:
        logger.warning(f"Binance BTC fallback failed: {e}")
        return []


async def _fetch_from_coingecko(coin_id: str, days: int = 365) -> list:
    """Fetch daily closes from CoinGecko as fallback."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart",
                params={"vs_currency": "usd", "days": str(days)}
            )
            data = resp.json()
            prices = data.get("prices", [])
            from collections import defaultdict
            day_prices = defaultdict(list)
            for ts_ms, price in prices:
                dt = datetime.utcfromtimestamp(ts_ms / 1000).strftime("%Y-%m-%d")
                day_prices[dt].append(float(price))
            results = []
            for dt in sorted(day_prices.keys()):
                results.append({"date": dt, "close_price": day_prices[dt][-1]})
            return results
    except Exception as e:
        logger.warning(f"CoinGecko fallback failed for {coin_id}: {e}")
        return []


@router.get("/m2-comparison")
async def get_m2_comparison(assets: str = "btc", days: int = 365):
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
                if val and val != ".":
                    fred_rows.append({"date": obs.get("date"), "value": float(val)})
            # FRED returns desc; reverse to ascending
            fred_rows.reverse()
            m2_rows = fred_rows
        except Exception as e:
            logger.warning(f"M2 FRED fallback failed: {e}")

    dates = [str(r["date"]) for r in m2_rows if r["value"] is not None]
    result = {
        "dates": dates,
        "series": {
            "m2": [float(r["value"]) for r in m2_rows if r["value"] is not None]
        }
    }

    asset_keys = [k.strip().lower() for k in assets.split(",") if k.strip()]

    # BTC from oi_history, fallback to macro_prices, then Binance API
    if "btc" in asset_keys:
        btc_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, price as close_price
               FROM oi_history
               WHERE symbol = 'BTCUSDT' AND time > $1
               ORDER BY DATE(time), time DESC""",
            [cutoff]
        )
        if len(btc_rows) < 10:
            # Fallback 1: macro_prices if BTC is tracked there
            btc_asset = await db.query("SELECT id FROM macro_assets WHERE key = 'btc' LIMIT 1", [])
            if btc_asset:
                btc_rows = await db.query(
                    """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, close_price
                       FROM macro_prices WHERE asset_id = $1 AND time > $2
                       ORDER BY DATE(time), time DESC""",
                    [btc_asset[0]["id"], cutoff]
                )
        if len(btc_rows) < 10:
            # Fallback 2: Binance API
            btc_rows = await _fetch_btc_from_binance(cutoff)
        if len(btc_rows) < 10:
            # Fallback 3: CoinGecko
            btc_rows = await _fetch_from_coingecko("bitcoin", days=days)
        btc_map = {str(r["date"]): float(r["close_price"]) for r in btc_rows if r["close_price"] is not None}

        # If M2 dates empty but BTC has data, use BTC dates as primary
        if not dates and btc_map:
            dates = sorted(btc_map.keys())
            result["dates"] = dates
            result["series"]["m2"] = [None] * len(dates)

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
        price_map = {str(r["date"]): float(r["close_price"]) for r in rows if r["close_price"] is not None}
        result["series"][key] = [price_map.get(d) for d in dates]

    return result
