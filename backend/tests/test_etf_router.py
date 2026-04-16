"""Tests for ETF router"""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestETFRouter:
    @patch("routers.etf.get_db")
    async def test_get_etf_flows(self, mock_get_db):
        from routers.etf import get_etf_flows
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"date": "2026-03-30", "fund_ticker": "IBIT", "fund_name": "BlackRock", "flow_usd": 7500000.0, "btc_price": 85000.0}
        ])
        result = await get_etf_flows(days=30, ticker="IBIT")
        assert len(result["flows"]) == 1
        assert result["flows"][0]["fund_ticker"] == "IBIT"

    @patch("routers.etf.get_db")
    async def test_get_latest_flows(self, mock_get_db):
        from routers.etf import get_latest_flows
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"max_date": "2026-03-30"}],
            [
                {"fund_ticker": "IBIT", "fund_name": "BlackRock", "flow_usd": 7500000.0, "btc_price": 85000.0},
                {"fund_ticker": "FBTC", "fund_name": "Fidelity", "flow_usd": 28900000.0, "btc_price": 85000.0}
            ]
        ])
        result = await get_latest_flows()
        assert result["date"] == "2026-03-30"
        assert len(result["flows"]) == 2

    @patch("routers.etf.get_db")
    async def test_get_etf_summary(self, mock_get_db):
        from routers.etf import get_etf_summary
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [
                {"date": "2026-03-28", "flow_usd": 10000000.0, "btc_price": 84000.0},
                {"date": "2026-03-29", "flow_usd": 5000000.0, "btc_price": 84500.0},
                {"date": "2026-03-30", "flow_usd": -2000000.0, "btc_price": 85000.0},
            ],
            [
                {"fund_ticker": "IBIT", "fund_name": "BlackRock", "total_invested_usd": 1e9, "total_btc_held": 12000.0,
                 "avg_btc_price": 83333.0, "latest_aum_usd": 1.02e9, "unrealized_pnl_usd": 20e6, "unrealized_pnl_pct": 2.0, "updated_at": "2026-03-30"}
            ]
        ])
        result = await get_etf_summary()
        assert len(result["cumulative"]) == 3
        assert result["cumulative"][2]["cumulative_flow"] == 13000000.0
        assert result["totals"]["aum_usd"] == 1.02e9
        assert result["totals"]["pnl_usd"] == 20e6
        assert len(result["funds"]) == 1
