"""Tests for ETF Farside fetcher"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fetchers.etf_farside import FarsideETFFetcher


def make_mock_session(html: str):
    mock_resp = AsyncMock()
    mock_resp.text = AsyncMock(return_value=html)
    mock_resp.__aenter__ = AsyncMock(return_value=mock_resp)
    mock_resp.__aexit__ = AsyncMock(return_value=None)

    mock_session = AsyncMock()
    mock_session.get = MagicMock(return_value=mock_resp)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    return mock_session


@pytest.mark.asyncio
class TestFarsideETFFetcher:
    async def test_parse_value_basic(self):
        f = FarsideETFFetcher()
        assert f._parse_value("7.5") == 7.5
        assert f._parse_value("(7.5)") == -7.5
        assert f._parse_value("1,205.2") == 1205.2
        assert f._parse_value("-") == 0.0
        assert f._parse_value("") == 0.0
        assert f._parse_value("n/a") == 0.0

    async def test_parse_date(self):
        f = FarsideETFFetcher()
        assert f._parse_date("30 Mar 2026") == "2026-03-30"
        assert f._parse_date("invalid") is None

    async def test_get_daily_flows_success(self):
        html = """
        <html>
          <table>ignore</table>
          <table>
            <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>Total</td></tr>
            <tr><td></td><td>IBIT</td><td>FBTC</td><td>BITB</td><td>ARKB</td><td>BTCO</td><td>EZBC</td><td>BRRR</td><td>HODL</td><td>BTCW</td><td>MSBT</td><td>GBTC</td><td>BTC</td><td></td></tr>
            <tr><td>Fee</td><td>0.25%</td><td>0.25%</td><td>0.20%</td><td>0.21%</td><td>0.25%</td><td>0.19%</td><td>0.25%</td><td>0.20%</td><td>0.25%</td><td>0.14%</td><td>1.50%</td><td>0.15%</td><td></td></tr>
            <tr><td>30 Mar 2026</td><td>7.5</td><td>28.9</td><td>0.0</td><td>33.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>0.0</td><td>-</td><td>0.0</td><td>0.0</td><td>69.4</td></tr>
          </table>
        </html>
        """
        fetcher = FarsideETFFetcher()
        fetcher.session = make_mock_session(html)
        results = await fetcher.get_daily_flows()
        
        total_record = next((r for r in results if r["fund_ticker"] == "TOTAL"), None)
        ibit_record = next((r for r in results if r["fund_ticker"] == "IBIT"), None)
        
        assert total_record is not None
        assert total_record["flow_usd"] == 69.4 * 1_000_000
        assert total_record["date"] == "2026-03-30"
        
        assert ibit_record is not None
        assert ibit_record["flow_usd"] == 7.5 * 1_000_000
        assert ibit_record["fund_name"] == "BlackRock iShares"

    async def test_get_daily_flows_negative(self):
        html = """
        <table>ignore</table>
        <table>
          <tr><td></td><td></td><td></td><td>Total</td></tr>
          <tr><td></td><td>IBIT</td><td>GBTC</td><td></td></tr>
          <tr><td>Fee</td><td>0.25%</td><td>1.5%</td><td></td></tr>
          <tr><td>01 Apr 2026</td><td>(10.5)</td><td>(5.2)</td><td>(15.7)</td></tr>
        </table>
        """
        fetcher = FarsideETFFetcher()
        fetcher.session = make_mock_session(html)
        results = await fetcher.get_daily_flows()
        
        ibit = next((r for r in results if r["fund_ticker"] == "IBIT"), None)
        assert ibit["flow_usd"] == -10.5 * 1_000_000
