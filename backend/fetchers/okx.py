"""
Fetcher для OKX данных (liquidations)
"""
import aiohttp
from typing import Dict, List, Optional


class OKXFetcher:
    BASE_URL = "https://www.okx.com"

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_liquidation_data(self, symbol: str = "BTCUSDT") -> List[Dict]:
        """
        Получает реальные данные о ликвидациях за последние 24ч.
        Возвращает список точек: {price, size, side, posSide}
        """
        import logging
        logger = logging.getLogger(__name__)

        # Маппинг символов к OKX instFamily
        base = symbol.upper().replace("USDT", "").replace("USD", "")
        inst_family = f"{base}-USDT"

        try:
            session = await self._get_session()
            url = f"{self.BASE_URL}/api/v5/public/liquidation-orders"
            params = {
                "instType": "SWAP",
                "mgnMode": "CROS",
                "instFamily": inst_family,
                "state": "filled",
                "limit": "100",
            }

            async with session.get(url, params=params, headers={"Accept": "application/json"}) as resp:
                data = await resp.json()

            if data.get("code") != "0":
                logger.error(f"OKX liquidation API error: {data}")
                return []

            items = []
            for entry in data.get("data", []):
                for detail in entry.get("details", []):
                    try:
                        price = float(detail["bkPx"])
                        size = float(detail["sz"])
                        pos_side = detail.get("posSide", "").lower()
                        side = "Short" if pos_side == "short" else "Long"
                        items.append({
                            "price": price,
                            "size": size,
                            "side": side,
                            "posSide": pos_side,
                        })
                    except (ValueError, KeyError):
                        continue

            logger.info(f"OKX liquidations fetched for {symbol}: {len(items)} records")
            return items
        except Exception as e:
            logger.error(f"OKX liquidation fetch error: {e}")
            return []

    async def close(self):
        if self.session:
            await self.session.close()
