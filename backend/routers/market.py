"""
Router для market data (OI, CVD, Clusters)
"""
from fastapi import APIRouter, HTTPException
from fetchers.binance_futures import BinanceFuturesFetcher
from interpreters.oi_interpreter import interpret_oi_advanced

router = APIRouter(prefix="/api/v1/market", tags=["market"])

fetcher = BinanceFuturesFetcher()

@router.get("/oi/{symbol}")
async def get_oi_analysis(symbol: str):
    """
    Полная аналитика OI + интерпретация
    """
    try:
        data = await fetcher.get_oi_analysis(symbol.upper())
        
        # Добавляем расширенную интерпретацию если есть данные по объему
        # (в реальности нужно сравнивать с объемом 24ч назад)
        advanced = interpret_oi_advanced(
            data["oi_change_24h"],
            data["price_change_24h"],
            15  # Заглушка для примера, в реальности считать
        )
        
        data["analysis"] = advanced
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cvd/{symbol}")
async def get_cvd(symbol: str):
    """
    Cumulative Volume Delta
    """
    try:
        data = await fetcher.get_cvd(symbol.upper())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clusters/{symbol}")
async def get_clusters(symbol: str):
    """
    Кластерный объем
    """
    try:
        data = await fetcher.get_cluster_data(symbol.upper())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context/{symbol}")
async def get_context(symbol: str):
    """
    Общий контекст (цена + ключевые уровни)
    """
    try:
        # Можно добавить EMA, ATR расчет
        oi_data = await fetcher.get_oi_analysis(symbol.upper())
        
        return {
            "symbol": symbol,
            "price": oi_data["price"],
            "price_change_24h": oi_data["price_change_24h"],
            "oi": oi_data["open_interest"],
            "interpretation": oi_data["interpretation"],
            "timestamp": oi_data["timestamp"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
