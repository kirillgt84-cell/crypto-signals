"""
Position Calculator — Pro-only trading tool.
Calculates position size, leverage, and allocation based on risk parameters.
"""
from typing import Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/position-calc", tags=["position-calc"])


class PositionCalcRequest(BaseModel):
    direction: Literal["long", "short"]
    portfolio_balance: float = Field(gt=0)
    risk_type: Literal["percent", "fixed"]
    risk_value: float = Field(gt=0)
    entry_price: float = Field(gt=0)
    stop_price: float = Field(gt=0)

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
    allocation: float
    leverage: float
    risk_amount: float
    stop_distance: float


def _calculate(req: PositionCalcRequest) -> PositionCalcResponse:
    # Risk amount
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

    # Position value
    position_value = quantity * req.entry_price

    # Leverage
    leverage = position_value / req.portfolio_balance if req.portfolio_balance > 0 else 0

    return PositionCalcResponse(
        quantity=round(quantity, 6),
        position_value=round(position_value, 2),
        allocation=round(position_value, 2),
        leverage=round(leverage, 1),
        risk_amount=round(risk_amount, 2),
        stop_distance=round(stop_distance, 2),
    )


def _require_pro(current_user: dict):
    tier = current_user.get("subscription_tier", "free")
    if tier not in ("pro", "admin"):
        raise HTTPException(status_code=403, detail="Pro subscription required")


@router.post("/calculate", response_model=PositionCalcResponse)
async def calculate_position(
    req: PositionCalcRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_pro(current_user)
    return _calculate(req)


@router.get("/check-access")
async def check_access(current_user: dict = Depends(get_current_user)):
    """Quick check if user has Pro access to the calculator."""
    tier = current_user.get("subscription_tier", "free")
    return {"has_access": tier in ("pro", "admin"), "tier": tier}
