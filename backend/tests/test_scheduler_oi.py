"""Unit tests for scheduler OI snapshot with dynamic symbols."""
import pytest
from unittest.mock import AsyncMock, patch
from scheduler import _get_top_symbols


class TestSchedulerOI:
    """Tests for OI snapshot symbol selection."""

    @pytest.mark.asyncio
    async def test_get_top_symbols_filters_by_volume(self):
        """Symbols below min volume should be excluded."""
        mock_exchange = [
            {"symbol": "BTCUSDT"},
            {"symbol": "ETHUSDT"},
            {"symbol": "LOWVOLUSDT"},
        ]
        mock_tickers = [
            {"symbol": "BTCUSDT", "quoteVolume": "100000000"},
            {"symbol": "ETHUSDT", "quoteVolume": "50000000"},
            {"symbol": "LOWVOLUSDT", "quoteVolume": "100"},  # below 1M
        ]
        
        with patch("fetchers.binance_heatmap.BinanceHeatmapFetcher") as MockFetcher:
            instance = MockFetcher.return_value
            instance.get_exchange_info = AsyncMock(return_value=mock_exchange)
            instance.get_all_tickers = AsyncMock(return_value=mock_tickers)
            instance.close = AsyncMock()
            
            symbols = await _get_top_symbols(min_volume=1_000_000, top_n=10)
        
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols
        assert "LOWVOLUSDT" not in symbols

    @pytest.mark.asyncio
    async def test_get_top_symbols_limits_to_top_n(self):
        """Should return at most top_n symbols."""
        mock_exchange = [{"symbol": f"SYM{i}USDT"} for i in range(200)]
        mock_tickers = [{"symbol": f"SYM{i}USDT", "quoteVolume": str((200 - i) * 1_000_000)} for i in range(200)]
        
        with patch("fetchers.binance_heatmap.BinanceHeatmapFetcher") as MockFetcher:
            instance = MockFetcher.return_value
            instance.get_exchange_info = AsyncMock(return_value=mock_exchange)
            instance.get_all_tickers = AsyncMock(return_value=mock_tickers)
            instance.close = AsyncMock()
            
            symbols = await _get_top_symbols(min_volume=1_000_000, top_n=50)
        
        assert len(symbols) == 50
        assert symbols[0] == "SYM0USDT"  # highest volume
