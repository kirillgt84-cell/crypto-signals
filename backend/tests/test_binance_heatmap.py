"""Unit tests for Binance heatmap fetcher."""
import pytest
from unittest.mock import AsyncMock, patch
from fetchers.binance_heatmap import BinanceHeatmapFetcher


class TestBinanceHeatmapFetcher:
    """Tests for heatmap snapshot logic."""

    @pytest.mark.asyncio
    async def test_get_snapshot_returns_symbol_not_baseasset(self):
        """Snapshot must use full symbol (e.g. BTCUSDT) not baseAsset (BTC)."""
        fetcher = BinanceHeatmapFetcher()
        
        # Mock exchange info
        fetcher._exchange_info = [
            {"symbol": "BTCUSDT", "baseAsset": "BTC", "category": "PoW"},
            {"symbol": "ETHUSDT", "baseAsset": "ETH", "category": "Layer-1"},
        ]
        fetcher._category_map = {"BTCUSDT": "PoW", "ETHUSDT": "Layer-1"}
        
        # Mock tickers
        mock_tickers = [
            {"symbol": "BTCUSDT", "lastPrice": "50000", "volume": "1000", "quoteVolume": "50000000", "priceChangePercent": "2.5"},
            {"symbol": "ETHUSDT", "lastPrice": "3000", "volume": "5000", "quoteVolume": "15000000", "priceChangePercent": "-1.2"},
        ]
        
        # Mock OI
        mock_oi = {"BTCUSDT": 100000.0, "ETHUSDT": 50000.0}
        
        with patch.object(fetcher, "get_all_tickers", new=AsyncMock(return_value=mock_tickers)):
            with patch.object(fetcher, "get_all_open_interest", new=AsyncMock(return_value=mock_oi)):
                snapshot = await fetcher.get_snapshot()
        
        symbols = {s["symbol"] for s in snapshot}
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols
        assert "BTC" not in symbols  # baseAsset should NOT be in snapshot
        assert "ETH" not in symbols

    def test_excluded_bases_empty(self):
        """EXCLUDED_BASES should be empty so major assets are included."""
        from fetchers.binance_heatmap import EXCLUDED_BASES
        assert EXCLUDED_BASES == set()
