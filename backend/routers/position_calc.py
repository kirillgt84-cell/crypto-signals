"""
Position Calculator — Pro-only trading tool.
Concept: leverage auto-calculated so liquidation lands at stop ± buffer.
"""
import math
from typing import Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/position-calc", tags=["position-calc"])

MAX_EXCHANGE_LEVERAGE = 125


class PositionCalcRequest(BaseModel):
    direction: Literal["long", "short"]
    portfolio_balance: float = Field(gt=0)
    risk_type: Literal["percent", "fixed"]
    risk_value: float = Field(gt=0)
    entry_price: float = Field(gt=0)
    stop_price: float = Field(gt=0)
    buffer_pct: float = Field(default=5.0, ge=0, le=50)

    @field_validator("risk_value")
    @classmethod
    def validate_risk_value(cls, v: float, info) -> float:
        data = info.data
        if data.get("risk_type") == "percent" and v > 100:
            raise ValueError("risk_percent cannot exceed 100")
        if data.get("risk_type") == "fixed" and data.get("portfolio_balance") and v > data["portfolio_balance"]:
            raise ValueError("risk_amount cannot exceed portfolio_balance")
        return v

    @field_validator("stop_price")
    @classmethod
    def validate_stop_price(cls, v: float, info) -> float:
        data = info.data
        entry = data.get("entry_price")
        direction = data.get("direction")
        if entry is not None:
            if v == entry:
                raise ValueError("stop_price must differ from entry_price")
            if direction == "long" and v > entry:
                raise ValueError("for long positions stop_price must be below entry_price")
            if direction == "short" and v < entry:
                raise ValueError("for short positions stop_price must be above entry_price")
        return v


class PositionCalcResponse(BaseModel):
    quantity: float
    position_value: float
    margin: float
    allocation_pct: float
    leverage: float
    exchange_leverage: int
    liquidation_price: float
    risk_amount: float
    stop_distance: float
    buffer_pct: float
    max_leverage_exceeded: bool


def _calculate(req: PositionCalcRequest) -> PositionCalcResponse:
    # Risk amount in USD
    if req.risk_type == "percent":
        risk_amount = req.portfolio_balance * (req.risk_value / 100)
    else:
        risk_amount = req.risk_value

    # Stop distance
    if req.direction == "long":
        stop_distance = req.entry_price - req.stop_price
    else:
        stop_distance = req.stop_price - req.entry_price

    # Quantity
    quantity = risk_amount / stop_distance
    position_value = quantity * req.entry_price

    # Liquidation price based on buffer
    # buffer_pct=0  → liquidation = stop (aggressive, min margin)
    # buffer_pct=5  → stop is 5% above liquidation (safe)
    if req.buffer_pct > 0:
        buffer_mult = 1 + (req.buffer_pct / 100)
        if req.direction == "long":
            liquidation_price = req.stop_price / buffer_mult
        else:
            liquidation_price = req.stop_price / (2 - buffer_mult)
    else:
        liquidation_price = req.stop_price

    # Leverage: entry / distance_to_liquidation
    liq_distance = abs(req.entry_price - liquidation_price)
    leverage = req.entry_price / liq_distance if liq_distance > 0 else 0

    # Margin required
    margin = position_value / leverage if leverage > 0 else position_value

    # Exchange leverage with cap
    raw_exchange_leverage = max(1, math.ceil(leverage)) if leverage > 0 else 1
    exchange_leverage = min(raw_exchange_leverage, MAX_EXCHANGE_LEVERAGE)

    return PositionCalcResponse(
        quantity=round(quantity, 6),
        position_value=round(position_value, 2),
        margin=round(margin, 2),
        allocation_pct=round((position_value / req.portfolio_balance) * 100, 2),
        leverage=round(leverage, 1),
        exchange_leverage=exchange_leverage,
        liquidation_price=round(liquidation_price, 2),
        risk_amount=round(risk_amount, 2),
        stop_distance=round(stop_distance, 2),
        buffer_pct=req.buffer_pct,
        max_leverage_exceeded=raw_exchange_leverage > MAX_EXCHANGE_LEVERAGE,
    )


from core.tiers import require_tier

_require_starter = require_tier("starter")


@router.post("/calculate", response_model=PositionCalcResponse)
async def calculate_position(
    req: PositionCalcRequest,
    current_user: dict = Depends(_require_starter),
):
    return _calculate(req)


@router.get("/check-access")
async def check_access(current_user: dict = Depends(_require_starter)):
    """Quick check if user has access to the calculator."""
    tier = current_user.get("subscription_tier", "free")
    return {"has_access": True, "tier": tier}
