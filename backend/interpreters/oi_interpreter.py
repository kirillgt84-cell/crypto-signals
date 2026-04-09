"""
Расширенная логика интерпретации OI с учетом объема
"""

def interpret_oi_advanced(
    oi_change_pct: float,
    price_change_pct: float,
    volume_change_pct: float
) -> dict:
    """
    Расширенная логика с тремя переменными
    
    Returns:
        dict: status, signal, description, action_recommendation
    """
    
    # Определяем направления
    oi_up = oi_change_pct > 1.0
    oi_down = oi_change_pct < -1.0
    oi_flat = not oi_up and not oi_down
    
    price_up = price_change_pct > 0.5
    price_down = price_change_pct < -0.5
    price_flat = not price_up and not price_down
    
    volume_up = volume_change_pct > 10  # Объем вырос более чем на 10%
    volume_flat = abs(volume_change_pct) <= 10
    
    # 1. OI растет, цена растет, объем растет
    if oi_up and price_up and volume_up:
        return {
            "status": "long_buildup",
            "signal": "strong_bullish",
            "strength": 5,
            "description": "OI↑ Цена↑ Объем↑ — Крупные игроки агрессивно накапливают лонги. Толпа шортит. Устойчивый восходящий тренд.",
            "action": "Рассматривать покупки (лонг) на откатах к EMA50",
            "color": "#22c55e"  # green-500
        }
    
    # 2. OI растет, цена падает, объем растет
    if oi_up and price_down and volume_up:
        return {
            "status": "short_buildup",
            "signal": "strong_bearish",
            "strength": 5,
            "description": "OI↑ Цена↓ Объем↑ — Крупные игроки распродают позицию толпе. Устойчивый нисходящий тренд.",
            "action": "Рассматривать продажи (шорт)",
            "color": "#ef4444"  # red-500
        }
    
    # 3. OI падает, цена растет (разгрузка)
    if oi_down and price_up:
        if volume_up:
            desc = "Разгрузка предыдущего падающего тренда. Умные деньги фиксируют прибыль по шортам."
            action = "Осторожно, возможен разворот. Не входить в лонг."
            signal = "caution_bullish"
        else:
            desc = "Разгрузка в конце восходящего движения. Крупные фиксируют прибыль по лонгам."
            action = "Рассмотреть продажи (шорт) при слабости."
            signal = "weak_bearish"
        
        return {
            "status": "short_liquidation" if volume_up else "long_distribution",
            "signal": signal,
            "strength": 3,
            "description": f"OI↓ Цена↑ — {desc}",
            "action": action,
            "color": "#eab308"  # yellow-500
        }
    
    # 4. OI падает, цена падает
    if oi_down and price_down:
        if volume_up:
            desc = "Разгрузка в конце нисходящего движения. Крупные фиксируют прибыль по шортам."
            action = "Рассмотреть покупки (лонг) при признаках разворота."
            signal = "potential_bottom"
        else:
            desc = "Разгрузка предыдущего растущего тренда. Умные деньги фиксируют прибыль."
            action = "Осторожно, возможно продолжение падения."
            signal = "caution_bearish"
        
        return {
            "status": "long_liquidation" if volume_up else "short_distribution",
            "signal": signal,
            "strength": 3,
            "description": f"OI↓ Цена↓ — {desc}",
            "action": action,
            "color": "#f97316"  # orange-500
        }
    
    # 5. OI не меняется, цена в боковике
    if oi_flat and price_flat:
        return {
            "status": "accumulation",
            "signal": "neutral",
            "strength": 2,
            "description": "OI→ Цена↔ — Фаза накопления. Крупные игроки набирают позицию незаметно.",
            "action": "Ждать пробоя диапазона на повышенном объеме",
            "color": "#6b7280"  # gray-500
        }
    
    # 6. OI растет, цена боковик (накопление)
    if oi_up and price_flat:
        return {
            "status": "hidden_accumulation",
            "signal": "watchlist",
            "strength": 4,
            "description": "OI↑ Цена↔ — Скрытое накопление. Конфликт между быками и медведями.",
            "action": "Готовиться к пробою. Торговать в сторону пробоя.",
            "color": "#3b82f6"  # blue-500
        }
    
    # 7. OI падает, цена боковик (распределение)
    if oi_down and price_flat:
        return {
            "status": "hidden_distribution",
            "signal": "watchlist",
            "strength": 4,
            "description": "OI↓ Цена↔ — Фаза распределения. Перетекание позиций.",
            "action": "Предпочтительнее торговать в разворот тренда.",
            "color": "#8b5cf6"  # violet-500
        }
    
    # По умолчанию
    return {
        "status": "neutral",
        "signal": "neutral",
        "strength": 1,
        "description": "Нейтральная динамика. Недостаточно данных для интерпретации.",
        "action": "Ожидание четких сигналов",
        "color": "#9ca3af"  # gray-400
    }
