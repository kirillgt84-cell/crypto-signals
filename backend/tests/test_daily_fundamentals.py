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
    fetch_coingecko_data,
    fetch_binance_funding,
)


class TestInterpretMvrv:
    def test_undervalued(self):
        status, desc = interpret_mvrv(0.8)
        assert status == "UNDERvalued"
        assert "накопления" in desc

    def test_fair(self):
        status, desc = interpret_mvrv(1.5)
        assert status == "FAIR"
        assert "Справедливая" in desc

    def test_overvalued(self):
        status, desc = interpret_mvrv(2.5)
        assert status == "OVERvalued"
        assert "Переоценен" in desc

    def test_bubble(self):
        status, desc = interpret_mvrv(4.0)
        assert status == "BUBBLE"
        assert "Пузырь" in desc

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
        assert "Лонги" in desc

    def test_short_overheat(self):
        status, desc = interpret_funding(-0.002)
        assert status == "SHORT_OVERHEAT"
        assert "Шорты" in desc

    def test_neutral_positive(self):
        status, desc = interpret_funding(0.0005)
        assert status == "NEUTRAL"
        assert "Нейтрально" in desc

    def test_neutral_negative(self):
        status, desc = interpret_funding(-0.0005)
        assert status == "NEUTRAL"
        assert "Нейтрально" in desc

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
class TestFetchCoinGecko:
    async def test_success(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "market_data": {
                "market_cap": {"usd": 1000000000000},
                "current_price": {"usd": 50000},
                "circulating_supply": 19000000,
                "price_change_percentage_24h": 2.5,
            }
        }
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_coingecko_data(mock_client, "bitcoin")
        assert result["market_cap"] == 1000000000000
        assert result["price"] == 50000
        assert result["supply"] == 19000000
        assert result["price_change_24h_pct"] == 2.5

    async def test_missing_price_change(self):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "market_data": {
                "market_cap": {"usd": 1000000000000},
                "current_price": {"usd": 50000},
                "circulating_supply": 19000000,
            }
        }
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_coingecko_data(mock_client, "bitcoin")
        assert result["price_change_24h_pct"] == 0

    async def test_failure(self):
        mock_response = Mock()
        mock_response.status_code = 500
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response

        result = await fetch_coingecko_data(mock_client, "bitcoin")
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
    @patch("daily_fundamentals.fetch_coingecko_data", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_btc_bgeometrics_success(
        self, mock_get_db, mock_cg, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        mock_bg.side_effect = [
            {"nupl": "0.25", "d": "2026-04-14"},  # BTC nupl
            {"mvrv": "1.5", "d": "2026-04-14"},   # BTC mvrv
        ]
        mock_funding.return_value = 0.0001
        mock_cg.return_value = None

        results = await collect_fundamentals()

        assert len(results) == 4  # BTC: mvrv, nupl, funding + ETH: funding
        assert all(r["saved"] for r in results)
        btc_results = [r for r in results if r["symbol"] == "BTC"]
        assert btc_results[0]["metric"] == "mvrv"
        assert btc_results[1]["metric"] == "nupl"
        assert btc_results[2]["metric"] == "funding_rate"

    @patch("daily_fundamentals.fetch_binance_funding", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_bgeometrics_last", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_coingecko_data", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_btc_fallback_to_coingecko(
        self, mock_get_db, mock_cg, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        # BGeometrics returns None -> fallback to CoinGecko
        mock_bg.return_value = None
        mock_funding.return_value = 0.0001
        mock_cg.return_value = {
            "market_cap": 1000000000000,
            "price": 50000,
            "supply": 19000000,
            "price_change_24h_pct": 2.5,
        }

        results = await collect_fundamentals()

        # BTC: market_momentum + funding, ETH: market_momentum + funding
        metrics = [r["metric"] for r in results]
        assert "market_momentum" in metrics
        assert "funding_rate" in metrics

    @patch("daily_fundamentals.fetch_binance_funding", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_bgeometrics_last", new_callable=AsyncMock)
    @patch("daily_fundamentals.fetch_coingecko_data", new_callable=AsyncMock)
    @patch("daily_fundamentals.get_db")
    async def test_collect_no_funding(
        self, mock_get_db, mock_cg, mock_bg, mock_funding
    ):
        mock_db = mock_get_db.return_value
        mock_db.connect = AsyncMock()
        mock_db.close = AsyncMock()
        mock_db.execute = AsyncMock()

        mock_bg.side_effect = [
            {"nupl": "0.25"},
            {"mvrv": "1.5"},
        ]
        mock_funding.return_value = None  # No funding data
        mock_cg.return_value = None

        results = await collect_fundamentals()

        # Only mvrv and nupl for BTC
        assert len(results) == 2
        assert results[0]["metric"] == "mvrv"
        assert results[1]["metric"] == "nupl"
