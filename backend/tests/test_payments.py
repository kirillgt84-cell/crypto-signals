"""Tests for payments router"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.query = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def mock_paypal():
    paypal = MagicMock()
    paypal.create_order = AsyncMock()
    paypal.capture_order = AsyncMock()
    paypal.create_subscription = AsyncMock()
    paypal.create_product = AsyncMock()
    paypal.create_plan = AsyncMock()
    paypal.verify_webhook_signature = AsyncMock()
    return paypal


@pytest.mark.asyncio
class TestListPlans:
    @patch("routers.payments.get_db")
    async def test_list_plans(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[
            {"id": 1, "name": "Pro Monthly", "price": 25.0, "currency": "USD"},
            {"id": 2, "name": "Pro Yearly", "price": 228.0, "currency": "USD"},
        ])
        from routers.payments import list_plans
        result = await list_plans()
        assert len(result) == 2
        assert result[0]["name"] == "Pro Monthly"


@pytest.mark.asyncio
class TestCreateOrder:
    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_create_order_success(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_db.query = AsyncMock(return_value=[{"id": 1, "price": 25.0, "currency": "USD"}])
        mock_paypal.create_order = AsyncMock(return_value={
            "id": "ORDER_123",
            "status": "CREATED",
            "links": [{"rel": "approve", "href": "https://paypal.com/approve"}],
        })

        from routers.payments import create_order, CreateOrderRequest
        result = await create_order(CreateOrderRequest(plan_id=1), {"id": 42})
        assert result["order_id"] == "ORDER_123"
        assert result["approval_url"] == "https://paypal.com/approve"

    @patch("routers.payments.get_db")
    async def test_create_order_plan_not_found(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[])
        from routers.payments import create_order, CreateOrderRequest
        with pytest.raises(HTTPException) as exc:
            await create_order(CreateOrderRequest(plan_id=99), {"id": 42})
        assert exc.value.status_code == 404

    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_create_order_paypal_failure(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_db.query = AsyncMock(return_value=[{"id": 1, "price": 25.0, "currency": "USD"}])
        mock_paypal.create_order = AsyncMock(return_value={"status_code": 400, "message": "Bad request"})

        from routers.payments import create_order, CreateOrderRequest
        with pytest.raises(HTTPException) as exc:
            await create_order(CreateOrderRequest(plan_id=1), {"id": 42})
        assert exc.value.status_code == 502


@pytest.mark.asyncio
class TestCaptureOrder:
    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_capture_order_completed(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_paypal.capture_order = AsyncMock(return_value={"status": "COMPLETED"})
        mock_db.query = AsyncMock(side_effect=[
            [{"plan_id": 1}],
            [{"tier": "pro"}],
        ])

        from routers.payments import capture_order
        result = await capture_order({"order_id": "ORDER_123"}, {"id": 42})
        assert result["success"] is True
        assert result["status"] == "captured"

    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_capture_order_failed(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_paypal.capture_order = AsyncMock(return_value={"status": "FAILED"})

        from routers.payments import capture_order
        with pytest.raises(HTTPException) as exc:
            await capture_order({"order_id": "ORDER_123"}, {"id": 42})
        assert exc.value.status_code == 400

    async def test_capture_order_missing_id(self):
        from routers.payments import capture_order
        with pytest.raises(HTTPException) as exc:
            await capture_order({}, {"id": 42})
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestCreateSubscription:
    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_create_subscription_success(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_db.query = AsyncMock(return_value=[{"id": 1, "price": 25.0, "currency": "USD", "paypal_plan_id": "PLAN_123"}])
        mock_paypal.create_subscription = AsyncMock(return_value={
            "id": "SUB_123",
            "status": "APPROVAL_PENDING",
            "links": [{"rel": "approve", "href": "https://paypal.com/sub-approve"}],
        })

        from routers.payments import create_subscription, CreateSubscriptionRequest
        result = await create_subscription(CreateSubscriptionRequest(plan_id=1), {"id": 42})
        assert result["subscription_id"] == "SUB_123"
        assert result["approval_url"] == "https://paypal.com/sub-approve"

    @patch("routers.payments.get_db")
    async def test_create_subscription_no_paypal_plan(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 1, "price": 25.0, "paypal_plan_id": None}])
        from routers.payments import create_subscription, CreateSubscriptionRequest
        with pytest.raises(HTTPException) as exc:
            await create_subscription(CreateSubscriptionRequest(plan_id=1), {"id": 42})
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestMySubscription:
    @patch("routers.payments.get_db")
    async def test_my_subscription_active(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{
            "id": 1, "status": "active", "plan_name": "Pro Monthly",
            "price": 25.0, "currency": "USD", "type": "subscription",
        }])
        from routers.payments import my_subscription
        result = await my_subscription({"id": 42})
        assert result["status"] == "active"

    @patch("routers.payments.get_db")
    async def test_my_subscription_none(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[])
        from routers.payments import my_subscription
        result = await my_subscription({"id": 42})
        assert result is None


@pytest.mark.asyncio
class TestPaymentHistory:
    @patch("routers.payments.get_db")
    async def test_payment_history(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "status": "captured", "plan_name": "Pro"}],
            [{"id": 2, "status": "active", "plan_name": "Pro Monthly"}],
        ])
        from routers.payments import payment_history
        result = await payment_history({"id": 42})
        assert len(result["payments"]) == 1
        assert len(result["subscriptions"]) == 1


@pytest.mark.asyncio
class TestPayPalWebhook:
    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_webhook_payment_capture_completed(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_paypal.verify_webhook_signature = AsyncMock(return_value=True)
        mock_db.query = AsyncMock(side_effect=[
            [],  # idempotency check
            [{"user_id": 42, "plan_id": 1}],
            [{"tier": "pro"}],
        ])

        from routers.payments import paypal_webhook
        from starlette.requests import Request
        async def receive():
            import json
            payload = {
                "id": "EVT_123",
                "event_type": "PAYMENT.CAPTURE.COMPLETED",
                "resource_type": "capture",
                "resource": {
                    "id": "CAP_123",
                    "supplementary_data": {"related_ids": {"order_id": "ORDER_123"}},
                },
            }
            return {"type": "http.request", "body": json.dumps(payload).encode()}
        request = Request({"type": "http", "headers": []}, receive=receive)

        result = await paypal_webhook(request)
        assert result["status"] == "processed"

    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_webhook_idempotency(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_db.query = AsyncMock(return_value=[{"1": 1}])  # already processed

        from routers.payments import paypal_webhook
        from starlette.requests import Request
        async def receive():
            import json
            return {"type": "http.request", "body": json.dumps({"id": "EVT_456", "event_type": "TEST"}).encode()}
        request = Request({"type": "http", "headers": []}, receive=receive)

        result = await paypal_webhook(request)
        assert result["status"] == "already_processed"

    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_webhook_invalid_signature(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_paypal.verify_webhook_signature = AsyncMock(return_value=False)
        mock_db.query = AsyncMock(return_value=[])  # not processed yet

        from routers.payments import paypal_webhook
        from starlette.requests import Request
        async def receive():
            import json
            return {"type": "http.request", "body": json.dumps({"id": "EVT_789", "event_type": "TEST"}).encode()}
        request = Request({"type": "http", "headers": []}, receive=receive)

        with pytest.raises(HTTPException) as exc:
            await paypal_webhook(
                request,
                paypal_auth_algo="RSA",
                paypal_transmission_sig="sig",
            )
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestCreateTrial:
    @patch("routers.payments.get_db")
    @patch("routers.payments.get_paypal_api")
    async def test_create_trial_success(self, mock_get_paypal, mock_get_db, mock_db, mock_paypal):
        mock_get_db.return_value = mock_db
        mock_get_paypal.return_value = mock_paypal
        mock_db.query = AsyncMock(side_effect=[
            [],  # no existing subscription
            [{"id": 1, "name": "Pro Monthly Trial", "paypal_plan_id": "PLAN_TRIAL"}],
        ])
        mock_paypal.create_subscription = AsyncMock(return_value={
            "id": "SUB_TRIAL",
            "status": "APPROVAL_PENDING",
            "links": [{"rel": "approve", "href": "https://paypal.com/trial"}],
        })

        from routers.payments import create_trial, CreateTrialRequest
        result = await create_trial(CreateTrialRequest(billing_cycle="monthly"), {"id": 42})
        assert result["subscription_id"] == "SUB_TRIAL"
        assert result["approval_url"] == "https://paypal.com/trial"

    @patch("routers.payments.get_db")
    async def test_create_trial_existing_subscription(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"1": 1}])
        from routers.payments import create_trial, CreateTrialRequest
        with pytest.raises(HTTPException) as exc:
            await create_trial(CreateTrialRequest(billing_cycle="monthly"), {"id": 42})
        assert exc.value.status_code == 400

    async def test_create_trial_invalid_billing_cycle(self):
        from routers.payments import create_trial, CreateTrialRequest
        with pytest.raises(HTTPException) as exc:
            await create_trial(CreateTrialRequest(billing_cycle="weekly"), {"id": 42})
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestAdminEndpoints:
    async def test_admin_payments_non_admin(self):
        from routers.payments import admin_payments
        with pytest.raises(HTTPException) as exc:
            await admin_payments({"id": 42, "subscription_tier": "pro"})
        assert exc.value.status_code == 403

    @patch("routers.payments.get_db")
    async def test_admin_payments_success(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 1, "email": "a@b.com"}])
        from routers.payments import admin_payments
        result = await admin_payments({"id": 1, "subscription_tier": "admin"})
        assert len(result) == 1

    async def test_admin_subscriptions_non_admin(self):
        from routers.payments import admin_subscriptions
        with pytest.raises(HTTPException) as exc:
            await admin_subscriptions({"id": 42, "subscription_tier": "free"})
        assert exc.value.status_code == 403

    @patch("routers.payments.get_db")
    async def test_admin_subscriptions_success(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query = AsyncMock(return_value=[{"id": 1, "email": "a@b.com"}])
        from routers.payments import admin_subscriptions
        result = await admin_subscriptions({"id": 1, "subscription_tier": "admin"})
        assert len(result) == 1
