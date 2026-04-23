"""Tests for risk parity engine and router."""
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
from services.risk_parity import (
    inverse_volatility_weights,
    risk_parity_weights,
    calculate_returns,
    _calculate_metrics,
)


class TestRiskParityCalculations:
    def test_inverse_volatility_weights(self):
        """Inverse vol weights should sum to 1 and lower-vol assets get higher weight."""
        prices = pd.DataFrame({
            "A": [100, 101, 102, 101, 100],
            "B": [100, 110, 105, 115, 120],
        })
        returns = calculate_returns(prices)
        weights = inverse_volatility_weights(returns, lookback=4)
        assert abs(weights.sum() - 1.0) < 1e-6
        # A is less volatile -> should have higher weight
        assert weights[0] > weights[1]

    def test_risk_parity_weights_sum_to_one(self):
        """Risk parity weights should sum to 1."""
        np.random.seed(42)
        prices = pd.DataFrame({
            "SPY": 100 + np.cumsum(np.random.randn(100) * 0.5),
            "TLT": 100 + np.cumsum(np.random.randn(100) * 0.3),
            "GLD": 100 + np.cumsum(np.random.randn(100) * 0.4),
        })
        returns = calculate_returns(prices)
        result = risk_parity_weights(returns, lookback=90)
        assert result["success"]
        assert abs(result["weights"].sum() - 1.0) < 1e-4
        assert result["expected_vol"] > 0

    def test_risk_parity_respects_bounds(self):
        """Weights should respect max_weight and min_weight constraints."""
        np.random.seed(42)
        prices = pd.DataFrame({
            "A": 100 + np.cumsum(np.random.randn(100) * 0.5),
            "B": 100 + np.cumsum(np.random.randn(100) * 0.3),
            "C": 100 + np.cumsum(np.random.randn(100) * 0.4),
            "D": 100 + np.cumsum(np.random.randn(100) * 0.6),
        })
        returns = calculate_returns(prices)
        result = risk_parity_weights(returns, lookback=90, max_weight=0.40, min_weight=0.10)
        weights = result["weights"]
        assert all(w <= 0.40 + 1e-4 for w in weights)
        assert all(w >= 0.10 - 1e-4 for w in weights)

    def test_calculate_metrics(self):
        equity = pd.Series([1.0, 1.1, 1.05, 0.95, 1.0, 1.15])
        returns = equity.pct_change().dropna()
        metrics = _calculate_metrics(returns, equity)
        assert "cagr" in metrics
        assert "sharpe_ratio" in metrics
        assert "sortino_ratio" in metrics
        assert "max_drawdown" in metrics
        assert "calmar_ratio" in metrics
        assert metrics["max_drawdown"] < 0  # There was a drawdown


class TestRiskParityRouter:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from main import app
        return TestClient(app)

    def test_list_strategies(self, client):
        resp = client.get("/api/v1/risk-parity/strategies")
        assert resp.status_code == 200
        data = resp.json()
        assert "strategies" in data
        assert len(data["strategies"]) >= 2

    @patch("routers.risk_parity._fetch_prices_yf")
    def test_calculate_weights(self, mock_fetch, client):
        mock_fetch.return_value = pd.DataFrame({
            "SPY": [400, 405, 410, 408, 415],
            "TLT": [100, 101, 99, 102, 101],
        })
        resp = client.post("/api/v1/risk-parity/calculate", json={
            "tickers": ["SPY", "TLT"],
            "lookback": 4,
            "period": "1y",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_parity" in data
        assert "inverse_volatility" in data
        assert abs(sum(data["risk_parity"]["weights"].values()) - 1.0) < 1e-3

    @patch("routers.risk_parity.run_comparison")
    def test_backtest_endpoint(self, mock_run, client):
        mock_run.return_value = {
            "tickers": ["SPY", "TLT"],
            "period_days": 100,
            "strategies": {
                "risk_parity": {
                    "cagr": 0.08,
                    "sharpe_ratio": 1.2,
                    "max_drawdown": -0.05,
                }
            }
        }
        resp = client.post("/api/v1/risk-parity/backtest", json={
            "tickers": ["SPY", "TLT"],
            "period": "1y",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "strategies" in data
        assert "risk_parity" in data["strategies"]
