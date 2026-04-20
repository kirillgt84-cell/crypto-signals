"""
Unified Dashboard State
Объединяет все модули: Yield Curve + Macro + Cross-Market
"""

from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class UnifiedDashboardState:
    """
    Полное состояние дашборда — все модули в одном объекте
    """
    
    # Метаданные
    timestamp: datetime = field(default_factory=datetime.now)
    data_quality: str = "full"  # full, partial, stale
    
    # === YIELD CURVE MODULE ===
    yield_curve: Dict = field(default_factory=dict)
    spreads: Dict = field(default_factory=dict)
    recession_probability: Dict = field(default_factory=dict)
    curve_shape: str = "unknown"
    inversion_active: bool = False
    inversion_duration_days: Optional[int] = None
    
    # === MACRO MODULE ===
    macro_prices: Dict = field(default_factory=dict)
    correlations: Dict = field(default_factory=dict)
    vix_level: Optional[float] = None
    vix_interpretation: str = ""
    
    # === CROSS-MARKET MODULE ===
    market_regime: str = "unknown"
    regime_bias: str = "neutral"  # bullish, bearish, neutral
    risk_level: str = "moderate"  # low, moderate, high, extreme
    cross_market_impacts: List = field(default_factory=list)
    
    # === PATTERN MATCHING ===
    historical_analogs: List = field(default_factory=list)
    top_analog: Optional[str] = None
    analog_similarity: float = 0.0
    aggregated_forecast: Dict = field(default_factory=dict)
    
    # === SIGNALS ===
    active_signals: List = field(default_factory=list)
    critical_alerts: List = field(default_factory=list)
    
    def to_api_response(self) -> Dict:
        """Конвертировать в API response"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "data_quality": self.data_quality,
            
            "yield_curve": {
                "yields": self.yield_curve,
                "spreads": self.spreads,
                "shape": self.curve_shape,
                "inversion_active": self.inversion_active,
                "inversion_duration_days": self.inversion_duration_days,
            },
            
            "recession": self.recession_probability,
            
            "macro": {
                "prices": self.macro_prices,
                "correlations": self.correlations,
                "vix": {
                    "level": self.vix_level,
                    "interpretation": self.vix_interpretation
                }
            },
            
            "market_regime": {
                "regime": self.market_regime,
                "bias": self.regime_bias,
                "risk_level": self.risk_level,
                "impacts": self.cross_market_impacts
            },
            
            "historical_analogs": {
                "matches": self.historical_analogs[:3],
                "top_match": self.top_analog,
                "similarity": self.analog_similarity,
                "forecast": self.aggregated_forecast
            },
            
            "signals": {
                "active": self.active_signals,
                "critical": self.critical_alerts,
                "count": len(self.active_signals) + len(self.critical_alerts)
            }
        }
