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
            # M2 rows (2 rows, days=30 → threshold=30//7*0.5≈2, no FRED fallback)
            [{"date": "2024-01-01", "value": 21000.0}, {"date": "2024-01-02", "value": 21100.0}],
            # BTC rows from oi_history (10 rows → no BTC fallback)
            [{"date": f"2024-01-{i:02d}", "close_price": 41000.0 + i * 1000} for i in range(1, 11)],
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
            resp = client.get("/api/v1/macro/m2-comparison?assets=btc,spx,gold&days=30")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dates"] == ["2024-01-01", "2024-01-02"]
        assert data["series"]["m2"] == [21000.0, 21100.0]
        assert data["series"]["btc"] == [42000.0, 43000.0]
        assert data["series"]["spx"] == [4500.0, 4600.0]
        assert data["series"]["gold"] == [2000.0, 2050.0]

    def test_get_m2_comparison_empty_m2_btc_coingecko(self, client):
        """When M2 DB is empty and oi_history is empty, CoinGecko BTC fallback should drive dates."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            # M2 rows — empty
            [],
            # BTC oi_history — empty
            [],
            # BTC macro_asset lookup — empty
            [],
            # SPX asset — empty
            [],
            # Gold asset — empty
            [],
        ])
        cg_data = [
            {"date": "2024-01-01", "close_price": 42000.0},
            {"date": "2024-01-02", "close_price": 43000.0},
        ]
        with patch("routers.macro.get_db", return_value=mock_db), \
             patch("routers.macro._fetch_btc_from_binance", return_value=[]), \
             patch("routers.macro._fetch_from_coingecko", return_value=cg_data):
            resp = client.get("/api/v1/macro/m2-comparison?assets=btc&days=30")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dates"] == ["2024-01-01", "2024-01-02"]
        assert data["series"]["m2"] == [None, None]
        assert data["series"]["btc"] == [42000.0, 43000.0]

    def test_get_m2_comparison_all_btc_fallbacks_fail(self, client):
        """When all BTC sources fail, btc series should be None values."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            # M2 rows
            [{"date": "2024-01-01", "value": 21000.0}],
            # BTC oi_history — empty
            [],
            # BTC macro_asset lookup — empty
            [],
        ])
        with patch("routers.macro.get_db", return_value=mock_db), \
             patch("routers.macro._fetch_btc_from_binance", return_value=[]), \
             patch("routers.macro._fetch_from_coingecko", return_value=[]):
            resp = client.get("/api/v1/macro/m2-comparison?assets=btc&days=30")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dates"] == ["2024-01-01"]
        assert data["series"]["btc"] == [None]

    def test_get_correlations_fallback_computes(self, client):
        """When macro_correlations table is empty, fallback should compute correlations from raw prices."""
        mock_db = MagicMock()
        btc_rows = [{"day": f"2024-01-{i:02d}", "price": 40000.0 + i * 1000} for i in range(1, 31)]
        spx_rows = [{"day": f"2024-01-{i:02d}", "close_price": 4500.0 + i * 10} for i in range(1, 31)]
        gold_rows = [{"day": f"2024-01-{i:02d}", "close_price": 2000.0 + i * 5} for i in range(1, 31)]
        mock_db.query = AsyncMock(side_effect=[
            # macro_correlations — empty (triggers fallback)
            [],
            # macro_assets (spx500, gold, vix)
            [
                {"id": 1, "key": "spx500"},
                {"id": 2, "key": "gold"},
                {"id": 3, "key": "vix"},
            ],
            # oi_history BTCUSDT (30 rows → enough)
            btc_rows,
            # macro_prices spx (_get_macro_map)
            spx_rows,
            # macro_prices gold
            gold_rows,
            # macro_prices vix
            [],
        ])
        with patch("routers.macro.get_db", return_value=mock_db), \
             patch("routers.macro._fetch_btc_from_binance", return_value=[]), \
             patch("routers.macro._fetch_from_coingecko", return_value=[]):
            resp = client.get("/api/v1/macro/correlations?limit=30")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        # Last record should have computed correlations for btc↔spx and gold↔btc
        last = data[-1]
        assert last["date"] == "2024-01-30"
        assert isinstance(last["btc_spx_correlation"], float)
        assert isinstance(last["gold_btc_correlation"], float)
        # VIX was empty so correlation should be None
        assert last["vix_btc_correlation"] is None
        assert last["vix_level"] is None

    def test_get_correlations_all_fallbacks_fail(self, client):
        """When macro_correlations is empty and all raw price sources fail, return empty list."""
        mock_db = MagicMock()
        mock_db.query = AsyncMock(side_effect=[
            # macro_correlations — empty
            [],
            # macro_assets
            [{"id": 1, "key": "spx500"}, {"id": 2, "key": "gold"}, {"id": 3, "key": "vix"}],
            # oi_history — empty
            [],
            # macro_assets btc lookup — empty
            [],
        ])
        with patch("routers.macro.get_db", return_value=mock_db), \
             patch("routers.macro._fetch_btc_from_binance", return_value=[]), \
             patch("routers.macro._fetch_from_coingecko", return_value=[]):
            resp = client.get("/api/v1/macro/correlations?limit=30")
        assert resp.status_code == 200
        data = resp.json()
        assert data == []
