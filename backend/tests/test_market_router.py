"""Tests for routers/market.py"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, patch

from routers.market import clean_json, get_liquidation_levels_enriched


class TestCleanJson:
    def test_nested_dict(self):
        obj = {"a": {"b": np.int64(42)}, "c": [np.float64(1.5)]}
        result = clean_json(obj)
        assert result == {"a": {"b": 42}, "c": [1.5]}
        assert isinstance(result["a"]["b"], int)
        assert isinstance(result["c"][0], float)

    def test_numpy_bool(self):
        obj = {"flag": np.bool_(True)}
        result = clean_json(obj)
        assert result == {"flag": True}
        assert isinstance(result["flag"], bool)

    def test_numpy_array(self):
        obj = {"arr": np.array([1, 2, 3])}
        result = clean_json(obj)
        assert result == {"arr": [1, 2, 3]}

    def test_plain_values_unchanged(self):
        obj = {"s": "hello", "i": 42, "f": 3.14, "b": True}
        result = clean_json(obj)
        assert result == obj

    def test_deeply_nested(self):
        obj = {
            "level1": {
                "level2": {
                    "level3": [np.int32(1), {"val": np.float32(2.0)}]
                }
            }
        }
        result = clean_json(obj)
        assert result["level1"]["level2"]["level3"][0] == 1
        assert result["level1"]["level2"]["level3"][1]["val"] == 2.0


@pytest.mark.asyncio
class TestLiquidationLevelsEnriched:
    @patch("routers.market.fetcher")
    @patch("routers.market.okx_fetcher")
    async def test_with_okx_data(self, mock_okx, mock_binance):
        mock_binance.get_liquidation_levels = AsyncMock(return_value={
            "current_price": 50000,
            "funding_rate": 0.0001,
            "funding_signal": "neutral"
        })
        mock_okx.get_liquidation_data = AsyncMock(return_value=[
            {"price": 49000, "size": 1.0, "side": "Long", "posSide": "short"},
            {"price": 51000, "size": 2.0, "side": "Short", "posSide": "long"},
        ])

        result = await get_liquidation_levels_enriched("BTCUSDT")

        assert result["current_price"] == 50000
        assert result["source"] == "okx"
        assert len(result["long_liquidations"]) == 1
        assert len(result["short_liquidations"]) == 1
        assert result["closest_long"] == 49000
        assert result["closest_short"] == 51000

    @patch("routers.market.fetcher")
    @patch("routers.market.okx_fetcher")
    async def test_no_okx_data_fallback(self, mock_okx, mock_binance):
        mock_binance.get_liquidation_levels = AsyncMock(return_value={
            "current_price": 50000,
            "funding_rate": 0.0001,
        })
        mock_okx.get_liquidation_data = AsyncMock(return_value=[])

        result = await get_liquidation_levels_enriched("BTCUSDT")

        assert result["current_price"] == 50000

    @patch("routers.market.fetcher")
    @patch("routers.market.okx_fetcher")
    async def test_closest_long_no_below_price(self, mock_okx, mock_binance):
        mock_binance.get_liquidation_levels = AsyncMock(return_value={
            "current_price": 50000,
            "funding_rate": 0.0001,
            "funding_signal": "neutral"
        })
        # All long liquidations are ABOVE current price (unusual but possible)
        mock_okx.get_liquidation_data = AsyncMock(return_value=[
            {"price": 51000, "size": 1.0, "side": "Long", "posSide": "short"},
        ])

        result = await get_liquidation_levels_enriched("BTCUSDT")
        # Should fallback to min(long prices) when none are below current_price
        assert result["closest_long"] == 51000

    @patch("routers.market.fetcher")
    @patch("routers.market.okx_fetcher")
    async def test_closest_short_no_above_price(self, mock_okx, mock_binance):
        mock_binance.get_liquidation_levels = AsyncMock(return_value={
            "current_price": 50000,
            "funding_rate": 0.0001,
            "funding_signal": "neutral"
        })
        # All short liquidations are BELOW current price (unusual but possible)
        mock_okx.get_liquidation_data = AsyncMock(return_value=[
            {"price": 49000, "size": 1.0, "side": "Short", "posSide": "long"},
        ])

        result = await get_liquidation_levels_enriched("BTCUSDT")
        # Should fallback to max(short prices) when none are above current_price
        assert result["closest_short"] == 49000
