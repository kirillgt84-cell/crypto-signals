"""
Daily fundamentals collector
Gathers MVRV, NUPL, Funding Rate from free APIs
Run via cron: python daily_fundamentals.py
"""
import asyncio
import httpx
import logging
import json
from database import get_db

logger = logging.getLogger(__name__)

BGEOMETRICS_URL = "https://bitcoin-data.com/api/v1"

ASSETS = {
    "BTC": {"source": "bgeometrics"},
    "ETH": {"source": "binance"},
    "SOL": {"source": "binance"},
    "BNB": {"source": "binance"},
    "XRP": {"source": "binance"},
    "DOGE": {"source": "binance"},
    "ADA": {"source": "binance"},
    "LINK": {"source": "binance"},
    "AVAX": {"source": "binance"},
    "POL": {"source": "binance"},
}

async def fetch_bgeometrics_last(client: httpx.AsyncClient, metric: str):
    """Fetch latest metric from BGeometrics free API (BTC only)"""
    try:
        r = await client.get(f"{BGEOMETRICS_URL}/{metric}/last", timeout=10)
        logger.info(f"[BGeometrics] {metric} status={r.status_code}")
        if r.status_code == 200:
            return r.json()
        else:
            logger.warning(f"[BGeometrics] {metric} returned {r.status_code}: {r.text[:200]}")
    except Exception as e:
        logger.error(f"[BGeometrics] {metric} error: {e}")
    return None

async def fetch_binance_24hr(client: httpx.AsyncClient, symbol: str):
    """Fetch 24h price change percent from Binance (no rate limits, no API key)"""
    try:
        r = await client.get(
            f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}USDT",
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            return {
                "price": float(data.get("lastPrice", 0)),
                "price_change_24h_pct": float(data.get("priceChangePercent", 0)),
            }
        else:
            logger.warning(f"[Fundamentals] Binance 24hr {symbol} status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        logger.error(f"[Fundamentals] Binance 24hr {symbol} error: {e}")
    return None

async def fetch_binance_funding(client: httpx.AsyncClient, symbol: str):
    """Fetch latest funding rate from Binance"""
    try:
        r = await client.get(
            f"https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}USDT&limit=1",
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                return float(data[0]["fundingRate"])
    except Exception as e:
        logger.error(f"[Fundamentals] Binance funding error: {e}")
    return None

def interpret_mvrv(mvrv: float):
    if mvrv < 1.0:
        return "UNDERvalued", "Зона накопления"
    if mvrv < 2.0:
        return "FAIR", "Справедливая цена"
    if mvrv < 3.5:
        return "OVERvalued", "Переоценен"
    return "BUBBLE", "Пузырь"

def interpret_nupl(nupl: float):
    if nupl > 0.75:
        return "EUPHORIA", "🔴 Эйфория"
    if nupl > 0.50:
        return "BELIEF", "🟠 Вера"
    if nupl > 0.25:
        return "HOPE", "🟡 Надежда"
    if nupl > 0:
        return "OPTIMISM", "🟢 Оптимизм"
    return "CAPITULATION", "🔵 Капитуляция"

def interpret_funding(rate: float):
    if rate > 0.001:
        return "LONG_OVERHEAT", "Лонги перегреты"
    if rate < -0.001:
        return "SHORT_OVERHEAT", "Шорты перегреты"
    return "NEUTRAL", "Нейтрально"

async def save_metric(db, symbol: str, name: str, value: float, raw_data: dict):
    try:
        await db.execute(
            """INSERT INTO fundamental_metrics (symbol, metric_name, value, raw_data)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (symbol, metric_name, computed_at) DO UPDATE
               SET value = EXCLUDED.value, raw_data = EXCLUDED.raw_data""",
            [symbol, name, value, json.dumps(raw_data)]
        )
        logger.info(f"[Fundamentals] Saved {symbol}/{name} = {value}")
        return {"saved": True, "symbol": symbol, "metric": name, "value": value}
    except Exception as e:
        logger.error(f"[Fundamentals] Failed to save {symbol}/{name}: {e}")
        return {"saved": False, "symbol": symbol, "metric": name, "error": str(e)}

async def collect_fundamentals():
    db = get_db()
    await db.connect()
    logger.info("[Fundamentals] Collection started")
    results = []
    
    async with httpx.AsyncClient() as client:
        for symbol, config in ASSETS.items():
            logger.info(f"[Fundamentals] Collecting {symbol}...")
            source = config["source"]
            
            funding = await fetch_binance_funding(client, symbol)
            
            if source == "bgeometrics":
                nupl_data = await fetch_bgeometrics_last(client, "nupl")
                mvrv_data = await fetch_bgeometrics_last(client, "mvrv")
                
                if nupl_data and mvrv_data:
                    nupl_val = float(nupl_data.get("nupl", 0))
                    mvrv_val = float(mvrv_data.get("mvrv", 0))
                    
                    results.append(await save_metric(db, symbol, "mvrv", mvrv_val, {
                        "interpretation": interpret_mvrv(mvrv_val)[0],
                        "description": interpret_mvrv(mvrv_val)[1],
                    }))
                    
                    results.append(await save_metric(db, symbol, "nupl", nupl_val, {
                        "interpretation": interpret_nupl(nupl_val)[0],
                        "description": interpret_nupl(nupl_val)[1],
                    }))
                else:
                    logger.warning(f"[Fundamentals] {symbol} BGeometrics incomplete, using Binance 24h")
                    bn = await fetch_binance_24hr(client, symbol)
                    if bn:
                        results.append(await save_metric(db, symbol, "market_momentum", bn["price_change_24h_pct"] / 100, {
                            "price": bn["price"],
                            "price_change_24h_pct": bn["price_change_24h_pct"],
                        }))
                
                # Also save market_momentum for BTC from Binance
                bn = await fetch_binance_24hr(client, symbol)
                if bn:
                    results.append(await save_metric(db, symbol, "market_momentum", bn["price_change_24h_pct"] / 100, {
                        "price": bn["price"],
                        "price_change_24h_pct": bn["price_change_24h_pct"],
                    }))
            else:
                bn = await fetch_binance_24hr(client, symbol)
                if bn:
                    results.append(await save_metric(db, symbol, "market_momentum", bn["price_change_24h_pct"] / 100, {
                        "price": bn["price"],
                        "price_change_24h_pct": bn["price_change_24h_pct"],
                    }))
            
            if funding is not None:
                results.append(await save_metric(db, symbol, "funding_rate", funding, {
                    "rate_pct": funding * 100,
                    "interpretation": interpret_funding(funding)[0],
                    "description": interpret_funding(funding)[1],
                }))
    
    await db.close()
    logger.info("[Fundamentals] Collection finished")
    return results

if __name__ == "__main__":
    asyncio.run(collect_fundamentals())
