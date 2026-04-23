"""Unit tests for macro router."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from main import app


class TestMacroRouter:
    """Tests for macro correlations API."""

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_list_assets(self, client):
        """Assets endpoint should return macro asset list."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "key": "spx500", "name": "S&P 500", "yahoo_symbol": "^GSPC", "category": "index"},
            {"id": 2, "key": "gold", "name": "Gold Futures", "yahoo_symbol": "GC=F", "category": "commodity"},
        ])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/assets")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["key"] == "spx500"

    def test_get_prices(self, client):
        """Prices endpoint should return historical data."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1}],  # asset lookup
            [
                {"time": "2024-01-01", "close_price": 4500, "volume": 1000000},
                {"time": "2024-01-02", "close_price": 4600, "volume": 1200000},
            ],
        ])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/prices/spx500?limit=30")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["close_price"] == 4500

    def test_get_prices_unknown_asset(self, client):
        """Unknown asset should return error."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/prices/unknown")
        assert resp.status_code == 200
        assert "error" in resp.json()

    def test_get_correlations(self, client):
        """Correlations endpoint should return history."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(return_value=[
            {"date": "2024-01-01", "btc_spx_correlation": 0.5, "gold_btc_correlation": -0.2, "vix_btc_correlation": -0.3, "vix_level": 15.0},
            {"date": "2024-01-02", "btc_spx_correlation": 0.6, "gold_btc_correlation": -0.1, "vix_btc_correlation": -0.4, "vix_level": 16.0},
        ])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/correlations?limit=30")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["btc_spx_correlation"] == 0.5
        assert data[0]["vix_btc_correlation"] == -0.3

    def test_get_latest(self, client):
        """Latest endpoint should return combined snapshot."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            [{"date": "2024-01-02", "btc_spx_correlation": 0.6, "gold_btc_correlation": -0.1, "vix_btc_correlation": -0.4, "vix_level": 16.0, "btc_price": 50000, "spx_price": 4600, "gold_price": 2000}],
            [{"key": "spx500", "name": "S&P 500"}, {"key": "gold", "name": "Gold"}],
            [{"close_price": 4600, "time": "2024-01-02"}],
            [{"close_price": 2000, "time": "2024-01-02"}],
        ])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert "correlation" in data
        assert "prices" in data
        assert data["correlation"]["btc_price"] == 50000


    def test_get_m2_comparison(self, client):
        """M2 comparison should return aligned M2 + selected asset prices."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            # M2 rows
            [{"date": "2024-01-01", "value": 21000.0}, {"date": "2024-01-02", "value": 21100.0}],
            # BTC rows
            [{"date": "2024-01-01", "close_price": 42000.0}, {"date": "2024-01-02", "close_price": 43000.0}],
            # SPX asset
            [{"id": 1}],
            # SPX rows
            [{"date": "2024-01-01", "close_price": 4500.0}, {"date": "2024-01-02", "close_price": 4600.0}],
            # Gold asset
            [{"id": 2}],
            # Gold rows
            [{"date": "2024-01-01", "close_price": 2000.0}, {"date": "2024-01-02", "close_price": 2050.0}],
        ])
        with patch("routers.macro.get_db", return_value=mock_db):
            resp = client.get("/api/v1/macro/m2-comparison?assets=btc,spx,gold&days=365")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dates"] == ["2024-01-01", "2024-01-02"]
        assert data["series"]["m2"] == [21000.0, 21100.0]
        assert data["series"]["btc"] == [42000.0, 43000.0]
        assert data["series"]["spx"] == [4500.0, 4600.0]
        assert data["series"]["gold"] == [2000.0, 2050.0]
