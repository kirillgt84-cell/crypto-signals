"""
Router для market data (OI, CVD, Clusters, Checklist)
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from fetchers.binance_futures import BinanceFuturesFetcher
from fetchers.okx import OKXFetcher
from interpreters.oi_interpreter import interpret_oi_advanced
from database import get_db
import numpy as np

router = APIRouter(prefix="/api/v1/market", tags=["market"])

fetcher = BinanceFuturesFetcher()
okx_fetcher = OKXFetcher()

async def get_liquidation_levels_enriched(symbol: str) -> Dict:
    """Реальные данные ликвидаций из OKX + funding/цена из Binance"""
    base_data = await fetcher.get_liquidation_levels(symbol)
    okx_items = await okx_fetcher.get_liquidation_data(symbol)
    
    if not okx_items:
        return base_data
    
    current_price = base_data.get("current_price", 0)
    
    longs = [x for x in okx_items if x["side"] == "Long"]
    shorts = [x for x in okx_items if x["side"] == "Short"]
    
    closest_long = current_price
    closest_short = current_price
    
    if longs:
        # ближайшая long-ликвидация ниже текущей цены
        below = [l["price"] for l in longs if l["price"] < current_price]
        closest_long = max(below) if below else min(l["price"] for l in longs)
    
    if shorts:
        # ближайшая short-ликвидация выше текущей цены
        above = [s["price"] for s in shorts if s["price"] > current_price]
        closest_short = min(above) if above else max(s["price"] for s in shorts)
    
    return {
        "current_price": current_price,
        "funding_rate": base_data.get("funding_rate", 0),
        "long_liquidations": longs,
        "short_liquidations": shorts,
        "closest_long": round(closest_long, 2),
        "closest_short": round(closest_short, 2),
        "funding_signal": base_data.get("funding_signal", "neutral"),
        "source": "okx"
    }


async def get_liquidation_heatmap(symbol: str, bucket_size: Optional[float] = None) -> Dict:
    """
    Aggregates OKX liquidation data into price buckets for heatmap visualization.
    Sizes are converted to USDT value for consistent comparison.
    """
    okx_items_raw = await okx_fetcher.get_liquidation_data(symbol)

    if not okx_items_raw:
        return {
            "buckets": [],
            "meta": {
                "maxSize": 0,
                "totalLongs": 0,
                "totalShorts": 0,
                "count": 0,
                "bucketSize": 0,
                "priceRange": [0, 0],
                "source": "none"
            }
        }

    # Convert sizes to USDT value (sz * price)
    okx_items = []
    for item in okx_items_raw:
        okx_items.append({
            "price": item["price"],
            "size": item["size"] * item["price"],
            "side": item["side"],
        })

    prices = [item["price"] for item in okx_items]
    min_p, max_p = min(prices), max(prices)

    if bucket_size is None:
        if min_p >= 20000:
            bucket_size = 100
        elif min_p >= 1000:
            bucket_size = 10
        elif min_p >= 100:
            bucket_size = 1
        elif min_p >= 1:
            bucket_size = 0.1
        else:
            bucket_size = 0.01

    buckets = defaultdict(lambda: {"longSize": 0.0, "shortSize": 0.0, "totalSize": 0.0, "count": 0})
    for item in okx_items:
        bucket_price = round(item["price"] / bucket_size) * bucket_size
        b = buckets[bucket_price]
        b["totalSize"] += item["size"]
        b["count"] += 1
        if item["side"] == "Long":
            b["longSize"] += item["size"]
        else:
            b["shortSize"] += item["size"]

    # Sort high to low (descending price) for vertical display
    sorted_buckets = []
    for price in sorted(buckets.keys(), reverse=True):
        b = buckets[price]
        sorted_buckets.append({
            "price": round(price, 4),
            "longSize": round(b["longSize"], 2),
            "shortSize": round(b["shortSize"], 2),
            "totalSize": round(b["totalSize"], 2),
            "count": b["count"]
        })

    max_size = max((b["totalSize"] for b in sorted_buckets), default=0)
    total_longs = sum(b["longSize"] for b in sorted_buckets)
    total_shorts = sum(b["shortSize"] for b in sorted_buckets)

    return {
        "buckets": sorted_buckets,
        "meta": {
            "maxSize": round(max_size, 2),
            "totalLongs": round(total_longs, 2),
            "totalShorts": round(total_shorts, 2),
            "count": len(okx_items),
            "bucketSize": bucket_size,
            "priceRange": [round(min_p, 2), round(max_p, 2)],
            "source": "okx"
        }
    }

def clean_json(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(v) for v in obj]
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

@router.get("/oi/{symbol}")
async def get_oi_analysis(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Полная аналитика OI + интерпретация
    Возвращает текущий OI и изменение за период из базы
    """
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        # Получаем текущие данные (OI, цена, объем за период)
        data = await fetcher.get_oi_analysis(symbol_upper, timeframe)
        
        # Получаем исторические данные для расчета изменения
        db = get_db()
        
        # Ищем OI за соответствующий таймфрейм назад
        hours_map = {"15m": 0.25, "1h": 1, "4h": 4, "1d": 24, "3d": 72, "1w": 168}
        hours = hours_map.get(timeframe, 1)
        minutes = hours * 60
        
        # 1. Пробуем найти запись с точным таймфреймом
        old_data = await db.query(
            f"""SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
               WHERE symbol = $1 AND timeframe = $2 
               AND time BETWEEN NOW() - INTERVAL '{minutes} minutes' - INTERVAL '30 minutes'
                            AND NOW() - INTERVAL '{minutes} minutes' + INTERVAL '30 minutes'
               ORDER BY ABS(EXTRACT(EPOCH FROM (time - (NOW() - INTERVAL '{minutes} minutes')))) ASC
               LIMIT 1""",
            [symbol_upper, timeframe]
        )
        
        # 2. Fallback: ищем в 1h данных за тот же период назад
        # (для монет вне топ-20 scheduler сохраняет только 1h)
        if not old_data or len(old_data) == 0:
            old_data = await db.query(
                f"""SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
                   WHERE symbol = $1 AND timeframe = '1h' 
                   AND time BETWEEN NOW() - INTERVAL '{minutes} minutes' - INTERVAL '30 minutes'
                                AND NOW() - INTERVAL '{minutes} minutes' + INTERVAL '30 minutes'
                   ORDER BY ABS(EXTRACT(EPOCH FROM (time - (NOW() - INTERVAL '{minutes} minutes')))) ASC
                   LIMIT 1""",
                [symbol_upper]
            )
        
        # 3. Final fallback: самая старая запись за последние 24ч (любой tf)
        if not old_data or len(old_data) == 0:
            old_data = await db.query(
                """SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
                   WHERE symbol = $1 AND time > NOW() - INTERVAL '24 hours'
                   ORDER BY time ASC LIMIT 1""",
                [symbol_upper]
            )
        
        # Если fetcher уже дал OI change (через openInterestHist), оставляем его
        # Иначе fallback на расчет из БД
        if data.get('oi_change_24h', 0) == 0 and old_data and len(old_data) > 0:
            old_oi = old_data[0]['open_interest']
            current_oi = data.get('open_interest', 0)
            oi_change_pct = ((current_oi - old_oi) / old_oi * 100) if old_oi > 0 else 0
            data['oi_change_24h'] = round(oi_change_pct, 2)
            data['oi_change_value'] = round(current_oi - old_oi, 2)
            print(f"DEBUG router fallback: OI calc - current={current_oi}, old={old_oi}, change={oi_change_pct:.2f}%")
        else:
            # Ensure keys always exist
            if 'oi_change_24h' not in data:
                data['oi_change_24h'] = 0
            if 'oi_change_value' not in data:
                data['oi_change_value'] = 0
            print(f"DEBUG router: using fetcher OI change={data.get('oi_change_24h', 0)}%")
        
        # volume_change уже рассчитан fetcher-ом за выбранный таймфрейм (klines)
        # Спотовый объем
        spot_data = await fetcher.get_spot_volume(symbol_upper, timeframe)
        data['spot_volume'] = spot_data.get('spot_volume', 0)
        # Используем kline-based изменение из fetcher-а (за выбранный таймфрейм)
        data['spot_volume_change'] = spot_data.get('spot_volume_change', 0)
        
        # Добавляем расширенную интерпретацию
        advanced = interpret_oi_advanced(
            data.get('oi_change_24h', 0),
            data.get('price_change_24h', 0),
            data.get('volume_change', 15)
        )
        
        # Расчет Exchange Flow: сначала пробуем реальный on-chain netflow из DeFiLlama
        netflow_data = await fetcher.get_exchange_netflow("Binance")
        if netflow_data.get("exchange_flow") is not None:
            exchange_flow = netflow_data["exchange_flow"]
            data["exchange_flow_source"] = "defillama"
            data["exchange_flow_raw_24h"] = netflow_data.get("inflows_24h")
            data["exchange_flow_tvl"] = netflow_data.get("clean_assets_tvl")
        else:
            # Fallback: synthetic metric как разница фьючерс/спот объема (24ч)
            # Положительный = больше активности на фьючерсах (спекуляция)
            # Отрицательный = больше на споте (аккумуляция)
            futures_volume = data.get('real_volume_24h', 0) or data.get('volume_24h', 0)
            spot_volume = data.get('spot_volume', 0)
            if futures_volume > 0 and spot_volume > 0:
                exchange_flow = ((futures_volume - spot_volume) / (futures_volume + spot_volume)) * 1000
            else:
                exchange_flow = 0
            data["exchange_flow_source"] = "synthetic"
        
        data["exchange_flow"] = round(exchange_flow, 2)
        data["analysis"] = advanced
        data["timeframe"] = timeframe
        return data
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/checklist/{symbol}")
async def get_checklist(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Полный чек-лист входа (7 фильтров)
    Возвращает score 0-7 и рекомендацию
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Checklist called: {symbol}, {timeframe}")
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        # Получаем все данные
        oi_data = await fetcher.get_oi_analysis(symbol_upper, timeframe)
        cvd_data = await fetcher.get_cvd(symbol_upper)
        clusters_data = await fetcher.get_cluster_data(symbol_upper)
        levels_data = await fetcher.get_ema_levels(symbol_upper, timeframe)
        liq_data = await get_liquidation_levels_enriched(symbol_upper)
        
        # Расчет изменения OI из базы
        db = get_db()
        hours_map = {"1h": 24, "4h": 24, "1d": 7}
        hours = hours_map.get(timeframe, 24)
        
        old_oi = await db.query(
            """SELECT open_interest FROM oi_history 
               WHERE symbol = $1 AND timeframe = $2 
               AND time < NOW() - INTERVAL '%s hours'
               ORDER BY time DESC LIMIT 1""" % hours,
            [symbol.upper(), timeframe]
        )
        
        if old_oi and len(old_oi) > 0:
            current_oi = oi_data.get('open_interest', 0)
            oi_change = ((current_oi - old_oi[0]['open_interest']) / old_oi[0]['open_interest'] * 100)
        else:
            oi_change = 0
        
        # Формируем чек-лист
        checks = {}
        score = 0
        
        # 1. OI Signal (Обязательный)
        oi_signal = oi_data.get('analysis', {}).get('signal', 'neutral')
        checks['oi_signal'] = {
            'passed': oi_signal in ['strong_bullish', 'bullish', 'strong_bearish', 'bearish'] and oi_signal != 'neutral',
            'value': oi_data.get('analysis', {}).get('status', 'neutral'),
            'description': 'OI + Price combination',
            'weight': 'required'
        }
        if checks['oi_signal']['passed']:
            score += 2
        
        # 2. CVD Confirmation (Обязательный)
        cvd_interp = cvd_data.get('interpretation', 'neutral')
        oi_trend = 'bullish' if 'bullish' in oi_signal else 'bearish' if 'bearish' in oi_signal else 'neutral'
        cvd_match = (oi_trend == cvd_interp) and cvd_interp != 'neutral'
        checks['cvd_confirmation'] = {
            'passed': cvd_match,
            'value': f"CVD: {cvd_interp}",
            'description': 'CVD confirms direction',
            'weight': 'required'
        }
        if checks['cvd_confirmation']['passed']:
            score += 2
        
        # 3. Volume Profile Clear (Обязательный)
        # Упрощенная проверка - считаем что путь свободен если есть кластеры
        clusters = clusters_data.get('clusters', [])
        has_clusters = len(clusters) > 0
        checks['cluster_clear'] = {
            'passed': has_clusters,
            'value': f"POC: {clusters_data.get('poc', 'N/A')}",
            'description': 'Volume profile data available',
            'weight': 'required'
        }
        if checks['cluster_clear']['passed']:
            score += 2
        
        # 4. EMA Position (Желательный)
        trend = levels_data.get('trend', 'mixed')
        distance_50 = levels_data.get('distance_to_ema50_pct', 0)
        ema_ok = trend != 'mixed' and abs(distance_50) < 2
        checks['ema_position'] = {
            'passed': ema_ok,
            'value': f"{trend} ({distance_50}%)",
            'description': 'Price at EMA50 (pullback)',
            'weight': 'preferred'
        }
        if checks['ema_position']['passed']:
            score += 1
        
        # 5. Funding Normal (Фоновый)
        funding = liq_data.get('funding_rate', 0)
        funding_ok = abs(funding) < 0.0001
        checks['funding_normal'] = {
            'passed': funding_ok,
            'value': f"{funding*100:.4f}%",
            'description': 'Funding not extreme',
            'weight': 'background'
        }
        if checks['funding_normal']['passed']:
            score += 0.5
        
        # Рекомендация
        required_passed = sum(1 for c in checks.values() if c['weight'] == 'required' and c['passed'])
        
        if required_passed == 3 and score >= 6:
            recommendation = "STRONG_BUY"
            action = "ENTRY ALLOWED"
            color = "green"
        elif required_passed == 3 and score >= 4:
            recommendation = "BUY"
            action = "ENTRY (caution)"
            color = "yellow"
        elif required_passed == 3:
            recommendation = "CAUTION"
            action = "CAUTION"
            color = "orange"
        else:
            recommendation = "WAIT"
            action = "WAIT"
            color = "red"
        
        return clean_json({
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "timestamp": datetime.utcnow().isoformat(),
            "score": score,
            "max_score": 7,
            "recommendation": recommendation,
            "action": action,
            "color": color,
            "checks": checks,
            "levels": {
                "price": oi_data.get('price'),
                "ema50": levels_data.get('ema50'),
                "ema200": levels_data.get('ema200'),
                "poc": clusters_data.get('poc'),
                "liquidation_long": liq_data.get('closest_long'),
                "liquidation_short": liq_data.get('closest_short')
            }
        })
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/cvd/{symbol}")
async def get_cvd(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """Cumulative Volume Delta"""
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        data = await fetcher.get_cvd(symbol_upper)
        data["timeframe"] = timeframe
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{symbol}")
async def get_profile(symbol: str):
    """Volume Profile (POC, VAH, VAL) + EMA levels"""
    try:
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        cluster_data = await fetcher.get_cluster_data(symbol_upper)
        ema_data = await fetcher.get_ema_levels(symbol_upper, "1h")
        
        return {
            **cluster_data,
            "ema20": ema_data.get("ema20"),
            "ema50": ema_data.get("ema50"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/levels/{symbol}")
async def get_levels(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """Ликвидационные уровни, heatmap и EMA"""
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        liquidation = await get_liquidation_levels_enriched(symbol_upper)
        heatmap = await get_liquidation_heatmap(symbol_upper)
        ema = await fetcher.get_ema_levels(symbol_upper, timeframe)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "liquidation_levels": liquidation,
            "liquidation_heatmap": heatmap,
            "ema_levels": ema,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/spot-volume/{symbol}")
async def get_spot_volume(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Спотовый объем для сравнения с фьючерсным
    """
    try:
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        data = await fetcher.get_spot_volume(symbol_upper, timeframe)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sentiment/{symbol}")
async def get_sentiment(
    symbol: str
):
    """
    Sentiment метрики: Long/Short ratio, Top Trader ratio, Taker volume ratio
    """
    try:
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        data = await fetcher.get_sentiment_metrics(symbol_upper)
        return clean_json(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/heatmap")
async def get_heatmap(
    timeframe: str = Query("1h", description="Timeframe: m15, 1h, 4h, 1d"),
    sector: str = Query("all", description="Sector filter: all, meme, defi, ai, gaming, layer-1, layer-2, infra, pow, metaverse, storage, nft, payment, rwa"),
    limit: int = Query(100, ge=1, le=300),
    min_volume: float = Query(1_000_000, ge=0, description="Minimum 24h quote volume in USDT"),
):
    """
    Heatmap data: volume & OI changes across Binance Futures pairs (excludes BTC, ETH, SOL, BNB).
    Compares current snapshot with historical snapshot based on timeframe.
    """
    from datetime import timedelta
    try:
        db = get_db()

        # Map timeframe to minutes
        tf_minutes = {"m15": 15, "1h": 60, "4h": 240, "1d": 1440}
        minutes = tf_minutes.get(timeframe, 60)

        # Get latest snapshot for each symbol
        latest_rows = await db.query(
            """SELECT DISTINCT ON (symbol)
                  symbol, category, price, volume_24h, quote_volume_24h, price_change_pct, oi, snapshot_time
               FROM heatmap_snapshots
               WHERE quote_volume_24h >= $1
               ORDER BY symbol, snapshot_time DESC""",
            [min_volume]
        )

        if not latest_rows:
            return clean_json({"timeframe": timeframe, "sector": sector, "items": []})

        # Find previous snapshot for each symbol
        items = []
        for row in latest_rows:
            sym = row["symbol"]
            prev_rows = await db.query(
                """SELECT volume_24h, quote_volume_24h, oi
                   FROM heatmap_snapshots
                   WHERE symbol = $1 AND snapshot_time <= NOW() - INTERVAL '%s minutes'
                   ORDER BY snapshot_time DESC LIMIT 1""" % minutes,
                [sym]
            )

            prev_vol = prev_rows[0]["quote_volume_24h"] if prev_rows else row["quote_volume_24h"]
            prev_oi = prev_rows[0]["oi"] if prev_rows else row["oi"]

            vol_change_pct = ((row["quote_volume_24h"] - prev_vol) / prev_vol * 100) if prev_vol and prev_vol > 0 else 0
            oi_change_pct = ((row["oi"] - prev_oi) / prev_oi * 100) if prev_oi and prev_oi > 0 else 0

            # Sector filter
            cat = row["category"] or "Other"
            if sector != "all" and cat.lower() != sector.lower():
                continue

            items.append({
                "symbol": sym,
                "category": cat,
                "price": float(row["price"] or 0),
                "price_change_pct": float(row["price_change_pct"] or 0),
                "quote_volume_24h": float(row["quote_volume_24h"] or 0),
                "volume_change_pct": round(vol_change_pct, 2),
                "oi": float(row["oi"] or 0),
                "oi_change_pct": round(oi_change_pct, 2),
            })

        # Sort by absolute volume change desc, then by absolute OI change
        items.sort(key=lambda x: (abs(x["volume_change_pct"]), abs(x["oi_change_pct"])), reverse=True)

        return clean_json({
            "timeframe": timeframe,
            "sector": sector,
            "count": len(items),
            "items": items[:limit],
        })
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")
# ── Market Gauge ─────────────────────────────────────────────────────────────

@router.get("/gauge")
async def get_market_gauge(
    symbol: str = Query("BTCUSDT", description="Trading pair symbol"),
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """RSI + MACD gauge with neutral signal interpretation."""
    import logging
    logger = logging.getLogger(__name__)

    if timeframe not in ("1h", "4h", "1d"):
        raise HTTPException(status_code=400, detail="timeframe must be 1h, 4h, or 1d")

    try:
        gauge = await fetcher.get_gauge_data(symbol.upper(), timeframe)
    except Exception as e:
        logger.error(f"Gauge fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    rsi = gauge.get("rsi", 50.0)
    macd_trend = gauge.get("macd_trend", "bull")
    macd_momentum = gauge.get("macd_momentum", "increasing")

    # Signal logic — returns type codes for i18n on frontend
    if rsi < 30 and macd_trend == "bull" and macd_momentum == "increasing":
        signal = {"type": "consider_longs", "strength": 5 if rsi < 20 else 4}
    elif rsi < 30 and macd_trend == "bear":
        signal = {"type": "await_bounce", "strength": 2}
    elif rsi < 45 and macd_trend == "bull":
        signal = {"type": "consider_longs", "strength": 3}
    elif 45 <= rsi <= 55:
        signal = {"type": "neutral", "strength": 1}
    elif rsi > 70 and macd_trend == "bear" and macd_momentum == "decreasing":
        signal = {"type": "consider_shorts", "strength": 5 if rsi > 80 else 4}
    elif rsi > 70 and macd_trend == "bull":
        signal = {"type": "await_correction", "strength": 2}
    elif rsi > 55 and macd_trend == "bear":
        signal = {"type": "consider_shorts", "strength": 3}
    else:
        signal = {"type": "neutral", "strength": 2}

    # RSI zone
    if rsi < 30:
        rsi_zone = "oversold"
    elif rsi > 70:
        rsi_zone = "overbought"
    else:
        rsi_zone = "neutral"

    from datetime import datetime, timezone
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "rsi": {
            "value": rsi,
            "zone": rsi_zone,
        },
        "macd": {
            "trend": macd_trend,
            "histogram": gauge.get("macd_histogram", [0.0, 0.0, 0.0, 0.0, 0.0]),
            "momentum": macd_momentum,
        },
        "signal": signal,
        "divergence": None,
    }


# Deploy timestamp: Sun Apr 12 09:39:12 CEST 2026

# ── Coin Search ──────────────────────────────────────────────────────────────

_coins_cache = {"data": [], "last_update": None}

@router.get("/coins")
async def get_coins(
    q: Optional[str] = Query(None, description="Search by symbol (e.g. BTC)"),
    limit: int = Query(200, ge=1, le=500)
):
    """List active Binance Futures USDT pairs with 24h volume/price."""
    import httpx
    from datetime import datetime

    now = datetime.utcnow()
    if not _coins_cache["data"] or (
        _coins_cache["last_update"] and
        (now - _coins_cache["last_update"]).seconds > 21600
    ):
        async with httpx.AsyncClient(timeout=30.0) as client:
            info_res = await client.get("https://fapi.binance.com/fapi/v1/exchangeInfo")
            symbols_info = info_res.json().get("symbols", [])
            ticker_res = await client.get("https://fapi.binance.com/fapi/v1/ticker/24hr")
            tickers = {t["symbol"]: t for t in ticker_res.json()}

        coins = []
        for s in symbols_info:
            if s.get("quoteAsset") != "USDT" or s.get("status") != "TRADING":
                continue
            sym = s["symbol"]
            t = tickers.get(sym, {})
            price = float(t.get("lastPrice", 0) or 0)
            vol = float(t.get("volume", 0) or 0)
            weighted_avg = float(t.get("weightedAvgPrice", 0) or 0)
            coins.append({
                "symbol": sym,
                "baseAsset": s.get("baseAsset", sym),
                "quoteAsset": "USDT",
                "volume_24h": vol * weighted_avg,
                "price": price,
                "priceChangePercent": float(t.get("priceChangePercent", 0) or 0),
            })
        coins.sort(key=lambda x: x["volume_24h"], reverse=True)
        _coins_cache["data"] = coins
        _coins_cache["last_update"] = now

    coins = _coins_cache["data"]
    if q:
        q = q.lower()
        coins = [c for c in coins if q in c["baseAsset"].lower() or c["baseAsset"].lower().startswith(q)]
    return clean_json(coins[:limit])
