"""Tests for admin router"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException


@pytest.mark.asyncio
class TestAdminRouter:
    @patch("routers.admin.get_db")
    async def test_list_users_success(self, mock_get_db):
        from routers.admin import list_users
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "email": "admin@test.com", "username": "admin", "subscription_tier": "admin", "is_active": True, "created_at": "2024-01-01"},
            {"id": 2, "email": "user@test.com", "username": "user", "subscription_tier": "free", "is_active": True, "created_at": "2024-01-02"},
        ])
        result = await list_users({"id": 1, "subscription_tier": "admin"})
        assert len(result["users"]) == 2
        assert result["users"][0]["subscription_tier"] == "admin"

    async def test_require_admin_forbidden(self):
        from routers.admin import require_admin
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await require_admin({"id": 2, "subscription_tier": "pro"})
        assert exc_info.value.status_code == 403

    @patch("routers.admin.get_db")
    async def test_update_user_success(self, mock_get_db):
        from routers.admin import update_user
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock(return_value=None)
        result = await update_user(2, {"subscription_tier": "pro"}, {"id": 1, "subscription_tier": "admin"})
        assert result["message"] == "User updated"

    async def test_update_user_forbidden(self):
        from routers.admin import require_admin
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await require_admin({"id": 2, "subscription_tier": "pro"})
        assert exc_info.value.status_code == 403

    @patch("routers.admin.get_db")
    async def test_update_user_no_fields(self, mock_get_db):
        from routers.admin import update_user
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await update_user(2, {"invalid_field": "x"}, {"id": 1, "subscription_tier": "admin"})
        assert exc_info.value.status_code == 400

    @patch("routers.admin.get_db")
    async def test_update_user_self_demote(self, mock_get_db):
        from routers.admin import update_user
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await update_user(1, {"subscription_tier": "pro"}, {"id": 1, "subscription_tier": "admin"})
        assert exc_info.value.status_code == 400

    @patch("routers.admin.get_db")
    async def test_admin_stats(self, mock_get_db):
        from routers.admin import admin_stats
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"c": 42}],
            [{"c": 5}],
            [{"c": 37}],
            [{"c": 3}],
            [
                {"date": "2026-04-10", "count": 2},
                {"date": "2026-04-11", "count": 1},
            ],
        ])
        result = await admin_stats({"id": 1, "subscription_tier": "admin"})
        assert result["total_users"] == 42
        assert result["pro_users"] == 5
        assert result["free_users"] == 37
        assert result["new_users_7d"] == 3
        assert len(result["registrations_by_day"]) == 30
