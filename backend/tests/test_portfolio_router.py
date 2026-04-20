"""Unit tests for portfolio router."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from routers.auth import get_current_user


def mock_admin():
    return {"id": 1, "email": "admin@test.com", "username": "admin", "subscription_tier": "admin"}


def mock_pro():
    return {"id": 2, "email": "pro@test.com", "username": "pro", "subscription_tier": "pro"}


class TestPortfolioRouter:
    """Tests for portfolio API endpoints."""

    @pytest.fixture(autouse=True)
    def reset_overrides(self):
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_connect_binance_invalid_creds(self, client):
        """Connect with invalid API key should return 400."""
        app.dependency_overrides[get_current_user] = mock_pro
        with patch("fetchers.binance_portfolio.BinancePortfolioFetcher.get_futures_account", side_effect=RuntimeError("Invalid")):
            with patch("fetchers.binance_portfolio.BinancePortfolioFetcher.close", new=AsyncMock()):
                resp = client.post(
                    "/api/v1/portfolio/connect/binance",
                    json={"api_key": "bad", "api_secret": "bad"},
                )
        assert resp.status_code == 400

    def test_disconnect_binance(self, client):
        """Disconnect should deactivate source."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="UPDATE 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.delete("/api/v1/portfolio/disconnect/binance")
        assert resp.status_code == 200
        assert "disconnected" in resp.json()["message"].lower()

    def test_get_summary_unauthorized(self, client):
        """Summary without auth should return 401."""
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 401

    def test_get_history(self, client):
        """History should return list of daily snapshots."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"date": "2024-01-01", "total_notional": 10000, "total_unrealized_pnl": 500},
            {"date": "2024-01-02", "total_notional": 10500, "total_unrealized_pnl": 300},
        ])
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.get("/api/v1/portfolio/history")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["total_notional"] == 10000

    def test_add_manual_asset(self, client):
        """Adding manual asset should insert into DB."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [],  # no existing manual source
            [{"id": 99}],  # RETURNING id from insert
        ])
        mock_db.execute = AsyncMock(return_value="INSERT 0 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.post(
                "/api/v1/portfolio/manual/assets",
                json={"asset_symbol": "BTC", "amount": 0.5, "avg_entry_price": 40000, "side": "LONG"},
            )
        assert resp.status_code == 200
        assert "added" in resp.json()["message"].lower()

    def test_remove_manual_asset(self, client):
        """Removing manual asset should delete from DB."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="DELETE 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.delete("/api/v1/portfolio/manual/assets/BTC")
        assert resp.status_code == 200

    def test_list_categories(self, client):
        """Categories should return system + user lists."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "name": "L1", "color": "#ef4444"}],
            [{"id": 10, "name": "MyCat", "color": "#6366f1"}],
        ])
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.get("/api/v1/portfolio/categories")
        assert resp.status_code == 200
        data = resp.json()
        assert "system" in data
        assert "user" in data

    def test_assign_category(self, client):
        """Assigning category should upsert asset_categories."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="INSERT 0 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.post(
                "/api/v1/portfolio/categories/assign",
                json={"asset_symbol": "BTC", "system_category_id": 1},
            )
        assert resp.status_code == 200

    def test_list_models(self, client):
        """Models endpoint returns allocations for authenticated user."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "name": "Conservative", "description": "Safe", "risk_level": "conservative", "is_custom": False, "user_id": None}],
            [{"asset_symbol": "BTC", "asset_name": "Bitcoin", "target_weight": 50.0}],
            [{"category_id": 1, "target_weight": 50.0, "category_name": "Stablecoins"}],
        ])
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.get("/api/v1/portfolio/models")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert "allocations" in data[0]
        assert "asset_allocations" in data[0]

    def test_select_model(self, client):
        """Selecting a model should upsert user_portfolio_settings."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="INSERT 0 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.post(
                "/api/v1/portfolio/models/select",
                json={"model_id": 2},
            )
        assert resp.status_code == 200

    def test_get_deviation_no_model(self, client):
        """Deviation without selected model should return 400."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[])
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.get("/api/v1/portfolio/models/deviation")
        assert resp.status_code == 400
        assert "no model selected" in resp.json()["detail"].lower()

    def test_get_alerts(self, client):
        """Alerts should return list for user."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "asset_symbol": "BTC", "alert_type": "pnl_up", "message": "+10%", "is_read": False},
        ])
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.get("/api/v1/portfolio/alerts")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_mark_alerts_read(self, client):
        """Mark read should update all user alerts."""
        app.dependency_overrides[get_current_user] = mock_pro
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="UPDATE 1")
        with patch("routers.portfolio.get_db", return_value=mock_db):
            resp = client.post("/api/v1/portfolio/alerts/read")
        assert resp.status_code == 200
