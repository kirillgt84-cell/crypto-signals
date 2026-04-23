"""
Fundamental metrics router
MVRV, NUPL, Funding Rate, Composite Index
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, Any
import json
from database import get_db

def _parse_raw_data(raw_data: Any) -> dict:
    if isinstance(raw_data, str):
        try:
            return json.loads(raw_data)
        except Exception:
            return {}
    if isinstance(raw_data, dict):
        return raw_data
    return {}

router = APIRouter(prefix="/api/v1/fundamentals", tags=["fundamentals"])

@router.post("/trigger")
async def trigger_fundamentals_collection():
    """Manually trigger fundamentals collection"""
    try:
        import asyncio
        from daily_fundamentals import collect_fundamentals
        # Run with timeout to avoid Railway killing the request
        results = await asyncio.wait_for(collect_fundamentals(), timeout=25)
        return {"status": "ok", "message": "Fundamentals collection completed", "results": results}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Collection failed: {str(e)}\n{traceback.format_exc()}")

@router.get("/raw-check/{symbol}")
async def raw_check(symbol: str):
    """Debug endpoint: insert a test row and return it"""
    db = get_db()
    try:
        await db.execute(
            """INSERT INTO fundamental_metrics (symbol, metric_name, value, raw_data)
               VALUES ($1, 'mvrv', 1.5, '{\"test\": true}')
               ON CONFLICT (symbol, metric_name, computed_at) DO UPDATE
               SET value = EXCLUDED.value, raw_data = EXCLUDED.raw_data""",
            [symbol.upper()]
        )
        row = await db.query(
            "SELECT * FROM fundamental_metrics WHERE symbol = $1 AND metric_name = 'mvrv' ORDER BY computed_at DESC LIMIT 1",
            [symbol.upper()]
        )
        return {"inserted": True, "row": row[0] if row else None}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}\n{traceback.format_exc()}")

@router.get("/api-check")
async def api_check():
    """Debug endpoint: test external APIs from Railway"""
    import httpx
    results = {}
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get("https://bitcoin-data.com/api/v1/nupl/last", timeout=10)
            results["bgeometrics_nupl"] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text[:200]}
        except Exception as e:
            results["bgeometrics_nupl"] = {"error": str(e)}
        
        try:
            r = await client.get("https://bitcoin-data.com/api/v1/mvrv/last", timeout=10)
            results["bgeometrics_mvrv"] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text[:200]}
        except Exception as e:
            results["bgeometrics_mvrv"] = {"error": str(e)}
        
        try:
            r = await client.get("https://bitcoin-data.com/api/v1/sopr/last", timeout=10)
            results["bgeometrics_sopr"] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text[:200]}
        except Exception as e:
            results["bgeometrics_sopr"] = {"error": str(e)}
        
        try:
            r = await client.get("https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false", timeout=10)
            results["coingecko"] = {"status": r.status_code, "has_market_data": "market_data" in r.json() if r.status_code == 200 else False}
        except Exception as e:
            results["coingecko"] = {"error": str(e)}
        
        try:
            r = await client.get("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1", timeout=10)
            results["binance_funding"] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text[:200]}
        except Exception as e:
            results["binance_funding"] = {"error": str(e)}
        
        try:
            from services.macro_pulse.fred_client import FREDClient
            fred = FREDClient()
            obs = await fred.get_series_observations("M2SL", limit=1)
            results["fred_m2"] = {"status": 200 if obs else 404, "data": obs[0] if obs else None}
        except Exception as e:
            results["fred_m2"] = {"error": str(e)}
    return results

@router.get("/{symbol}/mvrv")
async def get_mvrv(symbol: str):
    """Get latest MVRV ratio for symbol"""
    db = get_db()
    row = await db.query(
        """SELECT value, raw_data, computed_at 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name = 'mvrv'
           ORDER BY computed_at DESC LIMIT 1""",
        [symbol.upper()]
    )
    if not row:
        raise HTTPException(status_code=404, detail="MVRV data not available yet")
    data = dict(row[0])
    data["raw_data"] = _parse_raw_data(data.get("raw_data"))
    return data

@router.get("/{symbol}/nupl")
async def get_nupl(symbol: str):
    """Get latest NUPL for symbol"""
    db = get_db()
    row = await db.query(
        """SELECT value, raw_data, computed_at 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name = 'nupl'
           ORDER BY computed_at DESC LIMIT 1""",
        [symbol.upper()]
    )
    if not row:
        raise HTTPException(status_code=404, detail="NUPL data not available yet")
    data = dict(row[0])
    data["raw_data"] = _parse_raw_data(data.get("raw_data"))
    return data

@router.get("/{symbol}/funding")
async def get_funding(symbol: str):
    """Get latest funding rate for symbol"""
    db = get_db()
    row = await db.query(
        """SELECT value, raw_data, computed_at 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name = 'funding_rate'
           ORDER BY computed_at DESC LIMIT 1""",
        [symbol.upper()]
    )
    if not row:
        raise HTTPException(status_code=404, detail="Funding rate data not available yet")
    data = dict(row[0])
    data["raw_data"] = _parse_raw_data(data.get("raw_data"))
    return data

@router.get("/{symbol}/sopr")
async def get_sopr(symbol: str):
    """Get latest SOPR (Spent Output Profit Ratio) for symbol"""
    db = get_db()
    row = await db.query(
        """SELECT value, raw_data, computed_at 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name = 'sopr'
           ORDER BY computed_at DESC LIMIT 1""",
        [symbol.upper()]
    )
    if not row:
        raise HTTPException(status_code=404, detail="SOPR data not available yet")
    data = dict(row[0])
    data["raw_data"] = _parse_raw_data(data.get("raw_data"))
    return data

@router.get("/{symbol}/m2")
async def get_m2(symbol: str):
    """Get latest M2 Global Liquidity from FRED"""
    db = get_db()
    row = await db.query(
        """SELECT value, raw_data, computed_at 
           FROM fundamental_metrics 
           WHERE symbol = 'GLOBAL' AND metric_name = 'm2'
           ORDER BY computed_at DESC LIMIT 1""",
        []
    )
    if not row:
        raise HTTPException(status_code=404, detail="M2 data not available yet")
    data = dict(row[0])
    data["raw_data"] = _parse_raw_data(data.get("raw_data"))
    return data


@router.get("/{symbol}/m2/history")
async def get_m2_history(symbol: str, days: int = 365):
    """Get M2 Global Liquidity history"""
    from datetime import datetime, timedelta
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = await db.query(
        """SELECT computed_at::date as date, value, raw_data
           FROM fundamental_metrics 
           WHERE symbol = 'GLOBAL' AND metric_name = 'm2'
           AND computed_at > $1
           ORDER BY computed_at ASC""",
        [cutoff]
    )
    return [
        {
            "date": str(r["date"]),
            "value": float(r["value"]),
            "raw_data": _parse_raw_data(r.get("raw_data"))
        }
        for r in rows
    ]


@router.get("/{symbol}/m2/compare")
async def get_m2_compare(symbol: str, days: int = 365):
    """Get M2 history aligned with BTC, SPX and Gold prices for chart overlay"""
    from datetime import datetime, timedelta
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

    # BTC daily close from oi_history
    btc_rows = await db.query(
        """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, price as close_price
           FROM oi_history 
           WHERE symbol = 'BTCUSDT' AND time > $1
           ORDER BY DATE(time), time DESC""",
        [cutoff]
    )

    # SPX
    spx_asset = await db.query("SELECT id FROM macro_assets WHERE key = 'spx500' LIMIT 1", [])
    spx_rows = []
    if spx_asset:
        spx_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, close_price
               FROM macro_prices WHERE asset_id = $1 AND time > $2
               ORDER BY DATE(time), time DESC""",
            [spx_asset[0]["id"], cutoff]
        )

    # Gold
    gold_asset = await db.query("SELECT id FROM macro_assets WHERE key = 'gold' LIMIT 1", [])
    gold_rows = []
    if gold_asset:
        gold_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as date, close_price
               FROM macro_prices WHERE asset_id = $1 AND time > $2
               ORDER BY DATE(time), time DESC""",
            [gold_asset[0]["id"], cutoff]
        )

    # Build maps
    btc_map = {str(r["date"]): float(r["close_price"]) for r in btc_rows}
    spx_map = {str(r["date"]): float(r["close_price"]) for r in spx_rows}
    gold_map = {str(r["date"]): float(r["close_price"]) for r in gold_rows}

    result = {"dates": [], "m2": [], "btc": [], "spx": [], "gold": []}
    for r in m2_rows:
        d = str(r["date"])
        result["dates"].append(d)
        result["m2"].append(float(r["value"]))
        result["btc"].append(btc_map.get(d))
        result["spx"].append(spx_map.get(d))
        result["gold"].append(gold_map.get(d))

    return result


@router.get("/{symbol}/composite")
async def get_composite(symbol: str):
    """Get composite fundamental health score"""
    db = get_db()
    rows = await db.query(
        """SELECT metric_name, value, raw_data 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name IN ('mvrv', 'nupl', 'funding_rate', 'market_momentum', 'sopr', 'm2')
           ORDER BY computed_at DESC""",
        [symbol.upper()]
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Fundamental data not available yet")
    
    # Take latest of each metric
    latest = {}
    for r in rows:
        if r["metric_name"] not in latest:
            rec = dict(r)
            rec["raw_data"] = _parse_raw_data(rec.get("raw_data"))
            latest[r["metric_name"]] = rec
    
    components = {}
    values = []
    weights = []
    interpretation = {}
    
    if "mvrv" in latest:
        mvrv = float(latest["mvrv"]["value"])
        mvrv_norm = max(-1, min(1, (mvrv - 2.0) / 2.0))  # 0->-1, 4->+1
        components["mvrv"] = {"value": mvrv, "normalized": round(mvrv_norm, 3), "weight": 0.35}
        values.append(mvrv_norm)
        weights.append(0.35)
        interpretation["mvrv"] = latest["mvrv"].get("raw_data", {}).get("description", "")
    
    if "nupl" in latest:
        nupl = float(latest["nupl"]["value"])
        nupl_norm = max(-1, min(1, (nupl - 0.25) / 0.5))  # -0.25->-1, 0.75->+1
        components["nupl"] = {"value": nupl, "normalized": round(nupl_norm, 3), "weight": 0.35}
        values.append(nupl_norm)
        weights.append(0.35)
        interpretation["nupl"] = latest["nupl"].get("raw_data", {}).get("description", "")
    
    if "sopr" in latest:
        sopr = float(latest["sopr"]["value"])
        sopr_norm = max(-1, min(1, (sopr - 1.0) / 0.02))  # 0.98->-1, 1.02->+1
        components["sopr"] = {"value": sopr, "normalized": round(sopr_norm, 3), "weight": 0.20}
        values.append(sopr_norm)
        weights.append(0.20)
        interpretation["sopr"] = latest["sopr"].get("raw_data", {}).get("description", "")
    
    if "funding_rate" in latest:
        funding = float(latest["funding_rate"]["value"])
        funding_norm = max(-1, min(1, funding / 0.001))    # -0.001->-1, 0.001->+1
        components["funding"] = {"value": funding, "normalized": round(funding_norm, 3), "weight": 0.20}
        values.append(funding_norm)
        weights.append(0.20)
        interpretation["funding"] = latest["funding_rate"].get("raw_data", {}).get("description", "")
    
    if "market_momentum" in latest:
        momentum = float(latest["market_momentum"]["value"])
        momentum_norm = max(-1, min(1, momentum / 0.30))  # -30%->-1, +30%->+1
        components["market_momentum"] = {
            "value": momentum,
            "normalized": round(momentum_norm, 3),
            "weight": 0.20
        }
        values.append(momentum_norm)
        weights.append(0.20)
        interpretation["market_momentum"] = "24h Market Momentum"
    
    if "m2" in latest:
        m2 = float(latest["m2"]["value"])
        # Normalize M2: compare to historical average (simplified)
        m2_norm = 0.0  # placeholder for trend-based normalization
        components["m2"] = {"value": m2, "normalized": m2_norm, "weight": 0.0}
        interpretation["m2"] = latest["m2"].get("raw_data", {}).get("description", "")
    
    if not weights:
        raise HTTPException(status_code=404, detail="Fundamental data not available yet")
    
    total_weight = sum(weights)
    score = sum(v * w for v, w in zip(values, weights)) / total_weight
    
    sentiment = "BULLISH" if score > 0.5 else "BEARISH" if score < -0.5 else "NEUTRAL"
    
    return {
        "symbol": symbol.upper(),
        "score": round(score, 3),
        "sentiment": sentiment,
        "components": components,
        "interpretation": interpretation
    }
