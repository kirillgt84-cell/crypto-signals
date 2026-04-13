"""
Fundamental metrics router
MVRV, NUPL, Funding Rate, Composite Index
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from database import get_db

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
            r = await client.get("https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false", timeout=10)
            results["coingecko"] = {"status": r.status_code, "has_market_data": "market_data" in r.json() if r.status_code == 200 else False}
        except Exception as e:
            results["coingecko"] = {"error": str(e)}
        
        try:
            r = await client.get("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1", timeout=10)
            results["binance_funding"] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text[:200]}
        except Exception as e:
            results["binance_funding"] = {"error": str(e)}
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
    return row[0]

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
    return row[0]

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
    return row[0]

@router.get("/{symbol}/composite")
async def get_composite(symbol: str):
    """Get composite fundamental health score"""
    db = get_db()
    rows = await db.query(
        """SELECT metric_name, value, raw_data 
           FROM fundamental_metrics 
           WHERE symbol = $1 AND metric_name IN ('mvrv', 'nupl', 'funding_rate', 'market_momentum')
           ORDER BY computed_at DESC""",
        [symbol.upper()]
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Fundamental data not available yet")
    
    # Take latest of each metric
    latest = {}
    for r in rows:
        if r["metric_name"] not in latest:
            latest[r["metric_name"]] = r
    
    components = {}
    values = []
    weights = []
    interpretation = {}
    
    if "mvrv" in latest:
        mvrv = latest["mvrv"]["value"]
        mvrv_norm = max(-1, min(1, (mvrv - 2.0) / 2.0))  # 0->-1, 4->+1
        components["mvrv"] = {"value": mvrv, "normalized": round(mvrv_norm, 3), "weight": 0.35}
        values.append(mvrv_norm)
        weights.append(0.35)
        interpretation["mvrv"] = latest["mvrv"].get("raw_data", {}).get("description", "")
    
    if "nupl" in latest:
        nupl = latest["nupl"]["value"]
        nupl_norm = max(-1, min(1, (nupl - 0.25) / 0.5))  # -0.25->-1, 0.75->+1
        components["nupl"] = {"value": nupl, "normalized": round(nupl_norm, 3), "weight": 0.35}
        values.append(nupl_norm)
        weights.append(0.35)
        interpretation["nupl"] = latest["nupl"].get("raw_data", {}).get("description", "")
    
    if "funding_rate" in latest:
        funding = latest["funding_rate"]["value"]
        funding_norm = max(-1, min(1, funding / 0.001))    # -0.001->-1, 0.001->+1
        components["funding"] = {"value": funding, "normalized": round(funding_norm, 3), "weight": 0.30}
        values.append(funding_norm)
        weights.append(0.30)
        interpretation["funding"] = latest["funding_rate"].get("raw_data", {}).get("description", "")
    
    if "market_momentum" in latest:
        momentum = latest["market_momentum"]["value"]
        momentum_norm = max(-1, min(1, momentum / 0.30))  # -30%->-1, +30%->+1
        components["market_momentum"] = {
            "value": momentum,
            "normalized": round(momentum_norm, 3),
            "weight": 0.30
        }
        values.append(momentum_norm)
        weights.append(0.30)
        interpretation["market_momentum"] = "Рыночный импульс 24ч"
    
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
