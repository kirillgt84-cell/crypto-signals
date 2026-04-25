"""
Macro sync service: fetches traditional asset prices and computes correlations with BTC.
"""
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import numpy as np

from database import get_db
from fetchers.macro_yahoo import MacroYahooFetcher

logger = logging.getLogger(__name__)


async def sync_macro_prices():
    """Fetch latest prices for all macro assets and save to DB."""
    db = get_db()
    fetcher = MacroYahooFetcher()
    try:
        assets = await db.query("SELECT id, key FROM macro_assets WHERE is_active = TRUE", [])
        for asset in assets:
            asset_id = asset["id"]
            key = asset["key"]
            try:
                hist = await fetcher.get_historical(key, period="5y", interval="1d")
                for candle in hist:
                    dt = candle["time"]
                    if isinstance(dt, datetime) and dt.tzinfo is not None:
                        from datetime import timezone
                        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                    await db.execute(
                        """INSERT INTO macro_prices
                           (asset_id, time, open_price, high_price, low_price, close_price, volume)
                           VALUES ($1, $2, $3, $4, $5, $6, $7)
                           ON CONFLICT (asset_id, time) DO UPDATE SET
                             open_price = EXCLUDED.open_price,
                             high_price = EXCLUDED.high_price,
                             low_price = EXCLUDED.low_price,
                             close_price = EXCLUDED.close_price,
                             volume = EXCLUDED.volume""",
                        [asset_id, dt, candle["open"], candle["high"], candle["low"], candle["close"], candle["volume"]],
                    )
                logger.info(f"[Macro] Synced {len(hist)} candles for {key}")
            except Exception as e:
                logger.error(f"[Macro] Failed to sync {key}: {e}")
    finally:
        pass


async def _get_daily_returns(db, asset_id: int, days: int = 30) -> List[float]:
    """Get daily returns for an asset over last N days."""
    rows = await db.query(
        """SELECT close_price FROM macro_prices
           WHERE asset_id = $1
           ORDER BY time DESC LIMIT $2""",
        [asset_id, days],
    )
    prices = [r["close_price"] for r in rows if r["close_price"] is not None]
    prices.reverse()
    if len(prices) < 3:
        return []
    returns = [(prices[i] - prices[i - 1]) / prices[i - 1] for i in range(1, len(prices))]
    return returns


async def calculate_correlations():
    """Compute BTC-SPX and Gold-BTC correlations using last 30 days."""
    db = get_db()
    try:
        # Find asset IDs
        assets = await db.query("SELECT id, key FROM macro_assets WHERE key IN ('spx500', 'gold')", [])
        asset_map = {a["key"]: a["id"] for a in assets}

        # BTC data from oi_history (use last price of each day)
        btc_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, price
               FROM oi_history
               WHERE symbol = 'BTCUSDT' AND time > NOW() - INTERVAL '45 days'
               ORDER BY DATE(time), time DESC""",
            [],
        )
        btc_prices = {str(r["day"]): r["price"] for r in btc_rows}

        # Get macro prices aligned with BTC dates
        spx_id = asset_map.get("spx500")
        gold_id = asset_map.get("gold")
        vix_id = (await db.query("SELECT id FROM macro_assets WHERE key = 'vix' LIMIT 1", []))
        vix_id = vix_id[0]["id"] if vix_id else None

        btc_returns = []
        spx_returns = []
        gold_returns = []
        vix_returns = []

        for row in btc_rows:
            day = row["day"]
            btc_price = row["price"]
            # Get macro prices for this day
            spx_row = await db.query(
                "SELECT close_price FROM macro_prices WHERE asset_id = $1 AND DATE(time AT TIME ZONE 'UTC') = $2 LIMIT 1",
                [spx_id, day],
            )
            gold_row = await db.query(
                "SELECT close_price FROM macro_prices WHERE asset_id = $1 AND DATE(time AT TIME ZONE 'UTC') = $2 LIMIT 1",
                [gold_id, day],
            )
            vix_row = await db.query(
                "SELECT close_price FROM macro_prices WHERE asset_id = $1 AND DATE(time AT TIME ZONE 'UTC') = $2 LIMIT 1",
                [vix_id, day],
            )
            if spx_row and gold_row:
                btc_returns.append(btc_price)
                spx_returns.append(spx_row[0]["close_price"])
                gold_returns.append(gold_row[0]["close_price"])
                if vix_row:
                    vix_returns.append(vix_row[0]["close_price"])

        if len(btc_returns) < 5:
            logger.warning("[Macro] Not enough aligned data for correlation")
            return

        # Calculate returns
        btc_r = [(btc_returns[i] - btc_returns[i - 1]) / btc_returns[i - 1] for i in range(1, len(btc_returns))]
        spx_r = [(spx_returns[i] - spx_returns[i - 1]) / spx_returns[i - 1] for i in range(1, len(spx_returns))]
        gold_r = [(gold_returns[i] - gold_returns[i - 1]) / gold_returns[i - 1] for i in range(1, len(gold_returns))]
        vix_r = [(vix_returns[i] - vix_returns[i - 1]) / vix_returns[i - 1] for i in range(1, len(vix_returns))] if len(vix_returns) == len(btc_returns) else []

        # Correlations
        btc_spx_corr = float(np.corrcoef(btc_r, spx_r)[0, 1]) if len(btc_r) == len(spx_r) and len(btc_r) > 2 else None
        gold_btc_corr = float(np.corrcoef(gold_r, btc_r)[0, 1]) if len(gold_r) == len(btc_r) and len(gold_r) > 2 else None
        vix_btc_corr = float(np.corrcoef(vix_r, btc_r)[0, 1]) if len(vix_r) == len(btc_r) and len(vix_r) > 2 else None

        # Latest VIX level
        vix_price = None
        if vix_id:
            vix_row = await db.query(
                "SELECT close_price FROM macro_prices WHERE asset_id = $1 ORDER BY time DESC LIMIT 1",
                [vix_id],
            )
            if vix_row:
                vix_price = vix_row[0]["close_price"]

        await db.execute(
            """INSERT INTO macro_correlations
               (date, btc_spx_correlation, gold_btc_correlation, vix_btc_correlation, vix_level, btc_price, spx_price, gold_price)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (date) DO UPDATE SET
                 btc_spx_correlation = EXCLUDED.btc_spx_correlation,
                 gold_btc_correlation = EXCLUDED.gold_btc_correlation,
                 vix_btc_correlation = EXCLUDED.vix_btc_correlation,
                 vix_level = EXCLUDED.vix_level,
                 btc_price = EXCLUDED.btc_price,
                 spx_price = EXCLUDED.spx_price,
                 gold_price = EXCLUDED.gold_price,
                 calculated_at = NOW()""",
            [datetime.utcnow().date(), btc_spx_corr, gold_btc_corr, vix_btc_corr, vix_price, btc_returns[-1], spx_returns[-1], gold_returns[-1]],
        )
        logger.info(f"[Macro] Correlations saved: BTC↔SPX={btc_spx_corr:.3f}, Gold↔BTC={gold_btc_corr:.3f}, VIX↔BTC={vix_btc_corr:.3f}")
    except Exception as e:
        logger.error(f"[Macro] Correlation calculation failed: {e}")


async def backfill_correlations():
    """Backfill macro_correlations for all available history using monthly 30-day windows."""
    db = get_db()
    try:
        assets = await db.query("SELECT id, key FROM macro_assets WHERE key IN ('spx500', 'gold', 'vix')", [])
        asset_map = {a["key"]: a["id"] for a in assets}
        spx_id = asset_map.get("spx500")
        gold_id = asset_map.get("gold")
        vix_id = asset_map.get("vix")

        btc_rows = await db.query(
            """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, price
               FROM oi_history
               WHERE symbol = 'BTCUSDT' AND time > NOW() - INTERVAL '5 years'
               ORDER BY DATE(time), time DESC""",
            [],
        )
        if len(btc_rows) < 5:
            logger.warning("[Macro Backfill] Not enough BTC data")
            return

        all_days = sorted([str(r["day"]) for r in btc_rows])
        btc_map = {str(r["day"]): r["price"] for r in btc_rows}

        async def get_macro_map(asset_id):
            if not asset_id:
                return {}
            rows = await db.query(
                """SELECT DISTINCT ON (DATE(time)) DATE(time) as day, close_price
                   FROM macro_prices WHERE asset_id = $1 AND time > NOW() - INTERVAL '5 years'
                   ORDER BY DATE(time), time DESC""",
                [asset_id],
            )
            return {str(r["day"]): r["close_price"] for r in rows}

        spx_map = await get_macro_map(spx_id)
        gold_map = await get_macro_map(gold_id)
        vix_map = await get_macro_map(vix_id)

        from collections import defaultdict
        month_days = defaultdict(list)
        for day in all_days:
            month_days[day[:7]].append(day)

        backfilled = 0
        for month_str in sorted(month_days.keys()):
            days = month_days[month_str]
            end_day = max(days)
            end_idx = all_days.index(end_day)
            start_idx = max(0, end_idx - 29)
            window = all_days[start_idx:end_idx + 1]

            btc_vals = [btc_map[d] for d in window if d in btc_map]
            spx_vals = [spx_map[d] for d in window if d in spx_map]
            gold_vals = [gold_map[d] for d in window if d in gold_map]
            vix_vals = [vix_map[d] for d in window if d in vix_map]

            if len(btc_vals) < 5 or len(spx_vals) < 5 or len(gold_vals) < 5:
                continue

            btc_r = [(btc_vals[i] - btc_vals[i - 1]) / btc_vals[i - 1] for i in range(1, len(btc_vals))]
            spx_r = [(spx_vals[i] - spx_vals[i - 1]) / spx_vals[i - 1] for i in range(1, len(spx_vals))]
            gold_r = [(gold_vals[i] - gold_vals[i - 1]) / gold_vals[i - 1] for i in range(1, len(gold_vals))]
            vix_r = [(vix_vals[i] - vix_vals[i - 1]) / vix_vals[i - 1] for i in range(1, len(vix_vals))] if len(vix_vals) == len(btc_vals) else []

            btc_spx_corr = float(np.corrcoef(btc_r, spx_r)[0, 1]) if len(btc_r) == len(spx_r) and len(btc_r) > 2 else None
            gold_btc_corr = float(np.corrcoef(gold_r, btc_r)[0, 1]) if len(gold_r) == len(btc_r) and len(gold_r) > 2 else None
            vix_btc_corr = float(np.corrcoef(vix_r, btc_r)[0, 1]) if len(vix_r) == len(btc_r) and len(vix_r) > 2 else None

            vix_price = vix_map.get(end_day)

            await db.execute(
                """INSERT INTO macro_correlations
                   (date, btc_spx_correlation, gold_btc_correlation, vix_btc_correlation, vix_level, btc_price, spx_price, gold_price)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (date) DO UPDATE SET
                     btc_spx_correlation = EXCLUDED.btc_spx_correlation,
                     gold_btc_correlation = EXCLUDED.gold_btc_correlation,
                     vix_btc_correlation = EXCLUDED.vix_btc_correlation,
                     vix_level = EXCLUDED.vix_level,
                     btc_price = EXCLUDED.btc_price,
                     spx_price = EXCLUDED.spx_price,
                     gold_price = EXCLUDED.gold_price,
                     calculated_at = NOW()""",
                [datetime.strptime(end_day, "%Y-%m-%d").date(), btc_spx_corr, gold_btc_corr, vix_btc_corr, vix_price,
                 btc_map.get(end_day), spx_map.get(end_day), gold_map.get(end_day)],
            )
            backfilled += 1

        logger.info(f"[Macro Backfill] Backfilled {backfilled} monthly correlation records")
    except Exception as e:
        logger.error(f"[Macro Backfill] Failed: {e}")
