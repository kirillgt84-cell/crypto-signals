"""
PayPal API service: Orders v2 + Subscriptions v1 + Webhook verification
Uses httpx (already in project). Supports Sandbox and Live modes.
"""
import os
import logging
import base64
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")  # or "live"

BASE_URL = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"


class PayPalAPI:
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
        self._access_token: Optional[str] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if not self.client:
            self.client = httpx.AsyncClient(timeout=30.0)
        return self.client

    async def _get_access_token(self) -> str:
        if self._access_token:
            return self._access_token
        client = await self._get_client()
        creds = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode()).decode()
        resp = await client.post(
            f"{BASE_URL}/v1/oauth2/token",
            headers={"Authorization": f"Basic {creds}"},
            data={"grant_type": "client_credentials"},
        )
        data = resp.json()
        if resp.status_code != 200:
            raise RuntimeError(f"PayPal auth failed: {data}")
        self._access_token = data["access_token"]
        return self._access_token

    async def _api(self, method: str, path: str, json_data: Optional[Dict] = None) -> Dict[str, Any]:
        token = await self._get_access_token()
        client = await self._get_client()
        url = f"{BASE_URL}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, json=json_data)
        elif method == "PATCH":
            resp = await client.patch(url, headers=headers, json=json_data)
        else:
            raise ValueError(f"Unsupported method {method}")
        result = resp.json() if resp.status_code < 500 else {}
        if resp.status_code >= 400:
            logger.error(f"PayPal API error {resp.status_code}: {result}")
        return {"status_code": resp.status_code, **result}

    # ========== ORDERS (one-time payments) ==========

    async def create_order(self, amount: float, currency: str = "USD", reference_id: str = "") -> Dict[str, Any]:
        """Create a PayPal order (one-time payment)."""
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference_id or "default",
                    "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                }
            ],
            "application_context": {
                "return_url": "https://mirkaso.com/pricing?payment=success",
                "cancel_url": "https://mirkaso.com/pricing?payment=cancelled",
            },
        }
        return await self._api("POST", "/v2/checkout/orders", payload)

    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Capture an approved PayPal order."""
        return await self._api("POST", f"/v2/checkout/orders/{order_id}/capture")

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        return await self._api("GET", f"/v2/checkout/orders/{order_id}")

    # ========== PRODUCTS & PLANS ==========

    async def create_product(self, name: str, description: str, product_type: str = "SERVICE") -> Dict[str, Any]:
        """Create a PayPal catalog product."""
        payload = {
            "name": name,
            "description": description,
            "type": product_type,
            "category": "SOFTWARE",
        }
        return await self._api("POST", "/v1/catalogs/products", payload)

    async def create_plan(
        self,
        product_id: str,
        name: str,
        amount: float,
        currency: str = "USD",
        trial_days: int = 7,
        billing_cycle: str = "monthly",
    ) -> Dict[str, Any]:
        """Create a PayPal billing plan with a trial period."""
        frequency = "MONTH" if billing_cycle == "monthly" else "YEAR"
        trial_cycles = [{
            "frequency": {"interval_unit": "DAY", "interval_count": 1},
            "tenure_type": "TRIAL",
            "sequence": 1,
            "total_cycles": trial_days,
            "pricing_scheme": {"fixed_price": {"value": "0", "currency_code": currency}},
        }]
        regular_cycles = [{
            "frequency": {"interval_unit": frequency, "interval_count": 1},
            "tenure_type": "REGULAR",
            "sequence": 2,
            "total_cycles": 0,
            "pricing_scheme": {"fixed_price": {"value": f"{amount:.2f}", "currency_code": currency}},
        }]
        payload = {
            "product_id": product_id,
            "name": name,
            "description": f"{name} with {trial_days}-day free trial",
            "status": "ACTIVE",
            "billing_cycles": trial_cycles + regular_cycles,
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3,
            },
        }
        return await self._api("POST", "/v1/billing/plans", payload)

    # ========== SUBSCRIPTIONS ==========

    async def create_subscription(
        self,
        plan_id: str,
        start_time: Optional[str] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a PayPal subscription using a billing plan ID."""
        payload: Dict[str, Any] = {"plan_id": plan_id}
        if start_time:
            payload["start_time"] = start_time
        if return_url or cancel_url:
            payload["application_context"] = {}
            if return_url:
                payload["application_context"]["return_url"] = return_url
            if cancel_url:
                payload["application_context"]["cancel_url"] = cancel_url
        return await self._api("POST", "/v1/billing/subscriptions", payload)

    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        return await self._api("GET", f"/v1/billing/subscriptions/{subscription_id}")

    async def cancel_subscription(self, subscription_id: str, reason: str = "User requested") -> Dict[str, Any]:
        return await self._api("POST", f"/v1/billing/subscriptions/{subscription_id}/cancel", {"reason": reason})

    # ========== WEBHOOK VERIFICATION ==========

    async def verify_webhook_signature(
        self,
        auth_algo: str,
        cert_url: str,
        transmission_id: str,
        transmission_sig: str,
        transmission_time: str,
        webhook_body: str,
    ) -> bool:
        """Verify webhook signature via PayPal API."""
        if not PAYPAL_WEBHOOK_ID:
            logger.warning("PAYPAL_WEBHOOK_ID not set, skipping webhook verification")
            return True
        payload = {
            "auth_algo": auth_algo,
            "cert_url": cert_url,
            "transmission_id": transmission_id,
            "transmission_sig": transmission_sig,
            "transmission_time": transmission_time,
            "webhook_id": PAYPAL_WEBHOOK_ID,
            "webhook_event": webhook_body,
        }
        result = await self._api("POST", "/v1/notifications/verify-webhook-signature", payload)
        verified = result.get("verification_status") == "SUCCESS"
        if not verified:
            logger.error(f"PayPal webhook verification failed: {result}")
        return verified

    async def close(self):
        if self.client:
            await self.client.close()
            self.client = None


# Singleton
_paypal_api: Optional[PayPalAPI] = None


def get_paypal_api() -> PayPalAPI:
    global _paypal_api
    if _paypal_api is None:
        _paypal_api = PayPalAPI()
    return _paypal_api
