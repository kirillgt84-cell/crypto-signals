import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


class TestPromoRouter:
    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.query = AsyncMock()
        db.execute = AsyncMock()
        return db

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_validate_promo_code_not_found(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = []

        from routers.promo import validate_promo_code
        result = await validate_promo_code("MISSING", 1)
        assert result["valid"] is False
        assert result["error"] == "PROMO_NOT_FOUND"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_validate_promo_code_inactive(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [{"id": 1, "code": "TEST", "is_active": False, "current_uses": 0, "trial_days": 7, "trial_tier": "pro"}]

        from routers.promo import validate_promo_code
        result = await validate_promo_code("TEST", 1)
        assert result["valid"] is False
        assert result["error"] == "PROMO_INACTIVE"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_validate_promo_code_limit_reached(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [{"id": 1, "code": "TEST", "is_active": True, "max_uses": 5, "current_uses": 5, "trial_days": 7, "trial_tier": "pro"}]

        from routers.promo import validate_promo_code
        result = await validate_promo_code("TEST", 1)
        assert result["valid"] is False
        assert result["error"] == "PROMO_LIMIT_REACHED"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_validate_promo_code_user_already_active(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [{"id": 1, "code": "TEST", "is_active": True, "max_uses": None, "current_uses": 0, "trial_days": 7, "trial_tier": "pro"}],
            [{"id": 99}],  # existing active promo activation
        ]

        from routers.promo import validate_promo_code
        result = await validate_promo_code("TEST", 1)
        assert result["valid"] is False
        assert result["error"] == "USER_ALREADY_HAS_ACTIVE_PROMO"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_validate_promo_code_success(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [{"id": 1, "code": "TEST", "is_active": True, "max_uses": None, "current_uses": 0, "trial_days": 7, "trial_tier": "pro"}],
            [],  # no existing activation
            [],  # no referral
        ]

        from routers.promo import validate_promo_code
        result = await validate_promo_code("TEST", 1)
        assert result["valid"] is True
        assert result["trial_days"] == 7
        assert result["trial_tier"] == "pro"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_check_promo_code_valid(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [{"id": 1, "code": "TEST", "is_active": True, "max_uses": None, "current_uses": 0, "trial_days": 7, "trial_tier": "pro", "partner_name": "Partner", "discount_percent": 0}]

        from routers.promo import check_promo_code
        result = await check_promo_code("TEST")
        assert result["valid"] is True
        assert result["trial_days"] == 7

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_check_promo_code_not_found(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = []

        from routers.promo import check_promo_code
        result = await check_promo_code("MISSING")
        assert result["valid"] is False

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_get_partner_stats(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [
            {"code": "TEST", "total_activations": 5, "active_trials": 2, "conversions": 1}
        ]

        from routers.promo import get_partner_stats
        result = await get_partner_stats({"id": 1})
        assert "promo_codes" in result
        assert len(result["promo_codes"]) == 1
        assert result["promo_codes"][0]["code"] == "TEST"

    @pytest.mark.asyncio
    @patch("routers.promo.get_db")
    async def test_get_my_promo_status_none(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = []

        from routers.promo import get_my_promo_status
        result = await get_my_promo_status({"id": 1})
        assert result["has_promo"] is False
