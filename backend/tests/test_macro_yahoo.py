"""Unit tests for macro Yahoo fetcher."""
import pytest
from unittest.mock import patch, MagicMock
from fetchers.macro_yahoo import MacroYahooFetcher


class TestMacroYahooFetcher:
    """Tests for macro asset fetcher via yfinance."""

    @pytest.mark.asyncio
    async def test_get_historical_structure(self):
        """Historical data should return list of candles with required fields."""
        fetcher = MacroYahooFetcher()
        # Mock yfinance.Ticker.history via asyncio.to_thread
        mock_hist = MagicMock()
        mock_hist.iterrows.return_value = [
            (
                MagicMock(to_pydatetime=lambda: __import__("datetime").datetime(2024, 1, 1)),
                {"Open": 100.0, "High": 101.0, "Low": 99.0, "Close": 100.5, "Volume": 1000000},
            ),
            (
                MagicMock(to_pydatetime=lambda: __import__("datetime").datetime(2024, 1, 2)),
                {"Open": 100.5, "High": 102.0, "Low": 100.0, "Close": 101.5, "Volume": 1200000},
            ),
        ]

        with patch("yfinance.Ticker") as MockTicker:
            MockTicker.return_value.history.return_value = mock_hist
            result = await fetcher.get_historical("spx500", period="5d", interval="1d")

        assert len(result) == 2
        assert result[0]["close"] == 100.5
        assert result[0]["open"] == 100.0
        assert result[0]["volume"] == 1000000
        assert result[1]["close"] == 101.5

    @pytest.mark.asyncio
    async def test_get_latest_price(self):
        """Latest price should return the most recent close."""
        fetcher = MacroYahooFetcher()
        mock_hist = MagicMock()
        mock_hist.iterrows.return_value = [
            (
                MagicMock(to_pydatetime=lambda: __import__("datetime").datetime(2024, 1, 1)),
                {"Open": 100, "High": 101, "Low": 99, "Close": 100.5, "Volume": 1},
            ),
            (
                MagicMock(to_pydatetime=lambda: __import__("datetime").datetime(2024, 1, 2)),
                {"Open": 100.5, "High": 102, "Low": 100, "Close": 200.0, "Volume": 1},
            ),
        ]

        with patch("yfinance.Ticker") as MockTicker:
            MockTicker.return_value.history.return_value = mock_hist
            price = await fetcher.get_latest_price("gold")

        assert price == 200.0

    @pytest.mark.asyncio
    async def test_unknown_asset_raises(self):
        """Unknown asset key should raise ValueError."""
        fetcher = MacroYahooFetcher()
        with pytest.raises(ValueError):
            await fetcher.get_historical("unknown_asset")
