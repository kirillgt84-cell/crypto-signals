"""
Router для market data (OI, CVD, Clusters, Checklist)
"""
from datetime import datetime, timedelta
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

def clean_json(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(v) for v in obj]
    elif isinstance(obj, (np.bool_, np.bool)):
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
        # 1h -> 1 час назад, 4h -> 4 часа назад, 1d -> 24 часа назад
        hours_map = {"1h": 1, "4h": 4, "1d": 24}
        hours = hours_map.get(timeframe, 1)
        
        # Ищем запись за период `hours` назад (с допуском ±30 мин)
        print(f"DEBUG router: Looking for {symbol_upper} {timeframe}, hours={hours}")
        
        # Используем минуты для корректного SQL (избегаем '1 hours' vs '1 hour')
        minutes = hours * 60
        old_data = await db.query(
            f"""SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
               WHERE symbol = $1 AND timeframe = $2 
               AND time BETWEEN NOW() - INTERVAL '{minutes} minutes' - INTERVAL '30 minutes'
                            AND NOW() - INTERVAL '{minutes} minutes' + INTERVAL '30 minutes'
               ORDER BY ABS(EXTRACT(EPOCH FROM (time - (NOW() - INTERVAL '{minutes} minutes')))) ASC
               LIMIT 1""",
            [symbol_upper, timeframe]
        )
        
        print(f"DEBUG router: old_data (exact match) = {old_data}")
        
        # Fallback: если нет точного попадания, берем самую старую запись за сегодня
        if not old_data or len(old_data) == 0:
            old_data = await db.query(
                """SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
                   WHERE symbol = $1 AND timeframe = $2 
                   AND time > NOW() - INTERVAL '24 hours'
                   ORDER BY time ASC LIMIT 1""",
                [symbol_upper, timeframe]
            )
            print(f"DEBUG router: old_data (fallback) = {old_data}")
        
        # Проверим последние записи вообще (без фильтра времени)
        latest_data = await db.query(
            """SELECT open_interest, price, volume, spot_volume, time FROM oi_history 
               WHERE symbol = $1 AND timeframe = $2 
               ORDER BY time DESC LIMIT 3""",
            [symbol_upper, timeframe]
        )
        print(f"DEBUG router: latest 3 records = {latest_data}")
        
        # Расчет изменения OI из БД (если есть история)
        if old_data and len(old_data) > 0:
            old_oi = old_data[0]['open_interest']
            current_oi = data.get('open_interest', 0)
            oi_change_pct = ((current_oi - old_oi) / old_oi * 100) if old_oi > 0 else 0
            data['oi_change_24h'] = round(oi_change_pct, 2)
            data['oi_change_value'] = round(current_oi - old_oi, 2)
            print(f"DEBUG router: OI calc - current={current_oi}, old={old_oi}, change={oi_change_pct:.2f}%")
            
            # Расчет изменения фьючерсного объема
            old_volume = old_data[0].get('volume', 0) or 0
            current_volume = data.get('volume_24h', 0)
            volume_change_pct = ((current_volume - old_volume) / old_volume * 100) if old_volume > 0 else 0
            data['volume_change'] = round(volume_change_pct, 2)
            
            # Расчет изменения спотового объема
            old_spot_volume = old_data[0].get('spot_volume', 0) or 0
            spot_data = await fetcher.get_spot_volume(symbol_upper, timeframe)
            current_spot_volume = spot_data.get('spot_volume', 0)
            spot_volume_change_pct = ((current_spot_volume - old_spot_volume) / old_spot_volume * 100) if old_spot_volume > 0 else 0
            data['spot_volume'] = current_spot_volume
            data['spot_volume_change'] = round(spot_volume_change_pct, 2)
        else:
            # Нет исторических данных - оставляем 0
            data['oi_change_24h'] = 0
            data['oi_change_value'] = 0
            data['volume_change'] = data.get('volume_change', 0)
            spot_data = await fetcher.get_spot_volume(symbol_upper, timeframe)
            data['spot_volume'] = spot_data.get('spot_volume', 0)
            data['spot_volume_change'] = 0
        
        # Добавляем расширенную интерпретацию
        advanced = interpret_oi_advanced(
            data.get('oi_change_24h', 0),
            data.get('price_change_24h', 0),
            data.get('volume_change', 15)
        )
        
        # Расчет Exchange Flow как разница фьючерс/спот объема
        # Положительный = больше активности на фьючерсах (спекуляция)
        # Отрицательный = больше на споте (аккумуляция)
        futures_volume = data.get('volume_24h', 0)
        spot_volume = data.get('spot_volume', 0)
        if futures_volume > 0 and spot_volume > 0:
            exchange_flow = ((futures_volume - spot_volume) / (futures_volume + spot_volume)) * 1000
        else:
            exchange_flow = 0
        
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
            'description': 'OI + Price комбинация',
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
            'description': 'CVD подтверждает направление',
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
            'description': 'Данные профиля объема доступны',
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
            'description': 'Цена у EMA50 (pullback)',
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
            'description': 'Funding не экстремальный',
            'weight': 'background'
        }
        if checks['funding_normal']['passed']:
            score += 0.5
        
        # Рекомендация
        required_passed = sum(1 for c in checks.values() if c['weight'] == 'required' and c['passed'])
        
        if required_passed == 3 and score >= 6:
            recommendation = "STRONG_BUY"
            action = "ВХОД РАЗРЕШЕН"
            color = "green"
        elif required_passed == 3 and score >= 4:
            recommendation = "BUY"
            action = "ВХОД (внимание)"
            color = "yellow"
        elif required_passed == 3:
            recommendation = "CAUTION"
            action = "ОСТОРОЖНО"
            color = "orange"
        else:
            recommendation = "WAIT"
            action = "ОЖИДАНИЕ"
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
    """Volume Profile (POC, VAH, VAL)"""
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        data = await fetcher.get_cluster_data(symbol_upper)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/levels/{symbol}")
async def get_levels(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """Ликвидационные уровни и EMA"""
    try:
        # Добавляем USDT к символу если его нет
        symbol_upper = symbol.upper()
        if not symbol_upper.endswith('USDT'):
            symbol_upper = f"{symbol_upper}USDT"
        
        liquidation = await get_liquidation_levels_enriched(symbol_upper)
        ema = await fetcher.get_ema_levels(symbol_upper, timeframe)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "liquidation_levels": liquidation,
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
# Deploy timestamp: Sun Apr 12 09:39:12 CEST 2026
