"""
Crypto Metrics Router — Capital Flow Analysis (BTC / ALT / STABLE)
MVP: current snapshot + phase detection + signal + interpretation
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/crypto-metrics", tags=["crypto-metrics"])

# In-memory cache with TTL
_cache: dict = {}
_cache_time: Optional[datetime] = None
CACHE_TTL_SECONDS = 300  # 5 minutes

# Stablecoin CoinGecko IDs for market-cap summation
_STABLECOIN_IDS = [
    "tether",
    "usd-coin",
    "dai",
    "first-digital-usd",
    "usdd",
    "frax",
    "true-usd",
    "paxos-standard",
]


class DominanceData(BaseModel):
    btc: float
    alt: float
    stable: float


class FlowData(BaseModel):
    btc_to_alt: bool
    alt_to_btc: bool
    crypto_to_stable: bool
    stable_to_btc: bool


class SignalData(BaseModel):
    type: str  # BUY_BTC | BUY_ALTS | MOVE_TO_STABLES | HOLD
    strength: str  # weak | medium | strong


class HistoricalMatch(BaseModel):
    period: str
    similarity: float


class MarketStateResponse(BaseModel):
    btc_dominance: float
    alt_dominance: float
    stable_dominance: float
    total_market_cap_usd: float
    btc_market_cap_usd: float
    stable_market_cap_usd: float
    alt_market_cap_usd: float
    phase: str
    phase_description: str
    flows: FlowData
    signal: SignalData
    interpretation: str
    historical_match: Optional[HistoricalMatch] = None
    updated_at: str


async def _fetch_coingecko_global() -> dict:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get("https://api.coingecko.com/api/v3/global")
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.warning("CoinGecko global fetch failed, returning empty fallback")
        return {"data": {}}


async def _fetch_stablecoin_mcaps() -> float:
    ids_param = ",".join(_STABLECOIN_IDS)
    url = (
        "https://api.coingecko.com/api/v3/coins/markets"
        f"?vs_currency=usd&ids={ids_param}&per_page=250"
    )
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MirkasoBot/1.0)"}
    
    # Try primary endpoint with retries
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                coins = resp.json()
                total = sum(c.get("market_cap", 0) or 0 for c in coins)
                if total > 0:
                    return total
        except Exception:
            logger.warning(f"CoinGecko stablecoin markets fetch failed (attempt {attempt + 1})")
        import asyncio
        await asyncio.sleep(1.5 * (attempt + 1))
    
    # Fallback: try category endpoint
    try:
        fallback_url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=stablecoins&per_page=250"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(fallback_url, headers=headers)
            resp.raise_for_status()
            coins = resp.json()
            total = sum(c.get("market_cap", 0) or 0 for c in coins)
            if total > 0:
                return total
    except Exception:
        logger.warning("CoinGecko stablecoin category fallback also failed")
    
    # Last resort: hardcoded approximate total stablecoin mcap (~$170B as of 2025)
    logger.warning("Using hardcoded stablecoin mcap fallback")
    return 170_000_000_000.0


def _detect_phase(btc_d: float, stable_d: float, alt_d: float) -> tuple[str, str]:
    """
    Phase detection based on dominance levels.
    Returns (phase_key, description).
    """
    # Simplified heuristics for MVP
    if stable_d > 0.18:
        return (
            "RISK_OFF",
            "Stablecoin dominance is elevated. Capital is fleeing risk assets. Historically this precedes or accompanies market corrections.",
        )
    if btc_d > 0.52 and stable_d < 0.12:
        return (
            "BTC_EXPANSION",
            "Bitcoin dominates while stablecoins shrink. This is typical of early bull phases where BTC leads the market.",
        )
    if btc_d < 0.45 and alt_d > 0.45 and stable_d < 0.12:
        return (
            "ALTSEASON",
            "Altcoins are gaining dominance while BTC retreats. Capital is rotating from BTC into higher-beta assets.",
        )
    if btc_d > 0.48 and stable_d < 0.12:
        return (
            "BTC_ACCUMULATION",
            "BTC dominance is rising gradually. Smart money often accumulates BTC before broader alt rallies.",
        )
    if btc_d < 0.50 and stable_d > 0.12:
        return (
            "DISTRIBUTION",
            "Bitcoin dominance is falling while stablecoins grow. This can signal profit-taking and preparation for lower prices.",
        )
    return (
        "TRANSITION",
        "The market is in a transitional phase. No clear dominance trend is dominant — wait for confirmation.",
    )


def _detect_flows(
    btc_d: float, stable_d: float, alt_d: float
) -> FlowData:
    # For MVP we use absolute thresholds as proxy for flow direction
    # In V2 these will be derived from 7-day deltas
    return FlowData(
        btc_to_alt=(btc_d < 0.46 and alt_d > 0.42),
        alt_to_btc=(btc_d > 0.50 and alt_d < 0.40),
        crypto_to_stable=(stable_d > 0.15),
        stable_to_btc=(btc_d > 0.50 and stable_d < 0.12),
    )


def _generate_signal(
    phase: str, flows: FlowData
) -> SignalData:
    if phase == "ALTSEASON" or flows.btc_to_alt:
        return SignalData(type="BUY_ALTS", strength="strong" if phase == "ALTSEASON" else "medium")
    if phase == "BTC_EXPANSION" or flows.stable_to_btc:
        return SignalData(type="BUY_BTC", strength="strong" if phase == "BTC_EXPANSION" else "medium")
    if phase == "RISK_OFF" or flows.crypto_to_stable:
        return SignalData(type="MOVE_TO_STABLES", strength="strong" if phase == "RISK_OFF" else "medium")
    if phase == "BTC_ACCUMULATION":
        return SignalData(type="BUY_BTC", strength="medium")
    if phase == "DISTRIBUTION":
        return SignalData(type="MOVE_TO_STABLES", strength="weak")
    return SignalData(type="HOLD", strength="weak")


def _generate_interpretation(
    phase: str, btc_d: float, stable_d: float, alt_d: float, signal: SignalData
) -> str:
    parts = []
    if phase == "BTC_EXPANSION":
        parts.append(
            f"Bitcoin captures {btc_d:.1%} of total market cap while stablecoins shrink to {stable_d:.1%}. "
            "This pattern historically marks early-stage bull markets where BTC outperforms alts."
        )
    elif phase == "ALTSEASON":
        parts.append(
            f"Altcoins now represent {alt_d:.1%} of the market as BTC dominance fades to {btc_d:.1%}. "
            "Capital is rotating into higher-risk assets — a classic altseason signature."
        )
    elif phase == "RISK_OFF":
        parts.append(
            f"Stablecoin dominance has climbed to {stable_d:.1%}. "
            "Investors are moving to the sidelines. This often coincides with macro uncertainty or local tops."
        )
    elif phase == "BTC_ACCUMULATION":
        parts.append(
            f"BTC dominance at {btc_d:.1%} is rising while altcoin share is compressed. "
            "Institutional and smart-money accumulation typically precedes the next leg up."
        )
    elif phase == "DISTRIBUTION":
        parts.append(
            f"Bitcoin dominance is declining ({btc_d:.1%}) while stablecoins grow ({stable_d:.1%}). "
            "Profit-taking is underway — capital is moving to safety."
        )
    else:
        parts.append(
            f"Market is mixed: BTC {btc_d:.1%}, alts {alt_d:.1%}, stables {stable_d:.1%}. "
            "No dominant trend is visible yet."
        )

    # Action sentence
    if signal.type == "BUY_BTC":
        parts.append("Action: overweight BTC relative to alts.")
    elif signal.type == "BUY_ALTS":
        parts.append("Action: consider increasing altcoin exposure.")
    elif signal.type == "MOVE_TO_STABLES":
        parts.append("Action: reduce risk exposure and build stablecoin reserves.")
    else:
        parts.append("Action: maintain current allocation and wait for clearer direction.")

    return " ".join(parts)


def _find_historical_match(phase: str) -> Optional[HistoricalMatch]:
    # MVP: static analogs based on phase
    analogs = {
        "BTC_EXPANSION": HistoricalMatch(period="2020 Q4 — BTC broke $20K, alt dominance compressed", similarity=0.72),
        "ALTSEASON": HistoricalMatch(period="2021 Q1 — DeFi summer, ETH and alts surged", similarity=0.68),
        "RISK_OFF": HistoricalMatch(period="2022 May — Terra collapse, flight to stables", similarity=0.65),
        "BTC_ACCUMULATION": HistoricalMatch(period="2023 Q1 — post-FTX recovery, BTC led the bounce", similarity=0.70),
        "DISTRIBUTION": HistoricalMatch(period="2021 Nov — BTC ATH, rotation to stables began", similarity=0.60),
    }
    return analogs.get(phase)


async def _compute_market_state() -> MarketStateResponse:
    global_data = await _fetch_coingecko_global()
    data = global_data.get("data") or {}

    total_mcap = (data.get("total_market_cap") or {}).get("usd") or 0
    if total_mcap <= 0:
        raise ValueError("Invalid total market cap from CoinGecko")

    market_cap_pct = data.get("market_cap_percentage") or {}
    btc_mcap_pct = ((market_cap_pct.get("btc") or 0) / 100) if market_cap_pct else 0.0
    btc_mcap = total_mcap * btc_mcap_pct

    stable_mcap = await _fetch_stablecoin_mcaps()
    stable_d = stable_mcap / total_mcap if total_mcap else 0.0
    alt_d = max(0.0, 1.0 - btc_mcap_pct - stable_d)
    # Normalize if sum != 1 due to data gaps
    total_d = btc_mcap_pct + stable_d + alt_d
    if total_d > 0:
        btc_mcap_pct = btc_mcap_pct / total_d
        stable_d = stable_d / total_d
        alt_d = alt_d / total_d

    phase, phase_desc = _detect_phase(btc_mcap_pct, stable_d, alt_d)
    flows = _detect_flows(btc_mcap_pct, stable_d, alt_d)
    signal = _generate_signal(phase, flows)
    interpretation = _generate_interpretation(phase, btc_mcap_pct, stable_d, alt_d, signal)
    historical = _find_historical_match(phase)

    return MarketStateResponse(
        btc_dominance=round(btc_mcap_pct, 4),
        alt_dominance=round(alt_d, 4),
        stable_dominance=round(stable_d, 4),
        total_market_cap_usd=round(total_mcap, 0),
        btc_market_cap_usd=round(btc_mcap, 0),
        stable_market_cap_usd=round(stable_mcap, 0),
        alt_market_cap_usd=round(total_mcap - btc_mcap - stable_mcap, 0),
        phase=phase,
        phase_description=phase_desc,
        flows=flows,
        signal=signal,
        interpretation=interpretation,
        historical_match=historical,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/market-state", response_model=MarketStateResponse)
async def get_market_state():
    global _cache, _cache_time
    now = datetime.now(timezone.utc)
    if _cache_time and (now - _cache_time).total_seconds() < CACHE_TTL_SECONDS:
        return _cache

    try:
        state = await _compute_market_state()
    except Exception as exc:
        logger.exception("Failed to compute crypto metrics market state")
        # Return cached stale data if available
        if _cache:
            return _cache
        # Return fallback placeholder so the UI doesn't crash
        return MarketStateResponse(
            btc_dominance=0.0,
            alt_dominance=0.0,
            stable_dominance=0.0,
            total_market_cap_usd=0,
            btc_market_cap_usd=0,
            stable_market_cap_usd=0,
            alt_market_cap_usd=0,
            phase="UNKNOWN",
            phase_description="Market data is temporarily unavailable. Please try again later.",
            flows=FlowData(btc_to_alt=False, alt_to_btc=False, crypto_to_stable=False, stable_to_btc=False),
            signal=SignalData(type="HOLD", strength="weak"),
            interpretation="Market data is currently unavailable. Please wait a few minutes and refresh.",
            historical_match=None,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    _cache = state
    _cache_time = now
    return state
