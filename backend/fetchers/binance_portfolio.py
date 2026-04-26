"""
Binance read-only portfolio fetcher (Futures + Spot).
Uses HMAC-SHA256 signed requests with API key + secret.
"""
import hashlib
import hmac
import time
from typing import Dict, List, Optional
import httpx
import logging

logger = logging.getLogger(__name__)

BINANCE_FAPI = "https://fapi.binance.com"
BINANCE_SPOT = "https://api.binance.com"
BINANCE_FAPI_TESTNET = "https://testnet.binancefuture.com"
BINANCE_SPOT_TESTNET = "https://testnet.binance.vision"


class BinancePortfolioFetcher:
    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.client: Optional[httpx.AsyncClient] = None
        self.base_fapi = BINANCE_FAPI_TESTNET if testnet else BINANCE_FAPI
        self.base_spot = BINANCE_SPOT_TESTNET if testnet else BINANCE_SPOT

    async def _get_client(self) -> httpx.AsyncClient:
        if not self.client:
            self.client = httpx.AsyncClient(timeout=30.0)
        return self.client

    def _sign(self, query_string: str) -> str:
        return hmac.new(
            self.api_secret.encode(),
            query_string.encode(),
            hashlib.sha256,
        ).hexdigest()

    async def _get(self, path: str, params: Optional[Dict] = None, base_url: str = None) -> Dict:
        base_url = base_url or self.base_fapi
        client = await self._get_client()
        ts = str(int(time.time() * 1000))
        qs = f"timestamp={ts}"
        if params:
            for k, v in sorted(params.items()):
                qs += f"&{k}={v}"
        signature = self._sign(qs)
        url = f"{base_url}{path}?{qs}&signature={signature}"
        resp = await client.get(
            url,
            headers={"X-MBX-APIKEY": self.api_key},
        )
        data = resp.json() if resp.status_code < 500 else {}
        if resp.status_code >= 400:
            logger.error(f"Binance API error {resp.status_code}: {data}")
            raise RuntimeError(f"Binance API error: {data.get('msg', 'Unknown')}")
        return data

    # ============= FUTURES =============

    async def get_futures_account(self) -> Dict:
        """Get futures account info (balances, positions)."""
        return await self._get("/fapi/v2/account")

    async def get_position_risk(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get position risk for all or specific symbol."""
        params = {}
        if symbol:
            params["symbol"] = symbol
        return await self._get("/fapi/v2/positionRisk", params)

    @staticmethod
    def parse_positions(account: Dict, position_risks: List[Dict]) -> List[Dict]:
        """Normalize Binance Futures data into unified portfolio asset format."""
        assets = []
        for pos in account.get("positions", []):
            amt = float(pos.get("positionAmt", 0))
            if abs(amt) < 1e-12:
                continue
            symbol = pos.get("symbol", "")
            entry = float(pos.get("entryPrice", 0))
            mark = float(pos.get("markPrice", 0))
            upnl = float(pos.get("unrealizedProfit", 0))
            notional = abs(amt) * mark if mark else 0
            side = "LONG" if amt > 0 else "SHORT"
            assets.append({
                "symbol": symbol,
                "asset_name": symbol.replace("USDT", ""),
                "amount": abs(amt),
                "avg_entry_price": entry,
                "current_price": mark,
                "unrealized_pnl": upnl,
                "unrealized_pnl_pct": ((mark - entry) / entry * 100) if entry > 0 else 0,
                "notional": notional,
                "margin": float(pos.get("initialMargin", 0)),
                "leverage": int(pos.get("leverage", 1)),
                "side": side,
            })

        risk_map = {r.get("symbol"): r for r in position_risks}
        for asset in assets:
            risk = risk_map.get(asset["symbol"])
            if risk:
                asset["liquidation_price"] = float(risk.get("liquidationPrice", 0))
                asset["unrealized_pnl"] = float(risk.get("unRealizedProfit", asset["unrealized_pnl"]))
                entry = float(risk.get("entryPrice", 0))
                mark = float(risk.get("markPrice", 0))
                asset["avg_entry_price"] = entry
                asset["current_price"] = mark
                if entry > 0:
                    asset["unrealized_pnl_pct"] = ((mark - entry) / entry * 100) * (1 if asset["side"] == "LONG" else -1)

        return assets

    # ============= SPOT =============

    async def get_spot_account(self) -> Dict:
        """Get spot account info (balances)."""
        return await self._get("/api/v3/account", base_url=self.base_spot)

    async def get_spot_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Get current spot prices for symbols (no auth required)."""
        client = await self._get_client()
        if not symbols:
            return {}
        # Batch via ticker/price? For multiple symbols we can use /api/v3/ticker/price
        # But simpler: get all and filter
        resp = await client.get(f"{self.base_spot}/api/v3/ticker/price")
        data = resp.json() if resp.status_code == 200 else []
        prices = {}
        for item in data:
            sym = item.get("symbol", "")
            if sym in symbols:
                prices[sym] = float(item.get("price", 0))
        return prices

    @staticmethod
    def parse_spot_balances(account: Dict, prices: Dict[str, float]) -> List[Dict]:
        """Normalize Binance Spot balances into unified portfolio asset format."""
        assets = []
        for bal in account.get("balances", []):
            free = float(bal.get("free", 0))
            locked = float(bal.get("locked", 0))
            amt = free + locked
            if amt < 1e-12:
                continue
            asset = bal.get("asset", "")
            # Skip stablecoins unless they have significant value? Keep them.
            symbol = f"{asset}USDT"
            price = prices.get(symbol, 0)
            if price == 0 and asset == "USDT":
                price = 1.0
            notional = amt * price
            # Skip dust (< $1)
            if notional < 1:
                continue
            assets.append({
                "symbol": symbol,
                "asset_name": asset,
                "amount": amt,
                "avg_entry_price": 0,  # Not available via spot account endpoint
                "current_price": price,
                "unrealized_pnl": 0,
                "unrealized_pnl_pct": 0,
                "notional": notional,
                "margin": 0,
                "leverage": 1,
                "side": "LONG",
            })
        return assets

    async def close(self):
        if self.client:
            await self.client.close()
            self.client = None
