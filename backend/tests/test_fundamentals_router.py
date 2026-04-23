"""Tests for routers/fundamentals.py"""
import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from routers.fundamentals import _parse_raw_data, router


class TestParseRawData:
    def test_string_json(self):
        raw = '{"description": "test", "value": 1.5}'
        result = _parse_raw_data(raw)
        assert result == {"description": "test", "value": 1.5}

    def test_dict(self):
        raw = {"description": "test", "value": 1.5}
        result = _parse_raw_data(raw)
        assert result == {"description": "test", "value": 1.5}

    def test_invalid_string(self):
        raw = "not valid json"
        result = _parse_raw_data(raw)
        assert result == {}

    def test_none(self):
        result = _parse_raw_data(None)
        assert result == {}

    def test_int(self):
        result = _parse_raw_data(42)
        assert result == {}


class TestCompositeCalculations:
    """Test composite score calculation logic directly"""

    def _call_get_composite(self, rows):
        """Helper to exercise composite logic with mocked DB"""
        from routers.fundamentals import get_composite
        import asyncio

        with patch("routers.fundamentals.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=rows)
            return asyncio.run(get_composite("BTC"))

    def test_composite_with_mvrv_nupl_funding(self):
        rows = [
            {"metric_name": "mvrv", "value": 2.0, "raw_data": '{"description": "FAIR"}'},
            {"metric_name": "nupl", "value": 0.25, "raw_data": '{"description": "HOPE"}'},
            {"metric_name": "funding_rate", "value": 0.0005, "raw_data": '{"description": "NEUTRAL"}'},
        ]
        result = self._call_get_composite(rows)

        assert result["symbol"] == "BTC"
        assert "score" in result
        assert "sentiment" in result
        assert "components" in result
        assert len(result["components"]) == 3

    def test_composite_with_sopr(self):
        rows = [
            {"metric_name": "mvrv", "value": 2.0, "raw_data": '{"description": "FAIR"}'},
            {"metric_name": "nupl", "value": 0.25, "raw_data": '{"description": "HOPE"}'},
            {"metric_name": "funding_rate", "value": 0.0005, "raw_data": '{"description": "NEUTRAL"}'},
            {"metric_name": "sopr", "value": 1.01, "raw_data": '{"description": "PROFIT_TAKING"}'},
        ]
        result = self._call_get_composite(rows)
        assert "sopr" in result["components"]
        assert result["components"]["sopr"]["normalized"] > 0

    def test_composite_with_market_momentum(self):
        rows = [
            {"metric_name": "market_momentum", "value": 0.15, "raw_data": '{"price": 50000}'},
            {"metric_name": "funding_rate", "value": -0.0005, "raw_data": '{"description": "NEUTRAL"}'},
        ]
        result = self._call_get_composite(rows)

        assert result["symbol"] == "BTC"
        assert "market_momentum" in result["components"]
        assert "funding" in result["components"]

    def test_composite_bullish(self):
        rows = [
            {"metric_name": "mvrv", "value": 4.0, "raw_data": '{"description": "BUBBLE"}'},
            {"metric_name": "nupl", "value": 0.75, "raw_data": '{"description": "EUPHORIA"}'},
            {"metric_name": "funding_rate", "value": 0.002, "raw_data": '{"description": "OVERHEAT"}'},
        ]
        result = self._call_get_composite(rows)
        assert result["sentiment"] == "BULLISH"
        assert result["score"] > 0.5

    def test_composite_bearish(self):
        rows = [
            {"metric_name": "mvrv", "value": 0.0, "raw_data": '{"description": "UNDER"}'},
            {"metric_name": "nupl", "value": -0.25, "raw_data": '{"description": "CAPITULATION"}'},
            {"metric_name": "funding_rate", "value": -0.002, "raw_data": '{"description": "OVERHEAT"}'},
        ]
        result = self._call_get_composite(rows)
        assert result["sentiment"] == "BEARISH"
        assert result["score"] < -0.5

    def test_composite_neutral(self):
        rows = [
            {"metric_name": "mvrv", "value": 2.0, "raw_data": '{"description": "FAIR"}'},
            {"metric_name": "nupl", "value": 0.25, "raw_data": '{"description": "HOPE"}'},
            {"metric_name": "funding_rate", "value": 0.0, "raw_data": '{"description": "NEUTRAL"}'},
        ]
        result = self._call_get_composite(rows)
        assert result["sentiment"] == "NEUTRAL"

    def test_composite_decimal_values(self):
        """Test that Decimal values from asyncpg are properly handled"""
        from decimal import Decimal
        rows = [
            {"metric_name": "mvrv", "value": Decimal("1.5"), "raw_data": '{"description": "FAIR"}'},
            {"metric_name": "nupl", "value": Decimal("0.3"), "raw_data": '{"description": "HOPE"}'},
        ]
        result = self._call_get_composite(rows)
        assert isinstance(result["score"], float)

    def test_composite_no_data_404(self):
        from fastapi import HTTPException
        from routers.fundamentals import get_composite
        import asyncio

        with patch("routers.fundamentals.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=[])
            with pytest.raises(HTTPException) as exc_info:
                asyncio.run(get_composite("BTC"))
            assert exc_info.value.status_code == 404

    def test_composite_with_m2(self):
        rows = [
            {"metric_name": "mvrv", "value": 2.0, "raw_data": '{"description": "FAIR"}'},
            {"metric_name": "nupl", "value": 0.25, "raw_data": '{"description": "HOPE"}'},
            {"metric_name": "funding_rate", "value": 0.0005, "raw_data": '{"description": "NEUTRAL"}'},
            {"metric_name": "m2", "value": 21000.5, "raw_data": '{"source": "FRED"}'},
        ]
        result = self._call_get_composite(rows)
        assert "m2" in result["components"]
        assert result["components"]["m2"]["value"] == 21000.5


@pytest.mark.asyncio
class TestFundamentalsEndpoints:
    @patch("routers.fundamentals.get_db")
    async def test_get_mvrv_success(self, mock_get_db):
        from routers.fundamentals import get_mvrv

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"value": 1.5, "raw_data": '{"interpretation": "FAIR"}', "computed_at": "2026-04-14T00:00:00"}
        ])

        result = await get_mvrv("BTC")
        assert result["value"] == 1.5
        assert result["raw_data"]["interpretation"] == "FAIR"

    @patch("routers.fundamentals.get_db")
    async def test_get_mvrv_404(self, mock_get_db):
        from fastapi import HTTPException
        from routers.fundamentals import get_mvrv

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await get_mvrv("BTC")
        assert exc_info.value.status_code == 404

    @patch("routers.fundamentals.get_db")
    async def test_get_nupl_success(self, mock_get_db):
        from routers.fundamentals import get_nupl

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"value": 0.25, "raw_data": '{"interpretation": "HOPE"}', "computed_at": "2026-04-14T00:00:00"}
        ])

        result = await get_nupl("BTC")
        assert result["value"] == 0.25
        assert result["raw_data"]["interpretation"] == "HOPE"

    @patch("routers.fundamentals.get_db")
    async def test_get_funding_success(self, mock_get_db):
        from routers.fundamentals import get_funding

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"value": 0.0001, "raw_data": '{"interpretation": "NEUTRAL"}', "computed_at": "2026-04-14T00:00:00"}
        ])

        result = await get_funding("BTC")
        assert result["value"] == 0.0001
        assert result["raw_data"]["interpretation"] == "NEUTRAL"

    @patch("routers.fundamentals.get_db")
    async def test_get_sopr_success(self, mock_get_db):
        from routers.fundamentals import get_sopr

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"value": 1.01, "raw_data": '{"interpretation": "PROFIT_TAKING"}', "computed_at": "2026-04-14T00:00:00"}
        ])

        result = await get_sopr("BTC")
        assert result["value"] == 1.01
        assert result["raw_data"]["interpretation"] == "PROFIT_TAKING"

    @patch("routers.fundamentals.get_db")
    async def test_get_sopr_404(self, mock_get_db):
        from fastapi import HTTPException
        from routers.fundamentals import get_sopr

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await get_sopr("BTC")
        assert exc_info.value.status_code == 404

    @patch("routers.fundamentals.get_db")
    async def test_get_m2_success(self, mock_get_db):
        from routers.fundamentals import get_m2

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"value": 21000.5, "raw_data": '{"source": "FRED"}', "computed_at": "2026-04-14T00:00:00"}
        ])

        result = await get_m2("GLOBAL")
        assert result["value"] == 21000.5
        assert result["raw_data"]["source"] == "FRED"

    @patch("routers.fundamentals.get_db")
    async def test_get_m2_404(self, mock_get_db):
        from fastapi import HTTPException
        from routers.fundamentals import get_m2

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        with pytest.raises(HTTPException) as exc_info:
            await get_m2("GLOBAL")
        assert exc_info.value.status_code == 404

    @patch("routers.fundamentals.get_db")
    async def test_raw_check(self, mock_get_db):
        from routers.fundamentals import raw_check

        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()
        mock_db.query = AsyncMock(return_value=[
            {"symbol": "BTC", "metric_name": "mvrv", "value": 1.5, "raw_data": {"test": True}}
        ])

        result = await raw_check("BTC")
        assert result["inserted"] is True
        assert result["row"]["symbol"] == "BTC"
