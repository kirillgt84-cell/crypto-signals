from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import logging

# Сервисы
from app.services.fred_client import FREDClient, YieldCurveCalculator
from app.services.pattern_engine import get_pattern_engine, MarketState
from app.services.cross_market import get_cross_market_analyzer
from app.services.telegram import get_telegram_service
from app.services.macro_data import get_macro_service
from app.services.interpretation_engine import get_interpretation_engine, DashboardInterpretation

# Модели
from app.models.unified_state import UnifiedDashboardState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Глобальные сервисы
fred_client: FREDClient = None
calculator: YieldCurveCalculator = None
pattern_engine = None
cross_market_analyzer = None
telegram_service = None
macro_service = None
interpretation_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    global fred_client, calculator, pattern_engine
    global cross_market_analyzer, telegram_service, macro_service, interpretation_engine
    
    logger.info("🚀 Starting up YCI Backend...")
    
    fred_client = FREDClient()
    calculator = YieldCurveCalculator()
    pattern_engine = get_pattern_engine()
    cross_market_analyzer = get_cross_market_analyzer()
    telegram_service = get_telegram_service()
    macro_service = get_macro_service()
    interpretation_engine = get_interpretation_engine()
    
    logger.info("✅ All services initialized (including Interpretation Engine)")
    
    yield
    
    logger.info("Shutting down...")


app = FastAPI(
    title="Yield Curve Intelligence API",
    description="Макро-аналитика: Yield Curve + Cross-Market Correlations",
    version="1.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Yield Curve Intelligence API",
        "version": "1.1.0",
        "modules": ["yield_curve", "macro", "cross_market", "pattern_matching"],
        "docs": "/docs"
    }


# ========== YIELD CURVE ENDPOINTS ==========

@app.get("/api/v1/yield-curve/current")
async def get_current_yield_curve():
    """Текущая кривая доходности"""
    try:
        data = await fred_client.get_yield_curve()
        
        yields = {}
        timestamp = None
        
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
                    if timestamp is None:
                        timestamp = observations[0].get("date")
        
        return {
            "timestamp": timestamp,
            "yields": yields,
            "source": "FRED"
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/yield-curve/spreads")
async def get_yield_spreads():
    """Ключевые спреды"""
    try:
        data = await fred_client.get_yield_curve()
        
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        spreads = calculator.calculate_spreads(yields)
        shape = calculator.determine_curve_shape(yields)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "spreads": spreads,
            "curve_shape": shape,
            "is_inverted_10y2y": spreads.get("10Y_2Y", 1) < 0,
            "is_inverted_10y3m": spreads.get("10Y_3M", 1) < 0,
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/yield-curve/recession-probability")
async def get_recession_probability():
    """Вероятность рецессии (NY Fed модель)"""
    try:
        data = await fred_client.get_yield_curve()
        
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        spread_10y_3m = yields.get("10Y", 0) - yields.get("3M", 0)
        result = calculator.calculate_recession_probability(spread_10y_3m)
        result["timestamp"] = datetime.now().isoformat()
        
        return result
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PATTERN MATCHING ==========

@app.get("/api/v1/analogs")
async def get_historical_analogs():
    """Найти исторические аналогии текущей ситуации"""
    try:
        # Получаем текущие данные
        data = await fred_client.get_yield_curve()
        
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        spreads = calculator.calculate_spreads(yields)
        shape = calculator.determine_curve_shape(yields)
        
        # Создаём текущее состояние
        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=spreads,
            curve_shape=shape.upper()
        )
        
        # Ищем аналоги
        matches = pattern_engine.find_best_matches(current_state, n=3)
        forecast = pattern_engine.get_aggregated_forecast(matches)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "current_state": {
                "curve_shape": shape,
                "spreads": spreads
            },
            "matches": [
                {
                    "period": m.period_name,
                    "similarity": m.similarity_score,
                    "recession_followed": m.recession_followed,
                    "lead_time_months": m.lead_time_months,
                    "sp500_outcome": m.sp500_outcome,
                    "narrative": m.narrative
                }
                for m in matches
            ],
            "forecast": forecast
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== CROSS-MARKET ==========

@app.get("/api/v1/cross-market/signal")
async def get_cross_market_signal():
    """Получить cross-market сигнал для всех активов"""
    try:
        # Получаем yield curve данные
        data = await fred_client.get_yield_curve()
        
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        spreads = calculator.calculate_spreads(yields)
        shape = calculator.determine_curve_shape(yields)
        
        # Вероятность рецессии
        spread_10y_3m = spreads.get("10Y_3M", 0)
        recession_data = calculator.calculate_recession_probability(spread_10y_3m)
        
        # Генерируем cross-market сигнал
        signal = cross_market_analyzer.generate_cross_market_signal(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y", 0),
            recession_prob=recession_data["probability_12m"]
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
                        "12m": i.typical_return_12m
                    }
                }
                for i in signal.impacts
            ]
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== MACRO MODULE ==========

@app.get("/api/v1/macro/latest")
async def get_macro_latest():
    """Последние данные макро-модуля (совместимость с существующим API)"""
    try:
        prices = await macro_service.get_all_macro_prices()
        correlations = await macro_service.get_correlations(window_days=30)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "prices": prices,
            "correlations": correlations
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/macro/correlations")
async def get_macro_correlations(limit: int = 90):
    """История корреляций"""
    try:
        correlations = await macro_service.get_correlations(window_days=limit)
        return {
            "window_days": limit,
            "correlations": correlations
        }
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== UNIFIED DASHBOARD ==========

@app.get("/api/v1/yield-curve/interpret")
async def get_yield_curve_interpretation():
    """
    РАЗВЁРНУТЫЕ ИНТЕРПРЕТАЦИИ для всех метрик Yield Curve.
    Формат: блок с заголовком + 2-3 предложения + actionable advice.
    """
    try:
        # 1. Получаем текущие данные
        data = await fred_client.get_yield_curve()
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        spreads = calculator.calculate_spreads(yields)
        shape = calculator.determine_curve_shape(yields)
        
        # 2. Recession Probability
        spread_10y_3m = spreads.get("10Y_3M", 0)
        recession_data = calculator.calculate_recession_probability(spread_10y_3m)
        recession_prob = recession_data.get("probability_12m", 0)
        
        # 3. Pattern Matching
        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=spreads,
            curve_shape=shape.upper()
        )
        matches = pattern_engine.find_best_matches(current_state, n=3)
        top_match = matches[0] if matches else None
        aggregated = pattern_engine.get_aggregated_forecast(matches) if matches else None
        
        # 4. Cross-Market
        signal = cross_market_analyzer.generate_cross_market_signal(
            curve_shape=shape,
            spread_10y2y=spreads.get("10Y_2Y", 0),
            recession_prob=recession_prob
        )
        
        cross_market = {}
        for i in signal.impacts:
            cross_market[i.asset] = {
                "impact_3m": i.typical_return_3m,
                "impact_6m": i.typical_return_6m,
                "risk_level": i.risk_level
            }
        
        # 5. Генерируем интерпретации
        interpretation = interpretation_engine.interpret_dashboard(
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
            aggregated=aggregated
        )
        
        # 6. Формируем ответ
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
            ]
        }
    
    except Exception as e:
        logger.error(f"Interpretation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/dashboard")
async def get_unified_dashboard():
    """
    Полный unified dashboard — все модули + интерпретации в одном ответе
    """
    try:
        state = UnifiedDashboardState()
        
        # 1. Yield Curve Data
        data = await fred_client.get_yield_curve()
        yields = {}
        for tenor, observations in data.items():
            if observations:
                val = observations[0].get("value")
                if val and val != ".":
                    yields[tenor] = float(val)
        
        state.yield_curve = yields
        state.spreads = calculator.calculate_spreads(yields)
        state.curve_shape = calculator.determine_curve_shape(yields)
        state.inversion_active = state.spreads.get("10Y_2Y", 1) < 0
        
        # 2. Recession Probability
        spread_10y_3m = state.spreads.get("10Y_3M", 0)
        state.recession_probability = calculator.calculate_recession_probability(spread_10y_3m)
        
        # 3. Pattern Matching
        current_state = MarketState(
            timestamp=datetime.now(),
            yields=yields,
            spreads=state.spreads,
            curve_shape=state.curve_shape.upper()
        )
        
        matches = pattern_engine.find_best_matches(current_state, n=3)
        if matches:
            state.historical_analogs = [
                {
                    "period": m.period_name,
                    "similarity": m.similarity_score,
                    "recession": m.recession_followed,
                    "narrative": m.narrative
                }
                for m in matches
            ]
            state.top_analog = matches[0].period_name
            state.analog_similarity = matches[0].similarity_score
            state.aggregated_forecast = pattern_engine.get_aggregated_forecast(matches)
        
        # 4. Cross-Market
        signal = cross_market_analyzer.generate_cross_market_signal(
            curve_shape=state.curve_shape,
            spread_10y2y=state.spreads.get("10Y_2Y", 0),
            recession_prob=state.recession_probability.get("probability_12m", 0)
        )
        
        state.market_regime = signal.regime.value
        state.regime_bias = signal.overall_bias
        state.risk_level = signal.risk_level
        state.cross_market_impacts = [
            {"asset": i.asset, "direction": i.direction, "magnitude": i.magnitude}
            for i in signal.impacts
        ]
        
        # 5. Interpretations
        cross_market_dict = {}
        for i in signal.impacts:
            cross_market_dict[i.asset] = {
                "impact_3m": i.typical_return_3m,
                "impact_6m": i.typical_return_6m,
                "risk_level": i.risk_level
            }
        
        top_match = matches[0] if matches else None
        interpretation = interpretation_engine.interpret_dashboard(
            curve_shape=state.curve_shape,
            spread_10y2y=state.spreads.get("10Y_2Y"),
            spread_10y3m=state.spreads.get("10Y_3M"),
            recession_prob=state.recession_probability.get("probability_12m", 0),
            market_regime=signal.regime.value,
            analog_name=top_match.period_name if top_match else "unknown",
            analog_similarity=top_match.similarity_score if top_match else 0,
            analog_recession=top_match.recession_followed if top_match else False,
            analog_lead=top_match.lead_time_months if top_match else None,
            analog_sp500=top_match.sp500_outcome if top_match else None,
            cross_market=cross_market_dict,
            aggregated=state.aggregated_forecast
        )
        
        # 6. Generate Signals
        signals = []
        
        if state.inversion_active:
            signals.append({
                "level": "WARNING",
                "title": "Yield Curve Inverted",
                "message": f"{state.top_analog} было похоже ({state.analog_similarity:.0f}%)",
            })
        
        if state.recession_probability.get("probability_12m", 0) > 40:
            signals.append({
                "level": "CRITICAL" if state.recession_probability["probability_12m"] > 60 else "WARNING",
                "title": f"Recession Risk: {state.recession_probability['probability_12m']:.0f}%",
                "message": state.aggregated_forecast.get("narrative", "")
            })
        
        state.active_signals = signals
        
        # Формируем ответ
        response = state.to_api_response()
        response["interpretation"] = {
            "overall": {
                "assessment": interpretation.overall_assessment,
                "risk_level": interpretation.overall_risk_level,
                "color": interpretation.overall_color,
            },
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
            ]
        }
        
        return response
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
