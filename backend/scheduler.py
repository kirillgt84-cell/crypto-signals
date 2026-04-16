"""
Scheduler для сохранения OI и других метрик каждые 15 минут
"""
import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fetchers.binance_futures import BinanceFuturesFetcher
from database import get_db
from services.notifications import send_daily_reports, send_weekly_reports, send_telegram_alerts

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

async def run_daily_reports():
    """Wrapper for daily reports"""
    try:
        await send_daily_reports()
        logger.info("[Scheduler] Daily reports job completed")
    except Exception as e:
        logger.error(f"[Scheduler] Daily reports failed: {e}")

async def run_weekly_reports():
    """Wrapper for weekly reports"""
    try:
        await send_weekly_reports()
        logger.info("[Scheduler] Weekly reports job completed")
    except Exception as e:
        logger.error(f"[Scheduler] Weekly reports failed: {e}")

async def run_telegram_alerts():
    """Wrapper for Telegram alerts"""
    try:
        await send_telegram_alerts()
        logger.info("[Scheduler] Telegram alerts job completed")
    except Exception as e:
        logger.error(f"[Scheduler] Telegram alerts failed: {e}")

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
    
    # Daily reports at 08:00 UTC
    scheduler.add_job(
        run_daily_reports,
        'cron',
        hour=8,
        minute=0,
        id='daily_reports',
        replace_existing=True
    )
    
    # Weekly reports on Monday at 08:00 UTC
    scheduler.add_job(
        run_weekly_reports,
        'cron',
        day_of_week='mon',
        hour=8,
        minute=0,
        id='weekly_reports',
        replace_existing=True
    )
    
    # Telegram alerts every hour
    scheduler.add_job(
        run_telegram_alerts,
        'interval',
        hours=1,
        id='telegram_alerts',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("[Scheduler] Started - OI snapshot every 5 minutes, Fundamentals daily at 02:30, Reports at 08:00, Telegram alerts hourly")
    return scheduler

def stop_scheduler(scheduler):
    """Останавливает планировщик"""
    if scheduler:
        scheduler.shutdown()
        logger.info("[Scheduler] Stopped")
