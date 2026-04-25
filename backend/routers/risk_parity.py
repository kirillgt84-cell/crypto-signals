"""
Risk Parity strategy router.
"""
import os
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from routers.auth import get_current_user
from services.risk_parity import (
    run_comparison,
    risk_parity_weights,
    inverse_volatility_weights,
    calculate_returns,
    _fetch_prices_yf,
    DEFAULT_TRADFI,
    DEFAULT_CRYPTO,
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/risk-parity", tags=["risk-parity"])


class CalculateRequest(BaseModel):
    tickers: Optional[List[str]] = None
    lookback: int = 90
    max_weight: float = 0.50
    min_weight: float = 0.05
    target_vol: Optional[float] = 0.10
    period: str = "5y"


class BacktestRequest(BaseModel):
    tickers: Optional[List[str]] = None
    period: str = "10y"
    lookback: int = 90
    rebalance_freq: int = 30
    rebalance_threshold: Optional[float] = 0.05
    transaction_cost: float = 0.001
    target_vol: Optional[float] = 0.10


class AiInsightRequest(BaseModel):
    tickers: List[str]
    backtest: Optional[Dict[str, Any]] = None
    weights: Optional[Dict[str, Any]] = None
    period: str = "10y"


@router.get("/strategies")
async def list_strategies():
    """List available pre-defined risk parity strategies."""
    return {
        "strategies": [
            {
                "id": "all_weather",
                "name": "All-Weather",
                "description": "Risk parity across equities, bonds, gold, and commodities (SPY, TLT, GLD, DBC)",
                "tickers": DEFAULT_TRADFI,
                "rebalance_freq_days": 30,
            },
            {
                "id": "all_weather_crypto",
                "name": "All-Weather + Crypto",
                "description": "All-Weather with BTC and ETH added for diversification",
                "tickers": DEFAULT_TRADFI + DEFAULT_CRYPTO,
                "rebalance_freq_days": 30,
            },
            {
                "id": "inverse_vol",
                "name": "Inverse Volatility",
                "description": "Simple baseline: weights proportional to 1/volatility",
                "tickers": DEFAULT_TRADFI + DEFAULT_CRYPTO,
                "rebalance_freq_days": 30,
            },
        ]
    }


@router.post("/calculate")
async def calculate_weights(body: CalculateRequest):
    """Calculate risk parity weights for a given universe."""
    try:
        tickers = body.tickers or (DEFAULT_TRADFI + DEFAULT_CRYPTO)
        prices = _fetch_prices_yf(tickers, period=body.period)
        returns = calculate_returns(prices)
        returns = returns.dropna()

        if len(returns) < body.lookback:
            raise HTTPException(status_code=400, detail="Not enough historical data for lookback period")

        rp_result = risk_parity_weights(
            returns,
            lookback=body.lookback,
            max_weight=body.max_weight,
            min_weight=body.min_weight,
            target_vol=body.target_vol,
        )
        iv_result = inverse_volatility_weights(returns, lookback=body.lookback)

        return {
            "tickers": list(returns.columns),
            "risk_parity": {
                "weights": {t: round(float(w), 4) for t, w in zip(returns.columns, rp_result["weights"])},
                "leverage": round(rp_result["leverage"], 3),
                "expected_volatility": rp_result["expected_vol"],
                "risk_contribution": {t: round(float(rc), 4) for t, rc in zip(returns.columns, rp_result["risk_contribution"])},
            },
            "inverse_volatility": {
                "weights": {t: round(float(w), 4) for t, w in zip(returns.columns, iv_result)},
            },
            "data_points": len(returns),
            "date_from": str(returns.index[0]),
            "date_to": str(returns.index[-1]),
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Risk parity calculate failed (provider): {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Risk parity calculate failed: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


@router.post("/backtest")
async def run_backtest(body: BacktestRequest):
    """Run full backtest with metrics comparison."""
    try:
        tickers = body.tickers or (DEFAULT_TRADFI + DEFAULT_CRYPTO)
        result = run_comparison(
            tickers=tickers,
            period=body.period,
            lookback=body.lookback,
            rebalance_freq=body.rebalance_freq,
        )
        return result
    except HTTPException:
        raise
    except RuntimeError as e:
        logger.error(f"Risk parity backtest failed (provider): {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Risk parity backtest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")


@router.post("/ai-insight")
async def risk_parity_ai_insight(body: AiInsightRequest, lang: str = Query("en", description="User language: en, ru, es, zh"), current_user: dict = Depends(get_current_user)):
    """Get AI interpretation of risk parity backtest results. Neutral wording, no investment advice."""
    import httpx

    LANG_NAMES = {"en": "English", "ru": "Russian", "es": "Spanish", "zh": "Chinese"}
    language_name = LANG_NAMES.get(lang, "English")

    lines: List[str] = []
    lines.append(f"Assets: {', '.join(body.tickers)}")
    lines.append(f"Backtest period: {body.period}")

    if body.weights:
        rp = body.weights.get("risk_parity", {})
        iv = body.weights.get("inverse_volatility", {})
        rp_w = rp.get("weights", {})
        iv_w = iv.get("weights", {})
        if rp_w:
            lines.append("\nRisk Parity weights:")
            for t, w in rp_w.items():
                lines.append(f"- {t}: {w * 100:.1f}%")
        if iv_w:
            lines.append("\nInverse Volatility weights:")
            for t, w in iv_w.items():
                lines.append(f"- {t}: {w * 100:.1f}%")
        lev = rp.get("leverage")
        ev = rp.get("expected_volatility")
        if lev is not None:
            lines.append(f"\nLeverage: {lev:.2f}x")
        if ev is not None:
            lines.append(f"Expected volatility: {ev * 100:.1f}%")

    if body.backtest:
        strategies = body.backtest.get("strategies", {})
        lines.append("\nBacktest metrics:")
        for name, data in strategies.items():
            label = {"risk_parity": "Risk Parity", "inverse_volatility": "Inverse Vol", "benchmark_60_40": "60/40", "benchmark_100_equity": "100% Equity"}.get(name, name)
            cagr = data.get("cagr", 0)
            sharpe = data.get("sharpe_ratio", 0)
            max_dd = data.get("max_drawdown", 0)
            vol = data.get("annualized_volatility", 0)
            lines.append(f"- {label}: CAGR {(cagr * 100):.1f}%, Sharpe {sharpe:.2f}, Max DD {(max_dd * 100):.1f}%, Vol {(vol * 100):.1f}%")

    prompt = (
        "You are a neutral portfolio analytics assistant. "
        "Analyze the following risk parity portfolio construction. "
        "Describe the allocation, risk characteristics, and how the strategies compare to benchmarks. "
        "Do NOT give investment advice or recommend buying/selling. Keep it under 200 words.\n\n"
        + "\n".join(lines) +
        f"\n\nRespond in {language_name}."
    )

    if not OPENROUTER_API_KEY:
        return {"insight": "AI insights require OPENROUTER_API_KEY to be configured."}

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://crypto-signals-chi.vercel.app",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                    "temperature": 0.5,
                },
            )
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {"insight": content.strip()}
        except Exception as e:
            logger.error(f"Risk parity AI insight failed: {e}")
            return {"insight": "AI analysis unavailable at the moment. Please try again later."}
