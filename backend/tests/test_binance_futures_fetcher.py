"""Tests for fetchers/binance_futures.py"""
import pytest

from fetchers.binance_futures import BinanceFuturesFetcher


def make_mock_response(json_data):
    class MockResponse:
        async def json(self):
            return json_data
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return None
    return MockResponse()


def make_mock_session(responses):
    """responses: list of (expected_url_substring, MockResponse)"""
    class MockSession:
        def __init__(self):
            self.calls = []
        def get(self, url, **kwargs):
            self.calls.append((url, kwargs))
            for sub, resp in responses:
                if sub in url:
                    return resp
            return make_mock_response({})
    return MockSession()


@pytest.mark.asyncio
class TestBinanceFuturesFetcher:
    async def test_get_oi_analysis_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/openInterest", make_mock_response({"openInterest": "15000000000"})),
            ("/klines", make_mock_response([
                [1, "69000", "69500", "68500", "69000", "1000", 2, "2000", 100, "500", "1000", "0"],
                [2, "69000", "70500", "68500", "70000", "1200", 3, "2400", 120, "600", "1200", "0"],
            ])),
            ("/premiumIndex", make_mock_response({"markPrice": "70500.5"})),
        ])

        result = await fetcher.get_oi_analysis("BTCUSDT", "1h")

        assert result["symbol"] == "BTCUSDT"
        assert result["open_interest"] == 15000000000.0
        assert result["price"] == 70000.0
        assert result["price_change_24h"] == 1.45  # ((70000-69000)/69000)*100
        assert result["volume_24h"] == 1200.0
        assert result["interpretation"]["status"] in ["long_buildup", "neutral"]

    async def test_get_oi_analysis_klines_too_short(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/openInterest", make_mock_response({"openInterest": "15000000000"})),
            ("/klines", make_mock_response([])),
            ("/premiumIndex", make_mock_response({"markPrice": "70500.5"})),
        ])

        result = await fetcher.get_oi_analysis("BTCUSDT", "1h")

        assert result["price"] == 70500.5
        assert result["price_change_24h"] == 0
        assert result["volume_24h"] == 0

    async def test_get_oi_analysis_fallback_on_error(self):
        fetcher = BinanceFuturesFetcher()

        class ErrorResponse:
            async def json(self):
                raise Exception("bad json")
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        fetcher.session = make_mock_session([
            ("/openInterest", ErrorResponse()),
            ("/premiumIndex", make_mock_response({"markPrice": "50000"})),
        ])

        result = await fetcher.get_oi_analysis("BTCUSDT", "1h")
        assert result["price"] == 50000.0
        assert "error" in result

    async def test_get_oi_analysis_ultimate_fallback(self):
        fetcher = BinanceFuturesFetcher()

        class ErrorResponse:
            async def json(self):
                raise Exception("bad json")
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        fetcher.session = make_mock_session([
            ("/openInterest", ErrorResponse()),
            ("/premiumIndex", ErrorResponse()),
        ])

        result = await fetcher.get_oi_analysis("BTCUSDT", "1h")
        assert result["price"] == 0
        assert "error" in result

    async def test_get_cvd_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/aggTrades", make_mock_response([
                {"p": "70000", "q": "1.0", "m": False},
                {"p": "70100", "q": "0.5", "m": True},
                {"p": "70200", "q": "2.0", "m": False},
            ])),
        ])

        result = await fetcher.get_cvd("BTCUSDT", limit=500)

        assert result["symbol"] == "BTCUSDT"
        assert result["interpretation"] == "bullish"
        assert result["buy_volume"] == pytest.approx(210400.0)
        # Actually buy_volume = 1*70000 + 2*70200 = 210400
        assert result["buy_volume"] == pytest.approx(210400.0)
        assert result["sell_volume"] == pytest.approx(35050.0)

    async def test_get_cvd_empty_response(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/aggTrades", make_mock_response({})),  # not a list
        ])

        result = await fetcher.get_cvd("BTCUSDT")
        assert result["cvd_value"] == 0
        assert "error" in result

    async def test_get_cluster_data_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/aggTrades", make_mock_response([
                {"p": "50000", "q": "1.0", "m": False},
                {"p": "50050", "q": "2.0", "m": True},
                {"p": "50000", "q": "0.5", "m": False},
                {"p": "50100", "q": "1.5", "m": True},
            ])),
        ])

        result = await fetcher.get_cluster_data("BTCUSDT")

        assert result["symbol"] == "BTCUSDT"
        assert "poc" in result
        assert "vah" in result
        assert "val" in result
        assert len(result["clusters"]) > 0
        assert result["total_volume"] == 5.0

    async def test_get_cluster_data_empty_trades(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/aggTrades", make_mock_response([])),
        ])

        result = await fetcher.get_cluster_data("BTCUSDT")
        assert result["poc"] == 0
        assert result["clusters"] == []
        assert "error" in result

    async def test_get_liquidation_levels_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/ticker/24hr", make_mock_response({"lastPrice": "70000"})),
            ("/fundingRate", make_mock_response([{"fundingRate": "0.0002"}])),
        ])

        result = await fetcher.get_liquidation_levels("BTCUSDT")

        assert result["current_price"] == 70000.0
        assert result["funding_rate"] == 0.0002
        assert result["funding_signal"] == "bearish"
        assert len(result["long_liquidations"]) == 3
        assert len(result["short_liquidations"]) == 3

    async def test_get_liquidation_levels_fallback(self):
        fetcher = BinanceFuturesFetcher()

        class ErrorResponse:
            async def json(self):
                raise Exception("network error")
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        fetcher.session = make_mock_session([
            ("/ticker/24hr", ErrorResponse()),
        ])

        result = await fetcher.get_liquidation_levels("BTCUSDT")
        assert result["current_price"] == 70000
        assert "error" in result

    async def test_get_ema_levels_success(self):
        fetcher = BinanceFuturesFetcher()
        # Generate 300 fake klines [timestamp, open, high, low, close, volume, ...]
        klines = []
        base_price = 70000
        for i in range(300):
            close = base_price + i * 10
            klines.append([
                i, str(close-5), str(close+5), str(close-5), str(close), "1000",
                i+1, "2000", 100, "500", "1000", "0"
            ])

        fetcher.session = make_mock_session([
            ("/klines", make_mock_response(klines)),
        ])

        result = await fetcher.get_ema_levels("BTCUSDT", "1h")

        assert result["trend"] == "bullish"
        assert result["current_price"] > 70000
        assert "ema20" in result
        assert "ema50" in result
        assert "ema200" in result
        assert "rsi" in result
        assert "macd" in result
        assert "recommendation" in result

    async def test_get_ema_levels_fallback(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/klines", make_mock_response([])),
        ])

        result = await fetcher.get_ema_levels("BTCUSDT", "1h")
        assert result["trend"] == "bullish"
        assert result["current_price"] == 70000
        assert "error" in result

    async def test_get_spot_volume_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("https://api.binance.com/api/v3/klines", make_mock_response([
                [1, "69000", "69500", "68500", "69000", "1000", 2, "2000", 100, "500", "1000", "0"],
                [2, "69000", "70500", "68500", "70000", "1200", 3, "2400", 120, "600", "1200", "0"],
            ])),
        ])

        result = await fetcher.get_spot_volume("BTCUSDT", "1h")

        assert result["symbol"] == "BTCUSDT"
        assert result["spot_volume"] == 1200.0
        assert result["spot_volume_change"] == 20.0

    async def test_get_spot_volume_fallback(self):
        fetcher = BinanceFuturesFetcher()

        class ErrorResponse:
            async def json(self):
                raise Exception("network error")
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        fetcher.session = make_mock_session([
            ("https://api.binance.com/api/v3/klines", ErrorResponse()),
        ])

        result = await fetcher.get_spot_volume("BTCUSDT", "1h")
        assert result["spot_volume"] == 0
        assert "error" in result

    async def test_get_sentiment_metrics_success(self):
        fetcher = BinanceFuturesFetcher()
        fetcher.session = make_mock_session([
            ("/globalLongShortAccountRatio", make_mock_response([
                {"symbol": "BTCUSDT", "longAccount": "0.65", "shortAccount": "0.35", "longShortRatio": "1.857"}
            ])),
            ("/topLongShortPositionRatio", make_mock_response([
                {"symbol": "BTCUSDT", "longAccount": "0.72", "shortAccount": "0.28", "longShortRatio": "2.571"}
            ])),
            ("/takerlongshortRatio", make_mock_response([
                {"buyVol": "1.5", "sellVol": "1.0", "buySellRatio": "1.5"}
            ])),
        ])

        result = await fetcher.get_sentiment_metrics("BTCUSDT")

        assert result["symbol"] == "BTCUSDT"
        assert result["long_short_ratio"] == pytest.approx(1.86, rel=0.01)
        assert result["top_trader_ratio"] == pytest.approx(2.57, rel=0.01)
        assert result["taker_volume_ratio"] == pytest.approx(1.5, rel=0.01)
        assert result["sentiment_signal"] == "bullish"

    async def test_get_sentiment_metrics_fallback(self):
        fetcher = BinanceFuturesFetcher()

        class ErrorResponse:
            async def json(self):
                raise Exception("network error")
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        fetcher.session = make_mock_session([
            ("/globalLongShortAccountRatio", ErrorResponse()),
            ("/topLongShortPositionRatio", ErrorResponse()),
            ("/takerlongshortRatio", ErrorResponse()),
        ])

        result = await fetcher.get_sentiment_metrics("BTCUSDT")

        assert result["symbol"] == "BTCUSDT"
        assert result["long_short_ratio"] == 1.0
        assert result["sentiment_signal"] == "neutral"

    async def test_close_session(self):
        fetcher = BinanceFuturesFetcher()

        close_called = False
        class MockSession:
            async def close(self):
                nonlocal close_called
                close_called = True

        fetcher.session = MockSession()
        await fetcher.close()
        assert close_called is True
