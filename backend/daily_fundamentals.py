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

COINGECKO_URL = "https://api.coingecko.com/api/v3"
BGEOMETRICS_URL = "https://bitcoin-data.com/api/v1"

ASSETS = {
    "BTC": {
        "source": "bgeometrics",
        "coin_id": "bitcoin",
    },
    "ETH": {
        "source": "coingecko",
        "coin_id": "ethereum",
    },
}

async def fetch_bgeometrics_last(client: httpx.AsyncClient, metric: str):
    """Fetch latest metric from BGeometrics free API (BTC only)"""
    try:
        r = await client.get(f"{BGEOMETRICS_URL}/{metric}/last", timeout=30)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[Fundamentals] BGeometrics {metric} error: {e}")
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
                "price_change_24h_pct": data["market_data"].get("price_change_percentage_24h", 0),
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
        for symbol, config in ASSETS.items():
            print(f"[Fundamentals] Collecting {symbol}...")
            source = config["source"]
            coin_id = config["coin_id"]
            
            funding = await fetch_binance_funding(client, symbol)
            
            if source == "bgeometrics":
                # BTC: use BGeometrics free API
                nupl_data = await fetch_bgeometrics_last(client, "nupl")
                await asyncio.sleep(0.5)
                mvrv_data = await fetch_bgeometrics_last(client, "mvrv")
                await asyncio.sleep(0.5)
                realized_data = await fetch_bgeometrics_last(client, "realized-cap")
                await asyncio.sleep(0.5)
                market_cap_data = await fetch_bgeometrics_last(client, "market-cap")
                
                if nupl_data and mvrv_data:
                    nupl_val = float(nupl_data.get("nupl", 0))
                    mvrv_val = float(mvrv_data.get("mvrv", 0))
                    realized_cap = float(realized_data.get("realizedCap", 0)) if realized_data else None
                    market_cap = float(market_cap_data.get("marketCap", 0)) if market_cap_data else None
                    
                    await save_metric(db, symbol, "mvrv", mvrv_val, {
                        "market_cap": market_cap,
                        "realized_cap": realized_cap,
                        "interpretation": interpret_mvrv(mvrv_val)[0],
                        "description": interpret_mvrv(mvrv_val)[1],
                    })
                    
                    await save_metric(db, symbol, "nupl", nupl_val, {
                        "market_cap": market_cap,
                        "realized_cap": realized_cap,
                        "interpretation": interpret_nupl(nupl_val)[0],
                        "description": interpret_nupl(nupl_val)[1],
                    })
                    
                    print(f"[Fundamentals] {symbol} MVRV={mvrv_val:.3f}, NUPL={nupl_val:.3f}")
                else:
                    print(f"[Fundamentals] {symbol} BGeometrics data incomplete")
                    
            else:
                # ETH: fallback to CoinGecko for market data
                cg = await fetch_coingecko_data(client, coin_id)
                if cg:
                    await save_metric(db, symbol, "market_momentum", cg["price_change_24h_pct"] / 100, {
                        "price": cg["price"],
                        "market_cap": cg["market_cap"],
                        "supply": cg["supply"],
                        "price_change_24h_pct": cg["price_change_24h_pct"],
                    })
                    print(f"[Fundamentals] {symbol} Market momentum={cg['price_change_24h_pct']:.2f}%")
                else:
                    print(f"[Fundamentals] {symbol} CoinGecko data unavailable")
            
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
