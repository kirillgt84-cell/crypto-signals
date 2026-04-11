"""
Scheduler для сохранения OI и других метрик каждые 15 минут
"""
import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fetchers.binance_futures import BinanceFuturesFetcher
from database import get_db

logger = logging.getLogger(__name__)

async def save_oi_snapshot():
    """Сохраняет OI для всех символов и таймфреймов"""
    try:
        fetcher = BinanceFuturesFetcher()
        db = get_db()
        
        symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT']
        timeframes = ['1h', '4h', '1d']
        
        for symbol in symbols:
            for tf in timeframes:
                try:
                    # Получаем данные с Binance
                    data = await fetcher.get_oi_analysis(symbol, tf)
                    
                    # Сохраняем в БД
                    await db.execute(
                        """INSERT INTO oi_history 
                           (time, symbol, timeframe, open_interest, price, volume, funding_rate)
                           VALUES (NOW(), $1, $2, $3, $4, $5, $6)
                           ON CONFLICT (time, symbol, timeframe) DO NOTHING""",
                        [
                            symbol,
                            tf,
                            data.get('open_interest', 0),
                            data.get('price', 0),
                            data.get('volume_24h', 0),
                            data.get('funding_rate', 0)
                        ]
                    )
                    logger.info(f"[Scheduler] Saved OI for {symbol} {tf}: {data.get('open_interest', 0)}")
                    
                except Exception as e:
                    logger.error(f"[Scheduler] Failed to save {symbol} {tf}: {e}")
                    continue
        
        await fetcher.close()
        
    except Exception as e:
        logger.error(f"[Scheduler] Critical error: {e}")

def start_scheduler():
    """Запускает планировщик"""
    scheduler = AsyncIOScheduler()
    
    # Сохраняем OI каждые 15 минут
    scheduler.add_job(
        save_oi_snapshot,
        'interval',
        minutes=15,
        id='oi_snapshot',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("[Scheduler] Started - OI snapshot every 15 minutes")
    return scheduler

def stop_scheduler(scheduler):
    """Останавливает планировщик"""
    if scheduler:
        scheduler.shutdown()
        logger.info("[Scheduler] Stopped")
