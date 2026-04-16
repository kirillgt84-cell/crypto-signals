"""Tests for auth upgrade/self-promote"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException


@pytest.mark.asyncio
class TestAuthUpgrade:
    @patch("routers.auth.get_db")
    async def test_upgrade_to_pro(self, mock_get_db):
        from routers.auth import update_me
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock(return_value=None)
        result = await update_me(
            {"subscription_tier": "pro"},
            {"id": 1, "subscription_tier": "free", "email": "test@test.com"}
        )
        assert result["message"] == "Profile updated"

    @patch("routers.auth.get_db")
    async def test_self_promote_to_admin_blocked(self, mock_get_db):
        from routers.auth import update_me
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock(return_value=None)
        with pytest.raises(HTTPException) as exc_info:
            await update_me(
                {"subscription_tier": "admin"},
                {"id": 1, "subscription_tier": "free", "email": "test@test.com"}
            )
        assert exc_info.value.status_code == 403

    @patch("routers.auth.get_db")
    async def test_admin_can_change_own_tier(self, mock_get_db):
        from routers.auth import update_me
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock(return_value=None)
        result = await update_me(
            {"subscription_tier": "pro"},
            {"id": 1, "subscription_tier": "admin", "email": "admin@test.com"}
        )
        assert result["message"] == "Profile updated"
