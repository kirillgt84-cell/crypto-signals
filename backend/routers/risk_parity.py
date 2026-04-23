"""
Risk Parity strategy router.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.risk_parity import (
    run_comparison,
    risk_parity_weights,
    inverse_volatility_weights,
    calculate_returns,
    _fetch_prices_yf,
    DEFAULT_TRADFI,
    DEFAULT_CRYPTO,
)
import logging

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
    except Exception as e:
        logger.error(f"Risk parity backtest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")
