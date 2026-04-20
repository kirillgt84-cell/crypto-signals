"""
Unified Macro Data Service
Объединяет Yield Curve Intelligence + существующий Macro модуль
"""

import os
import aiohttp
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Asset symbols для разных API
ASSET_SYMBOLS = {
    "SP500": {"yahoo": "^GSPC", "polygon": "SPY"},
    "GOLD": {"yahoo": "GC=F", "polygon": "GLD"},
    "VIX": {"yahoo": "^VIX", "polygon": "VIX"},
    "BTC": {"yahoo": "BTC-USD", "polygon": "X:BTCUSD"},
    "ETH": {"yahoo": "ETH-USD", "polygon": "X:ETHUSD"},
    "DXY": {"yahoo": "DX-Y.NYB", "polygon": "UUP"},
    "OIL": {"yahoo": "CL=F", "polygon": "USO"},
}


class MacroDataService:
    """
    Сервис для получения макро-данных (акции, сырьё, крипта)
    Объединяет с yield curve данными
    """
    
    def __init__(self, polygon_api_key: Optional[str] = None):
        self.polygon_key = polygon_api_key or os.getenv("POLYGON_API_KEY")
        self.cache = {}
    
    async def get_asset_price(self, asset: str) -> Optional[Dict]:
        """Получить текущую цену актива"""
        symbol = ASSET_SYMBOLS.get(asset, {}).get("yahoo")
        if not symbol:
            return None
        
        # Здесь будет интеграция с Yahoo Finance или Polygon
        # Пока возвращаем мок-структуру
        return {
            "asset": asset,
            "symbol": symbol,
            "price": None,
            "change_24h": None,
            "timestamp": datetime.now().isoformat(),
            "source": "yahoo_finance"
        }
    
    async def get_all_macro_prices(self) -> Dict[str, Dict]:
        """Получить цены всех макро-активов"""
        assets = ["SP500", "GOLD", "VIX", "BTC"]
        result = {}
        
        for asset in assets:
            result[asset] = await self.get_asset_price(asset)
        
        return result
    
    async def get_historical_prices(self, asset: str, days: int = 90) -> List[Dict]:
        """Получить исторические цены для актива"""
        # Интеграция с Yahoo Finance API
        pass
    
    @staticmethod
    def calculate_correlation(series1: List[float], series2: List[float]) -> float:
        """Рассчитать корреляцию Пирсона между двумя рядами"""
        import numpy as np
        
        if len(series1) != len(series2) or len(series1) < 2:
            return 0.0
        
        return float(np.corrcoef(series1, series2)[0, 1])
    
    async def get_correlations(self, window_days: int = 30) -> Dict:
        """
        Получить текущие корреляции между активами
        """
        # Получаем исторические данные
        spx_data = await self.get_historical_prices("SP500", window_days)
        btc_data = await self.get_historical_prices("BTC", window_days)
        gold_data = await self.get_historical_prices("GOLD", window_days)
        
        # Рассчитываем корреляции
        correlations = {
            "BTC_SPX": {
                "value": 0.0,  # Будет рассчитано
                "interpretation": self._interpret_btc_spx_corr(0.0),
                "window_days": window_days
            },
            "GOLD_BTC": {
                "value": 0.0,
                "interpretation": self._interpret_gold_btc_corr(0.0),
                "window_days": window_days
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return correlations
    
    def _interpret_btc_spx_corr(self, corr: float) -> str:
        """Интерпретация корреляции BTC-SPX"""
        if corr > 0.7:
            return "Высокая корреляция — крипта ведёт себя как риск-актив"
        elif corr > 0.4:
            return "Умеренная корреляция — частичная зависимость от фондового рынка"
        else:
            return "Низкая корреляция — крипта независима"
    
    def _interpret_gold_btc_corr(self, corr: float) -> str:
        """Интерпретация корреляции Gold-BTC"""
        if corr < -0.3:
            return "BTC как 'цифровое золото' — обратная корреляция"
        elif corr > 0.4:
            return "Движутся вместе — оба активы реагируют на одни факторы"
        else:
            return "Слабая связь — разная природа активов"


# Singleton
_macro_service = None

def get_macro_service() -> MacroDataService:
    """Получить singleton instance"""
    global _macro_service
    if _macro_service is None:
        _macro_service = MacroDataService()
    return _macro_service
