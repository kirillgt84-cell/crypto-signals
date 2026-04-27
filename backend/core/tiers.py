"""Centralized tier configuration and access control."""
from fastapi import HTTPException, Depends
from typing import Dict

TIER_ORDER = {
    "starter": 1,
    "trader": 2,
    "investor": 3,
    "admin": 3,
}

# Maps legacy and alias tiers to canonical tier names
TIER_ALIASES = {
    "free": "starter",
    "pro": "trader",
    "admin": "investor",
}

# Feature slug -> minimum required canonical tier
FEATURE_MATRIX: Dict[str, str] = {
    # Public / starter
    "position_calc": "starter",
    "newsletter": "starter",
    "referral_program": "starter",
    "promo_codes": "starter",
    "community_tg": "starter",
    "email_support": "starter",
    "response_time": "starter",
    "learn_articles": "starter",
    "faq_help": "starter",
    # Trader+
    "anomaly_scanner": "trader",
    "entry_levels": "trader",
    "fundamentals_card": "trader",
    "cvd_chart": "trader",
    "sentiment_panel": "trader",
    "raw_indicators": "trader",
    "signal_feed": "trader",
    "export_csv": "trader",
    "stablecoin_flows": "trader",
    "alerts_realtime": "trader",
    "portfolio_basic": "trader",
    "ai_insight_basic": "trader",
    "portfolio_metrics_basic": "trader",
    # Investor+
    "portfolio_full": "investor",
    "portfolio_metrics_full": "investor",
    "ai_insight_unlimited": "investor",
    "binance_sync": "investor",
    "risk_parity": "investor",
    "backtesting": "investor",
    "custom_models": "investor",
    "rebalancing_signals": "investor",
    "on_chain_metrics": "investor",
    "tradi_macro_full": "investor",
    "api_access": "investor",
    "alerts_digest": "investor",
    # Admin only
    "admin_panel": "admin",
}


def normalize_tier(tier: str) -> str:
    """Return canonical tier name."""
    if not tier:
        return "starter"
    t = tier.lower().strip()
    return TIER_ALIASES.get(t, t)


def tier_level(tier: str) -> int:
    """Return numeric level for a tier (higher = more access)."""
    return TIER_ORDER.get(normalize_tier(tier), 1)


def check_feature_access(tier: str, feature: str) -> bool:
    """Check if a tier can access a feature."""
    min_tier = FEATURE_MATRIX.get(feature)
    if not min_tier:
        # Unknown features default to open
        return True
    return tier_level(tier) >= tier_level(min_tier)


# Import here to avoid circular imports at module load time.
# routers.auth does NOT import this module, so this is safe.
from routers.auth import get_current_user  # noqa: E402


def require_tier(min_tier: str):
    """FastAPI dependency factory that guards endpoints by tier.

    Usage:
        @router.get("/protected")
        async def protected(user=Depends(require_tier("trader"))):
            ...
    """
    min_level = tier_level(min_tier)

    def _dependency(current_user: dict = Depends(get_current_user)) -> dict:
        user_tier = current_user.get("subscription_tier", "starter")
        if tier_level(user_tier) < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"{min_tier.capitalize()} subscription required",
            )
        return current_user

    return _dependency
