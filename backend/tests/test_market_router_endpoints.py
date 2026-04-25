"""Tests for market router endpoints"""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestOiAnalysisEndpoint:
    @patch("routers.market.fetcher")
    @patch("routers.market.get_db")
    async def test_get_oi_analysis_with_history(self, mock_get_db, mock_fetcher):
        from routers.market import get_oi_analysis

        mock_fetcher.get_oi_analysis = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "open_interest": 15000000000,
            "price": 70000,
            "price_change_24h": 2.0,
            "volume_24h": 28000000000,
            "volume_change": 0.01,
        })
        mock_fetcher.get_spot_volume = AsyncMock(return_value={
            "spot_volume": 25000000000,
            "spot_volume_change": 1.5,
        })
        mock_fetcher.get_exchange_netflow = AsyncMock(return_value={"exchange_flow": None, "source": "defillama"})

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{
            "open_interest": 14000000000,
            "price": 69000,
            "volume": 20000000000,
            "spot_volume": 22000000000,
        }])

        result = await get_oi_analysis("BTC", "1h")

        assert result["symbol"] == "BTCUSDT"
        assert result["oi_change_24h"] > 0
        assert result["analysis"]["signal"] in ["strong_bullish", "long_buildup", "neutral"]
        assert "exchange_flow" in result

    @patch("routers.market.fetcher")
    @patch("routers.market.get_db")
    async def test_get_oi_analysis_no_history(self, mock_get_db, mock_fetcher):
        from routers.market import get_oi_analysis

        mock_fetcher.get_oi_analysis = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "open_interest": 15000000000,
            "price": 70000,
            "price_change_24h": 0.5,
            "volume_24h": 28000000000,
            "volume_change": 0.01,
        })
        mock_fetcher.get_spot_volume = AsyncMock(return_value={
            "spot_volume": 25000000000,
        })
        mock_fetcher.get_exchange_netflow = AsyncMock(return_value={"exchange_flow": None, "source": "defillama"})

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        result = await get_oi_analysis("BTC", "1h")

        assert result["oi_change_24h"] == 0
        assert result["oi_change_value"] == 0

    @patch("routers.market.fetcher")
    async def test_get_oi_analysis_appends_usdt(self, mock_fetcher):
        from routers.market import get_oi_analysis

        mock_fetcher.get_oi_analysis = AsyncMock(return_value={
            "symbol": "ETHUSDT",
            "open_interest": 5000000000,
            "price": 3500,
            "price_change_24h": 1.0,
            "volume_24h": 10000000000,
            "volume_change": 0.01,
        })
        mock_fetcher.get_spot_volume = AsyncMock(return_value={"spot_volume": 0})
        mock_fetcher.get_exchange_netflow = AsyncMock(return_value={"exchange_flow": None, "source": "defillama"})

        with patch("routers.market.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=[])
            result = await get_oi_analysis("eth", "1h")

        mock_fetcher.get_oi_analysis.assert_called_once()
        call_args = mock_fetcher.get_oi_analysis.call_args
        assert call_args[0][0] == "ETHUSDT"


@pytest.mark.asyncio
class TestChecklistEndpoint:
    @patch("routers.market.fetcher")
    @patch("routers.market.get_liquidation_levels_enriched", new_callable=AsyncMock)
    @patch("routers.market.get_db")
    async def test_get_checklist_strong_buy(self, mock_get_db, mock_liq, mock_fetcher):
        from routers.market import get_checklist

        mock_fetcher.get_oi_analysis = AsyncMock(return_value={
            "price": 70000,
            "open_interest": 15000000000,
            "analysis": {"signal": "strong_bullish", "status": "long_buildup"}
        })
        mock_fetcher.get_cvd = AsyncMock(return_value={"interpretation": "bullish"})
        mock_fetcher.get_cluster_data = AsyncMock(return_value={"clusters": [{"price": 70000}], "poc": 69800})
        mock_fetcher.get_ema_levels = AsyncMock(return_value={
            "trend": "bullish", "distance_to_ema50_pct": 1.0, "ema50": 69000, "ema200": 68000
        })
        mock_liq.return_value = {"funding_rate": 0.00005, "closest_long": 69000, "closest_short": 71000}

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"open_interest": 14000000000}])

        result = await get_checklist("BTC", "1h")

        assert result["recommendation"] == "STRONG_BUY"
        assert result["score"] >= 6
        assert result["checks"]["oi_signal"]["passed"] is True
        assert result["checks"]["cvd_confirmation"]["passed"] is True

    @patch("routers.market.fetcher")
    @patch("routers.market.get_liquidation_levels_enriched", new_callable=AsyncMock)
    @patch("routers.market.get_db")
    async def test_get_checklist_wait(self, mock_get_db, mock_liq, mock_fetcher):
        from routers.market import get_checklist

        mock_fetcher.get_oi_analysis = AsyncMock(return_value={
            "price": 70000,
            "open_interest": 15000000000,
            "analysis": {"signal": "neutral", "status": "neutral"}
        })
        mock_fetcher.get_cvd = AsyncMock(return_value={"interpretation": "neutral"})
        mock_fetcher.get_cluster_data = AsyncMock(return_value={"clusters": [], "poc": 0})
        mock_fetcher.get_ema_levels = AsyncMock(return_value={
            "trend": "mixed", "distance_to_ema50_pct": 0, "ema50": 69000, "ema200": 68000
        })
        mock_liq.return_value = {"funding_rate": 0, "closest_long": 69000, "closest_short": 71000}

        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        result = await get_checklist("BTC", "1h")

        assert result["recommendation"] == "WAIT"
        assert result["checks"]["oi_signal"]["passed"] is False


@pytest.mark.asyncio
class TestCvdEndpoint:
    @patch("routers.market.fetcher")
    async def test_get_cvd(self, mock_fetcher):
        from routers.market import get_cvd

        mock_fetcher.get_cvd = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "cvd_value": 1000000,
            "interpretation": "bullish",
        })

        result = await get_cvd("BTC", "1h")

        assert result["cvd_value"] == 1000000
        assert result["timeframe"] == "1h"
        call_args = mock_fetcher.get_cvd.call_args
        assert call_args[0][0] == "BTCUSDT"


@pytest.mark.asyncio
class TestProfileEndpoint:
    @patch("routers.market.fetcher")
    async def test_get_profile(self, mock_fetcher):
        from routers.market import get_profile

        mock_fetcher.get_cluster_data = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "poc": 69800,
            "vah": 71000,
            "val": 68500,
        })
        mock_fetcher.get_ema_levels = AsyncMock(return_value={
            "ema20": 69500, "ema50": 69000
        })

        result = await get_profile("BTC")

        assert result["poc"] == 69800
        assert result["ema20"] == 69500
        mock_fetcher.get_cluster_data.assert_called_once_with("BTCUSDT")
        mock_fetcher.get_ema_levels.assert_called_once_with("BTCUSDT", "1h")


@pytest.mark.asyncio
class TestLevelsEndpoint:
    @patch("routers.market.fetcher")
    @patch("routers.market.get_liquidation_levels_enriched", new_callable=AsyncMock)
    async def test_get_levels(self, mock_liq, mock_fetcher):
        from routers.market import get_levels

        mock_liq.return_value = {
            "current_price": 70000,
            "long_liquidations": [{"price": 69000}],
            "short_liquidations": [{"price": 71000}],
        }
        mock_fetcher.get_ema_levels = AsyncMock(return_value={
            "ema20": 69500, "ema50": 69000, "ema200": 68000
        })

        result = await get_levels("BTC", "1h")

        assert result["liquidation_levels"]["current_price"] == 70000
        assert result["ema_levels"]["ema20"] == 69500


@pytest.mark.asyncio
class TestSpotVolumeEndpoint:
    @patch("routers.market.fetcher")
    async def test_get_spot_volume(self, mock_fetcher):
        from routers.market import get_spot_volume

        mock_fetcher.get_spot_volume = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "spot_volume": 25000000000,
            "spot_volume_change": 2.5,
        })

        result = await get_spot_volume("BTC", "1h")

        assert result["spot_volume"] == 25000000000
        mock_fetcher.get_spot_volume.assert_called_once_with("BTCUSDT", "1h")


@pytest.mark.asyncio
class TestSentimentEndpoint:
    @patch("routers.market.fetcher")
    async def test_get_sentiment(self, mock_fetcher):
        from routers.market import get_sentiment

        mock_fetcher.get_sentiment_metrics = AsyncMock(return_value={
            "symbol": "BTCUSDT",
            "long_short_ratio": 1.25,
            "long_accounts_pct": 55.5,
            "short_accounts_pct": 44.5,
            "top_trader_ratio": 1.8,
            "top_long_pct": 64.0,
            "top_short_pct": 36.0,
            "taker_volume_ratio": 1.12,
            "taker_buy": 1.5,
            "taker_sell": 1.34,
            "sentiment_signal": "bullish",
        })

        result = await get_sentiment("BTC")

        assert result["symbol"] == "BTCUSDT"
        assert result["long_short_ratio"] == 1.25
        assert result["sentiment_signal"] == "bullish"
        mock_fetcher.get_sentiment_metrics.assert_called_once_with("BTCUSDT")
