"""
Fetcher for Binance Futures heatmap data (tickers + OI + categories).
Excludes top assets: BTC, ETH, SOL, BNB.
"""
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

EXCLUDED_BASES = set()


class BinanceHeatmapFetcher:
    BASE_URL = "https://fapi.binance.com"

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self._exchange_info: Optional[List[Dict]] = None
        self._category_map: Dict[str, str] = {}

    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_exchange_info(self) -> List[Dict]:
        """Fetch all perpetual futures symbols with categories. Cached."""
        if self._exchange_info is not None:
            return self._exchange_info

        session = await self._get_session()
        async with session.get(f"{self.BASE_URL}/fapi/v1/exchangeInfo") as resp:
            data = await resp.json()

        symbols = []
        for s in data.get("symbols", []):
            if s.get("status") != "TRADING" or s.get("contractType") != "PERPETUAL":
                continue

            base = s.get("baseAsset", "")
            if base in EXCLUDED_BASES:
                continue

            sub_types = s.get("underlyingSubType", [])
            category = "Other"
            for tag in sub_types:
                if tag != "USDC":
                    category = tag
                    break

            symbols.append({
                "symbol": s["symbol"],
                "baseAsset": base,
                "category": category,
            })
            self._category_map[s["symbol"]] = category

        self._exchange_info = symbols
        logger.info(f"Binance heatmap: loaded {len(symbols)} perpetual symbols")
        return symbols

    async def get_all_tickers(self) -> List[Dict]:
        """Fetch 24hr tickers for all symbols."""
        session = await self._get_session()
        async with session.get(f"{self.BASE_URL}/fapi/v1/ticker/24hr") as resp:
            data = await resp.json()
        return data if isinstance(data, list) else []

    async def get_open_interest(self, symbol: str) -> Optional[float]:
        """Fetch open interest for a single symbol."""
        session = await self._get_session()
        try:
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/openInterest",
                params={"symbol": symbol}
            ) as resp:
                data = await resp.json()
                return float(data.get("openInterest", 0))
        except Exception as e:
            logger.warning(f"OI fetch error for {symbol}: {e}")
            return None

    async def get_all_open_interest(
        self, symbols: List[str], max_concurrent: int = 50
    ) -> Dict[str, float]:
        """Fetch OI for all symbols with a concurrency limit."""
        semaphore = asyncio.Semaphore(max_concurrent)
        results: Dict[str, float] = {}

        async def fetch_one(sym: str):
            async with semaphore:
                oi = await self.get_open_interest(sym)
                if oi is not None:
                    results[sym] = oi

        await asyncio.gather(*[fetch_one(s) for s in symbols])
        return results

    async def get_snapshot(self) -> List[Dict]:
        """
        Combine tickers + OI + categories into a single snapshot.
        Returns list of dicts: {symbol, category, price, volume_24h,
                                 quote_volume_24h, price_change_pct, oi}
        """
        exchange_info = await self.get_exchange_info()
        valid_symbols = {s["symbol"] for s in exchange_info}

        tickers = await self.get_all_tickers()
        ticker_map: Dict[str, Dict] = {}
        for t in tickers:
            sym = t.get("symbol", "")
            if sym in valid_symbols:
                ticker_map[sym] = t

        oi_data = await self.get_all_open_interest(list(ticker_map.keys()))

        snapshot = []
        for info in exchange_info:
            sym = info["symbol"]
            ticker = ticker_map.get(sym, {})
            oi = oi_data.get(sym, 0)

            snapshot.append({
                "symbol": sym,
                "category": info["category"],
                "price": float(ticker.get("lastPrice", 0) or 0),
                "volume_24h": float(ticker.get("volume", 0) or 0),
                "quote_volume_24h": float(ticker.get("quoteVolume", 0) or 0),
                "price_change_pct": float(ticker.get("priceChangePercent", 0) or 0),
                "oi": oi,
            })

        return snapshot

    async def close(self):
        if self.session:
            await self.session.close()
