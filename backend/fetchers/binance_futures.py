"""
Fetcher для Binance Futures данных
"""
import aiohttp
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class BinanceFuturesFetcher:
    BASE_URL = "https://fapi.binance.com"
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def get_oi_analysis(self, symbol: str = "BTCUSDT") -> Dict:
        """
        Получает Open Interest + цену + объем + интерпретацию
        """
        session = await self._get_session()
        
        # Текущий OI
        async with session.get(
            f"{self.BASE_URL}/fapi/v1/openInterest",
            params={"symbol": symbol}
        ) as resp:
            oi_data = await resp.json()
        
        # Текущая цена и объем (24ч)
        async with session.get(
            f"{self.BASE_URL}/fapi/v1/ticker/24hr",
            params={"symbol": symbol}
        ) as resp:
            ticker = await resp.json()
        
        # OI 24ч назад (история)
        oi_history = await self._get_oi_history(symbol, hours=24)
        oi_24h_ago = oi_history[0] if oi_history else float(oi_data['openInterest'])
        
        current_oi = float(oi_data['openInterest'])
        oi_change_pct = ((current_oi - oi_24h_ago) / oi_24h_ago) * 100
        
        price_change_pct = float(ticker['priceChangePercent'])
        volume = float(ticker['volume'])
        
        return {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "open_interest": current_oi,
            "oi_change_24h": round(oi_change_pct, 2),
            "oi_change_value": current_oi - oi_24h_ago,
            "price": float(ticker['lastPrice']),
            "price_change_24h": round(price_change_pct, 2),
            "volume_24h": volume,
            "interpretation": self._interpret_oi(oi_change_pct, price_change_pct)
        }
    
    async def _get_oi_history(self, symbol: str, hours: int = 24) -> List[float]:
        """Получает историю OI за период"""
        session = await self._get_session()
        
        end_time = int(datetime.now().timestamp() * 1000)
        start_time = int((datetime.now() - timedelta(hours=hours)).timestamp() * 1000)
        
        async with session.get(
            f"{self.BASE_URL}/fapi/v1/openInterestHist",
            params={
                "symbol": symbol,
                "period": "1h",
                "limit": hours,
                "startTime": start_time,
                "endTime": end_time
            }
        ) as resp:
            data = await resp.json()
            
        if isinstance(data, list):
            return [float(item['sumOpenInterest']) for item in data]
        return []
    
    def _interpret_oi(self, oi_change: float, price_change: float) -> Dict:
        """
        Базовая логика интерпретации OI
        """
        oi_up = oi_change > 1
        oi_down = oi_change < -1
        price_up = price_change > 0.5
        price_down = price_change < -0.5
        
        if oi_up and price_up:
            return {
                "status": "long_buildup",
                "signal": "bullish",
                "description": "OI↑ Цена↑ — Накопление лонгов. Крупные игроки покупают, толпа шортит. Сильный сигнал для лонга.",
                "color": "green"
            }
        elif oi_up and price_down:
            return {
                "status": "short_buildup",
                "signal": "bearish", 
                "description": "OI↑ Цена↓ — Накопление шортов. Крупные продают толпе. Сильный сигнал для шорта.",
                "color": "red"
            }
        elif oi_down and price_up:
            return {
                "status": "short_liquidation",
                "signal": "caution",
                "description": "OI↓ Цена↑ — Разгрузка шортов (short squeeze). Слабый тренд, осторожно.",
                "color": "yellow"
            }
        elif oi_down and price_down:
            return {
                "status": "long_liquidation",
                "signal": "caution",
                "description": "OI↓ Цена↓ — Разгрузка лонгов. Слабый рынок, возможен отскок.",
                "color": "yellow"
            }
        else:
            return {
                "status": "neutral",
                "signal": "neutral",
                "description": "Нейтральная динамика. Ожидание пробоя.",
                "color": "gray"
            }
    
    async def get_cvd(self, symbol: str = "BTCUSDT", limit: int = 1000) -> Dict:
        """
        Расчет Cumulative Volume Delta
        """
        session = await self._get_session()
        
        # Получаем agg trades
        async with session.get(
            f"{self.BASE_URL}/fapi/v1/aggTrades",
            params={"symbol": symbol, "limit": limit}
        ) as resp:
            trades = await resp.json()
        
        if not isinstance(trades, list):
            return {"error": "No data"}
        
        # Расчет delta
        buy_volume = 0
        sell_volume = 0
        deltas = []
        
        for trade in trades:
            qty = float(trade['q'])
            price = float(trade['p'])
            
            # Определяем покупку/продажу по wasBuyerMaker
            if trade['m']:  # Buyer is maker (продажа маркетом)
                sell_volume += qty * price
                delta = -qty * price
            else:  # Seller is maker (покупка маркетом)
                buy_volume += qty * price
                delta = qty * price
            
            deltas.append(delta)
        
        cumulative = []
        running_total = 0
        for d in deltas:
            running_total += d
            cumulative.append(running_total)
        
        net_delta = buy_volume - sell_volume
        
        return {
            "symbol": symbol,
            "cvd_value": round(cumulative[-1], 2) if cumulative else 0,
            "net_delta": round(net_delta, 2),
            "buy_volume": round(buy_volume, 2),
            "sell_volume": round(sell_volume, 2),
            "delta_series": cumulative[-100:],  # Последние 100 точек для графика
            "interpretation": "bullish" if net_delta > 0 else "bearish"
        }
    
    async def get_cluster_data(self, symbol: str = "BTCUSDT") -> Dict:
        """
        Получает данные для кластерного объема (агрегация по ценовым уровням)
        """
        session = await self._get_session()
        
        # Получаем recent trades для кластеризации
        async with session.get(
            f"{self.BASE_URL}/fapi/v1/aggTrades",
            params={"symbol": symbol, "limit": 500}
        ) as resp:
            trades = await resp.json()
        
        if not isinstance(trades, list):
            return {"error": "No data"}
        
        # Агрегируем по ценовым уровням (округляем до $100 для BTC)
        clusters = {}
        for trade in trades:
            price = float(trade['p'])
            qty = float(trade['q'])
            
            # Округляем цену для кластеризации
            rounded_price = round(price / 100) * 100
            
            if rounded_price not in clusters:
                clusters[rounded_price] = {"buy": 0, "sell": 0, "total": 0}
            
            if trade['m']:  # Sell
                clusters[rounded_price]["sell"] += qty
            else:  # Buy
                clusters[rounded_price]["buy"] += qty
            
            clusters[rounded_price]["total"] += qty
        
        # Находим POC (Point of Control)
        poc_price = max(clusters.items(), key=lambda x: x[1]["total"])[0] if clusters else 0
        
        # Сортируем по цене
        sorted_clusters = sorted(clusters.items(), key=lambda x: x[0])
        
        return {
            "symbol": symbol,
            "poc": poc_price,
            "clusters": [
                {
                    "price": price,
                    "buy": data["buy"],
                    "sell": data["sell"],
                    "total": data["total"],
                    "delta": data["buy"] - data["sell"]
                }
                for price, data in sorted_clusters[-20:]  # Последние 20 уровней
            ]
        }
    
    async def close(self):
        if self.session:
            await self.session.close()
