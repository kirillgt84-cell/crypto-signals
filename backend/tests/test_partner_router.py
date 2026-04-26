"""Unit tests for partner router."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from routers.auth import get_current_user


def mock_user():
    return {"id": 1, "username": "testuser", "email": "test@example.com",
            "avatar_url": None, "is_email_verified": True, "subscription_tier": "free"}


class TestPartnerRouter:
    @pytest.fixture(autouse=True)
    def override_auth(self):
        app.dependency_overrides[get_current_user] = lambda: mock_user()
        yield
        app.dependency_overrides.pop(get_current_user, None)

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_generate_code_creates_table_and_code(self, client):
        """generate-code should auto-create tables and return a referral code."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [],  # no existing code
        ])
        mock_db.execute = AsyncMock(return_value="CREATE TABLE")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.post("/api/v1/partner/generate-code")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"].startswith("MIRKASO_")
        assert "mirkaso.com/?ref=" in data["referral_link"]

    def test_generate_code_returns_existing(self, client):
        """If code already exists, return it without creating new."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "user_id": 1, "code": "MIRKASO_ALICE_ABC123"}
        ])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.post("/api/v1/partner/generate-code")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] == "MIRKASO_ALICE_ABC123"

    def test_stats_no_code(self, client):
        """Stats should return zeros when user has no referral code."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.get("/api/v1/partner/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] is None
        assert data["total_referrals"] == 0
        assert data["available_balance"] == 0.00

    def test_stats_with_code(self, client):
        """Stats should return aggregated data when code exists."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "code": "MIRKASO_BOB_XYZ789", "total_referrals": 2,
              "active_referrals": 1, "total_earned": 100.00, "available_balance": 50.00}],
            [{"id": 10, "referred_user_id": 5, "username": "alice", "email": "a@example.com",
              "status": "registered", "joined_at": "2024-01-01"}],
            [{"id": 100, "type": "reward", "amount": 25.00, "created_at": "2024-01-02"}],
        ])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.get("/api/v1/partner/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] == "MIRKASO_BOB_XYZ789"
        assert data["total_referrals"] == 2
        assert data["total_earned"] == 100.00
        assert len(data["referrals"]) == 1
        assert len(data["transactions"]) == 1

    def test_balance_no_code(self, client):
        """Balance should be 0 when no code exists."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.get("/api/v1/partner/balance")
        assert resp.status_code == 200
        assert resp.json()["balance"] == 0.00

    def test_check_eligibility_no_referral(self, client):
        """User without referral code should not be eligible."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"referred_by_code": None, "referral_discount_used": False}
        ])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.get("/api/v1/partner/check-eligibility")
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is False
        assert data["discount_percent"] == 0

    def test_check_eligibility_with_unused_code(self, client):
        """User with unused referral code should be eligible for 20% discount."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"referred_by_code": "MIRKASO_ALICE_ABC123", "referral_discount_used": False}
        ])
        mock_db.execute = AsyncMock(return_value="OK")

        with patch("routers.partner.get_db", return_value=mock_db):
            resp = client.get("/api/v1/partner/check-eligibility")
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is True
        assert data["discount_percent"] == 20
        assert data["code"] == "MIRKASO_ALICE_ABC123"
