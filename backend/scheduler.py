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
from fetchers.etf_farside import FarsideETFFetcher
from fetchers.binance_heatmap import BinanceHeatmapFetcher

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

async def save_heatmap_snapshot():
    """Сохраняет snapshot всех Binance Futures пар для heatmap"""
    try:
        fetcher = BinanceHeatmapFetcher()
        db = get_db()

        snapshot = await fetcher.get_snapshot()
        inserted = 0
        for item in snapshot:
            try:
                await db.execute(
                    """INSERT INTO heatmap_snapshots
                       (symbol, category, price, volume_24h, quote_volume_24h, price_change_pct, oi, snapshot_time)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                       ON CONFLICT (symbol, snapshot_time) DO NOTHING""",
                    [
                        item["symbol"],
                        item["category"],
                        item["price"],
                        item["volume_24h"],
                        item["quote_volume_24h"],
                        item["price_change_pct"],
                        item["oi"],
                    ]
                )
                inserted += 1
            except Exception as e:
                logger.error(f"[Scheduler] Heatmap insert error for {item.get('symbol')}: {e}")
                continue

        # Cleanup old snapshots (> 7 days)
        await db.execute(
            "DELETE FROM heatmap_snapshots WHERE snapshot_time < NOW() - INTERVAL '7 days'"
        )

        await fetcher.close()
        logger.info(f"[Scheduler] Heatmap snapshot saved: {inserted}/{len(snapshot)} symbols")
    except Exception as e:
        logger.error(f"[Scheduler] Heatmap snapshot failed: {e}")


async def save_etf_snapshot():
    """Собирает Bitcoin ETF flow данные с Farside"""
    try:
        fetcher = FarsideETFFetcher()
        db = get_db()
        
        # Получаем текущую цену BTC
        from fetchers.binance_futures import BinanceFuturesFetcher
        binance = BinanceFuturesFetcher()
        btc_data = await binance.get_oi_analysis("BTCUSDT", "1d")
        btc_price = btc_data.get("price", 0)
        await binance.close()
        
        records = await fetcher.get_daily_flows()
        if not records:
            logger.warning("[Scheduler] No ETF flow data fetched")
            await fetcher.close()
            return
        
        inserted = 0
        for r in records:
            try:
                await db.execute(
                    """INSERT INTO etf_flows (date, fund_ticker, fund_name, flow_usd, btc_price)
                       VALUES ($1, $2, $3, $4, $5)
                       ON CONFLICT (date, fund_ticker) DO UPDATE
                       SET flow_usd = EXCLUDED.flow_usd, btc_price = EXCLUDED.btc_price""",
                    [r["date"], r["fund_ticker"], r["fund_name"], r["flow_usd"], btc_price]
                )
                inserted += 1
            except Exception as e:
                logger.error(f"[Scheduler] Failed to insert ETF flow {r}: {e}")
        
        # Пересчитываем статистику фондов
        await _recalculate_etf_stats(db, btc_price)
        
        # Сохраняем агрегированный дневной срез
        await _save_etf_daily_summary(db, btc_price)
        
        await fetcher.close()
        logger.info(f"[Scheduler] ETF flows saved: {inserted} records, BTC price: {btc_price}")
    except Exception as e:
        logger.error(f"[Scheduler] ETF snapshot failed: {e}")


async def _recalculate_etf_stats(db, current_btc_price: float):
    """Пересчитывает cumulative stats для каждого фонда"""
    try:
        # Получаем все фонды (кроме TOTAL)
        funds = await db.query(
            "SELECT DISTINCT fund_ticker, fund_name FROM etf_flows WHERE fund_ticker != 'TOTAL'",
            []
        )
        
        for f in funds:
            ticker = f["fund_ticker"]
            name = f["fund_name"]
            rows = await db.query(
                "SELECT flow_usd, btc_price FROM etf_flows WHERE fund_ticker = $1 ORDER BY date ASC",
                [ticker]
            )
            
            total_invested = 0.0
            total_btc = 0.0
            for r in rows:
                flow = r["flow_usd"] or 0
                price = r["btc_price"] or current_btc_price
                if price <= 0:
                    price = current_btc_price
                total_invested += flow
                total_btc += flow / price
            
            avg_price = total_invested / total_btc if total_btc > 0 else 0
            aum = total_btc * current_btc_price
            pnl = aum - total_invested
            pnl_pct = (aum / total_invested - 1) * 100 if total_invested > 0 else 0
            
            await db.execute(
                """INSERT INTO etf_fund_stats
                   (fund_ticker, fund_name, total_invested_usd, total_btc_held, avg_btc_price, latest_aum_usd, unrealized_pnl_usd, unrealized_pnl_pct, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                   ON CONFLICT (fund_ticker) DO UPDATE SET
                   fund_name = EXCLUDED.fund_name,
                   total_invested_usd = EXCLUDED.total_invested_usd,
                   total_btc_held = EXCLUDED.total_btc_held,
                   avg_btc_price = EXCLUDED.avg_btc_price,
                   latest_aum_usd = EXCLUDED.latest_aum_usd,
                   unrealized_pnl_usd = EXCLUDED.unrealized_pnl_usd,
                   unrealized_pnl_pct = EXCLUDED.unrealized_pnl_pct,
                   updated_at = NOW()""",
                [ticker, name, total_invested, total_btc, avg_price, aum, pnl, pnl_pct]
            )
    except Exception as e:
        logger.error(f"[Scheduler] ETF stats recalculation failed: {e}")


async def _save_etf_daily_summary(db, btc_price: float):
    """Сохраняет агрегированный дневной срез AUM и BTC held"""
    try:
        # Определяем последнюю дату для которой есть flow данные
        latest_date_row = await db.query(
            "SELECT MAX(date) as max_date FROM etf_flows WHERE fund_ticker = 'TOTAL'",
            []
        )
        latest_date = latest_date_row[0]["max_date"] if latest_date_row else None
        if not latest_date:
            return
        
        # Суммарные значения по всем фондам
        agg = await db.query(
            """SELECT 
                COALESCE(SUM(latest_aum_usd), 0) as total_aum,
                COALESCE(SUM(total_btc_held), 0) as total_btc,
                COALESCE(SUM(total_invested_usd), 0) as total_invested
               FROM etf_fund_stats""",
            []
        )
        
        total_aum = agg[0]["total_aum"] if agg else 0
        total_btc = agg[0]["total_btc"] if agg else 0
        
        # Total flow за последнюю дату
        flow_row = await db.query(
            "SELECT flow_usd FROM etf_flows WHERE fund_ticker = 'TOTAL' AND date = $1",
            [latest_date]
        )
        total_flow = flow_row[0]["flow_usd"] if flow_row else 0
        
        await db.execute(
            """INSERT INTO etf_daily_summary
               (date, total_flow_usd, total_aum_usd, total_btc_held, btc_price, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (date) DO UPDATE SET
               total_flow_usd = EXCLUDED.total_flow_usd,
               total_aum_usd = EXCLUDED.total_aum_usd,
               total_btc_held = EXCLUDED.total_btc_held,
               btc_price = EXCLUDED.btc_price,
               updated_at = NOW()""",
            [latest_date, total_flow, total_aum, total_btc, btc_price]
        )
        logger.info(f"[Scheduler] ETF daily summary saved for {latest_date}: AUM=${total_aum:,.0f}, BTC={total_btc:,.2f}")
    except Exception as e:
        logger.error(f"[Scheduler] ETF daily summary failed: {e}")


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
    
    # Bitcoin ETF flows daily after US market close (21:00 UTC)
    scheduler.add_job(
        save_etf_snapshot,
        'cron',
        hour=21,
        minute=30,
        id='etf_snapshot',
        replace_existing=True
    )
    
    # Heatmap snapshot every 15 minutes
    scheduler.add_job(
        save_heatmap_snapshot,
        'interval',
        minutes=15,
        id='heatmap_snapshot',
        replace_existing=True
    )

    # Anomaly scanner every 5 minutes
    scheduler.add_job(
        run_anomaly_scan,
        'interval',
        minutes=5,
        id='anomaly_scan',
        replace_existing=True
    )

    scheduler.start()
    logger.info("[Scheduler] Started - OI snapshot every 5 minutes, Heatmap every 15 minutes, Anomaly scan every 5 minutes, Fundamentals daily at 02:30, ETF flows at 21:30, Reports at 08:00, Telegram alerts hourly")
    return scheduler

def stop_scheduler(scheduler):
    """Останавливает планировщик"""
    if scheduler:
        scheduler.shutdown()
        logger.info("[Scheduler] Stopped")

async def run_anomaly_scan():
    """Scheduled anomaly scanner job."""
    try:
        from scanners.anomaly_scanner import run_scanner_job
        await run_scanner_job()
    except Exception as e:
        logger.error(f"[Scheduler] Anomaly scan failed: {e}")
