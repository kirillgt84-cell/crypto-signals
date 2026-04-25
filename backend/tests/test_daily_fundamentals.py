"""Tests for daily_fundamentals.py"""
import pytest
import json
from unittest.mock import AsyncMock, Mock, patch

from daily_fundamentals import (
    interpret_mvrv,
    interpret_nupl,
    interpret_funding,
    save_metric,
    collect_fundamentals,
    fetch_bgeometrics_last,
    fetch_binance_24hr,
    fetch_binance_funding,
)


@pytest.fixture
def mock_db():
    """Return a mock db for save_metric tests."""
    db = Mock()
    db.executed = []

    async def capture_execute(sql, args=None):
        db.executed.append((sql, args))

    db.execute = capture_execute
    return db


class TestInterpretMvrv:
    def test_undervalued(self):
        status, desc = interpret_mvrv(0.8)
        assert status == "UNDERvalued"
        assert "Accumulation" in desc

    def test_fair(self):
        status, desc = interpret_mvrv(1.5)
        assert status == "FAIR"
        assert "Fair" in desc

    def test_overvalued(self):
        status, desc = interpret_mvrv(2.5)
        assert status == "OVERvalued"
        assert "Overvalued" in desc

    def test_bubble(self):
        status, desc = interpret_mvrv(4.0)
        assert status == "BUBBLE"
        assert "Bubble" in desc

    def test_boundary_exactly_one(self):
        status, _ = interpret_mvrv(1.0)
        assert status == "FAIR"

    def test_boundary_exactly_two(self):
        status, _ = interpret_mvrv(2.0)
        assert status == "OVERvalued"

    def test_boundary_exactly_three_five(self):
        status, _ = interpret_mvrv(3.5)
        assert status == "BUBBLE"


class TestInterpretNupl:
    def test_euphoria(self):
        status, desc = interpret_nupl(0.8)
        assert status == "EUPHORIA"
        assert "🔴" in desc

    def test_belief(self):
        status, desc = interpret_nupl(0.6)
        assert status == "BELIEF"
        assert "🟠" in desc

    def test_hope(self):
        status, desc = interpret_nupl(0.3)
        assert status == "HOPE"
        assert "🟡" in desc

    def test_optimism(self):
        status, desc = interpret_nupl(0.1)
        assert status == "OPTIMISM"
        assert "🟢" in desc

    def test_capitulation(self):
        status, desc = interpret_nupl(-0.1)
        assert status == "CAPITULATION"
        assert "🔵" in desc

    def test_boundary_exactly_zero(self):
        status, _ = interpret_nupl(0.0)
        assert status == "CAPITULATION"


class TestInterpretFunding:
    def test_long_overheat(self):
        status, desc = interpret_funding(0.002)
        assert status == "LONG_OVERHEAT"
        assert "Longs" in desc

    def test_short_overheat(self):
        status, desc = interpret_funding(-0.002)
        assert status == "SHORT_OVERHEAT"
        assert "Shorts" in desc

    def test_neutral_positive(self):
        status, desc = interpret_funding(0.0005)
        assert status == "NEUTRAL"
        assert "Neutral" in desc

    def test_neutral_negative(self):
        status, desc = interpret_funding(-0.0005)
        assert status == "NEUTRAL"
        assert "Neutral" in desc

    def test_boundary_exactly_0_001(self):
        status, _ = interpret_funding(0.001)
        assert status == "NEUTRAL"

    def test_boundary_exactly_minus_0_001(self):
        status, _ = interpret_funding(-0.001)
        assert status == "NEUTRAL"


@pytest.mark.asyncio
class TestSaveMetric:
    async def test_save_metric_success(self, mock_db):
        raw = {"test": True, "value": 42}
        result = await save_metric(mock_db, "BTC", "mvrv", 1.5, raw)

        assert result["saved"] is True
        assert result["symbol"] == "BTC"
        assert result["metric"] == "mvrv"
        assert result["value"] == 1.5

        # Verify SQL was called with JSON-serialized raw_data
        assert len(mock_db.executed) == 1
        sql, args = mock_db.executed[0]
        assert "INSERT INTO fundamental_metrics" in sql
        assert args[3] == json.dumps(raw)

    async def test_save_metric_with_computed_at(self, mock_db):
        from datetime import datetime
        raw = {"test": True}
        obs_date = datetime(2024, 1, 15)
        result = await save_metric(mock_db, "GLOBAL", "m2", 21000.5, raw, computed_at=obs_date)
        assert result["saved"] is True
        sql, args = mock_db.executed[0]
        assert args[4] == obs_date

    async def test_save_metric_failure(self, mock_db):
        async def fail_execute(sql, args=None):
            raise Exception("DB connection lost")

        mock_db.execute = fail_execute

        result = await save_metric(mock_db, "BTC", "mvrv", 1.5, {"test": True})
        assert result["saved"] is False
        assert "DB connection lost" in result["error"]


@pytest.mark.asyncio
class TestFetchBGeometrics:
    async def test_success(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"mvrv": "1.5", "d": "2026-04-14"}
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_bgeometrics_last(mock_client, "mvrv")
        assert result == {"mvrv": "1.5", "d": "2026-04-14"}

    async def test_non_200_status(self):
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.text = "Rate limited"
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_bgeometrics_last(mock_client, "mvrv")
        assert result is None

    async def test_exception(self):
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Connection timeout")

        result = await fetch_bgeometrics_last(mock_client, "mvrv")
        assert result is None


@pytest.mark.asyncio
class TestFetchBinance24hr:
    async def test_success(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "lastPrice": "75000.50",
            "priceChangePercent": "2.5",
        }
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_binance_24hr(mock_client, "BTC")
        assert result["price"] == 75000.50
        assert result["price_change_24h_pct"] == 2.5

    async def test_failure(self):
        mock_response = Mock()
        mock_response.status_code = 500
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_binance_24hr(mock_client, "BTC")
        assert result is None

    async def test_exception(self):
        mock_client = AsyncMock()
        mock_client.get.side_effect = Exception("Connection timeout")

        result = await fetch_binance_24hr(mock_client, "BTC")
        assert result is None


@pytest.mark.asyncio
class TestFetchBinanceFunding:
    async def test_success(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"symbol": "BTCUSDT", "fundingRate": "0.0001", "fundingTime": 1234567890000}
        ]
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_binance_funding(mock_client, "BTC")
        assert result == 0.0001

    async def test_empty_response(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_binance_funding(mock_client, "BTC")
        assert result is None

    async def test_failure(self):
        mock_response = Mock()
        mock_response.status_code = 500
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_binance_funding(mock_client, "BTC")
        assert result is None


@pytest.mark.asyncio
class TestCollectFundamentals:
    @patch("daily_fundamentals.fetch_binance_funding", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_bgeometrics_last", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_binance_24hr", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_btc_bgeometrics_success(
        self, mock_get_db, mock_bn24, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        mock_bg.side_effect = [
            {"nupl": "0.25", "d": "2026-04-14"},  # BTC nupl
            {"mvrv": "1.5", "d": "2026-04-14"},   # BTC mvrv
            {"sopr": "1.01", "d": "2026-04-14"},  # BTC sopr
        ]
        mock_funding.return_value = 0.0001
        mock_bn24.return_value = {"price": 75000.0, "price_change_24h_pct": 1.5}

        with patch("daily_fundamentals.fetch_fred_m2_history", new_callable=AsyncMock, return_value=[
            {"date": "2024-01-01", "value": 21000.5},
            {"date": "2024-02-01", "value": 21200.0},
        ]):
            results = await collect_fundamentals()

        assert all(r["saved"] for r in results)
        btc_results = [r for r in results if r["symbol"] == "BTC"]
        # BTC: mvrv, nupl, sopr, market_momentum, funding_rate
        assert len(btc_results) == 5
        assert btc_results[0]["metric"] == "mvrv"
        assert btc_results[1]["metric"] == "nupl"
        assert btc_results[2]["metric"] == "sopr"
        assert btc_results[3]["metric"] == "market_momentum"
        assert btc_results[4]["metric"] == "funding_rate"

        # M2 saved under GLOBAL (2 history points)
        m2_results = [r for r in results if r["symbol"] == "GLOBAL" and r["metric"] == "m2"]
        assert len(m2_results) == 2
        assert m2_results[0]["value"] == 21000.5

        eth_results = [r for r in results if r["symbol"] == "ETH"]
        assert len(eth_results) == 2
        assert eth_results[0]["metric"] == "market_momentum"
        assert eth_results[1]["metric"] == "funding_rate"

    @patch("daily_fundamentals.fetch_binance_funding", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_bgeometrics_last", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_binance_24hr", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_btc_fallback_to_binance(
        self, mock_get_db, mock_bn24, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        # BGeometrics returns None -> fallback to Binance 24h for BTC
        mock_bg.return_value = None
        mock_funding.return_value = 0.0001
        mock_bn24.return_value = {"price": 50000.0, "price_change_24h_pct": 2.5}

        results = await collect_fundamentals()

        metrics = [r["metric"] for r in results]
        assert "market_momentum" in metrics
        assert "funding_rate" in metrics

    @patch("daily_fundamentals.fetch_binance_funding", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_bgeometrics_last", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_binance_24hr", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_no_funding(
        self, mock_get_db, mock_bn24, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        mock_bg.side_effect = [
            {"nupl": "0.25"},
            {"mvrv": "1.5"},
            {"sopr": "1.01"},
        ]
        mock_funding.return_value = None  # No funding data
        mock_bn24.return_value = None

        results = await collect_fundamentals()

        # mvrv, nupl, sopr for BTC
        assert len(results) == 3
        assert results[0]["metric"] == "mvrv"
        assert results[1]["metric"] == "nupl"
        assert results[2]["metric"] == "sopr"
