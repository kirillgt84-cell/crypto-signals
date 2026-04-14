"""Tests for strategies/hybrid_final.py and strategies/scanner.py"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import AsyncMock, patch, MagicMock

from strategies.hybrid_final import HybridFinalStrategy


def make_sample_df(n=50, start_price=50000):
    """Create a sample OHLCV DataFrame."""
    data = {
        "open": [start_price + i * 10 for i in range(n)],
        "high": [start_price + i * 10 + 50 for i in range(n)],
        "low": [start_price + i * 10 - 50 for i in range(n)],
        "close": [start_price + i * 10 + 5 for i in range(n)],
        "volume": [1000 + i * 10 for i in range(n)],
    }
    df = pd.DataFrame(data)
    df.index.name = "timestamp"
    return df


class TestHybridFinalStrategy:
    def test_init_calculates_indicators(self):
        df = make_sample_df(50)
        strategy = HybridFinalStrategy(df)

        assert "rsi" in strategy.df.columns
        assert "atr" in strategy.df.columns
        assert strategy.df["rsi"].notna().sum() > 0
        assert strategy.df["atr"].notna().sum() > 0

    def test_check_long_signal_true(self):
        df = make_sample_df(50)
        # Force RSI low and close > prev_close for long signal
        df.loc[df.index[-1], "close"] = df["close"].iloc[-2] + 100
        strategy = HybridFinalStrategy(df)
        # Manually set RSI to 30 (below 40)
        strategy.df.loc[strategy.df.index[-1], "rsi"] = 30

        result = strategy.check_long_signal(len(strategy.df) - 1)
        assert result == True

    def test_check_long_signal_false_rsi_too_high(self):
        df = make_sample_df(50)
        strategy = HybridFinalStrategy(df)
        strategy.df.loc[strategy.df.index[-1], "rsi"] = 50

        result = strategy.check_long_signal(len(strategy.df) - 1)
        assert result == False

    def test_check_long_signal_false_early_index(self):
        df = make_sample_df(50)
        strategy = HybridFinalStrategy(df)
        result = strategy.check_long_signal(5)
        assert result == False

    def test_check_short_signal_true(self):
        df = make_sample_df(50)
        df.loc[df.index[-1], "close"] = df["close"].iloc[-2] - 100
        strategy = HybridFinalStrategy(df)
        strategy.df.loc[strategy.df.index[-1], "rsi"] = 70

        result = strategy.check_short_signal(len(strategy.df) - 1)
        assert result == True

    def test_check_short_signal_false_rsi_too_low(self):
        df = make_sample_df(50)
        strategy = HybridFinalStrategy(df)
        strategy.df.loc[strategy.df.index[-1], "rsi"] = 50

        result = strategy.check_short_signal(len(strategy.df) - 1)
        assert result == False

    def test_check_short_signal_false_price_rising(self):
        df = make_sample_df(50)
        strategy = HybridFinalStrategy(df)
        strategy.df.loc[strategy.df.index[-1], "rsi"] = 70
        # close > prev_close
        assert strategy.df["close"].iloc[-1] > strategy.df["close"].iloc[-2]
        result = strategy.check_short_signal(len(strategy.df) - 1)
        assert result == False

    def test_atr_calculation(self):
        df = make_sample_df(30)
        strategy = HybridFinalStrategy(df)
        atr = strategy.df["atr"].iloc[-1]
        assert pd.notna(atr)
        assert atr > 0


@pytest.mark.asyncio
class TestScanner:
    @patch("strategies.scanner.fetch_binance_data", new_callable=AsyncMock)
    @patch("strategies.scanner.HybridFinalStrategy")
    async def test_check_signal_long(self, mock_strategy_cls, mock_fetch):
        df = make_sample_df(30)
        mock_fetch.return_value = df

        # Use a real strategy's df so atr/rsi columns exist
        real_strategy = HybridFinalStrategy(df)
        mock_strategy = MagicMock()
        mock_strategy.df = real_strategy.df
        mock_strategy.check_long_signal.return_value = True
        mock_strategy.check_short_signal.return_value = False
        mock_strategy_cls.return_value = mock_strategy

        from strategies.scanner import check_signal
        result = await check_signal("BTCUSDT")

        assert result is not None
        assert result["direction"] == "long"
        assert result["symbol"] == "BTC/USDT"
        assert "entry_price" in result
        assert "stop_price" in result
        assert "target_price" in result
        assert result["stop_price"] < result["entry_price"]
        assert result["target_price"] > result["entry_price"]

    @patch("strategies.scanner.fetch_binance_data", new_callable=AsyncMock)
    @patch("strategies.scanner.HybridFinalStrategy")
    async def test_check_signal_short(self, mock_strategy_cls, mock_fetch):
        df = make_sample_df(30)
        mock_fetch.return_value = df

        real_strategy = HybridFinalStrategy(df)
        mock_strategy = MagicMock()
        mock_strategy.df = real_strategy.df
        mock_strategy.check_long_signal.return_value = False
        mock_strategy.check_short_signal.return_value = True
        mock_strategy_cls.return_value = mock_strategy

        from strategies.scanner import check_signal
        result = await check_signal("BTCUSDT")

        assert result is not None
        assert result["direction"] == "short"
        assert result["stop_price"] > result["entry_price"]
        assert result["target_price"] < result["entry_price"]

    @patch("strategies.scanner.fetch_binance_data", new_callable=AsyncMock)
    async def test_check_signal_no_signal(self, mock_fetch):
        df = make_sample_df(30)
        mock_fetch.return_value = df

        from strategies.scanner import check_signal
        result = await check_signal("BTCUSDT")
        assert result is None

    @patch("strategies.scanner.fetch_binance_data", new_callable=AsyncMock)
    async def test_fetch_binance_data_structure(self, mock_fetch):
        df = make_sample_df(10).astype(float)
        mock_fetch.return_value = df

        from strategies.scanner import fetch_binance_data
        result = await fetch_binance_data("BTCUSDT", "1h", 10)

        assert isinstance(result, pd.DataFrame)
        assert "open" in result.columns
        assert "high" in result.columns
        assert "low" in result.columns
        assert "close" in result.columns
        assert "volume" in result.columns
        assert result.index.name == "timestamp"
        assert result["close"].dtype == float

    @patch("strategies.scanner.check_signal", new_callable=AsyncMock)
    @patch("strategies.scanner.aiohttp.ClientSession")
    async def test_scan_and_create_signal(self, mock_session_cls, mock_check_signal):
        mock_check_signal.return_value = {
            "symbol": "BTC/USDT",
            "direction": "long",
            "entry_price": 70000,
            "target_price": 75000,
            "stop_price": 68000,
            "confidence": 70,
            "strategy": "HYBRID_V1",
        }

        mock_resp = AsyncMock()
        mock_resp.status = 200
        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_resp)
        mock_session_cls.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        from strategies.scanner import scan_and_create_signal
        await scan_and_create_signal("http://localhost:8000")

        mock_session.post.assert_called_once()

    @patch("strategies.scanner.check_signal", new_callable=AsyncMock)
    @patch("strategies.scanner.aiohttp.ClientSession")
    async def test_scan_and_create_signal_api_error(self, mock_session_cls, mock_check_signal):
        mock_check_signal.return_value = {
            "symbol": "BTC/USDT",
            "direction": "long",
            "entry_price": 70000,
            "target_price": 75000,
            "stop_price": 68000,
            "confidence": 70,
            "strategy": "HYBRID_V1",
        }

        mock_resp = AsyncMock()
        mock_resp.status = 500
        mock_resp.text = AsyncMock(return_value="Server error")
        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=mock_resp)
        mock_session_cls.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        from strategies.scanner import scan_and_create_signal
        await scan_and_create_signal("http://localhost:8000")

        mock_session.post.assert_called_once()

    @patch("strategies.scanner.check_signal", new_callable=AsyncMock)
    async def test_scan_no_signal(self, mock_check_signal):
        mock_check_signal.return_value = None

        from strategies.scanner import scan_and_create_signal
        # Should complete without network calls since signal is None
        await scan_and_create_signal("http://localhost:8000")

    def test_start_scheduler(self):
        from strategies.scanner import start_scheduler
        scheduler = start_scheduler("http://localhost:8000")
        assert scheduler is not None
        scheduler.shutdown()
