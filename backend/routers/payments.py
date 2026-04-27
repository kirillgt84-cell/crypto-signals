"""
Payment router: PayPal integration for one-time and subscription payments.
Manages user access (subscription_tier) automatically via webhooks.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
from services.paypal import get_paypal_api
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


# ============= MODELS =============

class CreateOrderRequest(BaseModel):
    plan_id: int


class CreateSubscriptionRequest(BaseModel):
    plan_id: int


class CreateTrialRequest(BaseModel):
    billing_cycle: str  # "monthly" | "yearly"
    tier: str = "trader"  # "trader" | "investor"


# ============= HELPERS =============

async def _require_pro_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    # Anyone authenticated can purchase; this is just for viewing admin data
    return current_user


async def _get_plan(plan_id: int) -> Optional[dict]:
    db = get_db()
    rows = await db.query("SELECT * FROM plans WHERE id = $1 AND is_active = TRUE", [plan_id])
    return dict(rows[0]) if rows else None


async def _get_or_create_trial_plan(tier: str, billing_cycle: str) -> dict:
    """Find or create a PayPal billing plan with a 7-day trial for a given tier."""
    from core.tiers import normalize_tier
    canonical = normalize_tier(tier)
    if canonical not in ("trader", "investor"):
        raise HTTPException(status_code=400, detail="tier must be 'trader' or 'investor'")

    db = get_db()
    tier_label = canonical.capitalize()
    plan_name = f"{tier_label} {billing_cycle.title()} Trial"
    rows = await db.query("SELECT * FROM plans WHERE name = $1 AND is_active = TRUE", [plan_name])
    if rows:
        return dict(rows[0])

    # Pricing
    if canonical == "trader":
        amount = 19.0 if billing_cycle == "monthly" else 182.0
    else:  # investor
        amount = 35.0 if billing_cycle == "monthly" else 336.0

    # Create PayPal product + plan
    paypal = get_paypal_api()
    product_res = await paypal.create_product(
        name=f"Mirkaso {tier_label}",
        description=f"Mirkaso {tier_label} subscription with 7-day free trial",
    )
    product_id = product_res.get("id")
    if not product_id:
        raise HTTPException(status_code=502, detail="PayPal product creation failed")

    plan_res = await paypal.create_plan(
        product_id=product_id,
        name=plan_name,
        amount=amount,
        currency="USD",
        trial_days=7,
        billing_cycle=billing_cycle,
    )
    paypal_plan_id = plan_res.get("id")
    if not paypal_plan_id:
        raise HTTPException(status_code=502, detail="PayPal plan creation failed")

    # Save to DB
    inserted = await db.query(
        """INSERT INTO plans (name, description, price, currency, type, paypal_plan_id, tier, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id""",
        [plan_name, f"{tier_label} {billing_cycle} with 7-day trial", amount, "USD", "subscription", paypal_plan_id, canonical],
    )
    plan_id = inserted[0]["id"]
    return {
        "id": plan_id,
        "name": plan_name,
        "price": amount,
        "currency": "USD",
        "type": "subscription",
        "paypal_plan_id": paypal_plan_id,
        "tier": canonical,
    }


async def _record_webhook_event(event_id: str, event_type: str, resource_type: str, resource_id: str, payload: dict) -> bool:
    """Returns True if event was already processed (idempotency)."""
    db = get_db()
    existing = await db.query("SELECT 1 FROM paypal_webhook_events WHERE event_id = $1 LIMIT 1", [event_id])
    if existing:
        return True
    await db.execute(
        "INSERT INTO paypal_webhook_events (event_id, event_type, resource_type, resource_id, payload) VALUES ($1, $2, $3, $4, $5)",
        [event_id, event_type, resource_type, resource_id, str(payload)],
    )
    return False


from core.tiers import normalize_tier


async def _grant_access(user_id: int, tier: str = "pro"):
    db = get_db()
    normalized = normalize_tier(tier)
    await db.execute(
        "UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2",
        [normalized, user_id],
    )
    logger.info(f"[Payments] Granted {normalized} access to user {user_id}")


async def _revoke_access(user_id: int):
    db = get_db()
    await db.execute(
        "UPDATE users SET subscription_tier = 'starter', updated_at = NOW() WHERE id = $1",
        [user_id],
    )
    logger.info(f"[Payments] Revoked access from user {user_id}")


# ============= PUBLIC ENDPOINTS =============

@router.get("/plans")
async def list_plans():
    """List active pricing plans."""
    db = get_db()
    rows = await db.query("SELECT * FROM plans WHERE is_active = TRUE ORDER BY price ASC", [])
    return [dict(r) for r in rows]


@router.post("/create-order")
async def create_order(
    req: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a one-time PayPal order."""
    plan = await _get_plan(req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    paypal = get_paypal_api()
    result = await paypal.create_order(
        amount=float(plan["price"]),
        currency=plan["currency"],
        reference_id=f"plan_{plan['id']}_user_{current_user['id']}",
    )

    if result.get("status_code", 200) >= 400:
        raise HTTPException(status_code=502, detail="PayPal order creation failed")

    # Record pending payment
    db = get_db()
    order_id = result.get("id")
    await db.execute(
        """INSERT INTO payments (user_id, plan_id, paypal_order_id, status, amount, currency)
           VALUES ($1, $2, $3, 'created', $4, $5)""",
        [current_user["id"], plan["id"], order_id, plan["price"], plan["currency"]],
    )

    # Extract approval link
    approval_url = None
    for link in result.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break

    return {"order_id": order_id, "approval_url": approval_url}


@router.post("/capture-order")
async def capture_order(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Capture an approved order (client-side after user approves)."""
    order_id = body.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id required")

    paypal = get_paypal_api()
    result = await paypal.capture_order(order_id)

    status = result.get("status", "").upper()
    db = get_db()

    if status == "COMPLETED":
        await db.execute(
            "UPDATE payments SET status = 'captured', captured_at = NOW() WHERE paypal_order_id = $1",
            [order_id],
        )
        # Find plan tier and grant access
        pay = await db.query("SELECT plan_id FROM payments WHERE paypal_order_id = $1", [order_id])
        if pay:
            plan = await db.query("SELECT tier FROM plans WHERE id = $1", [pay[0]["plan_id"]])
            if plan:
                await _grant_access(current_user["id"], plan[0]["tier"])
        return {"success": True, "status": "captured"}
    else:
        await db.execute(
            "UPDATE payments SET status = 'failed' WHERE paypal_order_id = $1",
            [order_id],
        )
        raise HTTPException(status_code=400, detail=f"Payment not completed: {status}")


@router.post("/create-subscription")
async def create_subscription(
    req: CreateSubscriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a PayPal subscription (returns approval link)."""
    plan = await _get_plan(req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.get("paypal_plan_id"):
        raise HTTPException(status_code=400, detail="Plan is not configured for PayPal subscriptions")

    paypal = get_paypal_api()
    result = await paypal.create_subscription(plan_id=plan["paypal_plan_id"])

    if result.get("status_code", 200) >= 400:
        raise HTTPException(status_code=502, detail="PayPal subscription creation failed")

    sub_id = result.get("id")
    db = get_db()
    await db.execute(
        """INSERT INTO subscriptions (user_id, plan_id, paypal_subscription_id, status)
           VALUES ($1, $2, $3, 'created')""",
        [current_user["id"], plan["id"], sub_id],
    )

    approval_url = None
    for link in result.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break

    return {"subscription_id": sub_id, "approval_url": approval_url, "status": result.get("status")}


@router.get("/my-subscription")
async def my_subscription(current_user: dict = Depends(get_current_user)):
    """Get current user's active subscription."""
    db = get_db()
    rows = await db.query(
        """SELECT s.*, p.name as plan_name, p.price, p.currency, p.type
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.user_id = $1 AND s.status IN ('created', 'active')
           ORDER BY s.created_at DESC LIMIT 1""",
        [current_user["id"]],
    )
    return dict(rows[0]) if rows else None


@router.get("/history")
async def payment_history(current_user: dict = Depends(get_current_user)):
    """Get user's payment history."""
    db = get_db()
    payments = await db.query(
        """SELECT p.*, pl.name as plan_name FROM payments p
           JOIN plans pl ON pl.id = p.plan_id
           WHERE p.user_id = $1 ORDER BY p.created_at DESC""",
        [current_user["id"]],
    )
    subs = await db.query(
        """SELECT s.*, pl.name as plan_name FROM subscriptions s
           JOIN plans pl ON pl.id = s.plan_id
           WHERE s.user_id = $1 ORDER BY s.created_at DESC""",
        [current_user["id"]],
    )
    return {"payments": [dict(r) for r in payments], "subscriptions": [dict(r) for r in subs]}


# ============= WEBHOOK =============

@router.post("/webhook/paypal")
async def paypal_webhook(
    request: Request,
    paypal_transmission_id: Optional[str] = Header(None),
    paypal_cert_url: Optional[str] = Header(None),
    paypal_auth_algo: Optional[str] = Header(None),
    paypal_transmission_sig: Optional[str] = Header(None),
    paypal_transmission_time: Optional[str] = Header(None),
):
    """Handle PayPal webhooks for orders and subscriptions."""
    body = await request.body()
    body_str = body.decode("utf-8")
    payload = await request.json()

    event_id = payload.get("id")
    event_type = payload.get("event_type", "")
    resource = payload.get("resource", {})
    resource_type = payload.get("resource_type", "")
    resource_id = resource.get("id", "")

    # Idempotency check
    already_processed = await _record_webhook_event(event_id, event_type, resource_type, resource_id, payload)
    if already_processed:
        return {"status": "already_processed"}

    # Verify signature
    paypal = get_paypal_api()
    if paypal_auth_algo and paypal_transmission_sig:
        verified = await paypal.verify_webhook_signature(
            auth_algo=paypal_auth_algo,
            cert_url=paypal_cert_url or "",
            transmission_id=paypal_transmission_id or "",
            transmission_sig=paypal_transmission_sig,
            transmission_time=paypal_transmission_time or "",
            webhook_body=body_str,
        )
        if not verified:
            raise HTTPException(status_code=400, detail="Webhook verification failed")

    db = get_db()

    # --- PAYMENT CAPTURE ---
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        if order_id:
            await db.execute(
                "UPDATE payments SET status = 'captured', captured_at = NOW() WHERE paypal_order_id = $1",
                [order_id],
            )
            pay = await db.query("SELECT user_id, plan_id FROM payments WHERE paypal_order_id = $1", [order_id])
            if pay:
                plan = await db.query("SELECT tier FROM plans WHERE id = $1", [pay[0]["plan_id"]])
                if plan:
                    await _grant_access(pay[0]["user_id"], plan[0]["tier"])

    elif event_type == "PAYMENT.CAPTURE.DENIED":
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        if order_id:
            await db.execute("UPDATE payments SET status = 'failed' WHERE paypal_order_id = $1", [order_id])

    # --- SUBSCRIPTIONS ---
    elif event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
        sub_id = resource_id
        await db.execute(
            "UPDATE subscriptions SET status = 'active', current_period_start = NOW() WHERE paypal_subscription_id = $1",
            [sub_id],
        )
        sub = await db.query("SELECT user_id, plan_id FROM subscriptions WHERE paypal_subscription_id = $1", [sub_id])
        if sub:
            user_id = sub[0]["user_id"]
            plan_id = sub[0]["plan_id"]

            # --- REFERRAL REWARD ---
            user_row = await db.query(
                "SELECT referred_by_code FROM users WHERE id = $1", [user_id]
            )
            if user_row and user_row[0]["referred_by_code"]:
                ref_code = user_row[0]["referred_by_code"]
                existing_reward = await db.query(
                    """SELECT 1 FROM referral_transactions t
                       JOIN referral_codes c ON c.id = t.referral_code_id
                       WHERE c.code = $1 AND t.type = 'reward'
                       AND t.paypal_transaction_id = $2 LIMIT 1""",
                    [ref_code, sub_id],
                )
                if not existing_reward:
                    plan_price = await db.query("SELECT price FROM plans WHERE id = $1", [plan_id])
                    if plan_price and plan_price[0]["price"] is not None:
                        price = float(plan_price[0]["price"])
                        reward = round(price * 0.2, 2)
                        ref_code_row = await db.query(
                            "SELECT id, user_id FROM referral_codes WHERE code = $1",
                            [ref_code],
                        )
                        if ref_code_row:
                            ref_code_id = ref_code_row[0]["id"]
                            referrer_id = ref_code_row[0]["user_id"]
                            await db.execute(
                                """UPDATE referral_codes
                                   SET available_balance = available_balance + $1,
                                       total_earned = total_earned + $1,
                                       active_referrals = active_referrals + 1
                                   WHERE id = $2""",
                                [reward, ref_code_id],
                            )
                            await db.execute(
                                """UPDATE referrals
                                   SET status = 'subscribed',
                                       converted_at = NOW(),
                                       revenue_generated = revenue_generated + $1,
                                       reward_earned = reward_earned + $2
                                   WHERE referrer_code_id = $3 AND referred_user_id = $4""",
                                [price, reward, ref_code_id, user_id],
                            )
                            await db.execute(
                                """INSERT INTO referral_transactions
                                   (referral_code_id, user_id, type, amount, description, paypal_transaction_id)
                                   VALUES ($1, $2, 'reward', $3, 'Referral subscription activated', $4)""",
                                [ref_code_id, referrer_id, reward, sub_id],
                            )

            plan = await db.query("SELECT tier FROM plans WHERE id = $1", [plan_id])
            if plan:
                await _grant_access(user_id, plan[0]["tier"])

    elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
        sub_id = resource_id
        await db.execute(
            "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE paypal_subscription_id = $1",
            [sub_id],
        )
        sub = await db.query("SELECT user_id FROM subscriptions WHERE paypal_subscription_id = $1", [sub_id])
        if sub:
            await _revoke_access(sub[0]["user_id"])

    elif event_type == "BILLING.SUBSCRIPTION.EXPIRED":
        sub_id = resource_id
        await db.execute("UPDATE subscriptions SET status = 'expired' WHERE paypal_subscription_id = $1", [sub_id])
        sub = await db.query("SELECT user_id FROM subscriptions WHERE paypal_subscription_id = $1", [sub_id])
        if sub:
            await _revoke_access(sub[0]["user_id"])

    elif event_type == "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        sub_id = resource_id
        await db.execute("UPDATE subscriptions SET status = 'payment_failed' WHERE paypal_subscription_id = $1", [sub_id])

    logger.info(f"[Payments] Processed PayPal webhook: {event_type} ({event_id})")
    return {"status": "processed"}


# ============= ADMIN ENDPOINTS =============

@router.get("/admin/payments")
async def admin_payments(current_user: dict = Depends(get_current_user)):
    """List all payments (admin only)."""
    if current_user.get("subscription_tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    rows = await db.query(
        """SELECT p.*, u.email, u.username, pl.name as plan_name
           FROM payments p
           JOIN users u ON u.id = p.user_id
           JOIN plans pl ON pl.id = p.plan_id
           ORDER BY p.created_at DESC LIMIT 200""",
        [],
    )
    return [dict(r) for r in rows]


@router.post("/create-trial")
async def create_trial(
    req: CreateTrialRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a PayPal subscription with a 7-day free trial."""
    if req.billing_cycle not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="billing_cycle must be 'monthly' or 'yearly'")

    from core.tiers import normalize_tier
    canonical_tier = normalize_tier(req.tier)
    if canonical_tier not in ("trader", "investor"):
        raise HTTPException(status_code=400, detail="tier must be 'trader' or 'investor'")

    # Prevent downgrade / duplicate active subscription
    db = get_db()
    existing = await db.query(
        """SELECT s.*, p.tier as plan_tier
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.user_id = $1 AND s.status IN ('created', 'active')
           ORDER BY s.created_at DESC LIMIT 1""",
        [current_user["id"]],
    )
    if existing:
        current_plan_tier = existing[0].get("plan_tier", "starter")
        # Allow upgrade (starter/trader → investor), block downgrade or same-tier duplicate
        if current_plan_tier == canonical_tier:
            raise HTTPException(status_code=400, detail="You already have an active subscription for this tier")

    plan = await _get_or_create_trial_plan(canonical_tier, req.billing_cycle)
    paypal_plan_id = plan["paypal_plan_id"]

    # Check referral eligibility
    user = await db.query(
        "SELECT referred_by_code, referral_discount_used FROM users WHERE id = $1",
        [current_user["id"]]
    )
    is_referral = user and user[0]["referred_by_code"] and not user[0]["referral_discount_used"]

    if is_referral:
        discount_price = float(plan["price"] or 0) * 0.8
        paypal = get_paypal_api()
        product_res = await paypal.create_product(
            name=f"Mirkaso {canonical_tier.capitalize()} (Referral Discount)",
            description=f"{canonical_tier.capitalize()} subscription with 20% referral discount — ${discount_price:.2f}/{req.billing_cycle}"
        )
        if product_res.get("id"):
            plan_res = await paypal.create_plan(
                product_id=product_res["id"],
                name=f"{plan['name']} (Discounted)",
                amount=discount_price,
                currency="USD",
                trial_days=7,
                billing_cycle=req.billing_cycle,
            )
            if plan_res.get("id"):
                paypal_plan_id = plan_res["id"]
        await db.execute(
            "UPDATE users SET referral_discount_used = TRUE WHERE id = $1",
            [current_user["id"]]
        )

    paypal = get_paypal_api()
    result = await paypal.create_subscription(
        plan_id=paypal_plan_id,
        return_url="https://mirkaso.com/pricing?payment=success",
        cancel_url="https://mirkaso.com/pricing?payment=cancelled",
    )

    if result.get("status_code", 200) >= 400:
        raise HTTPException(status_code=502, detail="PayPal subscription creation failed")

    sub_id = result.get("id")
    await db.execute(
        """INSERT INTO subscriptions (user_id, plan_id, paypal_subscription_id, status, trial_ends_at)
           VALUES ($1, $2, $3, 'created', NOW() + INTERVAL '7 days')""",
        [current_user["id"], plan["id"], sub_id],
    )

    approval_url = None
    for link in result.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break

    return {"subscription_id": sub_id, "approval_url": approval_url, "status": result.get("status")}


@router.get("/admin/subscriptions")
async def admin_subscriptions(current_user: dict = Depends(get_current_user)):
    """List all subscriptions (admin only)."""
    if current_user.get("subscription_tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    rows = await db.query(
        """SELECT s.*, u.email, u.username, pl.name as plan_name
           FROM subscriptions s
           JOIN users u ON u.id = s.user_id
           JOIN plans pl ON pl.id = s.plan_id
           ORDER BY s.created_at DESC LIMIT 200""",
        [],
    )
    return [dict(r) for r in rows]
