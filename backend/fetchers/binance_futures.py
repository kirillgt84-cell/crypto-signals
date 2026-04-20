"""
Fetcher для Binance Futures данных
"""
import aiohttp
import asyncio
import math
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
    
    async def get_oi_analysis(self, symbol: str = "BTCUSDT", timeframe: str = "1h") -> Dict:
        """
        Получает Open Interest + цену + объем + интерпретацию
        timeframe: 1h, 4h, 1d - влияет на расчет изменений
        """
        session = await self._get_session()
        
        # Маппинг таймфреймов к часам для расчета изменений
        tf_hours = {"1h": 1, "4h": 4, "1d": 24}
        hours = tf_hours.get(timeframe, 1)
        
        try:
            # Текущий OI
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/openInterest",
                params={"symbol": symbol},
                headers={"Accept": "application/json"}
            ) as resp:
                oi_data = await resp.json()
            
            # Цена и объем за период (берем изменение за указанный период из klines)
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/klines",
                params={"symbol": symbol, "interval": timeframe, "limit": 2},
                headers={"Accept": "application/json"}
            ) as resp:
                klines = await resp.json()
            
            current_oi = float(oi_data['openInterest'])
            
            # Расчет изменения цены и объема за период
            print(f"DEBUG: klines type={type(klines)}, is_list={isinstance(klines, list)}")
            if isinstance(klines, list) and len(klines) >= 2:
                prev_candle = klines[0]
                current_candle = klines[1]
                prev_close = float(prev_candle[4])
                current_close = float(current_candle[4])
                prev_volume = float(prev_candle[5])
                current_volume = float(current_candle[5])
                
                price_change_pct = ((current_close - prev_close) / prev_close) * 100
                volume_change_pct = ((current_volume - prev_volume) / prev_volume) * 100 if prev_volume > 0 else 0
                volume = current_volume
                print(f"DEBUG: volume_change_pct={volume_change_pct}, price_change_pct={price_change_pct}")
            else:
                print(f"DEBUG: klines invalid, len={len(klines) if isinstance(klines, list) else 'N/A'}")
                price_change_pct = 0
                volume_change_pct = 0
                volume = 0
            
            # OI change рассчитывается в router из истории БД (scheduler сохраняет OI каждые 5 мин)
            # Здесь оставляем только текущее значение
            oi_change_pct = 0
            oi_change_value = 0
            
            # Get mark price as fallback if klines failed
            mark_price = None
            try:
                async with session.get(
                    f"{self.BASE_URL}/fapi/v1/premiumIndex",
                    params={"symbol": symbol},
                    headers={"Accept": "application/json"}
                ) as resp:
                    mark_data = await resp.json()
                    mark_price = float(mark_data.get('markPrice', 0))
            except:
                pass
            
            # Use klines close price or mark price
            final_price = current_close if 'current_close' in locals() else mark_price
            
            return {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "open_interest": current_oi,
                "oi_change_24h": round(oi_change_pct, 2),
                "oi_change_value": round(oi_change_value, 2),
                "price": final_price,
                "price_change_24h": round(price_change_pct, 2) if 'current_close' in locals() else 0,
                "volume_24h": volume,
                "volume_change": round(volume_change_pct, 2) if 'volume_change_pct' in locals() and volume_change_pct != 0 else 0.01,
                "interpretation": self._interpret_oi(oi_change_pct, price_change_pct)
            }
        except Exception as e:
            # Fallback при ошибке - пытаемся получить хотя бы mark price
            try:
                session = await self._get_session()
                async with session.get(
                    f"{self.BASE_URL}/fapi/v1/premiumIndex",
                    params={"symbol": symbol},
                    headers={"Accept": "application/json"}
                ) as resp:
                    mark_data = await resp.json()
                    mark_price = float(mark_data.get('markPrice', 0))
                    return {
                        "symbol": symbol,
                        "timestamp": datetime.utcnow().isoformat(),
                        "open_interest": 0,
                        "oi_change_24h": 0,
                        "oi_change_value": 0,
                        "price": mark_price,
                        "price_change_24h": 0,
                        "volume_24h": 0,
                        "interpretation": self._interpret_oi(0, 0),
                        "error": str(e)
                    }
            except:
                pass
            
            # Ultimate fallback
            return {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "open_interest": 0,
                "oi_change_24h": 0,
                "oi_change_value": 0,
                "price": 0,
                "price_change_24h": 0,
                "volume_24h": 0,
                "interpretation": self._interpret_oi(0, 0),
                "error": str(e)
            }
    
    async def _get_oi_history(self, symbol: str, hours: int = 24) -> List[float]:
        """Получает историю OI за период (требует auth, пока отключено)"""
        # Этот endpoint требует API key на Binance
        # Возвращаем пустой список как заглушку
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
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            session = await self._get_session()
            
            # Получаем agg trades
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/aggTrades",
                params={"symbol": symbol, "limit": limit},
                headers={"Accept": "application/json"}
            ) as resp:
                trades = await resp.json()
                
            if not isinstance(trades, list):
                logger.warning(f"Unexpected trades data: {trades}")
                return self._empty_cvd(symbol)
            
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
        except Exception as e:
            logger.error(f"CVD fetch error: {e}")
            return self._empty_cvd(symbol)
    
    def _empty_cvd(self, symbol: str) -> Dict:
        """Fallback при ошибке получения CVD"""
        return {
            "symbol": symbol,
            "cvd_value": 0,
            "net_delta": 0,
            "buy_volume": 0,
            "sell_volume": 0,
            "delta_series": [0] * 100,
            "interpretation": "neutral",
            "error": "Data unavailable"
        }
    
    async def get_cluster_data(self, symbol: str = "BTCUSDT") -> Dict:
        """
        Получает данные для кластерного объема (агрегация по ценовым уровням)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            session = await self._get_session()
            
            # Получаем recent trades для кластеризации
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/aggTrades",
                params={"symbol": symbol, "limit": 1500},
                headers={"Accept": "application/json"}
            ) as resp:
                trades = await resp.json()
            
            print(f"DEBUG cluster: {symbol} trades count={len(trades) if isinstance(trades, list) else 'N/A'}, type={type(trades)}")
            
            if not isinstance(trades, list):
                logger.warning(f"Unexpected cluster data: {trades}")
                return self._empty_clusters(symbol)
            
            if len(trades) == 0:
                print(f"DEBUG cluster: {symbol} - empty trades list")
                return self._empty_clusters(symbol)
            
            # Адаптивный шаг на основе реального разброса цен в trades
            prices = [float(t['p']) for t in trades]
            min_p = min(prices)
            max_p = max(prices)
            sample_price = prices[0]
            price_range = max_p - min_p
            
            if price_range > 0:
                rough_step = price_range / 25
                magnitude = 10 ** math.floor(math.log10(rough_step))
                normalized = rough_step / magnitude
                if normalized < 1.5:
                    step = magnitude
                elif normalized < 3.5:
                    step = 2 * magnitude
                elif normalized < 7.5:
                    step = 5 * magnitude
                else:
                    step = 10 * magnitude
            else:
                # Fallback: adaptive step ~0.02% of price, rounded to clean number
                raw_step = sample_price * 0.0002
                if raw_step >= 100:
                    step = round(raw_step / 100) * 100
                elif raw_step >= 10:
                    step = round(raw_step / 10) * 10
                elif raw_step >= 1:
                    step = round(raw_step)
                elif raw_step >= 0.1:
                    step = round(raw_step, 1)
                else:
                    step = max(0.0001, round(raw_step, 4))
            
            print(f"DEBUG cluster: {symbol} price_range={price_range}, step={step}, min={min_p}, max={max_p}")
            
            # Агрегируем по ценовым уровням
            clusters = {}
            for trade in trades:
                price = float(trade['p'])
                qty = float(trade['q'])
                
                # Округляем цену для кластеризации (динамический шаг)
                rounded_price = round(price / step) * step
                
                if rounded_price not in clusters:
                    clusters[rounded_price] = {"buy": 0, "sell": 0, "total": 0}
                
                if trade['m']:  # Sell
                    clusters[rounded_price]["sell"] += qty
                else:  # Buy
                    clusters[rounded_price]["buy"] += qty
                
                clusters[rounded_price]["total"] += qty
            
            # Находим POC (Point of Control) - уровень с максимальным объемом
            poc_price = max(clusters.items(), key=lambda x: x[1]["total"])[0] if clusters else 0
            
            # Расчет VAH и VAL (Value Area High/Low) - 70% объема
            total_volume = sum(c["total"] for c in clusters.values())
            target_volume = total_volume * 0.7  # 70% объема
            
            if len(clusters) <= 1:
                vah = poc_price
                val = poc_price
                accumulated = total_volume
            else:
                # Правильный алгоритм: расширение окна вокруг POC по цене
                sorted_prices = sorted(clusters.keys())
                poc_idx = sorted_prices.index(poc_price)
                
                included = {poc_price}
                accumulated = clusters[poc_price]["total"]
                
                up_idx = poc_idx + 1
                down_idx = poc_idx - 1
                
                while accumulated < target_volume:
                    up_vol = clusters[sorted_prices[up_idx]]["total"] if up_idx < len(sorted_prices) else -1
                    down_vol = clusters[sorted_prices[down_idx]]["total"] if down_idx >= 0 else -1
                    
                    if up_vol <= 0 and down_vol <= 0:
                        break
                    
                    if up_vol >= down_vol:
                        included.add(sorted_prices[up_idx])
                        accumulated += up_vol
                        up_idx += 1
                    else:
                        included.add(sorted_prices[down_idx])
                        accumulated += down_vol
                        down_idx -= 1
                
                vah = max(included)
                val = min(included)
            
            print(f"DEBUG cluster: {symbol} clusters={len(clusters)}, step={step}, poc={poc_price}, vah={vah}, val={val}")
            if len(clusters) <= 3:
                print(f"DEBUG cluster: {symbol} sample clusters: {list(clusters.keys())[:5]}")
            
            # Сортируем по цене для ответа
            sorted_clusters = sorted(clusters.items(), key=lambda x: x[0])
            
            # Fix floating point precision for cheap assets
            decimals = 6 if sample_price < 1 else 4
            
            return {
                "symbol": symbol,
                "poc": round(float(poc_price), decimals),
                "vah": round(float(vah), decimals),
                "val": round(float(val), decimals),
                "total_volume": round(float(total_volume), 2),
                "value_area_volume": round(float(accumulated), 2),
                "clusters": [
                    {
                        "price": price,
                        "buy": round(data["buy"], 4),
                        "sell": round(data["sell"], 4),
                        "total": round(data["total"], 4),
                        "delta": round(data["buy"] - data["sell"], 4)
                    }
                    for price, data in sorted_clusters[-20:]  # Последние 20 уровней
                ]
            }
        except Exception as e:
            logger.error(f"Cluster fetch error: {e}")
            return self._empty_clusters(symbol)
    
    def _empty_clusters(self, symbol: str) -> Dict:
        """Fallback при ошибке получения кластеров"""
        return {
            "symbol": symbol,
            "poc": 0,
            "vah": 0,
            "val": 0,
            "total_volume": 0,
            "value_area_volume": 0,
            "clusters": [],
            "error": "Data unavailable"
        }
    
    async def get_liquidation_levels(self, symbol: str = "BTCUSDT") -> Dict:
        """
        Расчет уровней ликвидаций (примерные на основе популярных плеч)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            session = await self._get_session()
            
            # Получаем текущую цену
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/ticker/24hr",
                params={"symbol": symbol},
                headers={"Accept": "application/json"}
            ) as resp:
                ticker = await resp.json()
            
            current_price = float(ticker['lastPrice'])
            
            # Получаем funding rate для определения настроения
            try:
                async with session.get(
                    f"{self.BASE_URL}/fapi/v1/fundingRate",
                    params={"symbol": symbol, "limit": 1},
                    headers={"Accept": "application/json"}
                ) as resp:
                    funding = await resp.json()
                funding_rate = float(funding[0]['fundingRate']) if funding else 0
            except:
                funding_rate = 0
            
            # Расчет уровней ликвидаций для популярных плеч
            levels = {
                "current_price": current_price,
                "funding_rate": funding_rate,
                "long_liquidations": [
                    {"price": round(current_price * 0.95, 2), "leverage": "20x", "distance": "-5%"},
                    {"price": round(current_price * 0.90, 2), "leverage": "10x", "distance": "-10%"},
                    {"price": round(current_price * 0.80, 2), "leverage": "5x", "distance": "-20%"},
                ],
                "short_liquidations": [
                    {"price": round(current_price * 1.05, 2), "leverage": "20x", "distance": "+5%"},
                    {"price": round(current_price * 1.10, 2), "leverage": "10x", "distance": "+10%"},
                    {"price": round(current_price * 1.20, 2), "leverage": "5x", "distance": "+20%"},
                ],
                "closest_long": round(current_price * 0.95, 2),
                "closest_short": round(current_price * 1.05, 2),
                "funding_signal": "bearish" if funding_rate > 0.0001 else "bullish" if funding_rate < -0.0001 else "neutral"
            }
            
            return levels
        except Exception as e:
            logger.error(f"Liquidation levels error: {e}")
            # Fallback с примерными значениями
            return {
                "current_price": 70000,
                "funding_rate": 0,
                "long_liquidations": [
                    {"price": 66500, "leverage": "20x", "distance": "-5%"},
                    {"price": 63000, "leverage": "10x", "distance": "-10%"},
                ],
                "short_liquidations": [
                    {"price": 73500, "leverage": "20x", "distance": "+5%"},
                    {"price": 77000, "leverage": "10x", "distance": "+10%"},
                ],
                "funding_signal": "neutral",
                "error": "Using fallback data"
            }
    
    async def get_ema_levels(self, symbol: str = "BTCUSDT", timeframe: str = "1h") -> Dict:
        """
        Получение EMA 50 и 200 для определения тренда
        timeframe: 1h, 4h, 1d
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            session = await self._get_session()
            
            # Получаем свечи за последние 300 периодов (для EMA200)
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/klines",
                params={"symbol": symbol, "interval": timeframe, "limit": 300},
                headers={"Accept": "application/json"}
            ) as resp:
                klines = await resp.json()
            
            if not isinstance(klines, list) or len(klines) < 200:
                raise ValueError("Insufficient klines data")
            
            # Создаем DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            df['close'] = df['close'].astype(float)
            df['high'] = df['high'].astype(float)
            df['low'] = df['low'].astype(float)
            
            # Расчет EMA
            df['ema20'] = df['close'].ewm(span=20, adjust=False).mean()
            df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()
            df['ema200'] = df['close'].ewm(span=200, adjust=False).mean()
            
            # Расчет RSI
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            # Расчет MACD
            ema12 = df['close'].ewm(span=12, adjust=False).mean()
            ema26 = df['close'].ewm(span=26, adjust=False).mean()
            df['macd'] = ema12 - ema26
            df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
            df['macd_histogram'] = df['macd'] - df['macd_signal']
            
            current_price = df['close'].iloc[-1]
            ema20 = df['ema20'].iloc[-1]
            ema50 = df['ema50'].iloc[-1]
            ema200 = df['ema200'].iloc[-1]
            rsi = df['rsi'].iloc[-1]
            macd = df['macd'].iloc[-1]
            macd_signal = df['macd_signal'].iloc[-1]
            
            # Определяем тренд
            trend = "bullish" if current_price > ema50 > ema200 else \
                    "bearish" if current_price < ema50 < ema200 else "mixed"
            
            return {
                "current_price": float(round(current_price, 2)),
                "ema20": float(round(ema20, 2)),
                "ema50": float(round(ema50, 2)),
                "ema200": float(round(ema200, 2)),
                "rsi": float(round(rsi, 1)),
                "macd": float(round(macd, 2)),
                "macd_signal": float(round(macd_signal, 2)),
                "trend": str(trend),
                "distance_to_ema20_pct": float(round((current_price - ema20) / ema20 * 100, 2)),
                "distance_to_ema50_pct": float(round((current_price - ema50) / ema50 * 100, 2)),
                "distance_to_ema200_pct": float(round((current_price - ema200) / ema200 * 100, 2)),
                "support_levels": [float(round(ema20, 2)), float(round(ema50, 2)), float(round(ema200, 2))],
                "recommendation": "buy_dip" if trend == "bullish" and current_price > ema50 else \
                                "wait" if trend == "mixed" else "caution"
            }
        except Exception as e:
            logger.error(f"EMA levels error: {e}")
            # Fallback значения
            return {
                "current_price": 70000,
                "ema20": 69500,
                "ema50": 69000,
                "ema200": 68000,
                "rsi": 50,
                "macd": 0,
                "macd_signal": 0,
                "trend": "bullish",
                "distance_to_ema20_pct": 0.72,
                "distance_to_ema50_pct": 1.45,
                "distance_to_ema200_pct": 2.94,
                "support_levels": [69500, 69000, 68000],
                "recommendation": "buy_dip",
                "error": "Using fallback data"
            }
    
    async def get_spot_volume(self, symbol: str = "BTCUSDT", timeframe: str = "1h") -> Dict:
        """
        Получает спотовый объем для сравнения с фьючерсным
        """
        session = await self._get_session()
        
        # Маппинг таймфреймов для спота
        tf_map = {"1h": "1h", "4h": "4h", "1d": "1d"}
        interval = tf_map.get(timeframe, "1h")
        
        try:
            # Спотовые klines
            async with session.get(
                f"https://api.binance.com/api/v3/klines",
                params={"symbol": symbol, "interval": interval, "limit": 2},
                headers={"Accept": "application/json"}
            ) as resp:
                klines = await resp.json()
            
            if isinstance(klines, list) and len(klines) >= 2:
                current_volume = float(klines[1][5])
                prev_volume = float(klines[0][5])
                volume_change = ((current_volume - prev_volume) / prev_volume * 100) if prev_volume > 0 else 0
            else:
                current_volume = 0
                volume_change = 0
            
            return {
                "symbol": symbol,
                "timeframe": timeframe,
                "spot_volume": current_volume,
                "spot_volume_change": round(volume_change, 2)
            }
        except Exception as e:
            return {
                "symbol": symbol,
                "timeframe": timeframe,
                "spot_volume": 0,
                "spot_volume_change": 0,
                "error": str(e)
            }
    
    async def get_sentiment_metrics(self, symbol: str = "BTCUSDT") -> Dict:
        """
        Получает sentiment метрики из Binance Data Collection API:
        - Global Long/Short Account Ratio
        - Top Trader Long/Short Position Ratio
        - Taker Buy/Sell Volume Ratio
        """
        import logging
        logger = logging.getLogger(__name__)
        session = await self._get_session()
        
        try:
            async def fetch_json(url: str, params: dict):
                async with session.get(url, params=params, headers={"Accept": "application/json"}) as resp:
                    return await resp.json()
            
            ls_data, top_data, taker_data = await asyncio.gather(
                fetch_json(f"{self.BASE_URL}/futures/data/globalLongShortAccountRatio", {"symbol": symbol, "period": "1h", "limit": 1}),
                fetch_json(f"{self.BASE_URL}/futures/data/topLongShortPositionRatio", {"symbol": symbol, "period": "1h", "limit": 1}),
                fetch_json(f"{self.BASE_URL}/futures/data/takerlongshortRatio", {"symbol": symbol, "period": "1h", "limit": 1}),
                return_exceptions=True
            )
            
            # Parse global L/S ratio
            ls_ratio = None
            ls_long = ls_short = 0.5
            if isinstance(ls_data, list) and len(ls_data) > 0:
                ls_long = float(ls_data[0].get("longAccount", 0))
                ls_short = float(ls_data[0].get("shortAccount", 0))
                ls_ratio = ls_long / ls_short if ls_short > 0 else None
            
            # Parse top trader position ratio
            top_ratio = None
            top_long = top_short = 0.5
            if isinstance(top_data, list) and len(top_data) > 0:
                top_long = float(top_data[0].get("longAccount", 0))
                top_short = float(top_data[0].get("shortAccount", 0))
                top_ratio = top_long / top_short if top_short > 0 else None
            
            # Parse taker volume ratio
            taker_ratio = None
            taker_buy = taker_sell = 1.0
            if isinstance(taker_data, list) and len(taker_data) > 0:
                taker_buy = float(taker_data[0].get("buyVol", 0))
                taker_sell = float(taker_data[0].get("sellVol", 0))
                taker_ratio = taker_buy / taker_sell if taker_sell > 0 else None
            
            # Simple signal
            bullish_signals = 0
            bearish_signals = 0
            if ls_ratio is not None:
                if ls_ratio > 1.2:
                    bearish_signals += 1  # too many longs = potential squeeze down
                elif ls_ratio < 0.8:
                    bullish_signals += 1
            if top_ratio is not None:
                if top_ratio > 1.5:
                    bullish_signals += 1
                elif top_ratio < 0.67:
                    bearish_signals += 1
            if taker_ratio is not None:
                if taker_ratio > 1.1:
                    bullish_signals += 1
                elif taker_ratio < 0.9:
                    bearish_signals += 1
            
            if bullish_signals > bearish_signals:
                signal = "bullish"
            elif bearish_signals > bullish_signals:
                signal = "bearish"
            else:
                signal = "neutral"
            
            return {
                "symbol": symbol,
                "long_short_ratio": round(ls_ratio, 2) if ls_ratio is not None else 1.0,
                "long_accounts_pct": round(ls_long * 100, 1) if ls_long else 50.0,
                "short_accounts_pct": round(ls_short * 100, 1) if ls_short else 50.0,
                "top_trader_ratio": round(top_ratio, 2) if top_ratio is not None else 1.0,
                "top_long_pct": round(top_long * 100, 1) if top_long else 50.0,
                "top_short_pct": round(top_short * 100, 1) if top_short else 50.0,
                "taker_volume_ratio": round(taker_ratio, 2) if taker_ratio is not None else 1.0,
                "taker_buy": round(taker_buy, 2),
                "taker_sell": round(taker_sell, 2),
                "sentiment_signal": signal,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Sentiment metrics error: {e}")
            return {
                "symbol": symbol,
                "long_short_ratio": 1.0,
                "long_accounts_pct": 50.0,
                "short_accounts_pct": 50.0,
                "top_trader_ratio": 1.0,
                "top_long_pct": 50.0,
                "top_short_pct": 50.0,
                "taker_volume_ratio": 1.0,
                "taker_buy": 1.0,
                "taker_sell": 1.0,
                "sentiment_signal": "neutral",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def get_all_perpetual_symbols(self) -> List[str]:
        """Fetch all USDT perpetual futures symbols from Binance."""
        session = await self._get_session()
        try:
            async with session.get(
                f"{self.BASE_URL}/fapi/v1/exchangeInfo",
                headers={"Accept": "application/json"}
            ) as resp:
                data = await resp.json()
            
            symbols = []
            for s in data.get("symbols", []):
                if s.get("status") == "TRADING" and s.get("contractType") == "PERPETUAL":
                    symbols.append(s["symbol"])
            return symbols
        except Exception as e:
            print(f"DEBUG: Error fetching exchange info: {e}")
            return []
    
    async def close(self):
        if self.session:
            await self.session.close()
