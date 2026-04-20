"""Unit tests for admin scanner endpoints."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app
from routers.auth import get_current_user


def mock_admin():
    return {"id": 1, "email": "admin@test.com", "username": "admin", "subscription_tier": "admin"}


def mock_pro():
    return {"id": 2, "email": "pro@test.com", "username": "pro", "subscription_tier": "pro"}


class TestAdminScanner:
    """Tests for admin scanner management endpoints."""

    @pytest.fixture(autouse=True)
    def reset_overrides(self):
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_scanner_status_admin_only(self, client):
        """Admin should get scanner status."""
        app.dependency_overrides[get_current_user] = mock_admin
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"run_at": "2024-01-01", "symbols_checked": 150, "anomalies_found": 3, "min_score": 5, "duration_ms": 1200, "error": None}],
            [{"cnt": 48, "total": 15}],
            [{"cnt": 5}],
            [{"value": "5"}],
        ])
        with patch("routers.admin.get_db", return_value=mock_db):
            resp = client.get("/api/v1/admin/scanner/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["runs_24h"] == 48
        assert data["active_signals"] == 5
        assert data["min_score"] == 5

    def test_scanner_status_non_admin_forbidden(self, client):
        """Non-admin should get 403."""
        app.dependency_overrides[get_current_user] = mock_pro
        resp = client.get("/api/v1/admin/scanner/status")
        assert resp.status_code == 403

    def test_scanner_logs_admin(self, client):
        """Admin should get scanner run logs."""
        app.dependency_overrides[get_current_user] = mock_admin
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "run_at": "2024-01-01", "symbols_checked": 150, "anomalies_found": 3, "min_score": 5, "duration_ms": 1000},
            {"id": 2, "run_at": "2024-01-02", "symbols_checked": 150, "anomalies_found": 0, "min_score": 5, "duration_ms": 900},
        ])
        with patch("routers.admin.get_db", return_value=mock_db):
            resp = client.get("/api/v1/admin/scanner/logs?limit=20")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["symbols_checked"] == 150

    def test_scanner_run_admin(self, client):
        """Admin should trigger scanner run."""
        app.dependency_overrides[get_current_user] = mock_admin
        with patch("scanners.anomaly_scanner.run_scanner_job", new=AsyncMock()):
            resp = client.post("/api/v1/admin/scanner/run")
        assert resp.status_code == 200
        assert "triggered" in resp.json()["message"].lower()

    def test_scanner_run_non_admin_forbidden(self, client):
        """Non-admin should not trigger scanner."""
        app.dependency_overrides[get_current_user] = mock_pro
        resp = client.post("/api/v1/admin/scanner/run")
        assert resp.status_code == 403

    def test_scanner_settings_update(self, client):
        """Admin should update scanner min_score."""
        app.dependency_overrides[get_current_user] = mock_admin
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value="INSERT 0 1")
        with patch("routers.admin.get_db", return_value=mock_db):
            resp = client.patch(
                "/api/v1/admin/scanner/settings",
                json={"min_score": 7},
            )
        assert resp.status_code == 200

    def test_scanner_settings_invalid_min_score(self, client):
        """Invalid min_score should return 400."""
        app.dependency_overrides[get_current_user] = mock_admin
        mock_db = MagicMock()
        with patch("routers.admin.get_db", return_value=mock_db):
            resp = client.patch(
                "/api/v1/admin/scanner/settings",
                json={"min_score": 15},
            )
        assert resp.status_code == 400

    def test_scanner_settings_non_admin_forbidden(self, client):
        """Non-admin should not change settings."""
        app.dependency_overrides[get_current_user] = mock_pro
        resp = client.patch(
            "/api/v1/admin/scanner/settings",
            json={"min_score": 7},
        )
        assert resp.status_code == 403
