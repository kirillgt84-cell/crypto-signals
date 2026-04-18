"""
Volume Spike / OI Anomaly Scanner
Top-150 USDT perpetual pairs, score 0-13, 24h cooldown.
Signals-only (no auto-trading).
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from database import get_db
from fetchers.binance_heatmap import BinanceHeatmapFetcher

logger = logging.getLogger(__name__)

MIN_QUOTE_VOLUME = 2_000_000.0
SCAN_TOP_N = 150
DEFAULT_MIN_SCORE = 8


def _score_volume_ratio(ratio: float) -> int:
    if ratio < 1.5:
        return 0
    if ratio < 2.5:
        return 1
    if ratio < 4.0:
        return 2
    if ratio < 6.0:
        return 3
    if ratio < 10.0:
        return 4
    return 5


def _score_oi_spike(oi_change_pct: float) -> int:
    abs_change = abs(oi_change_pct)
    if abs_change < 3.0:
        return 0
    if abs_change < 5.0:
        return 1
    if abs_change < 8.0:
        return 2
    if abs_change < 12.0:
        return 3
    if abs_change < 20.0:
        return 4
    return 5


def _score_price_momentum(price_change_pct: float) -> int:
    abs_change = abs(price_change_pct)
    if abs_change < 2.0:
        return 0
    if abs_change < 4.0:
        return 1
    if abs_change < 7.0:
        return 2
    return 3


def _short_squeeze_bonus(price_change_pct: float, oi_change_pct: float) -> int:
    if price_change_pct > 10.0 and oi_change_pct < -10.0:
        return 3
    if price_change_pct > 5.0 and oi_change_pct < -5.0:
        return 2
    return 0


def _calculate_confidence(score: int) -> str:
    if score >= 10:
        return "high"
    if score >= 8:
        return "medium"
    return "low"


def _determine_direction(price_change_pct: float, oi_change_pct: float) -> str:
    if price_change_pct > 0:
        return "LONG"
    if price_change_pct < -1.0 and oi_change_pct > 3.0:
        return "SHORT"
    if price_change_pct < 0:
        return "SHORT"
    return "LONG"


async def _get_current_data(fetcher: BinanceHeatmapFetcher) -> List[Dict[str, Any]]:
    exchange_info = await fetcher.get_exchange_info()
    valid_symbols = {s["symbol"] for s in exchange_info}
    base_map = {s["symbol"]: s["baseAsset"] for s in exchange_info}
    cat_map = {s["symbol"]: s["category"] for s in exchange_info}

    tickers = await fetcher.get_all_tickers()
    ticker_map: Dict[str, Dict] = {}
    for t in tickers:
        sym = t.get("symbol", "")
        if sym in valid_symbols:
            ticker_map[sym] = t

    oi_data = await fetcher.get_all_open_interest(list(ticker_map.keys()))

    results = []
    for sym, ticker in ticker_map.items():
        quote_vol = float(ticker.get("quoteVolume", 0) or 0)
        if quote_vol < MIN_QUOTE_VOLUME:
            continue
        results.append({
            "symbol": sym,
            "base_asset": base_map.get(sym, sym.replace("USDT", "")),
            "category": cat_map.get(sym, "Other"),
            "price": float(ticker.get("lastPrice", 0) or 0),
            "quote_volume_24h": quote_vol,
            "volume_24h": float(ticker.get("volume", 0) or 0),
            "price_change_pct": float(ticker.get("priceChangePercent", 0) or 0),
            "oi": oi_data.get(sym, 0.0),
        })

    results.sort(key=lambda x: x["quote_volume_24h"], reverse=True)
    return results[:SCAN_TOP_N]


async def _get_baselines(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    db = get_db()
    baselines: Dict[str, Dict[str, Any]] = {}
    if not symbols:
        return baselines

    placeholders = ",".join(f"${i+1}" for i in range(len(symbols)))
    avg_rows = await db.query(
        f"""SELECT symbol, AVG(quote_volume_24h) as avg_quote_volume
            FROM heatmap_snapshots
            WHERE symbol IN ({placeholders})
              AND snapshot_time > NOW() - INTERVAL '7 days'
            GROUP BY symbol""",
        symbols,
    )
    for r in avg_rows:
        baselines.setdefault(r["symbol"], {})["avg_quote_volume"] = float(r["avg_quote_volume"] or 0)

    oi_rows = await db.query(
        f"""SELECT DISTINCT ON (symbol) symbol, oi, snapshot_time
            FROM heatmap_snapshots
            WHERE symbol IN ({placeholders})
              AND snapshot_time > NOW() - INTERVAL '2 hours'
              AND snapshot_time < NOW() - INTERVAL '30 minutes'
            ORDER BY symbol, snapshot_time DESC""",
        symbols,
    )
    for r in oi_rows:
        baselines.setdefault(r["symbol"], {})["oi_1h_ago"] = float(r["oi"] or 0)
        baselines.setdefault(r["symbol"], {})["oi_1h_time"] = r["snapshot_time"]

    return baselines


async def _filter_cooldown(symbols: List[str]) -> set:
    db = get_db()
    if not symbols:
        return set()
    placeholders = ",".join(f"${i+1}" for i in range(len(symbols)))
    rows = await db.query(
        f"""SELECT DISTINCT symbol FROM anomaly_signals
            WHERE symbol IN ({placeholders})
              AND expires_at > NOW()""",
        symbols,
    )
    return {r["symbol"] for r in rows}


async def scan_anomalies(min_score: int = DEFAULT_MIN_SCORE) -> List[Dict[str, Any]]:
    fetcher = BinanceHeatmapFetcher()
    try:
        current_data = await _get_current_data(fetcher)
    finally:
        await fetcher.close()

    if not current_data:
        logger.warning("[Scanner] No current data fetched")
        return []

    symbols = [c["symbol"] for c in current_data]
    baselines = await _get_baselines(symbols)
    cooldown_symbols = await _filter_cooldown(symbols)

    signals = []
    for item in current_data:
        sym = item["symbol"]
        if sym in cooldown_symbols:
            continue

        baseline = baselines.get(sym, {})
        avg_vol = baseline.get("avg_quote_volume", 0.0)
        oi_1h = baseline.get("oi_1h_ago", 0.0)

        if avg_vol <= 0:
            continue

        volume_ratio = item["quote_volume_24h"] / avg_vol
        vol_score = _score_volume_ratio(volume_ratio)
        if vol_score < 2:
            continue

        oi_change_pct = 0.0
        if oi_1h > 0:
            oi_change_pct = ((item["oi"] - oi_1h) / oi_1h) * 100.0

        oi_score = _score_oi_spike(oi_change_pct)
        price_score = _score_price_momentum(item["price_change_pct"])
        squeeze_bonus = _short_squeeze_bonus(item["price_change_pct"], oi_change_pct)
        total_score = vol_score + oi_score + price_score + squeeze_bonus

        if total_score < min_score:
            continue

        direction = _determine_direction(item["price_change_pct"], oi_change_pct)
        confidence = _calculate_confidence(total_score)

        signals.append({
            "symbol": sym,
            "base_asset": item["base_asset"],
            "category": item["category"],
            "direction": direction,
            "score": total_score,
            "volume_ratio": round(volume_ratio, 2),
            "oi_change_pct": round(oi_change_pct, 2),
            "price_change_24h_pct": round(item["price_change_pct"], 2),
            "price": round(item["price"], 6),
            "quote_volume_24h": round(item["quote_volume_24h"], 2),
            "confidence": confidence,
            "details": {
                "volume_score": vol_score,
                "oi_score": oi_score,
                "price_score": price_score,
                "squeeze_bonus": squeeze_bonus,
            },
        })

    signals.sort(key=lambda x: x["score"], reverse=True)
    logger.info(f"[Scanner] Found {len(signals)} anomalies (min_score={min_score})")
    return signals


async def save_anomaly_signals(signals: List[Dict[str, Any]]) -> int:
    db = get_db()
    inserted = 0
    for s in signals:
        try:
            await db.execute(
                """INSERT INTO anomaly_signals
                   (symbol, base_asset, category, direction, score, volume_ratio,
                    oi_change_pct, price_change_24h_pct, price, quote_volume_24h,
                    confidence, details, triggered_at, expires_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW() + INTERVAL '24 hours')
                   ON CONFLICT (symbol, triggered_at) DO NOTHING""",
                [
                    s["symbol"],
                    s["base_asset"],
                    s["category"],
                    s["direction"],
                    s["score"],
                    s["volume_ratio"],
                    s["oi_change_pct"],
                    s["price_change_24h_pct"],
                    s["price"],
                    s["quote_volume_24h"],
                    s["confidence"],
                    str(s["details"]),
                ],
            )
            inserted += 1
        except Exception as e:
            logger.error(f"[Scanner] Failed to insert signal for {s['symbol']}: {e}")
    return inserted


async def run_scanner_job():
    try:
        signals = await scan_anomalies(min_score=DEFAULT_MIN_SCORE)
        if signals:
            inserted = await save_anomaly_signals(signals)
            logger.info(f"[Scanner] Saved {inserted}/{len(signals)} anomaly signals")
        else:
            logger.info("[Scanner] No anomalies found")
    except Exception as e:
        logger.error(f"[Scanner] Job failed: {e}")
