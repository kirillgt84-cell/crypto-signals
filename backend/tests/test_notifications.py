"""Tests for services/notifications.py"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.notifications import send_email, send_telegram_message, generate_daily_report, generate_weekly_report


def make_mock_httpx_client(post_return):
    mock_resp = MagicMock()
    mock_resp.status_code = post_return["status"]
    mock_resp.json.return_value = post_return.get("json", {})

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


@pytest.mark.asyncio
class TestSendEmail:
    @patch("services.notifications.RESEND_API_KEY", "test-key")
    @patch("services.notifications.httpx.AsyncClient")
    async def test_send_email_success(self, mock_client_cls):
        mock_client_cls.return_value = make_mock_httpx_client({"status": 200, "json": {"id": "email-123"}})
        result = await send_email("test@example.com", "Subject", "<html></html>")
        assert result["success"] is True
        assert result["id"] == "email-123"

    @patch("services.notifications.RESEND_API_KEY", None)
    async def test_send_email_no_key(self):
        result = await send_email("test@example.com", "Subject", "<html></html>")
        assert result["success"] is False
        assert "not configured" in result["error"]


@pytest.mark.asyncio
class TestSendTelegram:
    @patch("services.notifications.TELEGRAM_BOT_TOKEN", "bot-token")
    @patch("services.notifications.httpx.AsyncClient")
    async def test_send_telegram_success(self, mock_client_cls):
        mock_client_cls.return_value = make_mock_httpx_client({"status": 200, "json": {"ok": True, "result": {"message_id": 42}}})
        result = await send_telegram_message("123456", "Hello")
        assert result["success"] is True
        assert result["message_id"] == 42

    @patch("services.notifications.TELEGRAM_BOT_TOKEN", None)
    async def test_send_telegram_no_token(self):
        result = await send_telegram_message("123456", "Hello")
        assert result["success"] is False
        assert "not configured" in result["error"]


@pytest.mark.asyncio
class TestGenerateReports:
    @patch("services.notifications.get_db")
    async def test_generate_daily_report(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"symbol": "BTCUSDT", "price": 70000.0, "open_interest": 15000000000.0, "volume": 28000000000.0, "funding_rate": 0.0001}
        ])
        report = await generate_daily_report()
        assert "html" in report
        assert "BTCUSDT" in report["html"]

    @patch("services.notifications.get_db")
    async def test_generate_weekly_report(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[
            {"symbol": "BTCUSDT", "latest_price": 70000.0, "oi_change": 100000000.0}
        ])
        report = await generate_weekly_report()
        assert "html" in report
        assert "BTCUSDT" in report["html"]
