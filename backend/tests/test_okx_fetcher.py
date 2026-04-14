"""Tests for fetchers/okx.py"""
import pytest
from unittest.mock import AsyncMock, patch

from fetchers.okx import OKXFetcher


@pytest.mark.asyncio
class TestOKXFetcher:
    async def test_get_liquidation_data_success(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def json(self):
                return {
                    "code": "0",
                    "data": [
                        {
                            "details": [
                                {"bkPx": "50000.5", "sz": "1.5", "posSide": "short"},
                                {"bkPx": "51000.0", "sz": "2.0", "posSide": "long"},
                            ]
                        }
                    ]
                }
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def __init__(self):
                self.calls = []
            def get(self, url, **kwargs):
                self.calls.append((url, kwargs))
                return MockResponse()

        mock_session = MockSession()
        fetcher.session = mock_session

        result = await fetcher.get_liquidation_data("BTCUSDT")

        assert len(result) == 2
        assert result[0] == {"price": 50000.5, "size": 1.5, "side": "Short", "posSide": "short"}
        assert result[1] == {"price": 51000.0, "size": 2.0, "side": "Long", "posSide": "long"}

        # Verify correct symbol mapping
        assert mock_session.calls[0][1]["params"]["instFamily"] == "BTC-USDT"

    async def test_get_liquidation_data_api_error(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def json(self):
                return {"code": "50001", "msg": "error"}
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def get(self, url, **kwargs):
                return MockResponse()

        fetcher.session = MockSession()

        result = await fetcher.get_liquidation_data("BTCUSDT")
        assert result == []

    async def test_get_liquidation_data_empty_details(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def json(self):
                return {"code": "0", "data": [{"details": []}]}
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def get(self, url, **kwargs):
                return MockResponse()

        fetcher.session = MockSession()

        result = await fetcher.get_liquidation_data("BTCUSDT")
        assert result == []

    async def test_get_liquidation_data_invalid_detail_values(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def json(self):
                return {
                    "code": "0",
                    "data": [
                        {
                            "details": [
                                {"bkPx": "invalid", "sz": "1.5", "posSide": "short"},
                                {"bkPx": "50000", "sz": "invalid", "posSide": "long"},
                                {"bkPx": "51000", "sz": "2.0"},  # missing posSide
                            ]
                        }
                    ]
                }
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def get(self, url, **kwargs):
                return MockResponse()

        fetcher.session = MockSession()

        result = await fetcher.get_liquidation_data("BTCUSDT")
        # Third item should succeed with default posSide -> Long
        assert len(result) == 1
        assert result[0]["price"] == 51000.0
        assert result[0]["side"] == "Long"

    async def test_get_liquidation_data_exception(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def __aenter__(self):
                raise Exception("Connection error")
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def get(self, url, **kwargs):
                return MockResponse()

        fetcher.session = MockSession()

        result = await fetcher.get_liquidation_data("BTCUSDT")
        assert result == []

    async def test_symbol_mapping_eth(self):
        fetcher = OKXFetcher()
        
        class MockResponse:
            async def json(self):
                return {"code": "0", "data": []}
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None

        class MockSession:
            def __init__(self):
                self.calls = []
            def get(self, url, **kwargs):
                self.calls.append((url, kwargs))
                return MockResponse()

        mock_session = MockSession()
        fetcher.session = mock_session

        await fetcher.get_liquidation_data("ETHUSDT")

        assert mock_session.calls[0][1]["params"]["instFamily"] == "ETH-USDT"

    async def test_close_session(self):
        fetcher = OKXFetcher()
        
        close_called = False
        class MockSession:
            async def close(self):
                nonlocal close_called
                close_called = True
        
        mock_session = MockSession()
        fetcher.session = mock_session

        await fetcher.close()
        assert close_called is True
