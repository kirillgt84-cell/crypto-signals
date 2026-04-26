import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta


class TestGetEffectiveTier:
    @pytest.mark.asyncio
    @patch("routers.auth.get_db")
    async def test_promo_trial_active(self, mock_get_db):
        db = MagicMock()
        db.query = AsyncMock()
        mock_get_db.return_value = db

        expires = datetime.utcnow() + timedelta(days=3)
        db.query.side_effect = [
            [{"trial_tier": "pro", "expires_at": expires}],  # active promo
        ]

        from routers.auth import get_effective_tier
        result = await get_effective_tier(1)
        assert result["tier"] == "pro"
        assert result["source"] == "promo_trial"
        assert result["is_trial"] is True

    @pytest.mark.asyncio
    @patch("routers.auth.get_db")
    async def test_subscription_pro(self, mock_get_db):
        db = MagicMock()
        db.query = AsyncMock()
        mock_get_db.return_value = db

        db.query.side_effect = [
            [],  # no active promo
            [{"subscription_tier": "pro", "trial_expires_at": None}],  # pro subscription
        ]

        from routers.auth import get_effective_tier
        result = await get_effective_tier(1)
        assert result["tier"] == "pro"
        assert result["source"] == "subscription"
        assert result["is_trial"] is False

    @pytest.mark.asyncio
    @patch("routers.auth.get_db")
    async def test_free_fallback(self, mock_get_db):
        db = MagicMock()
        db.query = AsyncMock()
        mock_get_db.return_value = db

        db.query.side_effect = [
            [],  # no active promo
            [{"subscription_tier": "free", "trial_expires_at": None}],  # free user
        ]

        from routers.auth import get_effective_tier
        result = await get_effective_tier(1)
        assert result["tier"] == "free"
        assert result["source"] == "free"
        assert result["is_trial"] is False

    @pytest.mark.asyncio
    @patch("routers.auth.get_db")
    async def test_admin_tier(self, mock_get_db):
        db = MagicMock()
        db.query = AsyncMock()
        mock_get_db.return_value = db

        db.query.side_effect = [
            [],  # no active promo
            [{"subscription_tier": "admin", "trial_expires_at": None}],  # admin
        ]

        from routers.auth import get_effective_tier
        result = await get_effective_tier(1)
        assert result["tier"] == "admin"
        assert result["source"] == "subscription"
        assert result["is_trial"] is False
