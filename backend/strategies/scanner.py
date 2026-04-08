"""
Scanner — проверяет условия HYBRID стратегии каждые 5 минут
"""
import os
import asyncio
from datetime import datetime
from typing import Optional, Dict
import aiohttp
import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Импорт стратегии
try:
    from strategies.hybrid_final import HybridFinalStrategy
    STRATEGY_AVAILABLE = True
except ImportError:
    STRATEGY_AVAILABLE = False
    print("Warning: HybridFinalStrategy not available")


async def fetch_binance_data(symbol: str = "BTCUSDT", interval: str = "1h", limit: int = 100) -> pd.DataFrame:
    """Получаем данные с Binance (без API ключа — только публичные данные)."""
    url = f"https://fapi.binance.com/fapi/v1/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            data = await resp.json()
    
    # Преобразуем в DataFrame
    df = pd.DataFrame(data, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df.set_index('timestamp', inplace=True)
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    
    return df


async def check_signal(symbol: str = "BTCUSDT") -> Optional[Dict]:
    """
    Проверяем есть ли сигнал сейчас.
    Возвращает dict с параметрами сигнала или None.
    """
    if not STRATEGY_AVAILABLE:
        return None
    
    df = await fetch_binance_data(symbol)
    
    # Добавляем funding rate (можно получить отдельно или пока = 0)
    df['funding_rate'] = 0  # ← позже добавим реальный funding
    
    strategy = HybridFinalStrategy(df)
    
    # Проверяем последнюю свечу
    last_idx = len(strategy.df) - 1
    
    long_signal = strategy.check_long_signal(last_idx)
    short_signal = strategy.check_short_signal(last_idx)
    
    if not long_signal and not short_signal:
        return None
    
    direction = 'long' if long_signal else 'short'
    current_price = strategy.df['close'].iloc[last_idx]
    atr = strategy.df['atr'].iloc[last_idx]
    
    # Рассчитываем уровни
    if direction == 'long':
        entry = current_price
        stop = entry - (2.0 * atr)
        target = entry + (2.0 * (entry - stop))  # 2R
    else:
        entry = current_price
        stop = entry + (2.0 * atr)
        target = entry - (2.0 * (stop - entry))  # 2R
    
    confidence = 70 if strategy.df['rsi'].iloc[last_idx] > 40 else 60
    
    return {
        'symbol': symbol.replace('USDT', '/USDT'),
        'direction': direction,
        'entry_price': round(entry, 2),
        'target_price': round(target, 2),
        'stop_price': round(stop, 2),
        'confidence': confidence,
        'strategy': 'HYBRID_V1'
    }


async def scan_and_create_signal(api_base_url: str):
    """
    Основная функция сканера.
    Вызывается каждые 5 минут.
    """
    symbols = ['BTCUSDT']  # ← начнём с одной пары
    
    for symbol in symbols:
        signal = await check_signal(symbol)
        
        if signal:
            # Отправляем в API для создания сигнала
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{api_base_url}/api/v1/signals",
                    json=signal
                ) as resp:
                    if resp.status == 200:
                        print(f"[{datetime.now()}] Сигнал создан: {signal}")
                    else:
                        print(f"[{datetime.now()}] Ошибка создания: {await resp.text()}")


def start_scheduler(api_base_url: str = "http://localhost:8000"):
    """Запускаем планировщик."""
    scheduler = AsyncIOScheduler()
    
    # Каждые 5 минут
    scheduler.add_job(
        scan_and_create_signal,
        'interval',
        minutes=5,
        args=[api_base_url]
    )
    
    scheduler.start()
    print(f"[{datetime.now()}] Scanner запущен. Проверка каждые 5 минут.")
    
    return scheduler


if __name__ == "__main__":
    # Для теста вручную
    result = asyncio.run(check_signal("BTCUSDT"))
    print(result)
