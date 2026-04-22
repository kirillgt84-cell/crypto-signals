"""
FRED API Client for fetching yield curve data
API: https://fred.stlouisfed.org/docs/api/fred/
"""

import os
import aiohttp
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

FRED_BASE_URL = "https://api.stlouisfed.org/fred"

# Series IDs for Treasury yields
TREASURY_SERIES = {
    "3M": "DGS3MO",    # 3-Month Treasury
    "2Y": "DGS2",      # 2-Year Treasury
    "5Y": "DGS5",      # 5-Year Treasury
    "7Y": "DGS7",      # 7-Year Treasury
    "10Y": "DGS10",    # 10-Year Treasury
    "30Y": "DGS30",    # 30-Year Treasury
}

@dataclass
class FREDConfig:
    api_key: str
    base_url: str = FRED_BASE_URL
    timeout: int = 30


class FREDClient:
    """FRED API client"""
    
    def __init__(self, config: Optional[FREDConfig] = None):
        self.config = config or FREDConfig(
            api_key=os.getenv("FRED_API_KEY", "")
        )
        if not self.config.api_key:
            logger.warning("FRED_API_KEY not set!")
    
    async def _request(self, endpoint: str, params: Dict) -> Dict:
        """Base request method"""
        url = f"{self.config.base_url}/{endpoint}"
        params["api_key"] = self.config.api_key
        params["file_type"] = "json"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=self.config.timeout) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise Exception(f"FRED API error {resp.status}: {text}")
                return await resp.json()
    
    async def get_series_observations(
        self,
        series_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Get observations for a series"""
        params = {
            "series_id": series_id,
            "limit": limit,
            "sort_order": "desc"
        }
        if start_date:
            params["observation_start"] = start_date
        if end_date:
            params["observation_end"] = end_date
        
        data = await self._request("series/observations", params)
        return data.get("observations", [])
    
    async def get_yield_curve(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, List[Dict]]:
        """Get full yield curve"""
        result = {}
        
        for tenor, series_id in TREASURY_SERIES.items():
            try:
                observations = await self.get_series_observations(
                    series_id=series_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=1
                )
                result[tenor] = observations
            except Exception as e:
                logger.error(f"Error fetching {tenor} ({series_id}): {e}")
                result[tenor] = []
        
        return result
    
    async def get_historical_yields(
        self,
        tenor: str,
        years: int = 10
    ) -> List[Dict]:
        """Get historical data for a tenor"""
        end = datetime.now()
        start = end - timedelta(days=years * 365)
        
        series_id = TREASURY_SERIES.get(tenor)
        if not series_id:
            raise ValueError(f"Unknown tenor: {tenor}")
        
        return await self.get_series_observations(
            series_id=series_id,
            start_date=start.strftime("%Y-%m-%d"),
            end_date=end.strftime("%Y-%m-%d"),
            limit=10000
        )


class YieldCurveCalculator:
    """Spread and indicator calculator"""
    
    @staticmethod
    def calculate_spreads(yields: Dict[str, float]) -> Dict[str, float]:
        """Calculate key spreads"""
        spreads = {}
        
        if "10Y" in yields and "2Y" in yields:
            spreads["10Y_2Y"] = yields["10Y"] - yields["2Y"]
        
        if "10Y" in yields and "3M" in yields:
            spreads["10Y_3M"] = yields["10Y"] - yields["3M"]
        
        if "5Y" in yields and "2Y" in yields:
            spreads["5Y_2Y"] = yields["5Y"] - yields["2Y"]
        
        if "30Y" in yields and "10Y" in yields:
            spreads["30Y_10Y"] = yields["30Y"] - yields["10Y"]
        
        return spreads
    
    @staticmethod
    def calculate_recession_probability(spread_10y_3m: float) -> Dict:
        """Calculate recession probability (NY Fed model)"""
        import math
        
        beta_0 = -0.5334
        beta_1 = -0.6330
        
        logit = beta_0 + beta_1 * spread_10y_3m
        probability = 1 / (1 + math.exp(-logit))
        
        prob_pct = probability * 100
        if prob_pct < 10:
            confidence = "LOW"
        elif prob_pct < 25:
            confidence = "MODERATE"
        elif prob_pct < 50:
            confidence = "HIGH"
        else:
            confidence = "VERY_HIGH"
        
        return {
            "probability_12m": round(prob_pct, 2),
            "spread": spread_10y_3m,
            "logit": round(logit, 4),
            "confidence": confidence,
            "model": "NY Fed Logistic (Estrella-Mishkin)"
        }
    
    @staticmethod
    def determine_curve_shape(yields: Dict[str, float]) -> str:
        """Determine curve shape"""
        if "10Y" not in yields or "2Y" not in yields:
            return "unknown"
        
        spread_10y_2y = yields["10Y"] - yields["2Y"]
        
        if spread_10y_2y < -0.10:
            return "inverted"
        elif abs(spread_10y_2y) < 0.25:
            return "flat"
        elif "5Y" in yields and "2Y" in yields:
            spread_5y_2y = yields["5Y"] - yields["2Y"]
            if spread_5y_2y < 0 and spread_10y_2y > 0:
                return "humped"
        
        return "normal"
