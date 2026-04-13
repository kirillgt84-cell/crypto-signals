"""
Daily fundamentals collector
Gathers MVRV, NUPL, Funding Rate from free APIs
Run via cron: python daily_fundamentals.py
"""
import os
import asyncio
import httpx
from datetime import datetime, timedelta
from database import get_db

GLASSNODE_KEY = os.getenv("GLASSNODE_API_KEY", "")
COINGECKO_URL = "https://api.coingecko.com/api/v3"

ASSETS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
}

async def fetch_glassnode_metric(client: httpx.AsyncClient, metric: str, asset: str = "BTC"):
    """Fetch metric from Glassnode free tier"""
    if not GLASSNODE_KEY:
        return None
    url = f"https://api.glassnode.com/v1/metrics/market/{metric}"
    end = int(datetime.utcnow().timestamp())
    start = int((datetime.utcnow() - timedelta(days=30)).timestamp())
    params = {
        "a": asset,
        "api_key": GLASSNODE_KEY,
        "s": start,
        "u": end,
        "i": "24h",
    }
    try:
        r = await client.get(url, params=params, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                return float(data[-1]["v"])
    except Exception as e:
        print(f"[Fundamentals] Glassnode {metric} error: {e}")
    return None

async def fetch_coingecko_data(client: httpx.AsyncClient, coin_id: str):
    """Fetch market cap and price from CoinGecko"""
    try:
        r = await client.get(
            f"{COINGECKO_URL}/coins/{coin_id}",
            params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"},
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            return {
                "market_cap": data["market_data"]["market_cap"]["usd"],
                "price": data["market_data"]["current_price"]["usd"],
                "supply": data["market_data"]["circulating_supply"],
            }
    except Exception as e:
        print(f"[Fundamentals] CoinGecko error: {e}")
    return None

async def fetch_binance_funding(client: httpx.AsyncClient, symbol: str):
    """Fetch latest funding rate from Binance"""
    try:
        r = await client.get(
            f"https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}USDT&limit=1",
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                return float(data[0]["fundingRate"])
    except Exception as e:
        print(f"[Fundamentals] Binance funding error: {e}")
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
    await db.execute(
        """INSERT INTO fundamental_metrics (symbol, metric_name, value, raw_data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (symbol, metric_name, computed_at) DO UPDATE
           SET value = EXCLUDED.value, raw_data = EXCLUDED.raw_data""",
        [symbol, name, value, raw_data]
    )

async def collect_fundamentals():
    db = get_db()
    await db.connect()
    
    async with httpx.AsyncClient() as client:
        for symbol, coin_id in ASSETS.items():
            print(f"[Fundamentals] Collecting {symbol}...")
            
            # CoinGecko data
            cg = await fetch_coingecko_data(client, coin_id)
            
            # Glassnode realized cap
            realized_cap = await fetch_glassnode_metric(client, "realized_cap_usd", symbol)
            
            # Binance funding
            funding = await fetch_binance_funding(client, symbol)
            
            if cg and realized_cap:
                market_cap = cg["market_cap"]
                mvrv = market_cap / realized_cap
                nupl = (market_cap - realized_cap) / market_cap
                
                await save_metric(db, symbol, "mvrv", mvrv, {
                    "market_cap": market_cap,
                    "realized_cap": realized_cap,
                    "price": cg["price"],
                    "supply": cg["supply"],
                    "interpretation": interpret_mvrv(mvrv)[0],
                    "description": interpret_mvrv(mvrv)[1],
                })
                
                await save_metric(db, symbol, "nupl", nupl, {
                    "market_cap": market_cap,
                    "realized_cap": realized_cap,
                    "interpretation": interpret_nupl(nupl)[0],
                    "description": interpret_nupl(nupl)[1],
                })
                
                print(f"[Fundamentals] {symbol} MVRV={mvrv:.3f}, NUPL={nupl:.3f}")
            
            if funding is not None:
                await save_metric(db, symbol, "funding_rate", funding, {
                    "rate_pct": funding * 100,
                    "interpretation": interpret_funding(funding)[0],
                    "description": interpret_funding(funding)[1],
                })
                print(f"[Fundamentals] {symbol} Funding={funding:.4f}")
    
    await db.close()
    print("[Fundamentals] Done.")

if __name__ == "__main__":
    asyncio.run(collect_fundamentals())
