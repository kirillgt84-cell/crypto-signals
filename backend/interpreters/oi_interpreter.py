"""
Advanced OI interpretation logic with volume considerations
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
        dict: status, signal, description, action_recommendation
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
    volume_flat = abs(volume_change_pct) <= 10
    
    # 1. OI rising, price rising, volume rising (or flat)
    if oi_up and price_up:
        return {
            "status": "long_buildup",
            "signal": "strong_bullish",
            "strength": 5,
            "description": "OI↑ Price↑ Volume↑ — Smart money buying, crowd shorting.",
            "detailed": "Eventually the crowd will close shorts at stops, pushing price higher. Sustainable uptrend, strong market.",
            "action": "Consider long entries",
            "tactic": "Don't fight the trend. Wait for pullbacks to EMA20/50 to enter long.",
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
            "description": "OI↑ Price↓ Volume↑ — Smart money distributing to the crowd.",
            "detailed": "The crowd is buying, but soon they will be stopped out, pushing price even lower. Sustainable downtrend, strong market.",
            "action": "Consider short entries",
            "tactic": "Enter short on bounces to resistance. Don't catch a falling knife.",
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
                "description": "OI↓ Price↑ (Variant B) — Unwinding of previous downtrend.",
                "detailed": "Smart money taking profit on previous shorts, crowd covering losses. OI reversal coincides with correction beginning.",
                "action": "Consider long entries",
                "tactic": "Continuation of correction or reversal expected. Enter after breakout confirmation.",
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
                "description": "OI↓ Price↑ (Variant A) — Distribution at end of uptrend.",
                "detailed": "Big players taking profit, closing longs. Crowd closing sells at stops. Weak market.",
                "action": "Consider short entries",
                "tactic": "Decline expected. Do not enter long on this phase.",
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
                "description": "OI↓ Price↓ (Variant A) — Unwinding at end of downtrend.",
                "detailed": "Big players taking profit, closing shorts. Crowd closing buys at stops. Weak market, growth expected.",
                "action": "Consider long entries",
                "tactic": "Wait for reversal signs. Enter after bottom formation.",
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
                "description": "OI↓ Price↓ (Variant B) — Unwinding of previous uptrend.",
                "detailed": "OI reversal coincides with correction beginning. Smart money taking profit on previous longs, crowd covering losses.",
                "action": "Consider short entries",
                "tactic": "Continuation of correction or reversal expected. Don't buy the dip.",
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
            "description": "OI→ (flat) — Insufficient data for analysis.",
            "detailed": "OI stagnating. Further price movement uncertain. No analysis.",
            "action": "No trade",
            "tactic": "Wait for OI and price movement to form a signal.",
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
            "description": "OI↑ Price↔ — Accumulation phase underway.",
            "detailed": "Big players accumulating while price is flat. Conflict between bulls and bears.",
            "action": "Wait for range breakout",
            "tactic": "Wait for breakout on elevated volume and trade in its direction. If accumulation in trend - trade continuation. Range will become support/resistance zone.",
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
            "description": "OI↓ Price↔ — Distribution phase.",
            "detailed": "Big players distributing while price is flat. Positions flowing from pros to the crowd.",
            "action": "Wait for range boundary breakout",
            "tactic": "Prefer trading trend reversal. Range will become support/resistance after price exits.",
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
        "description": "NEUTRAL DYNAMICS - DEPLOY TEST.",
        "detailed": "Insufficient data for clear interpretation. Market in uncertainty.",
        "action": "No trade",
        "tactic": "Waiting for clear OI + Price + Volume pattern to form.",
        "color": "#9ca3af",  # gray-400
        "oi_change_pct": oi_change_pct,
        "price_change_pct": price_change_pct,
        "volume_change_pct": volume_change_pct
    }
