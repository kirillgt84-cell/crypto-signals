"""Tests for crypto-metrics router"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.mark.asyncio
class TestCryptoMetricsMarketState:
    @patch("routers.crypto_metrics._fetch_coingecko_global")
    @patch("routers.crypto_metrics._fetch_stablecoin_mcaps")
    async def test_compute_market_state_success(self, mock_stable, mock_global):
        mock_global.return_value = {
            "data": {
                "total_market_cap": {"usd": 3_000_000_000_000},
                "market_cap_percentage": {"btc": 52.0},
            }
        }
        mock_stable.return_value = 150_000_000_000

        from routers.crypto_metrics import _compute_market_state
        state = await _compute_market_state()
        assert state.btc_dominance > 0
        assert state.phase in {
            "BTC_EXPANSION", "BTC_ACCUMULATION", "ALTSEASON",
            "RISK_OFF", "DISTRIBUTION", "TRANSITION"
        }
        assert state.signal.type in {"BUY_BTC", "BUY_ALTS", "MOVE_TO_STABLES", "HOLD"}
        assert state.total_market_cap_usd > 0

    @patch("routers.crypto_metrics._fetch_coingecko_global")
    @patch("routers.crypto_metrics._fetch_stablecoin_mcaps")
    async def test_compute_market_state_coingecko_failure(self, mock_stable, mock_global):
        """When CoinGecko returns empty data we should raise so the endpoint returns fallback."""
        mock_global.return_value = {"data": {}}
        mock_stable.return_value = 0.0

        from routers.crypto_metrics import _compute_market_state
        with pytest.raises(ValueError):
            await _compute_market_state()

    @patch("routers.crypto_metrics._fetch_coingecko_global")
    @patch("routers.crypto_metrics._fetch_stablecoin_mcaps")
    async def test_get_market_state_returns_200_on_failure(self, mock_stable, mock_global):
        """Endpoint must return 200 with fallback data when upstream fails."""
        mock_global.side_effect = Exception("CoinGecko timeout")
        mock_stable.return_value = 0.0

        # Reset cache so we force a fresh (failing) computation
        from routers.crypto_metrics import _cache, _cache_time
        _cache.clear() if hasattr(_cache, "clear") else None
        # _cache is a dict, we can just reset the module globals
        import routers.crypto_metrics as cm
        cm._cache = {}
        cm._cache_time = None

        response = client.get("/api/v1/crypto-metrics/market-state")
        assert response.status_code == 200
        data = response.json()
        assert data["phase"] == "UNKNOWN"
        assert data["signal"]["type"] == "HOLD"
