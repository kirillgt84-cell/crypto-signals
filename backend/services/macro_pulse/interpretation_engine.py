"""
Interpretation Engine (Yield Curve Intelligence)
Regulatory-safe interpretations: historical analytics only.
No investment advice. No specific tickers. No guaranteed returns.

Format: Headline + Historical Context + Hypothetical Scenarios.
All "actionable" language replaced with "historical_context" field.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class MetricInterpretation:
    metric: str
    status: str          # normal, warning, critical, etc.
    key: str             # i18n key prefix (e.g. "yieldCurve.interpretations.curveShape.normal")
    params: Dict[str, Any] = field(default_factory=dict)
    color: str = "green"
    icon: str = "activity"


@dataclass
class DashboardInterpretation:
    timestamp: datetime
    disclaimer_key: str = "yieldCurve.disclaimer"
    overall_key: str = ""
    overall_params: Dict[str, Any] = field(default_factory=dict)
    overall_risk_level: str = "LOW" # LOW / MODERATE / ELEVATED / HIGH
    overall_color: str = "green"
    metrics: List[MetricInterpretation] = field(default_factory=list)
    signals: List[Dict[str, Any]] = field(default_factory=list)


class InterpretationEngine:
    """Generator of historical interpretations for Yield Curve metrics.
    
    All formulations are based on historical facts and statistics.
    Does not contain investment recommendations or specific tickers
    or guarantees of profitability."""

    def __init__(self):
        pass

    # ────────────────────────────────
    #Helpers
    # ────────────────────────────────

    @staticmethod
    def _recession_color(prob: float) -> str:
        if prob < 10: return "green"
        if prob < 25: return "yellow"
        if prob < 50: return "orange"
        return "red"

    @staticmethod
    def _risk_level(prob: float, shape: str) -> str:
        if prob >= 50 or shape == "inverted":
            return "HIGH"
        if prob >= 25 or shape == "flat":
            return "ELEVATED"
        if prob >= 10:
            return "MODERATE"
        return "LOW"

    # ────────────────────────────────
    #1. Curve Shape
    # ────────────────────────────────

    def interpret_curve_shape(self, shape: str) -> MetricInterpretation:
        key_map = {
            "normal": ("yieldCurve.interpretations.curveShape.normal", {}, "green", "trending-up", "normal"),
            "flat": ("yieldCurve.interpretations.curveShape.flat", {}, "yellow", "alert-triangle", "warning"),
            "inverted": ("yieldCurve.interpretations.curveShape.inverted", {}, "red", "trending-down", "critical"),
            "humped": ("yieldCurve.interpretations.curveShape.humped", {}, "orange", "activity", "warning"),
        }
        key, params, color, icon, status = key_map.get(shape.lower(), key_map["normal"])
        return MetricInterpretation(metric="curve_shape", status=status, key=key, params=params, color=color, icon=icon)

    # ────────────────────────────────
    #2. Spreads (10Y-2Y, 10Y-3M)
    # ────────────────────────────────

    def interpret_10y2y_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="unknown",
                key="yieldCurve.interpretations.10y2ySpread.unknown",
                params={},
                color="gray",
                icon="help-circle",
            )

        if spread > 1.0:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                key="yieldCurve.interpretations.10y2ySpread.steep",
                params={"spread": f"{spread:.2f}"},
                color="green",
                icon="arrow-up-right",
            )
        elif spread > 0.25:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                key="yieldCurve.interpretations.10y2ySpread.declining",
                params={"spread": f"{spread:.2f}"},
                color="blue",
                icon="minus",
            )
        elif spread > -0.10:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="warning",
                key="yieldCurve.interpretations.10y2ySpread.warning",
                params={"spread": f"{spread:.2f}"},
                color="yellow",
                icon="alert-triangle",
            )
        else:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="critical",
                key="yieldCurve.interpretations.10y2ySpread.inversion",
                params={"spread": f"{spread:.2f}"},
                color="red",
                icon="trending-down",
            )

    def interpret_10y3m_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="unknown",
                key="yieldCurve.interpretations.10y3mSpread.unknown",
                params={},
                color="gray",
                icon="help-circle",
            )

        if spread > 1.5:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="normal",
                key="yieldCurve.interpretations.10y3mSpread.steep",
                params={"spread": f"{spread:.2f}"},
                color="green",
                icon="trending-up",
            )
        elif spread > 0.0:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="normal",
                key="yieldCurve.interpretations.10y3mSpread.declining",
                params={"spread": f"{spread:.2f}"},
                color="blue",
                icon="minus",
            )
        elif spread > -0.50:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="warning",
                key="yieldCurve.interpretations.10y3mSpread.closeToInversion",
                params={"spread": f"{spread:.2f}"},
                color="yellow",
                icon="alert-triangle",
            )
        else:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="critical",
                key="yieldCurve.interpretations.10y3mSpread.inversion",
                params={"spread": f"{spread:.2f}"},
                color="red",
                icon="trending-down",
            )

    # ────────────────────────────────
    #3. Recession Probability
    # ────────────────────────────────

    def interpret_recession_probability(self, prob: Optional[float]) -> MetricInterpretation:
        if prob is None:
            return MetricInterpretation(
                metric="recession_probability",
                status="unknown",
                key="yieldCurve.interpretations.recessionProbability.unknown",
                params={},
                color="gray",
                icon="help-circle",
            )

        if prob < 10:
            return MetricInterpretation(
                metric="recession_probability",
                status="normal",
                key="yieldCurve.interpretations.recessionProbability.green",
                params={"prob": f"{prob:.1f}"},
                color="green",
                icon="shield-check",
            )
        elif prob < 25:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                key="yieldCurve.interpretations.recessionProbability.yellow",
                params={"prob": f"{prob:.1f}"},
                color="yellow",
                icon="alert-triangle",
            )
        elif prob < 50:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                key="yieldCurve.interpretations.recessionProbability.orange",
                params={"prob": f"{prob:.1f}"},
                color="orange",
                icon="alert-octagon",
            )
        else:
            return MetricInterpretation(
                metric="recession_probability",
                status="critical",
                key="yieldCurve.interpretations.recessionProbability.red",
                params={"prob": f"{prob:.1f}"},
                color="red",
                icon="skull",
            )

    # ────────────────────────────────
    #4. Market Regime
    # ────────────────────────────────

    def interpret_market_regime(self, regime: str) -> MetricInterpretation:
        key_map = {
            "risk-on": ("yieldCurve.interpretations.marketRegime.riskOn", "green", "rocket"),
            "risk-off": ("yieldCurve.interpretations.marketRegime.riskOff", "red", "shield"),
            "transition": ("yieldCurve.interpretations.marketRegime.transition", "yellow", "git-branch"),
            "undefined": ("yieldCurve.interpretations.marketRegime.undefined", "gray", "help-circle"),
        }
        key, color, icon = key_map.get(regime.lower(), key_map["undefined"])
        return MetricInterpretation(
            metric="market_regime",
            status=regime.lower(),
            key=key,
            params={},
            color=color,
            icon=icon,
        )

    # ────────────────────────────────
    #5.Historical Analogue
    # ────────────────────────────────

    def interpret_top_analog(
        self,
        analog_name: str,
        similarity: float,
        recession_followed: bool,
        lead_time_months: Optional[int],
        sp500_outcome: Optional[float],
    ) -> MetricInterpretation:

        if similarity < 30:
            return MetricInterpretation(
                metric="top_analog",
                status="low_relevance",
                key="yieldCurve.interpretations.topAnalog.weak",
                params={"analog": analog_name, "similarity": f"{similarity:.0f}"},
                color="blue",
                icon="history",
            )

        status = "warning" if recession_followed else "normal"
        color = "red" if recession_followed else "green"
        key = "yieldCurve.interpretations.topAnalog.recession" if recession_followed else "yieldCurve.interpretations.topAnalog.noRecession"

        return MetricInterpretation(
            metric="top_analog",
            status=status,
            key=key,
            params={
                "analog": analog_name,
                "similarity": f"{similarity:.0f}",
                "leadTime": str(lead_time_months) if lead_time_months else "",
                "sp500Outcome": f"{sp500_outcome:+.0f}" if sp500_outcome else "",
            },
            color=color,
            icon="history",
        )

    # ────────────────────────────────
    # 6. Cross-Market Impact (per asset)
    # ────────────────────────────────

    def interpret_cross_market(
        self,
        asset: str,
        impact_3m: float,
        impact_6m: float,
        risk_level: str,
    ) -> MetricInterpretation:

        asset_names = {
            "SP500": "S&P 500",
            "NASDAQ": "NASDAQ",
            "BTC": "Bitcoin",
            "ETH": "Ethereum",
            "GOLD": "Gold",
            "OIL": "Oil",
            "DXY": "Dollar Index (DXY)",
        }
        name = asset_names.get(asset, asset)
        avg_impact = (impact_3m + impact_6m) / 2

        if avg_impact > 5:
            key = "yieldCurve.interpretations.crossMarket.positive"
            status = "positive"
            color = "green"
        elif avg_impact > 0:
            key = "yieldCurve.interpretations.crossMarket.neutralPositive"
            status = "neutral-positive"
            color = "blue"
        elif avg_impact > -5:
            key = "yieldCurve.interpretations.crossMarket.neutralNegative"
            status = "neutral-negative"
            color = "yellow"
        else:
            key = "yieldCurve.interpretations.crossMarket.negative"
            status = "negative"
            color = "red"

        return MetricInterpretation(
            metric=f"cross_market_{asset.lower()}",
            status=status,
            key=key,
            params={
                "name": name,
                "avg": f"{avg_impact:.0f}",
                "impact3m": f"{impact_3m:.0f}",
                "impact6m": f"{impact_6m:.0f}",
                "riskLevel": risk_level,
            },
            color=color,
            icon="trending-up" if avg_impact > 0 else "trending-down",
        )

    # ────────────────────────────────
    #7. Aggregated Forecast
    # ────────────────────────────────

    def interpret_aggregated_forecast(
        self,
        recession_prob: float,
        confidence: str,
        sp500_range: Optional[List[float]],
        top_analogies: List[str],
    ) -> MetricInterpretation:

        if recession_prob < 30:
            key = "yieldCurve.interpretations.aggregatedForecast.softLanding"
            color = "green"
            status = "normal"
        elif recession_prob < 60:
            key = "yieldCurve.interpretations.aggregatedForecast.uncertainty"
            color = "yellow"
            status = "warning"
        else:
            key = "yieldCurve.interpretations.aggregatedForecast.slowdown"
            color = "red"
            status = "critical"

        return MetricInterpretation(
            metric="aggregated_forecast",
            status=status,
            key=key,
            params={
                "prob": f"{recession_prob:.0f}",
                "confidence": confidence,
                "analogies": str(len(top_analogies)),
                "analogiesList": ", ".join(top_analogies[:3]),
            },
            color=color,
            icon="activity",
        )

    # ────────────────────────────────
    #MainMethod
    # ────────────────────────────────

    def interpret_dashboard(
        self,
        curve_shape: str,
        spread_10y2y: Optional[float],
        spread_10y3m: Optional[float],
        recession_prob: Optional[float],
        market_regime: str,
        analog_name: str,
        analog_similarity: float,
        analog_recession: bool,
        analog_lead: Optional[int],
        analog_sp500: Optional[float],
        cross_market: Optional[Dict[str, Dict]] = None,
        aggregated: Optional[Dict] = None,
    ) -> DashboardInterpretation:

        metrics = []

        metrics.append(self.interpret_curve_shape(curve_shape))
        metrics.append(self.interpret_10y2y_spread(spread_10y2y))
        metrics.append(self.interpret_10y3m_spread(spread_10y3m))
        metrics.append(self.interpret_recession_probability(recession_prob))
        metrics.append(self.interpret_market_regime(market_regime))
        metrics.append(self.interpret_top_analog(
            analog_name, analog_similarity, analog_recession, analog_lead, analog_sp500
        ))

        if cross_market:
            for asset, data in cross_market.items():
                metrics.append(self.interpret_cross_market(
                    asset,
                    data.get("impact_3m", 0),
                    data.get("impact_6m", 0),
                    data.get("risk_level", "unknown"),
                ))

        if aggregated:
            metrics.append(self.interpret_aggregated_forecast(
                aggregated.get("recession_probability", 0),
                aggregated.get("confidence", "LOW"),
                aggregated.get("sp500_range"),
                aggregated.get("top_analogies", []),
            ))

        risk = self._risk_level(recession_prob or 0, curve_shape)
        risk_colors = {
            "LOW": "green",
            "MODERATE": "blue",
            "ELEVATED": "yellow",
            "HIGH": "red",
            "EXTREME": "darkred",
        }

        signals = []
        for m in metrics:
            if m.status in ("critical", "negative"):
                signals.append({
                    "level": "CRITICAL",
                    "key": "yieldCurve.interpretations.signals.critical",
                    "params": {"metric": m.metric},
                })
            elif m.status == "warning":
                signals.append({
                    "level": "WARNING",
                    "key": "yieldCurve.interpretations.signals.warning",
                    "params": {"metric": m.metric},
                })

        overall_key, overall_params = self._overall_assessment(risk, curve_shape, analog_name)

        return DashboardInterpretation(
            timestamp=datetime.utcnow(),
            disclaimer_key="yieldCurve.disclaimer",
            overall_key=overall_key,
            overall_params=overall_params,
            overall_risk_level=risk,
            overall_color=risk_colors.get(risk, "gray"),
            metrics=metrics,
            signals=signals,
        )

    @staticmethod
    def _overall_assessment(risk: str, shape: str, analog: str) -> tuple:
        key_map = {
            "HIGH": "yieldCurve.interpretations.overallAssessment.high",
            "EXTREME": "yieldCurve.interpretations.overallAssessment.high",
            "ELEVATED": "yieldCurve.interpretations.overallAssessment.elevated",
            "MODERATE": "yieldCurve.interpretations.overallAssessment.moderate",
            "LOW": "yieldCurve.interpretations.overallAssessment.low",
        }
        key = key_map.get(risk, key_map["LOW"])
        params = {"shape": shape, "analog": analog, "risk": risk}
        return key, params


_interpretation_engine = None

def get_interpretation_engine() -> InterpretationEngine:
    global _interpretation_engine
    if _interpretation_engine is None:
        _interpretation_engine = InterpretationEngine()
    return _interpretation_engine
