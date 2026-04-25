"""Tests for portfolio router"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.query = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.mark.asyncio
class TestConnectBinance:
    @patch("routers.portfolio.encrypt", return_value="encrypted")
    @patch("routers.portfolio.BinancePortfolioFetcher")
    @patch("routers.portfolio.get_db")
    async def test_connect_binance_futures_success(self, mock_get_db, mock_fetcher_cls, mock_encrypt, mock_db):
        mock_get_db.return_value = mock_db
        mock_fetcher = MagicMock()
        mock_fetcher.get_futures_account = AsyncMock(return_value={"totalWalletBalance": "1000"})
        mock_fetcher.close = AsyncMock()
        mock_fetcher_cls.return_value = mock_fetcher

        from routers.portfolio import connect_binance, ConnectBinanceRequest
        result = await connect_binance(
            ConnectBinanceRequest(api_key="key", api_secret="secret", market_type="futures"),
            {"id": 42},
        )
        assert "connected" in result["message"].lower()

    @patch("routers.portfolio.encrypt", return_value="encrypted")
    @patch("routers.portfolio.BinancePortfolioFetcher")
    @patch("routers.portfolio.get_db")
    async def test_connect_binance_spot_success(self, mock_get_db, mock_fetcher_cls, mock_encrypt, mock_db):
        mock_get_db.return_value = mock_db
        mock_fetcher = MagicMock()
        mock_fetcher.get_spot_account = AsyncMock(return_value={"balances": []})
        mock_fetcher.close = AsyncMock()
        mock_fetcher_cls.return_value = mock_fetcher

        from routers.portfolio import connect_binance, ConnectBinanceRequest
        result = await connect_binance(
            ConnectBinanceRequest(api_key="key", api_secret="secret", market_type="spot"),
            {"id": 42},
        )
        assert "connected" in result["message"].lower()

    @patch("routers.portfolio.BinancePortfolioFetcher")
    @patch("routers.portfolio.get_db")
    async def test_connect_binance_invalid_creds(self, mock_get_db, mock_fetcher_cls, mock_db):
        mock_get_db.return_value = mock_db
        mock_fetcher = MagicMock()
        mock_fetcher.get_futures_account = AsyncMock(side_effect=Exception("Invalid key"))
        mock_fetcher.close = AsyncMock()
        mock_fetcher_cls.return_value = mock_fetcher

        from routers.portfolio import connect_binance, ConnectBinanceRequest
        with pytest.raises(HTTPException) as exc:
            await connect_binance(
                ConnectBinanceRequest(api_key="bad", api_secret="bad"),
                {"id": 42},
            )
        assert exc.value.status_code == 400

    @patch("routers.portfolio.get_db")
    async def test_connect_binance_invalid_market_type(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import connect_binance, ConnectBinanceRequest
        with pytest.raises(HTTPException) as exc:
            await connect_binance(
                ConnectBinanceRequest(api_key="k", api_secret="s", market_type="invalid"),
                {"id": 42},
            )
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestDisconnectBinance:
    @patch("routers.portfolio.get_db")
    async def test_disconnect_binance(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import disconnect_binance
        result = await disconnect_binance({"id": 42}, "futures")
        assert "disconnected" in result["message"].lower()


@pytest.mark.asyncio
class TestSyncPortfolio:
    @patch("routers.portfolio.sync_user_portfolio")
    async def test_sync_portfolio(self, mock_sync):
        mock_sync.return_value = {"synced": True, "assets": 5}
        from routers.portfolio import sync_portfolio
        result = await sync_portfolio({"id": 42})
        assert result["synced"] is True


@pytest.mark.asyncio
class TestPortfolioSummary:
    @patch("routers.portfolio.get_portfolio_summary")
    async def test_portfolio_summary(self, mock_summary):
        mock_summary.return_value = {"total_notional": 10000, "assets": []}
        from routers.portfolio import portfolio_summary
        result = await portfolio_summary({"id": 42})
        assert result["total_notional"] == 10000


@pytest.mark.asyncio
class TestPortfolioHistory:
    @patch("routers.portfolio.get_db")
    async def test_portfolio_history(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"date": "2024-01-01", "value": 1000}])
        from routers.portfolio import portfolio_history
        result = await portfolio_history({"id": 42})
        assert len(result) == 1


@pytest.mark.asyncio
class TestManualAssets:
    @patch("routers.portfolio.get_db")
    async def test_add_manual_asset_new_source(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(side_effect=[
            [],  # no manual source
            [{"id": 99}],  # inserted source
        ])
        from routers.portfolio import add_manual_asset, ManualAssetRequest
        result = await add_manual_asset(
            ManualAssetRequest(asset_symbol="BTC", amount=1.0, avg_entry_price=50000),
            {"id": 42},
        )
        assert result["message"] == "Asset added"

    @patch("routers.portfolio.get_db")
    async def test_add_manual_asset_existing_source(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 99}])
        from routers.portfolio import add_manual_asset, ManualAssetRequest
        result = await add_manual_asset(
            ManualAssetRequest(asset_symbol="ETH", amount=2.0, avg_entry_price=3000),
            {"id": 42},
        )
        assert result["message"] == "Asset added"

    @patch("routers.portfolio.get_db")
    async def test_remove_manual_asset(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import remove_manual_asset
        result = await remove_manual_asset("BTC", {"id": 42})
        assert result["message"] == "Asset removed"


@pytest.mark.asyncio
class TestCategories:
    @patch("routers.portfolio.get_db")
    async def test_list_categories(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "name": "Crypto"}],
            [{"id": 2, "name": "MyCategory"}],
        ])
        from routers.portfolio import list_categories
        result = await list_categories({"id": 42})
        assert len(result["system"]) == 1
        assert len(result["user"]) == 1

    @patch("routers.portfolio.get_db")
    async def test_create_user_category(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import create_user_category, UserCategoryRequest
        result = await create_user_category(
            UserCategoryRequest(name="TestCat", color="#ff0000"),
            {"id": 42},
        )
        assert result["message"] == "Category created"

    @patch("routers.portfolio.get_db")
    async def test_assign_category(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import assign_category, AssignCategoryRequest
        result = await assign_category(
            AssignCategoryRequest(asset_symbol="BTC", system_category_id=1),
            {"id": 42},
        )
        assert result["message"] == "Category assigned"


@pytest.mark.asyncio
class TestModels:
    @patch("routers.portfolio.get_db")
    async def test_list_models_authenticated(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "name": "Conservative", "is_custom": False}],
            [{"asset_symbol": "BTC", "asset_name": "Bitcoin", "target_weight": 0.5}],
            [{"category_id": 1, "category_name": "Crypto", "target_weight": 0.5}],
        ])
        from routers.portfolio import list_models
        result = await list_models({"id": 42})
        assert len(result) == 1
        assert result[0]["name"] == "Conservative"

    @patch("routers.portfolio.get_db")
    async def test_list_models_anonymous(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "name": "Conservative", "is_custom": False}],
            [],
            [],
        ])
        from routers.portfolio import list_models
        result = await list_models(None)
        assert len(result) == 1

    @patch("routers.portfolio.get_db")
    async def test_select_model(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import select_model, SelectModelRequest
        result = await select_model(SelectModelRequest(model_id=1), {"id": 42})
        assert result["message"] == "Model selected"


@pytest.mark.asyncio
class TestDeviation:
    @patch("routers.portfolio.get_db")
    @patch("routers.portfolio.get_portfolio_summary")
    async def test_get_deviation_asset_level(self, mock_summary, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_summary.return_value = {
            "total_notional": 10000,
            "assets": [{"asset_symbol": "BTC", "notional": 6000}],
        }
        mock_db.query = AsyncMock(side_effect=[
            [{"selected_model_id": 1}],
            [{"asset_symbol": "BTC", "target_weight": 50}],
        ])
        from routers.portfolio import get_deviation
        result = await get_deviation({"id": 42})
        assert result["model_id"] == 1
        assert len(result["deviations"]) == 1
        assert result["deviations"][0]["asset"] == "BTC"

    @patch("routers.portfolio.get_db")
    @patch("routers.portfolio.get_portfolio_summary")
    async def test_get_deviation_category_fallback(self, mock_summary, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_summary.return_value = {
            "total_notional": 10000,
            "assets": [],
            "categories": {"Crypto": {"notional": 6000}},
        }
        mock_db.query = AsyncMock(side_effect=[
            [{"selected_model_id": 1}],
            [],  # no asset targets
            [{"category_id": 1, "target_weight": 50}],
            [{"id": 1}],
        ])
        from routers.portfolio import get_deviation
        result = await get_deviation({"id": 42})
        assert result["model_id"] == 1
        assert "category" in result["deviations"][0]

    @patch("routers.portfolio.get_db")
    async def test_get_deviation_no_model(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[])
        from routers.portfolio import get_deviation
        with pytest.raises(HTTPException) as exc:
            await get_deviation({"id": 42})
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestCustomModel:
    @patch("routers.portfolio.get_db")
    async def test_create_custom_model(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 99}])
        from routers.portfolio import create_custom_model, CreateCustomModelRequest, CustomModelAsset
        result = await create_custom_model(
            CreateCustomModelRequest(
                name="MyModel",
                assets=[CustomModelAsset(asset_symbol="BTC", target_weight=100)],
            ),
            {"id": 42},
        )
        assert result["model_id"] == 99

    @patch("routers.portfolio.get_db")
    async def test_create_custom_model_bad_weights(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import create_custom_model, CreateCustomModelRequest, CustomModelAsset
        with pytest.raises(HTTPException) as exc:
            await create_custom_model(
                CreateCustomModelRequest(
                    name="Bad",
                    assets=[CustomModelAsset(asset_symbol="BTC", target_weight=50)],
                ),
                {"id": 42},
            )
        assert exc.value.status_code == 400

    @patch("routers.portfolio.get_db")
    async def test_delete_custom_model(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"user_id": 42}])
        from routers.portfolio import delete_custom_model
        result = await delete_custom_model(1, {"id": 42})
        assert result["message"] == "Model deleted"

    @patch("routers.portfolio.get_db")
    async def test_delete_custom_model_not_found(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[])
        from routers.portfolio import delete_custom_model
        with pytest.raises(HTTPException) as exc:
            await delete_custom_model(1, {"id": 42})
        assert exc.value.status_code == 404

    @patch("routers.portfolio.get_db")
    async def test_delete_custom_model_not_owner(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"user_id": 99}])
        from routers.portfolio import delete_custom_model
        with pytest.raises(HTTPException) as exc:
            await delete_custom_model(1, {"id": 42})
        assert exc.value.status_code == 403


@pytest.mark.asyncio
class TestAlerts:
    @patch("routers.portfolio.get_db")
    async def test_list_alerts(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 1, "message": "Test alert"}])
        from routers.portfolio import list_alerts
        result = await list_alerts({"id": 42})
        assert len(result) == 1

    @patch("routers.portfolio.get_db")
    async def test_mark_alerts_read(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import mark_alerts_read
        result = await mark_alerts_read({"id": 42})
        assert result["message"] == "Alerts marked as read"

    @patch("routers.portfolio.get_db")
    async def test_get_alert_settings(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"alert_type": "pnl_up", "threshold": 10}])
        from routers.portfolio import get_alert_settings
        result = await get_alert_settings({"id": 42})
        assert len(result) == 1

    @patch("routers.portfolio.get_db")
    async def test_set_alert_setting(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.portfolio import set_alert_setting, AlertSettingRequest
        result = await set_alert_setting(
            AlertSettingRequest(alert_type="liquidation", threshold=1000),
            {"id": 42},
        )
        assert result["message"] == "Alert setting saved"


@pytest.mark.asyncio
class TestAdminSources:
    async def test_admin_sources_non_admin(self):
        from routers.portfolio import admin_sources
        with pytest.raises(HTTPException) as exc:
            await admin_sources({"id": 42, "subscription_tier": "pro"})
        assert exc.value.status_code == 403

    @patch("routers.portfolio.get_db")
    async def test_admin_sources_success(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 1, "email": "a@b.com"}])
        from routers.portfolio import admin_sources
        result = await admin_sources({"id": 1, "subscription_tier": "admin"})
        assert len(result) == 1


@pytest.mark.asyncio
class TestAiInsight:
    @patch("routers.portfolio.get_portfolio_summary")
    async def test_ai_insight_no_openrouter_key(self, mock_summary):
        mock_summary.return_value = {
            "total_notional": 1000,
            "assets": [{"asset_symbol": "BTC"}],
            "categories": {"Crypto": {"weight_pct": 100, "notional": 1000, "pnl": 0}},
        }
        from routers.portfolio import ai_insight
        with patch("routers.portfolio.OPENROUTER_API_KEY", ""):
            result = await ai_insight({"id": 42})
        assert "require" in result["insight"].lower()

    @patch("routers.portfolio.get_db")
    @patch("routers.portfolio.get_portfolio_summary")
    async def test_ai_insight_empty_portfolio(self, mock_summary, mock_get_db, mock_db):
        mock_summary.return_value = {"assets": []}
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[])
        from routers.portfolio import ai_insight
        with pytest.raises(HTTPException) as exc:
            await ai_insight({"id": 42})
        assert exc.value.status_code == 400
