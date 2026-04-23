"""
Advanced OI interpretation logic with volume considerations
Returns i18n keys for all user-facing text.
"""

print("DEBUG: oi_interpreter loaded with change percentages support")


def interpret_oi_advanced(
    oi_change_pct: float,
    price_change_pct: float,
    volume_change_pct: float
) -> dict:
    """
    Advanced logic with three variables

    Returns:
        dict: status, signal, description (i18n key), detailed (i18n key),
              action (i18n key), tactic (i18n key)
    """
    print(f"DEBUG interpret: oi={oi_change_pct}, price={price_change_pct}, vol={volume_change_pct}")

    # Determine directions
    oi_up = oi_change_pct > 1.0
    oi_down = oi_change_pct < -1.0
    oi_flat = not oi_up and not oi_down

    price_up = price_change_pct > 0.5
    price_down = price_change_pct < -0.5
    price_flat = not price_up and not price_down

    volume_up = volume_change_pct > 10  # Volume increased more than 10%

    # 1. OI rising, price rising, volume rising (or flat)
    if oi_up and price_up:
        return {
            "status": "long_buildup",
            "signal": "strong_bullish",
            "strength": 5,
            "description": "oi.description.longBuildup",
            "detailed": "oi.detailed.longBuildup",
            "action": "oi.action.longBuildup",
            "tactic": "oi.tactic.longBuildup",
            "color": "#22c55e",  # green-500
            "oi_change_pct": oi_change_pct,
            "price_change_pct": price_change_pct,
            "volume_change_pct": volume_change_pct
        }

    # 2. OI rising, price falling, volume rising (or flat)
    if oi_up and price_down:
        return {
            "status": "short_buildup",
            "signal": "strong_bearish",
            "strength": 5,
            "description": "oi.description.shortBuildup",
            "detailed": "oi.detailed.shortBuildup",
            "action": "oi.action.shortBuildup",
            "tactic": "oi.tactic.shortBuildup",
            "color": "#ef4444",  # red-500
            "oi_change_pct": oi_change_pct,
            "price_change_pct": price_change_pct,
            "volume_change_pct": volume_change_pct
        }

    # 3. OI falling, price rising (unwinding) - Variant A & B
    if oi_down and price_up:
        if volume_up:
            # Variant B: Unwinding of previous downtrend
            return {
                "status": "short_covering",
                "signal": "caution_bullish",
                "strength": 3,
                "description": "oi.description.shortCovering",
                "detailed": "oi.detailed.shortCovering",
                "action": "oi.action.shortCovering",
                "tactic": "oi.tactic.shortCovering",
                "color": "#eab308",  # yellow-500
                "oi_change_pct": oi_change_pct,
                "price_change_pct": price_change_pct,
                "volume_change_pct": volume_change_pct
            }
        else:
            # Variant A: Distribution at end of uptrend
            return {
                "status": "long_distribution",
                "signal": "weak_bearish",
                "strength": 2,
                "description": "oi.description.longDistribution",
                "detailed": "oi.detailed.longDistribution",
                "action": "oi.action.longDistribution",
                "tactic": "oi.tactic.longDistribution",
                "color": "#f97316",  # orange-500
                "oi_change_pct": oi_change_pct,
                "price_change_pct": price_change_pct,
                "volume_change_pct": volume_change_pct
            }

    # 4. OI falling, price falling - Variant A & B
    if oi_down and price_down:
        if volume_up:
            # Variant A: Unwinding at end of downtrend
            return {
                "status": "short_covering_bottom",
                "signal": "potential_bottom",
                "strength": 3,
                "description": "oi.description.shortCoveringBottom",
                "detailed": "oi.detailed.shortCoveringBottom",
                "action": "oi.action.shortCoveringBottom",
                "tactic": "oi.tactic.shortCoveringBottom",
                "color": "#22c55e",  # green-500 (potential bottom)
                "oi_change_pct": oi_change_pct,
                "price_change_pct": price_change_pct,
                "volume_change_pct": volume_change_pct
            }
        else:
            # Variant B: Unwinding of previous uptrend
            return {
                "status": "long_distribution_cont",
                "signal": "caution_bearish",
                "strength": 2,
                "description": "oi.description.longDistributionCont",
                "detailed": "oi.detailed.longDistributionCont",
                "action": "oi.action.longDistributionCont",
                "tactic": "oi.tactic.longDistributionCont",
                "color": "#ef4444",  # red-500
                "oi_change_pct": oi_change_pct,
                "price_change_pct": price_change_pct,
                "volume_change_pct": volume_change_pct
            }

    # 5. OI flat
    if oi_flat:
        return {
            "status": "neutral",
            "signal": "neutral",
            "strength": 1,
            "description": "oi.description.neutral",
            "detailed": "oi.detailed.neutral",
            "action": "oi.action.neutral",
            "tactic": "oi.tactic.neutral",
            "color": "#9ca3af",  # gray-400
            "oi_change_pct": oi_change_pct,
            "price_change_pct": price_change_pct,
            "volume_change_pct": volume_change_pct
        }

    # 6. OI rising, price flat (accumulation)
    if oi_up and price_flat:
        return {
            "status": "accumulation_phase",
            "signal": "watchlist",
            "strength": 4,
            "description": "oi.description.accumulationPhase",
            "detailed": "oi.detailed.accumulationPhase",
            "action": "oi.action.accumulationPhase",
            "tactic": "oi.tactic.accumulationPhase",
            "color": "#3b82f6",  # blue-500
            "oi_change_pct": oi_change_pct,
            "price_change_pct": price_change_pct,
            "volume_change_pct": volume_change_pct
        }

    # 7. OI falling, price flat (distribution)
    if oi_down and price_flat:
        return {
            "status": "distribution_phase",
            "signal": "watchlist",
            "strength": 4,
            "description": "oi.description.distributionPhase",
            "detailed": "oi.detailed.distributionPhase",
            "action": "oi.action.distributionPhase",
            "tactic": "oi.tactic.distributionPhase",
            "color": "#8b5cf6",  # violet-500
            "oi_change_pct": oi_change_pct,
            "price_change_pct": price_change_pct,
            "volume_change_pct": volume_change_pct
        }

    # Default
    return {
        "status": "neutral",
        "signal": "neutral",
        "strength": 1,
        "description": "oi.description.default",
        "detailed": "oi.detailed.default",
        "action": "oi.action.default",
        "tactic": "oi.tactic.default",
        "color": "#9ca3af",  # gray-400
        "oi_change_pct": oi_change_pct,
        "price_change_pct": price_change_pct,
        "volume_change_pct": volume_change_pct
    }
