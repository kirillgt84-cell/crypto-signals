"""
Fundamental metrics router
MVRV, NUPL, Funding Rate, Composite Index
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from database import get_db

router = APIRouter(prefix="/api/v1/fundamentals", tags=["fundamentals"])

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
           WHERE symbol = $1 AND metric_name IN ('mvrv', 'nupl', 'funding_rate')
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
    
    mvrv = latest.get("mvrv", {}).get("value", 0)
    nupl = latest.get("nupl", {}).get("value", 0)
    funding = latest.get("funding_rate", {}).get("value", 0)
    
    # Normalize each metric to -1..+1
    mvrv_norm = max(-1, min(1, (mvrv - 2.0) / 2.0))  # 0->-1, 4->+1
    nupl_norm = max(-1, min(1, (nupl - 0.25) / 0.5))  # -0.25->-1, 0.75->+1
    funding_norm = max(-1, min(1, funding / 0.001))    # -0.001->-1, 0.001->+1
    
    score = (
        mvrv_norm * 0.35 +
        nupl_norm * 0.35 +
        funding_norm * 0.30
    )
    
    sentiment = "BULLISH" if score > 0.5 else "BEARISH" if score < -0.5 else "NEUTRAL"
    
    return {
        "symbol": symbol.upper(),
        "score": round(score, 3),
        "sentiment": sentiment,
        "components": {
            "mvrv": {"value": mvrv, "normalized": round(mvrv_norm, 3), "weight": 0.35},
            "nupl": {"value": nupl, "normalized": round(nupl_norm, 3), "weight": 0.35},
            "funding": {"value": funding, "normalized": round(funding_norm, 3), "weight": 0.30},
        },
        "interpretation": {
            "mvrv": latest.get("mvrv", {}).get("raw_data", {}).get("description", ""),
            "nupl": latest.get("nupl", {}).get("raw_data", {}).get("description", ""),
            "funding": latest.get("funding_rate", {}).get("raw_data", {}).get("description", ""),
        }
    }
