"""Unit tests for Binance portfolio fetcher."""
import pytest
from fetchers.binance_portfolio import BinancePortfolioFetcher


class TestBinancePortfolioFetcher:
    """Tests for Binance read-only fetcher."""

    def test_parse_positions_long(self):
        """Parse a LONG futures position."""
        account = {
            "positions": [
                {
                    "symbol": "BTCUSDT",
                    "positionAmt": "0.5",
                    "entryPrice": "40000",
                    "markPrice": "45000",
                    "unrealizedProfit": "2500",
                    "initialMargin": "1000",
                    "leverage": "10",
                }
            ]
        }
        risks = [
            {
                "symbol": "BTCUSDT",
                "entryPrice": "40000",
                "markPrice": "45000",
                "unRealizedProfit": "2500",
                "liquidationPrice": "36000",
            }
        ]
        assets = BinancePortfolioFetcher.parse_positions(account, risks)
        assert len(assets) == 1
        a = assets[0]
        assert a["symbol"] == "BTCUSDT"
        assert a["side"] == "LONG"
        assert a["amount"] == 0.5
        assert a["current_price"] == 45000
        assert a["liquidation_price"] == 36000

    def test_parse_positions_short(self):
        """Parse a SHORT futures position."""
        account = {
            "positions": [
                {
                    "symbol": "ETHUSDT",
                    "positionAmt": "-2.0",
                    "entryPrice": "3000",
                    "markPrice": "2800",
                    "unrealizedProfit": "400",
                    "initialMargin": "500",
                    "leverage": "5",
                }
            ]
        }
        risks = [
            {
                "symbol": "ETHUSDT",
                "entryPrice": "3000",
                "markPrice": "2800",
                "unRealizedProfit": "400",
                "liquidationPrice": "3500",
            }
        ]
        assets = BinancePortfolioFetcher.parse_positions(account, risks)
        assert len(assets) == 1
        a = assets[0]
        assert a["side"] == "SHORT"
        assert a["amount"] == 2.0

    def test_parse_positions_zero_ignored(self):
        """Zero amount positions should be ignored."""
        account = {
            "positions": [
                {"symbol": "BTCUSDT", "positionAmt": "0", "entryPrice": "40000", "markPrice": "45000"}
            ]
        }
        assets = BinancePortfolioFetcher.parse_positions(account, [])
        assert len(assets) == 0

    def test_parse_spot_balances(self):
        """Parse spot balances excluding dust."""
        account = {
            "balances": [
                {"asset": "BTC", "free": "0.1", "locked": "0.0"},
                {"asset": "ETH", "free": "2.0", "locked": "0.5"},
                {"asset": "USDT", "free": "100.0", "locked": "0"},
                {"asset": "DUST", "free": "0.0001", "locked": "0"},
            ]
        }
        prices = {"BTCUSDT": 50000, "ETHUSDT": 3000}
        assets = BinancePortfolioFetcher.parse_spot_balances(account, prices)
        symbols = {a["symbol"] for a in assets}
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols
        # USDT should be present with price=1
        assert any(a["asset_name"] == "USDT" for a in assets)
        # DUST should be excluded (<$1)
        assert not any(a["asset_name"] == "DUST" for a in assets)

    def test_testnet_urls(self):
        """Testnet flag switches base URLs."""
        fetcher = BinancePortfolioFetcher("key", "secret", testnet=True)
        assert fetcher.base_fapi == "https://testnet.binancefuture.com"
        assert fetcher.base_spot == "https://testnet.binance.vision"

    def test_mainnet_urls_default(self):
        """Default fetcher uses production URLs."""
        fetcher = BinancePortfolioFetcher("key", "secret")
        assert fetcher.base_fapi == "https://fapi.binance.com"
        assert fetcher.base_spot == "https://api.binance.com"
