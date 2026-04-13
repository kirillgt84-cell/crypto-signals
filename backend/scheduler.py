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
                    # Получаем данные с Binance (фьючерсы + спот)
                    data = await fetcher.get_oi_analysis(symbol, tf)
                    spot_data = await fetcher.get_spot_volume(symbol, tf)
                    
                    # Сохраняем в БД
                    await db.execute(
                        """INSERT INTO oi_history 
                           (time, symbol, timeframe, open_interest, price, volume, spot_volume, funding_rate)
                           VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
                           ON CONFLICT (time, symbol, timeframe) DO NOTHING""",
                        [
                            symbol,
                            tf,
                            data.get('open_interest', 0),
                            data.get('price', 0),
                            data.get('volume_24h', 0),
                            spot_data.get('spot_volume', 0),
                            data.get('funding_rate', 0)
                        ]
                    )
                    logger.info(f"[Scheduler] Saved OI for {symbol} {tf}: OI={data.get('open_interest', 0)}, SpotVol={spot_data.get('spot_volume', 0)}")
                    
                except Exception as e:
                    logger.error(f"[Scheduler] Failed to save {symbol} {tf}: {e}")
                    continue
        
        await fetcher.close()
        
    except Exception as e:
        logger.error(f"[Scheduler] Critical error: {e}")

async def save_fundamentals_snapshot():
    """Собирает фундаментальные метрики MVRV, NUPL, Funding"""
    try:
        from daily_fundamentals import collect_fundamentals
        await collect_fundamentals()
        logger.info("[Scheduler] Fundamentals collection completed")
    except Exception as e:
        logger.error(f"[Scheduler] Fundamentals collection failed: {e}")

async def should_run_fundamentals() -> bool:
    """Проверяет, есть ли свежие данные фундаменталок в БД"""
    try:
        db = get_db()
        row = await db.query(
            "SELECT 1 FROM fundamental_metrics WHERE computed_at > NOW() - INTERVAL '25 hours' LIMIT 1"
        )
        return not row
    except Exception:
        return True

def start_scheduler():
    """Запускает планировщик"""
    scheduler = AsyncIOScheduler()
    
    # Сохраняем OI каждые 5 минут для точности расчетов по таймфреймам
    scheduler.add_job(
        save_oi_snapshot,
        'interval',
        minutes=5,
        id='oi_snapshot',
        replace_existing=True
    )
    
    # Собираем фундаментальные метрики раз в день
    scheduler.add_job(
        save_fundamentals_snapshot,
        'cron',
        hour=2,
        minute=30,
        id='fundamentals_snapshot',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("[Scheduler] Started - OI snapshot every 5 minutes, Fundamentals daily at 02:30")
    return scheduler

def stop_scheduler(scheduler):
    """Останавливает планировщик"""
    if scheduler:
        scheduler.shutdown()
        logger.info("[Scheduler] Stopped")
