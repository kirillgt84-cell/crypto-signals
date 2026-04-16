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

    @patch("routers.auth.get_db")
    @patch("routers.auth.bcrypt.checkpw")
    @patch("routers.auth.create_access_token")
    @patch("routers.auth.create_refresh_token")
    async def test_refresh_token_success(self, mock_create_refresh, mock_create_access, mock_checkpw, mock_get_db):
        from routers.auth import refresh_token
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{
            "id": 1,
            "user_id": 42,
            "expires_at": "2099-01-01T00:00:00",
            "is_revoked": False,
            "token_hash": "hashed_token"
        }])
        mock_db.execute = AsyncMock(return_value=None)
        mock_checkpw.return_value = True
        mock_create_access.return_value = "new-access-token"
        mock_create_refresh.return_value = "new-refresh-token"
        
        result = await refresh_token("old-refresh-token")
        assert result["access_token"] == "new-access-token"
        assert result["refresh_token"] == "new-refresh-token"
        assert result["expires_in"] == 60 * 60

    @patch("routers.auth.get_db")
    @patch("routers.auth.bcrypt.checkpw")
    async def test_refresh_token_invalid(self, mock_checkpw, mock_get_db):
        from routers.auth import refresh_token
        from fastapi import HTTPException
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{
            "id": 1,
            "user_id": 42,
            "expires_at": "2099-01-01T00:00:00",
            "is_revoked": False,
            "token_hash": "hashed_token"
        }])
        mock_checkpw.return_value = False
        
        with pytest.raises(HTTPException) as exc_info:
            await refresh_token("bad-token")
        assert exc_info.value.status_code == 401
