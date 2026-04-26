"""
Macro asset fetcher using yfinance (Yahoo Finance).
Fetches SPX500, Gold, VIX historical data.
"""
import logging
from typing import Dict, List, Optional
import asyncio

logger = logging.getLogger(__name__)

# Asset mapping: our key -> Yahoo Finance ticker
ASSETS = {
    "spx500": "^GSPC",
    "gold": "GC=F",
    "vix": "^VIX",
    "btc": "BTC-USD",
}


class MacroYahooFetcher:
    async def get_historical(
        self,
        asset_key: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> List[Dict]:
        """Fetch historical prices for a macro asset via yfinance (runs in thread pool)."""
        yahoo_sym = ASSETS.get(asset_key)
        if not yahoo_sym:
            raise ValueError(f"Unknown asset: {asset_key}")

        def _fetch():
            import yfinance as yf
            ticker = yf.Ticker(yahoo_sym)
            hist = ticker.history(period=period, interval=interval)
            out = []
            for idx, row in hist.iterrows():
                out.append({
                    "time": idx.to_pydatetime().replace(tzinfo=None),
                    "open": float(row["Open"]) if row["Open"] is not None else None,
                    "high": float(row["High"]) if row["High"] is not None else None,
                    "low": float(row["Low"]) if row["Low"] is not None else None,
                    "close": float(row["Close"]) if row["Close"] is not None else None,
                    "volume": float(row["Volume"]) if row["Volume"] is not None else 0,
                })
            return out

        return await asyncio.to_thread(_fetch)

    async def get_latest_price(self, asset_key: str) -> Optional[float]:
        """Get latest closing price."""
        hist = await self.get_historical(asset_key, period="5d", interval="1d")
        if hist:
            return hist[-1]["close"]
        return None
