"""
Router для market data (OI, CVD, Clusters)
"""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fetchers.binance_futures import BinanceFuturesFetcher
from interpreters.oi_interpreter import interpret_oi_advanced

router = APIRouter(prefix="/api/v1/market", tags=["market"])

fetcher = BinanceFuturesFetcher()

@router.get("/oi/{symbol}")
async def get_oi_analysis(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Полная аналитика OI + интерпретация
    """
    try:
        data = await fetcher.get_oi_analysis(symbol.upper(), timeframe)
        
        # Добавляем расширенную интерпретацию
        advanced = interpret_oi_advanced(
            data.get("oi_change_24h", 0),
            data.get("price_change_24h", 0),
            15
        )
        
        data["analysis"] = advanced
        data["timeframe"] = timeframe
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cvd/{symbol}")
async def get_cvd(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Cumulative Volume Delta
    """
    try:
        data = await fetcher.get_cvd(symbol.upper())
        data["timeframe"] = timeframe
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clusters/{symbol}")
async def get_clusters(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Кластерный объем
    """
    try:
        data = await fetcher.get_cluster_data(symbol.upper())
        data["timeframe"] = timeframe
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/{symbol}")
async def get_context(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Общий контекст (цена + ключевые уровни)
    """
    try:
        oi_data = await fetcher.get_oi_analysis(symbol.upper(), timeframe)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "price": oi_data["price"],
            "price_change": oi_data["price_change_24h"],
            "oi": oi_data["open_interest"],
            "interpretation": oi_data["interpretation"],
            "timestamp": oi_data["timestamp"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/levels/{symbol}")
async def get_levels(
    symbol: str,
    timeframe: str = Query("1h", description="Timeframe: 1h, 4h, 1d")
):
    """
    Ликвидационные уровни и EMA
    """
    try:
        liquidation = await fetcher.get_liquidation_levels(symbol.upper())
        ema = await fetcher.get_ema_levels(symbol.upper(), timeframe)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "liquidation_levels": liquidation,
            "ema_levels": ema,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
