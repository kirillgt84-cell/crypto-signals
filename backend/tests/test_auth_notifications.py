"""Tests for auth notification endpoints"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException


@pytest.mark.asyncio
class TestAuthNotifications:
    @patch("routers.auth.TELEGRAM_BOT_NAME", "testbot")
    async def test_get_telegram_link(self):
        from routers.auth import get_telegram_link
        result = await get_telegram_link({"id": 1, "email": "test@test.com"})
        assert result["bot_name"] == "testbot"
        assert "start=1" in result["deep_link"]

    @patch("routers.auth.send_email", new_callable=AsyncMock)
    async def test_test_email_success(self, mock_send_email):
        from routers.auth import test_email
        mock_send_email.return_value = {"success": True, "id": "email-123"}
        result = await test_email({"id": 1, "email": "test@test.com", "username": "tester"})
        assert result["message"] == "Test email sent"
        assert result["id"] == "email-123"

    async def test_test_email_no_email(self):
        from routers.auth import test_email
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await test_email({"id": 1, "email": None, "username": "tester"})
        assert exc_info.value.status_code == 400

    @patch("routers.auth.send_telegram_message", new_callable=AsyncMock)
    @patch("routers.auth.get_db")
    async def test_test_telegram_success(self, mock_get_db, mock_send_tg):
        from routers.auth import test_telegram
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"telegram_chat_id": "12345"}])
        mock_send_tg.return_value = {"success": True, "message_id": 42}
        result = await test_telegram({"id": 1, "email": "test@test.com", "username": "tester"})
        assert result["message"] == "Test Telegram message sent"
        assert result["message_id"] == 42

    @patch("routers.auth.get_db")
    async def test_test_telegram_not_connected(self, mock_get_db):
        from routers.auth import test_telegram
        from fastapi import HTTPException
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"telegram_chat_id": None}])
        with pytest.raises(HTTPException) as exc_info:
            await test_telegram({"id": 1, "email": "test@test.com", "username": "tester"})
        assert exc_info.value.status_code == 400
