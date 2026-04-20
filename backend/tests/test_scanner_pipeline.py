"""Unit tests for scanner pipeline."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from scanners.anomaly_scanner import scan_anomalies, run_scanner_job


class TestScannerPipeline:
    """Tests for anomaly scanner full pipeline."""

    @pytest.fixture
    def mock_fetcher(self):
        """Mock heatmap fetcher returning 2 symbols."""
        fetcher = MagicMock()
        fetcher.get_exchange_info = AsyncMock(return_value=[
            {"symbol": "BTCUSDT", "baseAsset": "BTC", "category": "PoW"},
            {"symbol": "ETHUSDT", "baseAsset": "ETH", "category": "Layer-1"},
        ])
        fetcher.get_all_tickers = AsyncMock(return_value=[
            {"symbol": "BTCUSDT", "lastPrice": "60000", "quoteVolume": "500000000", "volume": "8000", "priceChangePercent": "2.5"},
            {"symbol": "ETHUSDT", "lastPrice": "3000", "quoteVolume": "100000", "volume": "30", "priceChangePercent": "1.0"},
        ])
        fetcher.get_all_open_interest = AsyncMock(return_value={
            "BTCUSDT": 120000.0,
            "ETHUSDT": 50000.0,
        })
        fetcher.get_snapshot = AsyncMock(return_value=[])
        fetcher.close = AsyncMock()
        return fetcher

    @pytest.fixture
    def mock_db(self):
        """Mock database with proper responses."""
        db = MagicMock()
        db.query = AsyncMock(return_value=[])
        db.execute = AsyncMock(return_value="INSERT 0 1")
        return db

    @pytest.mark.asyncio
    async def test_scan_anomalies_finds_signals(self, mock_fetcher, mock_db):
        """High volume deviation should generate a signal."""
        mock_db.query = AsyncMock(side_effect=[
            # avg_rows (for _get_baselines)
            [{"symbol": "BTCUSDT", "avg_quote_volume": 100000000}],
            # oi_rows (for _get_baselines) — column must be `oi` as real query selects it
            [{"symbol": "BTCUSDT", "oi": 90000, "snapshot_time": "2024-01-01T00:00:00"}],
            # cooldown rows (no active cooldowns)
            [],
            # insert into anomaly_signals
            [{"id": 1}],
        ])

        with patch("scanners.anomaly_scanner.BinanceHeatmapFetcher", return_value=mock_fetcher):
            with patch("scanners.anomaly_scanner.get_db", return_value=mock_db):
                signals = await scan_anomalies(min_score=3)

        assert len(signals) >= 1
        # BTCUSDT had volume 5x baseline and OI 33% up → should appear
        btc = [s for s in signals if s.get("symbol") == "BTCUSDT"]
        assert len(btc) == 1

    @pytest.mark.asyncio
    async def test_scan_anomalies_cooldown_blocks(self, mock_fetcher, mock_db):
        """Existing cooldown should block duplicate signal."""
        mock_db.query = AsyncMock(side_effect=[
            [{"symbol": "BTCUSDT", "avg_quote_volume": 100000000}],
            [{"symbol": "BTCUSDT", "oi": 90000, "snapshot_time": "2024-01-01T00:00:00"}],
            # cooldown active
            [{"symbol": "BTCUSDT", "last_alert_time": "2024-01-01T00:00:00"}],
        ])

        with patch("scanners.anomaly_scanner.BinanceHeatmapFetcher", return_value=mock_fetcher):
            with patch("scanners.anomaly_scanner.get_db", return_value=mock_db):
                signals = await scan_anomalies(min_score=3)

        # Should be blocked by cooldown
        assert len(signals) == 0

    @pytest.mark.asyncio
    async def test_run_scanner_job_no_crash(self, mock_fetcher, mock_db):
        """Scheduled job should not raise on empty data."""
        mock_fetcher.get_exchange_info = AsyncMock(return_value=[])
        mock_fetcher.get_all_tickers = AsyncMock(return_value=[])
        mock_fetcher.get_all_open_interest = AsyncMock(return_value={})
        mock_db.query = AsyncMock(side_effect=[
            [], [], []
        ])

        with patch("scanners.anomaly_scanner.BinanceHeatmapFetcher", return_value=mock_fetcher):
            with patch("scanners.anomaly_scanner.get_db", return_value=mock_db):
                # run_scanner_job handles logging; we just assert no exception
                await run_scanner_job()
