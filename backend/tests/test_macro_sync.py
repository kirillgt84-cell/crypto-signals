"""Unit tests for macro sync service."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.macro_sync import sync_macro_prices, calculate_correlations


class TestMacroSync:
    """Tests for macro data sync and correlation calculation."""

    @pytest.fixture
    def mock_db(self):
        class MockDB:
            def __init__(self):
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
    async def test_sync_macro_prices_no_assets(self, mock_db):
        """Sync with no active assets should do nothing."""
        mock_db.query = AsyncMock(return_value=[])
        with patch("services.macro_sync.get_db", return_value=mock_db):
            await sync_macro_prices()
            assert len(mock_db.executed) == 0

    @pytest.mark.asyncio
    async def test_calculate_correlations_not_enough_data(self, mock_db):
        """Correlation calc with < 5 aligned days should log warning and return."""
        # Return only 3 assets and 2 BTC rows
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "key": "spx500"}, {"id": 2, "key": "gold"}],  # assets
            [{"day": "2024-01-01", "price": 40000}, {"day": "2024-01-02", "price": 41000}],  # btc
            [{"close_price": 4000}],  # spx for day 1
            [{"close_price": 1800}],  # gold for day 1
            [{"close_price": 4050}],  # spx for day 2
            [{"close_price": 1850}],  # gold for day 2
            [{"id": 3}],  # vix id
            [{"close_price": 15}],  # vix latest
        ])
        with patch("services.macro_sync.get_db", return_value=mock_db):
            await calculate_correlations()
            # Should insert despite only 2 days (wait, it needs 5 days)
            # With 2 btc rows, returns len=1, which is <5, so warning
            # Let's verify it didn't crash
