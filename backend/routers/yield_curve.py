"""
Yield Curve Intelligence Router
Макро-аналитика: кривая доходности Treasury + исторические аналоги + cross-market regime
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException

from services.macro_pulse import (
    FREDClient,
    YieldCurveCalculator,
    get_pattern_engine,
    MarketState,
    get_cross_market_analyzer,
    get_interpretation_engine,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["yield-curve"])

# Singleton instances
_fred_client: FREDClient = None
_calculator: YieldCurveCalculator = None
_pattern_engine = None
_cross_market_analyzer = None
_interpretation_engine = None


def _ensure_initialized():
    """Lazy-init singletons (safe for async reuse)"""
    global _fred_client, _calculator, _pattern_engine, _cross_market_analyzer, _interpretation_engine
    if _fred_client is None:
        _fred_client = FREDClient()
    if _calculator is None:
        _calculator = YieldCurveCalculator()
    if _pattern_engine is None:
        _pattern_engine = get_pattern_engine()
    if _cross_market_analyzer is None:
        _cross_market_analyzer = get_cross_market_analyzer()
    if _interpretation_engine is None:
        _interpretation_engine = get_interpretation_engine()


@router.get("/yield-curve/current")
async def get_current_yield_curve():
    """Текущая кривая доходности US Treasury"""
    try:
        _ensure_initialized()
        data = await _fred_client.get_yield_curve()

        yields = {}
        timestamp = None
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
                    if timestamp is None:
                        timestamp = observations[0].get("date")

        return {"timestamp": timestamp, "yields": yields, "source": "FRED"}
    except Exception as e:
        logger.error(f"Yield curve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yield-curve/spreads")
async def get_yield_spreads():
    """Ключевые спреды кривой доходности"""
    try:
        _ensure_initialized()
        data = await _fred_client.get_yield_curve()

        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spreads = _calculator.calculate_spreads(yields)
        shape = _calculator.determine_curve_shape(yields)

        return {
            "timestamp": datetime.now().isoformat(),
            "spreads": spreads,
            "curve_shape": shape,
            "is_inverted_10y2y": spreads.get("10Y_2Y", 1) < 0,
            "is_inverted_10y3m": spreads.get("10Y_3M", 1) < 0,
        }
    except Exception as e:
        logger.error(f"Spreads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yield-curve/recession-probability")
async def get_recession_probability():
    """Вероятность рецессии по модели NY Fed (Estrella-Mishkin)"""
    try:
        _ensure_initialized()
        data = await _fred_client.get_yield_curve()

        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spread_10y_3m = yields.get("10Y", 0) - yields.get("3M", 0)
        result = _calculator.calculate_recession_probability(spread_10y_3m)
        result["timestamp"] = datetime.now().isoformat()

        return result
    except Exception as e:
        logger.error(f"Recession probability error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analogs")
async def get_historical_analogs():
    """Исторические аналогии текущей ситуации (7 кейсов с 1966)"""
    try:
        _ensure_initialized()
        data = await _fred_client.get_yield_curve()

        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spreads = _calculator.calculate_spreads(yields)
        shape = _calculator.determine_curve_shape(yields)

        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=spreads,
            curve_shape=shape.upper(),
        )

        matches = _pattern_engine.find_best_matches(current_state, n=3)
        forecast = _pattern_engine.get_aggregated_forecast(matches)

        return {
            "timestamp": datetime.now().isoformat(),
            "current_state": {"curve_shape": shape, "spreads": spreads},
            "matches": [
                {
                    "period": m.period_name,
                    "similarity": m.similarity_score,
                    "recession_followed": m.recession_followed,
                    "lead_time_months": m.lead_time_months,
                    "sp500_outcome": m.sp500_outcome,
                    "narrative": m.narrative,
                }
                for m in matches
            ],
            "forecast": forecast,
        }
    except Exception as e:
        logger.error(f"Analogs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cross-market/signal")
async def get_cross_market_signal():
    """Cross-market regime signal + impact на активы"""
    try:
        _ensure_initialized()
        data = await _fred_client.get_yield_curve()

        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spreads = _calculator.calculate_spreads(yields)
        shape = _calculator.determine_curve_shape(yields)

        spread_10y_3m = spreads.get("10Y_3M", 0)
        recession_data = _calculator.calculate_recession_probability(spread_10y_3m)

        signal = _cross_market_analyzer.generate_cross_market_signal(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y", 0),
            recession_prob=recession_data["probability_12m"],
        )

        return {
            "timestamp": signal.timestamp.isoformat(),
            "regime": signal.regime.value,
            "curve_shape": signal.yield_curve_shape,
            "recession_probability": signal.recession_probability,
            "overall_bias": signal.overall_bias,
            "risk_level": signal.risk_level,
            "narrative": signal.narrative,
            "impacts": [
                {
                    "asset": i.asset,
                    "direction": i.direction,
                    "magnitude": i.magnitude,
                    "returns": {
                        "3m": i.typical_return_3m,
                        "6m": i.typical_return_6m,
                        "12m": i.typical_return_12m,
                    },
                }
                for i in signal.impacts
            ],
        }
    except Exception as e:
        logger.error(f"Cross-market error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/yield-curve/interpret")
async def get_yield_curve_interpretation():
    """Развёрнутые интерпретации для всех метрик Yield Curve"""
    try:
        _ensure_initialized()

        # 1. Yield Curve
        data = await _fred_client.get_yield_curve()
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spreads = _calculator.calculate_spreads(yields)
        shape = _calculator.determine_curve_shape(yields)

        # 2. Recession Probability
        spread_10y_3m = spreads.get("10Y_3M", 0)
        recession_data = _calculator.calculate_recession_probability(spread_10y_3m)
        recession_prob = recession_data.get("probability_12m", 0)

        # 3. Pattern Matching
        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=spreads,
            curve_shape=shape.upper(),
        )
        matches = _pattern_engine.find_best_matches(current_state, n=3)
        top_match = matches[0] if matches else None
        aggregated = _pattern_engine.get_aggregated_forecast(matches) if matches else None

        # 4. Cross-Market
        signal = _cross_market_analyzer.generate_cross_market_signal(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y", 0),
            recession_prob=recession_prob,
        )

        cross_market = {}
        for i in signal.impacts:
            cross_market[i.asset] = {
                "impact_3m": i.typical_return_3m,
                "impact_6m": i.typical_return_6m,
                "risk_level": signal.risk_level,
            }

        # 5. Generate interpretations
        interpretation = _interpretation_engine.interpret_dashboard(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y"),
            spread_10y3m=spreads.get("10Y_3M"),
            recession_prob=recession_prob,
            market_regime=signal.regime.value,
            analog_name=top_match.period_name if top_match else "unknown",
            analog_similarity=top_match.similarity_score if top_match else 0,
            analog_recession=top_match.recession_followed if top_match else False,
            analog_lead=top_match.lead_time_months if top_match else None,
            analog_sp500=top_match.sp500_outcome if top_match else None,
            cross_market=cross_market,
            aggregated=aggregated,
        )

        return {
            "timestamp": interpretation.timestamp.isoformat(),
            "overall": {
                "assessment": interpretation.overall_assessment,
                "risk_level": interpretation.overall_risk_level,
                "color": interpretation.overall_color,
            },
            "signals": interpretation.signals,
            "trade_actions": interpretation.trade_actions,
            "metrics": [
                {
                    "metric": m.metric,
                    "status": m.status,
                    "headline": m.headline,
                    "explanation": m.explanation,
                    "actionable": m.actionable,
                    "color": m.color,
                    "icon": m.icon,
                }
                for m in interpretation.metrics
            ],
        }
    except Exception as e:
        logger.error(f"Interpretation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/yield")
async def get_yield_dashboard():
    """Unified yield curve dashboard — всё в одном ответе"""
    try:
        _ensure_initialized()

        # 1. Yield Curve
        data = await _fred_client.get_yield_curve()
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)

        spreads = _calculator.calculate_spreads(yields)
        shape = _calculator.determine_curve_shape(yields)
        inversion_active = spreads.get("10Y_2Y", 1) < 0

        # 2. Recession Probability
        spread_10y_3m = spreads.get("10Y_3M", 0)
        recession = _calculator.calculate_recession_probability(spread_10y_3m)

        # 3. Pattern Matching
        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=spreads,
            curve_shape=shape.upper(),
        )
        matches = _pattern_engine.find_best_matches(current_state, n=3)
        forecast = _pattern_engine.get_aggregated_forecast(matches) if matches else {}

        # 4. Cross-Market
        signal = _cross_market_analyzer.generate_cross_market_signal(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y", 0),
            recession_prob=recession.get("probability_12m", 0),
        )

        # 5. Interpretation
        cross_market_dict = {}
        for i in signal.impacts:
            cross_market_dict[i.asset] = {
                "impact_3m": i.typical_return_3m,
                "impact_6m": i.typical_return_6m,
                "risk_level": signal.risk_level,
            }

        top_match = matches[0] if matches else None
        interpretation = _interpretation_engine.interpret_dashboard(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y"),
            spread_10y3m=spreads.get("10Y_3M"),
            recession_prob=recession.get("probability_12m", 0),
            market_regime=signal.regime.value,
            analog_name=top_match.period_name if top_match else "unknown",
            analog_similarity=top_match.similarity_score if top_match else 0,
            analog_recession=top_match.recession_followed if top_match else False,
            analog_lead=top_match.lead_time_months if top_match else None,
            analog_sp500=top_match.sp500_outcome if top_match else None,
            cross_market=cross_market_dict,
            aggregated=forecast,
        )

        # 6. Signals
        active_signals = []
        if inversion_active:
            active_signals.append({
                "level": "WARNING",
                "title": "Yield Curve Inverted",
                "message": f"{matches[0].period_name if matches else 'Unknown'} был похож ({matches[0].similarity_score:.0f}%)" if matches else "",
            })
        if recession.get("probability_12m", 0) > 40:
            active_signals.append({
                "level": "CRITICAL" if recession["probability_12m"] > 60 else "WARNING",
                "title": f"Recession Risk: {recession['probability_12m']:.0f}%",
                "message": forecast.get("narrative", ""),
            })

        return {
            "timestamp": datetime.now().isoformat(),
            "yield_curve": {
                "yields": yields,
                "spreads": spreads,
                "shape": shape,
                "inversion_active": inversion_active,
            },
            "recession": recession,
            "market_regime": {
                "regime": signal.regime.value,
                "bias": signal.overall_bias,
                "risk_level": signal.risk_level,
                "narrative": signal.narrative,
                "impacts": [
                    {
                        "asset": i.asset,
                        "direction": i.direction,
                        "magnitude": i.magnitude,
                        "returns": {
                            "3m": i.typical_return_3m,
                            "6m": i.typical_return_6m,
                            "12m": i.typical_return_12m,
                        },
                    }
                    for i in signal.impacts
                ],
            },
            "historical_analogs": {
                "matches": [
                    {
                        "period": m.period_name,
                        "similarity": m.similarity_score,
                        "recession": m.recession_followed,
                        "narrative": m.narrative,
                    }
                    for m in matches
                ],
                "forecast": forecast,
            },
            "signals": {
                "active": active_signals,
                "count": len(active_signals),
            },
            "interpretation": {
                "overall": {
                    "assessment": interpretation.overall_assessment,
                    "risk_level": interpretation.overall_risk_level,
                    "color": interpretation.overall_color,
                },
                "signals": interpretation.signals,
                "trade_actions": interpretation.trade_actions,
                "metrics": [
                    {
                        "metric": m.metric,
                        "status": m.status,
                        "headline": m.headline,
                        "explanation": m.explanation,
                        "actionable": m.actionable,
                        "color": m.color,
                        "icon": m.icon,
                    }
                    for m in interpretation.metrics
                ],
            },
        }
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
