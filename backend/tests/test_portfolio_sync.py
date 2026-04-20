"""Unit tests for portfolio sync service."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.portfolio_sync import sync_user_portfolio, get_portfolio_summary, check_alerts


class TestPortfolioSync:
    """Tests for portfolio sync logic."""

    @pytest.fixture
    def mock_db(self):
        class MockDB:
            def __init__(self):
                self.data = {}
                self.executed = []
                self.queried = []

            async def execute(self, sql, args=None):
                self.executed.append((sql, args))
                return "INSERT 0 1"

            async def query(self, sql, args=None):
                self.queried.append((sql, args))
                return []

        return MockDB()

    @pytest.mark.asyncio
    async def test_sync_no_sources(self, mock_db):
        """Sync with no active sources should return zero counts."""
        with patch("services.portfolio_sync.get_db", return_value=mock_db):
            result = await sync_user_portfolio(1)
            assert result["assets_count"] == 0
            assert result["total_notional"] == 0
            assert result["total_unrealized_pnl"] == 0

    @pytest.mark.asyncio
    async def test_get_portfolio_summary_empty(self, mock_db):
        """Summary for user with no assets should be zero."""
        with patch("services.portfolio_sync.get_db", return_value=mock_db):
            summary = await get_portfolio_summary(1)
            assert summary["total_notional"] == 0
            assert summary["total_unrealized_pnl"] == 0
            assert summary["total_assets"] == 0
            assert summary["categories"] == {}

    @pytest.mark.asyncio
    async def test_check_alerts_no_settings(self, mock_db):
        """Alerts with no settings should do nothing."""
        with patch("services.portfolio_sync.get_db", return_value=mock_db):
            await check_alerts(mock_db, 1, [])
            assert len(mock_db.executed) == 0

    @pytest.mark.asyncio
    async def test_check_alerts_liquidation(self, mock_db):
        """Liquidation alert should fire when close to liq price."""
        mock_db.query = AsyncMock(return_value=[{"alert_type": "liquidation", "threshold": 10.0}])
        assets = [{"symbol": "BTCUSDT", "current_price": 50000, "liquidation_price": 46000, "side": "LONG", "unrealized_pnl_pct": 5}]
        with patch("services.portfolio_sync.get_db", return_value=mock_db):
            await check_alerts(mock_db, 1, assets)
            # Should have inserted an alert
            assert any("portfolio_alerts" in str(e[0]) for e in mock_db.executed)
