"""
Risk Parity portfolio engine.
Allocates capital based on equal risk contribution (volatility), not capital weights.
"""
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

# Default asset universe
DEFAULT_TRADFI = ["SPY", "TLT", "GLD", "DBC"]
DEFAULT_CRYPTO = ["BTC-USD", "ETH-USD"]
DEFAULT_ALL = DEFAULT_TRADFI + DEFAULT_CRYPTO

__all__ = [
    "inverse_volatility_weights",
    "risk_parity_weights",
    "calculate_returns",
    "backtest_strategy",
    "run_comparison",
    "calculate_max_drawdown",
    "calculate_sharpe",
    "calculate_sortino",
    "calculate_calmar",
    "DEFAULT_TRADFI",
    "DEFAULT_CRYPTO",
    "DEFAULT_ALL",
]


def _fetch_prices_yf(tickers: List[str], period: str = "10y", interval: str = "1d") -> pd.DataFrame:
    """Download historical adjusted close prices from Yahoo Finance."""
    import yfinance as yf
    data = yf.download(tickers, period=period, interval=interval, progress=False, auto_adjust=True)
    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        prices = data[["Close"]] if len(tickers) == 1 else data["Close"]
    prices = prices.dropna(how="all").dropna(axis=1, how="all")
    return prices


def calculate_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Log returns from price series."""
    return np.log(prices / prices.shift(1)).dropna()


def inverse_volatility_weights(returns: pd.DataFrame, lookback: int = 90) -> np.ndarray:
    """Baseline: weights proportional to 1/volatility."""
    vol = returns.iloc[-lookback:].std() * np.sqrt(252)
    inv_vol = 1.0 / vol.replace(0, np.nan)
    inv_vol = inv_vol.dropna()
    weights = inv_vol / inv_vol.sum()
    return weights.reindex(returns.columns).fillna(0).values


def _portfolio_risk_contribution(weights: np.ndarray, cov: np.ndarray) -> np.ndarray:
    """Risk contribution of each asset."""
    port_vol = np.sqrt(weights @ cov @ weights)
    if port_vol == 0:
        return np.zeros_like(weights)
    marginal = cov @ weights
    rc = weights * marginal / port_vol
    return rc


def _risk_parity_objective(weights: np.ndarray, cov: np.ndarray) -> float:
    """Minimize sum of squared deviations from equal risk contribution."""
    rc = _portfolio_risk_contribution(weights, cov)
    target_rc = np.mean(rc)
    return np.sum((rc - target_rc) ** 2)


def risk_parity_weights(
    returns: pd.DataFrame,
    lookback: int = 90,
    max_weight: float = 0.50,
    min_weight: float = 0.05,
    target_vol: Optional[float] = None,
) -> Dict[str, any]:
    """
    Compute risk-parity weights using numerical optimization.

    Returns dict with:
        weights: np.ndarray
        leverage: float (if target_vol applied)
        expected_vol: float (annualized)
        risk_contribution: np.ndarray
    """
    recent = returns.iloc[-lookback:]
    cov = recent.cov().values * 252  # annualized covariance
    n = len(returns.columns)

    # Initial guess: inverse volatility
    w0 = inverse_volatility_weights(returns, lookback)
    if w0.sum() == 0:
        w0 = np.ones(n) / n

    # Bounds
    bounds = [(min_weight, max_weight) for _ in range(n)]

    # Constraint: sum(weights) = 1
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]

    result = minimize(
        _risk_parity_objective,
        w0,
        args=(cov,),
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"ftol": 1e-9, "maxiter": 1000},
    )

    if not result.success:
        logger.warning(f"Risk parity optimization did not converge: {result.message}")

    weights = np.maximum(result.x, 0)
    weights = weights / weights.sum()

    port_vol = np.sqrt(weights @ cov @ weights)
    rc = _portfolio_risk_contribution(weights, cov)

    leverage = 1.0
    if target_vol and port_vol > 0:
        leverage = target_vol / port_vol
        leverage = min(leverage, 3.0)  # cap leverage at 3x

    return {
        "weights": weights,
        "leverage": leverage,
        "expected_vol": round(port_vol, 4),
        "risk_contribution": rc,
        "success": result.success,
    }


def backtest_strategy(
    returns: pd.DataFrame,
    weights_func,
    rebalance_freq: int = 30,
    rebalance_threshold: Optional[float] = None,
    lookback: int = 90,
    max_weight: float = 0.50,
    min_weight: float = 0.05,
    target_vol: Optional[float] = None,
    transaction_cost: float = 0.001,
) -> Dict[str, any]:
    """
    Backtest a weighting strategy through time.

    Args:
        returns: daily log returns DataFrame
        weights_func: callable(returns_slice) -> weights array
        rebalance_freq: days between rebalancing
        rebalance_threshold: rebalance if any weight drifts > this pct
        transaction_cost: per-trade cost as fraction

    Returns:
        Dict with equity curve, metrics, weight history.
    """
    n_days = len(returns)
    n_assets = len(returns.columns)
    dates = returns.index

    equity = [1.0]
    current_weights = np.ones(n_assets) / n_assets
    weight_history = []
    equity_dates = [dates[0]]

    for i in range(1, n_days):
        # Daily portfolio return
        daily_ret = returns.iloc[i].values
        port_ret = np.dot(current_weights, daily_ret)
        equity.append(equity[-1] * np.exp(port_ret))
        equity_dates.append(dates[i])

        # Drift weights
        asset_rets = np.exp(daily_ret) - 1
        drifted = current_weights * (1 + asset_rets)
        drifted = drifted / drifted.sum() if drifted.sum() > 0 else current_weights

        # Rebalance check
        do_rebalance = False
        if i % rebalance_freq == 0:
            do_rebalance = True
        if rebalance_threshold:
            if np.max(np.abs(drifted - current_weights)) > rebalance_threshold:
                do_rebalance = True

        if do_rebalance:
            available = returns.iloc[max(0, i - lookback) : i]
            if len(available) >= 10:
                new_weights = weights_func(
                    available,
                    lookback=lookback,
                    max_weight=max_weight,
                    min_weight=min_weight,
                    target_vol=target_vol,
                )["weights"]
                turnover = np.sum(np.abs(new_weights - drifted))
                cost = turnover * transaction_cost
                equity[-1] *= (1 - cost)
                current_weights = new_weights
                weight_history.append({
                    "date": dates[i],
                    "weights": new_weights.copy(),
                    "turnover": turnover,
                })
        else:
            current_weights = drifted

    equity_series = pd.Series(equity, index=equity_dates)
    port_returns = equity_series.pct_change().dropna()

    metrics = _calculate_metrics(port_returns, equity_series)
    metrics["weight_history"] = weight_history
    metrics["equity_curve"] = [
        {"date": str(d), "value": float(v)} for d, v in equity_series.items()
    ]
    return metrics


def _calculate_metrics(returns: pd.Series, equity: pd.Series) -> Dict[str, any]:
    """CAGR, Sharpe, Sortino, Max Drawdown, Volatility, Calmar."""
    if len(returns) < 2:
        return {}

    # Annualized metrics (252 trading days)
    ann_factor = 252
    cagr = (equity.iloc[-1] / equity.iloc[0]) ** (ann_factor / len(returns)) - 1
    vol = returns.std() * np.sqrt(ann_factor)
    sharpe = (returns.mean() * ann_factor) / (vol * np.sqrt(ann_factor)) if vol > 0 else 0

    downside = returns[returns < 0]
    downside_vol = downside.std() * np.sqrt(ann_factor) if len(downside) > 1 else 0
    sortino = (returns.mean() * ann_factor) / downside_vol if downside_vol > 0 else 0

    # Max drawdown
    peak = equity.cummax()
    dd = (equity - peak) / peak
    max_dd = dd.min()

    calmar = cagr / abs(max_dd) if max_dd != 0 else 0

    return {
        "cagr": round(cagr, 4),
        "annualized_volatility": round(vol, 4),
        "sharpe_ratio": round(sharpe, 3),
        "sortino_ratio": round(sortino, 3),
        "max_drawdown": round(max_dd, 4),
        "calmar_ratio": round(calmar, 3),
        "total_return": round((equity.iloc[-1] / equity.iloc[0]) - 1, 4),
        "num_days": len(returns),
    }


def run_comparison(
    tickers: List[str] = None,
    period: str = "10y",
    lookback: int = 90,
    rebalance_freq: int = 30,
) -> Dict[str, any]:
    """Run backtest for Risk Parity, Inverse Vol, 60/40, and 100% Equity."""
    tickers = tickers or DEFAULT_ALL
    prices = _fetch_prices_yf(tickers, period=period)
    returns = calculate_returns(prices)

    # Align all to common date range
    returns = returns.dropna()

    def rp_weights(r, **kwargs):
        return risk_parity_weights(r, **kwargs)

    def inv_vol_weights(r, **kwargs):
        w = inverse_volatility_weights(r, kwargs.get("lookback", 90))
        return {"weights": w}

    def fixed_weights_6040(r, **kwargs):
        w = np.zeros(len(r.columns))
        if "SPY" in r.columns:
            w[r.columns.get_loc("SPY")] = 0.60
        if "TLT" in r.columns:
            w[r.columns.get_loc("TLT")] = 0.40
        return {"weights": w}

    def fixed_weights_100equity(r, **kwargs):
        w = np.zeros(len(r.columns))
        if "SPY" in r.columns:
            w[r.columns.get_loc("SPY")] = 1.0
        return {"weights": w}

    results = {
        "risk_parity": backtest_strategy(returns, rp_weights, rebalance_freq=rebalance_freq, lookback=lookback),
        "inverse_volatility": backtest_strategy(returns, inv_vol_weights, rebalance_freq=rebalance_freq, lookback=lookback),
        "benchmark_60_40": backtest_strategy(returns, fixed_weights_6040, rebalance_freq=rebalance_freq, lookback=lookback),
        "benchmark_100_equity": backtest_strategy(returns, fixed_weights_100equity, rebalance_freq=rebalance_freq, lookback=lookback),
    }

    return {
        "tickers": list(returns.columns),
        "period_days": len(returns),
        "date_from": str(returns.index[0]),
        "date_to": str(returns.index[-1]),
        "strategies": results,
    }
