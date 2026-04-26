"""
Portfolio risk metrics calculator.
Drawdown, Sharpe, Sortino, Calmar ratios from portfolio history.
"""
import logging
from typing import Dict, Any, List
from database import get_db
import numpy as np

logger = logging.getLogger(__name__)


def _calculate_returns(notional_values: List[float]) -> List[float]:
    """Calculate simple daily returns from notional series."""
    returns = []
    for i in range(1, len(notional_values)):
        prev = notional_values[i - 1]
        curr = notional_values[i]
        if prev and prev > 0:
            returns.append((curr - prev) / prev)
        else:
            returns.append(0.0)
    return returns


def calculate_max_drawdown(notional_values: List[float]) -> Dict[str, Any]:
    """Calculate maximum drawdown and peak/trough dates (indices)."""
    if not notional_values or len(notional_values) < 2:
        return {"max_drawdown": 0.0, "peak_index": 0, "trough_index": 0}
    
    peak = notional_values[0]
    peak_idx = 0
    max_dd = 0.0
    trough_idx = 0
    
    for i, val in enumerate(notional_values):
        if val > peak:
            peak = val
            peak_idx = i
        dd = (peak - val) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
            trough_idx = i
    
    return {
        "max_drawdown": round(max_dd, 4),
        "peak_index": peak_idx,
        "trough_index": trough_idx,
    }


def calculate_sharpe(returns: List[float], risk_free_rate: float = 0.0) -> float:
    """Annualized Sharpe ratio. Assumes daily returns, 365 trading days for crypto."""
    if not returns or len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    excess = arr - risk_free_rate
    std = np.std(excess, ddof=1)
    if std == 0:
        return 0.0
    sharpe = np.mean(excess) / std * np.sqrt(365)
    return round(sharpe, 3)


def calculate_sortino(returns: List[float], risk_free_rate: float = 0.0) -> float:
    """Annualized Sortino ratio (downside deviation only)."""
    if not returns or len(returns) < 2:
        return 0.0
    arr = np.array(returns)
    excess = arr - risk_free_rate
    downside = excess[excess < 0]
    downside_std = np.std(downside, ddof=1) if len(downside) > 1 else 0
    if downside_std == 0:
        return 0.0
    sortino = np.mean(excess) / downside_std * np.sqrt(365)
    return round(sortino, 3)


def calculate_calmar(returns: List[float], max_drawdown: float) -> float:
    """Annualized Calmar ratio = CAGR / max_drawdown."""
    if not returns or max_drawdown <= 0:
        return 0.0
    cagr = np.mean(returns) * 365
    calmar = cagr / max_drawdown
    return round(calmar, 3)


async def get_portfolio_metrics(user_id: int, days: int = 90) -> Dict[str, Any]:
    """Calculate risk-adjusted portfolio metrics from history."""
    db = get_db()
    rows = await db.query(
        """SELECT date, total_notional
           FROM portfolio_history
           WHERE user_id = $1 AND date > CURRENT_DATE - $2 * INTERVAL '1 day'
           ORDER BY date ASC""",
        [user_id, days],
    )
    
    if not rows or len(rows) < 5:
        return {
            "available": False,
            "message": "Not enough history data (minimum 5 days required)",
            "days_available": len(rows) if rows else 0,
        }
    
    notional_values = [r["total_notional"] or 0 for r in rows]
    returns = _calculate_returns(notional_values)
    
    dd_info = calculate_max_drawdown(notional_values)
    sharpe = calculate_sharpe(returns)
    sortino = calculate_sortino(returns)
    calmar = calculate_calmar(returns, dd_info["max_drawdown"])
    
    total_return = (notional_values[-1] - notional_values[0]) / notional_values[0] if notional_values[0] > 0 else 0
    volatility = round(np.std(returns, ddof=1) * np.sqrt(365), 4) if len(returns) > 1 else 0
    
    return {
        "available": True,
        "period_days": len(rows),
        "total_return_pct": round(total_return * 100, 2),
        "annualized_volatility": volatility,
        "max_drawdown_pct": round(dd_info["max_drawdown"] * 100, 2),
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "calmar_ratio": calmar,
        "daily_returns": [round(r, 6) for r in returns],
        "notional_history": [
            {"date": str(r["date"]), "notional": r["total_notional"]} for r in rows
        ],
    }
