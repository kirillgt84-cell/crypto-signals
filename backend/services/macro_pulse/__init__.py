"""
MacroPulse — Yield Curve Intelligence Module
FRED yield curve + historical analogs + cross-market regime detection
"""

from .fred_client import FREDClient, YieldCurveCalculator
from .pattern_engine import get_pattern_engine, MarketState
from .cross_market import get_cross_market_analyzer, CrossMarketAnalyzer, MarketRegime
from .interpretation_engine import get_interpretation_engine, InterpretationEngine

__all__ = [
    "FREDClient",
    "YieldCurveCalculator",
    "get_pattern_engine",
    "MarketState",
    "get_cross_market_analyzer",
    "CrossMarketAnalyzer",
    "MarketRegime",
    "get_interpretation_engine",
    "InterpretationEngine",
]
