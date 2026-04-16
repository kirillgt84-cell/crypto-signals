"""Tests for telegram router"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from routers.telegram import telegram_start, telegram_webhook, TelegramStartRequest


@pytest.mark.asyncio
class TestTelegramRouter:
    async def test_telegram_start_success(self):
        with patch("routers.telegram.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=[{"id": 1}])
            mock_db.execute = AsyncMock(return_value=None)
            result = await telegram_start(TelegramStartRequest(user_id=1, chat_id="12345"))
            assert result["message"] == "Telegram connected"

    async def test_telegram_start_user_not_found(self):
        with patch("routers.telegram.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=[])
            with pytest.raises(HTTPException) as exc_info:
                await telegram_start(TelegramStartRequest(user_id=99, chat_id="12345"))
            assert exc_info.value.status_code == 404

    async def test_telegram_webhook_start(self):
        with patch("routers.telegram.get_db") as mock_get_db:
            mock_db = mock_get_db.return_value
            mock_db.query = AsyncMock(return_value=[{"id": 1}])
            mock_db.execute = AsyncMock(return_value=None)
            result = await telegram_webhook({
                "message": {"text": "/start 1", "chat": {"id": 12345}}
            })
            assert result["ok"] is True

    async def test_telegram_webhook_no_start(self):
        result = await telegram_webhook({
            "message": {"text": "hello", "chat": {"id": 12345}}
        })
        assert result["ok"] is True
