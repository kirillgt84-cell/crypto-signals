from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Literal
from datetime import datetime
from enum import Enum

class CurveShape(str, Enum):
    NORMAL = "normal"
    FLAT = "flat"
    INVERTED = "inverted"
    HUMPED = "humped"

class SignalLevel(str, Enum):
    INFO = "info"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"

class YieldPoint(BaseModel):
    tenor: str = Field(..., description="Срок (3M, 2Y, 5Y, 10Y, 30Y)")
    yield_pct: float = Field(..., description="Доходность в процентах")
    timestamp: datetime

class YieldSpreads(BaseModel):
    timestamp: datetime
    spread_10y_2y: float = Field(..., alias="10Y_2Y")
    spread_10y_3m: float = Field(..., alias="10Y_3M")
    spread_5y_2y: float = Field(..., alias="5Y_2Y")
    spread_30y_10y: float = Field(..., alias="30Y_10Y")
    shape: CurveShape
    is_inverted_10y2y: bool
    is_inverted_10y3m: bool
    inversion_duration_days: Optional[int] = None
    
    class Config:
        populate_by_name = True

class RecessionProbability(BaseModel):
    timestamp: datetime
    probability_12m: float = Field(..., ge=0, le=100)
    spread_used: float
    model: str = "NY Fed Logistic"
    confidence: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"]
    historical_accuracy: float = 85.0

class Signal(BaseModel):
    id: str
    timestamp: datetime
    level: SignalLevel
    category: Literal["YIELD_CURVE", "RECESSION", "MARKET_REGIME", "ANALOG"]
    title: str
    message: str
    metrics: Dict[str, float]
    historical_precedent: Optional[str]
    recommended_action: Optional[str]
    is_active: bool = True
