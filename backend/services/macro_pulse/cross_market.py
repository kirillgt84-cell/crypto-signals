"""
Cross-Market Correlation Analyzer
Correlation analysis between yield curve and other markets
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MarketRegime(Enum):
    """Market regimes based on yield curve"""
    RISK_ON = "risk_on"                    # Normal curve, growth
    RISK_OFF_EARLY = "risk_off_early"      # Beginning of inversion
    RISK_OFF_LATE = "risk_off_late"        # Deep inversion
    RECOVERY = "recovery"                  # Exiting inversion
    TRANSITION = "transition"              # Flat curve


@dataclass
class MarketImpact:
    """Impact on a specific market"""
    asset: str
    direction: str  # UP, DOWN, SIDEWAYS
    magnitude: str  # SMALL, MODERATE, LARGE, EXTREME
    typical_return_3m: Optional[float]
    typical_return_6m: Optional[float]
    typical_return_12m: Optional[float]
    confidence: float  # 0-100
    key_drivers: List[str]


@dataclass
class CrossMarketSignal:
    """Composite signal for all markets"""
    regime: MarketRegime
    yield_curve_shape: str
    recession_probability: float
    timestamp: datetime
    impacts: List[MarketImpact]
    overall_bias: str  # BULLISH, BEARISH, NEUTRAL
    risk_level: str    # LOW, MODERATE, HIGH, EXTREME
    narrative_key: str
    narrative_params: Dict[str, Any] = field(default_factory=dict)


class CrossMarketAnalyzer:
    """
    Cross-market correlation analyzer
    
    Based on historical correlations between:
    - Yield curve shape
    - Fed policy phase
    - Risk assets performance
    """
    
    # Historical correlations by regime
    REGIME_IMPACTS = {
        MarketRegime.RISK_ON: {
            'bias': 'BULLISH',
            'risk_level': 'LOW',
            'impacts': {
                'SP500': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 3, '6m': 6, '12m': 12},
                'NASDAQ': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 4, '6m': 8, '12m': 15},
                'BTC': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 10, '6m': 20, '12m': 40},
                'ETH': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 12, '6m': 25, '12m': 50},
                'GOLD': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 0, '6m': 2, '12m': 5},
                'OIL': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 5, '6m': 8, '12m': 10},
                'DXY': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 0, '6m': -1, '12m': -2},
            }
        },
        MarketRegime.RISK_OFF_EARLY: {
            'bias': 'CAUTIOUS',
            'risk_level': 'MODERATE',
            'impacts': {
                'SP500': {'direction': 'SIDEWAYS', 'magnitude': 'MODERATE', '3m': -2, '6m': -5, '12m': -10},
                'NASDAQ': {'direction': 'DOWN', 'magnitude': 'MODERATE', '3m': -5, '6m': -10, '12m': -15},
                'BTC': {'direction': 'DOWN', 'magnitude': 'LARGE', '3m': -15, '6m': -20, '12m': -25},
                'ETH': {'direction': 'DOWN', 'magnitude': 'LARGE', '3m': -20, '6m': -30, '12m': -35},
                'GOLD': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 5, '6m': 10, '12m': 15},
                'OIL': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 0, '6m': -2, '12m': -5},
                'DXY': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 2, '6m': 5, '12m': 8},
            }
        },
        MarketRegime.RISK_OFF_LATE: {
            'bias': 'BEARISH',
            'risk_level': 'HIGH',
            'impacts': {
                'SP500': {'direction': 'DOWN', 'magnitude': 'LARGE', '3m': -8, '6m': -15, '12m': -25},
                'NASDAQ': {'direction': 'DOWN', 'magnitude': 'EXTREME', '3m': -12, '6m': -25, '12m': -35},
                'BTC': {'direction': 'DOWN', 'magnitude': 'EXTREME', '3m': -25, '6m': -40, '12m': -50},
                'ETH': {'direction': 'DOWN', 'magnitude': 'EXTREME', '3m': -30, '6m': -50, '12m': -60},
                'GOLD': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 8, '6m': 15, '12m': 25},
                'OIL': {'direction': 'DOWN', 'magnitude': 'LARGE', '3m': -10, '6m': -20, '12m': -25},
                'DXY': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 5, '6m': 10, '12m': 15},
            }
        },
        MarketRegime.RECOVERY: {
            'bias': 'BULLISH',
            'risk_level': 'MODERATE',
            'impacts': {
                'SP500': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 5, '6m': 12, '12m': 20},
                'NASDAQ': {'direction': 'UP', 'magnitude': 'LARGE', '3m': 8, '6m': 18, '12m': 30},
                'BTC': {'direction': 'UP', 'magnitude': 'EXTREME', '3m': 20, '6m': 50, '12m': 100},
                'ETH': {'direction': 'UP', 'magnitude': 'EXTREME', '3m': 25, '6m': 60, '12m': 120},
                'GOLD': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 5, '6m': 10, '12m': 15},
                'OIL': {'direction': 'UP', 'magnitude': 'MODERATE', '3m': 8, '6m': 15, '12m': 20},
                'DXY': {'direction': 'DOWN', 'magnitude': 'MODERATE', '3m': -3, '6m': -5, '12m': -8},
            }
        },
        MarketRegime.TRANSITION: {
            'bias': 'NEUTRAL',
            'risk_level': 'MODERATE',
            'impacts': {
                'SP500': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 0, '6m': 2, '12m': 5},
                'NASDAQ': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': -1, '6m': 3, '12m': 8},
                'BTC': {'direction': 'SIDEWAYS', 'magnitude': 'LARGE', '3m': -5, '6m': 10, '12m': 20},
                'ETH': {'direction': 'SIDEWAYS', 'magnitude': 'LARGE', '3m': -8, '6m': 12, '12m': 25},
                'GOLD': {'direction': 'UP', 'magnitude': 'SMALL', '3m': 3, '6m': 5, '12m': 8},
                'OIL': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 2, '6m': 3, '12m': 5},
                'DXY': {'direction': 'SIDEWAYS', 'magnitude': 'SMALL', '3m': 1, '6m': 2, '12m': 3},
            }
        }
    }
    
    def determine_regime(self, curve_shape: str, 
                        spread_10y2y: float,
                        recession_prob: float,
                        fed_trend: str = "neutral") -> MarketRegime:
        """
        Determine current market regime
        """
        if curve_shape == "INVERTED":
            if recession_prob > 50:
                return MarketRegime.RISK_OFF_LATE
            else:
                return MarketRegime.RISK_OFF_EARLY
        
        elif curve_shape == "FLAT":
            return MarketRegime.TRANSITION
        
        elif curve_shape == "NORMAL":
            if recession_prob > 30:
                # Normalization after inversion
                return MarketRegime.RECOVERY
            else:
                return MarketRegime.RISK_ON
        
        return MarketRegime.TRANSITION
    
    def generate_cross_market_signal(self, 
                                     curve_shape: str,
                                     spread_10y2y: float,
                                     recession_prob: float,
                                     fed_trend: str = "neutral") -> CrossMarketSignal:
        """
        Generate composite signal for all markets
        """
        regime = self.determine_regime(curve_shape, spread_10y2y, recession_prob, fed_trend)
        regime_data = self.REGIME_IMPACTS[regime]
        
        impacts = []
        for asset, data in regime_data['impacts'].items():
            impact = MarketImpact(
                asset=asset,
                direction=data['direction'],
                magnitude=data['magnitude'],
                typical_return_3m=data['3m'],
                typical_return_6m=data['6m'],
                typical_return_12m=data['12m'],
                confidence=75 if regime == MarketRegime.RISK_OFF_LATE else 65,
                key_drivers=self._get_drivers(regime, asset)
            )
            impacts.append(impact)
        
        narrative_key, narrative_params = self._generate_narrative(regime, curve_shape, recession_prob)

        return CrossMarketSignal(
            regime=regime,
            yield_curve_shape=curve_shape,
            recession_probability=recession_prob,
            timestamp=datetime.now(),
            impacts=impacts,
            overall_bias=regime_data['bias'],
            risk_level=regime_data['risk_level'],
            narrative_key=narrative_key,
            narrative_params=narrative_params,
        )
    
    def _get_drivers(self, regime: MarketRegime, asset: str) -> List[str]:
        """Get key drivers for an asset in the given regime"""
        drivers = {
            MarketRegime.RISK_ON: {
                'SP500': ['Economic growth', 'Earnings expansion', 'Low volatility'],
                'NASDAQ': ['Tech growth', 'Lower discount rates', 'Risk appetite'],
                'BTC': ['Liquidity expansion', 'Risk-on sentiment', 'Institutional adoption'],
                'GOLD': ['Opportunity cost', 'Inflation hedging'],
                'DXY': ['Interest rate differentials', 'Safe demand decline']
            },
            MarketRegime.RISK_OFF_EARLY: {
                'SP500': ['Slowing growth', 'Earnings compression', 'Valuation reset'],
                'NASDAQ': ['Higher discount rates', 'Growth derating'],
                'BTC': ['Liquidity tightening', 'Risk-off', 'Margin compression'],
                'GOLD': ['Safe haven demand', 'Real rate decline'],
                'DXY': ['Flight to safety', 'Rate advantage']
            },
            MarketRegime.RISK_OFF_LATE: {
                'SP500': ['Recession fear', 'Earnings collapse', 'Credit tightening'],
                'NASDAQ': ['Valuation crash', 'Funding stress'],
                'BTC': ['Forced selling', 'Liquidity crisis'],
                'GOLD': ['Safe haven bid', 'Currency debasement fear'],
                'DXY': ['Global flight to safety', 'Dollar shortage']
            },
            MarketRegime.RECOVERY: {
                'SP500': ['Fed pivot', 'Earnings recovery', 'Valuation expansion'],
                'NASDAQ': ['Lower rates', 'Growth premium returns'],
                'BTC': ['Liquidity injection', 'Risk appetite recovery'],
                'GOLD': ['Real rates negative', 'Inflation expectations'],
                'DXY': ['Rate cuts', 'Global recovery']
            }
        }
        
        regime_drivers = drivers.get(regime, {})
        return regime_drivers.get(asset, ['Macro factors'])
    
    def _generate_narrative(self, regime: MarketRegime, 
                           curve_shape: str,
                           recession_prob: float) -> str:
        """Generate description of current situation"""
        
        narratives = {
            MarketRegime.RISK_ON: 
                f"Normal yield curve ({curve_shape}) indicates a healthy economy. "
                "Favorable environment for risk assets.",
            
            MarketRegime.RISK_OFF_EARLY:
                f"Curve inversion ({curve_shape}) signals slowdown. "
                f"Recession probability {recession_prob:.0f}%. "
                "Rotation into defensive assets.",
            
            MarketRegime.RISK_OFF_LATE:
                f"Deep inversion ({curve_shape}) with recession probability {recession_prob:.0f}%. "
                "Defensive sentiment prevails. Defensive positioning justified.",
            
            MarketRegime.RECOVERY:
                f"Curve recovery ({curve_shape}) after inversion. "
                "Fed pivot possible. Favorable for growth assets.",
            
            MarketRegime.TRANSITION:
                f"Transition period ({curve_shape}). "
                "Uncertainty requires caution."
        }
        
        return narratives.get(regime, "Undefined regime")
    
    def calculate_correlation_matrix(self, 
                                     yields: pd.DataFrame,
                                     assets: pd.DataFrame,
                                     window: int = 90) -> pd.DataFrame:
        """
        Calculate rolling correlations between yield curve and assets
        """
        # Merge data
        combined = pd.concat([yields, assets], axis=1).dropna()
        
        # Calculate changes
        changes = combined.pct_change().dropna()
        
        # Rolling correlation
        corr_matrix = changes.rolling(window=window).corr()
        
        return corr_matrix


# Singleton
_analyzer = None

def get_cross_market_analyzer() -> CrossMarketAnalyzer:
    """Get singleton instance"""
    global _analyzer
    if _analyzer is None:
        _analyzer = CrossMarketAnalyzer()
    return _analyzer
