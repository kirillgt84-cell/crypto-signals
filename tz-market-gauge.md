# ТЗ: Market Gauge — Визуальный индикатор RSI + MACD

**Для:** Kimi VSCode  
**Проект:** Mirkaso (crypto-signals)  
**Статус:** Готово к реализации  
**Приоритет:** High  
**Время:** 4-6 часов

---

## Что строим

Компактная карточка 350×280px для дашборда `/app` с:
1. RSI полукруглый gauge (0-100)
2. MACD mini histogram (5 баров + тренд)
3. Нейтральная интерпретация ситуации
4. Уверенность 1-5

---

## Backend

### 1. Новый endpoint: `GET /api/v1/market/gauge`

**Файл:** `backend/routers/market.py`

**Параметры:**
- `symbol`: str, default "BTCUSDT"
- `timeframe`: str, enum ["1h", "4h", "1d"], default "1h"

**Access:**
- **All tiers** — Market Gauge доступен для Starter, Trader, Investor
- Starter (Free): delay 15m, только BTCUSDT, только 1H
- Trader: real-time, BTC/ETH/SOL, 1H/4H/1D
- Investor: real-time + divergence detection (v2)

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1h",
  "timestamp": "2026-04-26T14:30:00Z",
  "rsi": {
    "value": 34.2,
    "zone": "oversold",
    "label": "ПЕРЕПРОДАН"
  },
  "macd": {
    "trend": "bull",
    "histogram": [0.5, 0.8, 1.2, 1.5, 1.8],
    "momentum": "increasing"
  },
  "signal": {
    "type": "consider_longs",
    "label": "Рассматривать лонги",
    "strength": 4,
    "description": "RSI в зоне перепроданности, MACD: бычье пересечение с ростом гистограммы"
  },
  "divergence": null
}
```

**Функции для добавления:**
```python
def get_rsi_zone(value: float) -> str:
    if value < 30: return "oversold"
    if value > 70: return "overbought"
    return "neutral"

def get_rsi_label(value: float) -> str:
    if value < 30: return "ПЕРЕПРОДАН"
    if value < 45: return "БЛИЗКО К ПЕРЕПРОДАННОСТИ"
    if value < 55: return "НЕЙТРАЛЬНО"
    if value < 70: return "БЛИЗКО К ПЕРЕКУПЛЕННОСТИ"
    return "ПЕРЕКУПЛЕН"

def calculate_gauge_signal(rsi: float, macd_trend: str, macd_momentum: str) -> dict:
    """
    НЕЙТРАЛЬНЫЕ формулировки — не рекомендуют действие,
    описывают ситуацию для принятия решения трейдером.
    """
    if rsi < 30 and macd_trend == "bull" and macd_momentum == "increasing":
        return {
            "type": "consider_longs",
            "label": "Рассматривать лонги",
            "strength": 5 if rsi < 20 else 4,
            "description": "RSI перепродан, импульс разворачивается. Возможен отскок"
        }
    elif rsi < 30 and macd_trend == "bear":
        return {
            "type": "await_bounce",
            "label": "Вероятна коррекция",
            "strength": 2,
            "description": "Перепроданность без подтверждения импульса. Дождаться разворота MACD"
        }
    elif rsi < 45 and macd_trend == "bull":
        return {
            "type": "consider_longs",
            "label": "Рассматривать лонги",
            "strength": 3,
            "description": "Накопление. Слабый RSI при бычьем импульсе"
        }
    elif 45 <= rsi <= 55:
        return {
            "type": "neutral",
            "label": "Нейтрально",
            "strength": 1,
            "description": "Боковик. Нет выраженного преимущества"
        }
    elif rsi > 55 and macd_trend == "bear":
        return {
            "type": "consider_shorts",
            "label": "Рассматривать шорты",
            "strength": 3,
            "description": "Распределение. Сильный RSI при медвежьем импульсе"
        }
    elif rsi > 70 and macd_trend == "bear" and macd_momentum == "decreasing":
        return {
            "type": "consider_shorts",
            "label": "Рассматривать шорты",
            "strength": 5 if rsi > 80 else 4,
            "description": "RSI перекуплен, импульс разворачивается. Возможна коррекция"
        }
    elif rsi > 70 and macd_trend == "bull":
        return {
            "type": "await_correction",
            "label": "Вероятна коррекция",
            "strength": 2,
            "description": "Перекупленность без подтверждения. Дождаться разворота MACD"
        }
    else:
        return {
            "type": "neutral",
            "label": "Нейтрально",
            "strength": 2,
            "description": "Индикаторы не дают четкой картины"
        }
```

**v2 divergence (для Investor tier):**
```python
def check_divergence(prices: list, rsi_values: list, window: int = 20) -> dict:
    """
    Проверяет дивергенцию на последних N свечах.
    Возвращает: {"type": "bullish|bearish|null", "description": str}
    """
    # Bullish: price lower low, RSI higher low
    # Bearish: price higher high, RSI lower high
    pass
```

---

## Frontend

### 2. Компонент: `frontend/app/components/MarketGauge.tsx`

**Props:**
```typescript
interface MarketGaugeProps {
  symbol?: string;      // default "BTCUSDT"
  timeframe?: string;   // default "1h"
  className?: string;
}
```

**State:**
- `data: GaugeData | null`
- `loading: boolean`
- `symbol: string`
- `timeframe: string`
- `lastUpdate: Date`

**Импорты:**
```typescript
import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "@/app/lib/api";
```

**Auto-refresh:** `setInterval` 60 секунд. Очищать при unmount.

---

### 3. Подкомпонент: `RSIGauge`

**Props:** `{ value: number; label: string }`

**Визуал:** SVG полукруг 140×80px
- Фоновая дуга: stroke="#222", strokeWidth="12"
- Зоны (дуги разного цвета):
  - 0-30: `#22c55e` (зеленый)
  - 30-45: `#86efac` (светло-зеленый)
  - 45-55: `#6b7280` (серый)
  - 55-70: `#fca5a5` (светло-красный)
  - 70-100: `#ef4444` (красный)
- Стрелка (line): белая, от центра к текущему углу
- Угол: `angle = (value / 100) * 180` градусов
- Точки стрелки:
  - center: (70, 80)
  - end: `(70 + 50 * cos(PI - angle*PI/180), 80 - 50 * sin(PI - angle*PI/180))`

**Текст поверх:**
- Значение: `Math.round(value)`, text-2xl, font-bold
- Лейбл: `{label}`, text-xs, text-gray-400

---

### 4. Подкомпонент: `MACDGauge`

**Props:** `{ trend: "bull" | "bear"; histogram: number[]; momentum: string }`

**Визуал:**
- 5 вертикальных bar-ов (max-height 40px)
- Цвет bar: зеленый если значение > 0, красный если < 0
- Высота: `Math.abs(val) / maxVal * 40`
- Подпись: "BULL" (зеленый) или "BEAR" (красный)
- Стрелка: ▲ если momentum === "increasing", ▼ если "decreasing"

---

### 5. Блок интерпретации

**Цвет фона (getSignalColor):**
```typescript
const getSignalColor = (type: string) => {
  if (type.startsWith("consider_longs")) return "bg-green-900/30 border border-green-700/50";
  if (type.startsWith("consider_shorts")) return "bg-red-900/30 border border-red-700/50";
  if (type.startsWith("await_")) return "bg-yellow-900/30 border border-yellow-700/50";
  return "bg-gray-800/50 border border-gray-700/50";
};
```

**Элементы:**
1. `label`: text-sm, font-semibold, белый
2. Уверенность: "Уверенность: ●●●●○" (заполненные + пустые круги)
3. `description`: text-xs, opacity-80, 2 строки максимум

---

### 6. Хедер карточки

```
┌─────────────────────────────────┐
│ BTCUSDT    ▼        1H    ▼     │
│ (select)             (select)    │
└─────────────────────────────────┘
```

- Select symbol: BTCUSDT, ETHUSDT, SOLUSDT (пока)
- Select timeframe: 1H, 4H, 1D
- Style: bg-transparent, text-sm, border-none

---

## Макет полной карточки

```
┌─────────────────────────────────┐  ← 350×280px
│ BTCUSDT         ▼    1H    ▼    │  ← header, h-10
├─────────────────────────────────┤
│                                 │
│  ╭──────╮        ╭──────╮       │  ← gauges row
│ ╱  RSI   ╲      ╱ MACD  ╲      │  ← RSIGauge + MACDGauge
│ │   34    │     │  BULL   │     │
│  ╲   ▲   ╱       ╲ ▲▲▲  ╱      │
│   ╰──────╯        ╰──────╯       │
│  ПЕРЕПРОДАН      РОСТ           │  ← labels
│                                 │
├─────────────────────────────────┤
│ 🟢 РАССМАТРИВАТЬ ЛОНГИ          │  ← interpretation block
│ Уверенность: ●●●●○              │
│ RSI в зоне перепроданности      │
│ MACD: бычье пересечение         │
└─────────────────────────────────┘
```

**Container:**
- bg: `#0A0B0D` (или `bg-[#0A0B0D]`)
- border: `1px solid #222`
- borderRadius: `xl` (12px)
- padding: `p-4` (16px)
- width: `350px`
- height: `280px` (или auto)

---

## Интеграция в дашборд

### 7. Страница `/app`

**Файл:** `frontend/app/app/AppClient.tsx` или `frontend/app/app/page.tsx`

**Размещение:**
- Верхний ряд дашборда
- Первая позиция слева (если сетка)
- Или фиксированная позиция над графиками

**Tier logic:**
```typescript
// В AppClient.tsx
<div className="dashboard-grid">
  <MarketGauge />  // всегда показываем
  
  {/* остальные виджеты */}
</div>

// Для Free tier:
if (tier === "starter") {
  // Показывать gauge с delay 15m
  // Добавить overlay: "Upgrade to Trader for real-time"
}
```

---

## Tier-specific поведение

| | Free (Starter) | Trader | Investor |
|---|---|---|---|
| **Доступ** | ✅ Да | ✅ Да | ✅ Да |
| **Данные** | Delay 15m (кэш) | Real-time | Real-time |
| **Активы** | BTCUSDT only | BTC, ETH, SOL | Все + мультивиджет |
| **Таймфреймы** | 1H only | 1H, 4H, 1D | 1H, 4H, 1D, 1W |
| **Дивергенции** | ❌ | ❌ | ✅ (v2) |
| **Overlay** | "Upgrade to Trader" | None | None |

---

## v2 Enhancements (после базовой версии)

1. **Divergence detection**
   - Проверка на последних 20 свечах
   - Bullish: price lower low, RSI higher low
   - Bearish: price higher high, RSI lower high
   - Вывод: "Дивергенция: возможен отскок" / "Дивергенция: возможна коррекция"

2. **Multi-asset view (Investor)**
   - 4 карточки в ряд: BTC, ETH, SOL, общий рынок
   - Сравнение уверенности

3. **Alert on signal change**
   - Когда "Нейтрально" → "Рассматривать лонги"
   - Push notification или toast

4. **Historical gauge**
   - Sparkline изменения уверенности за 24h

---

## Порядок реализации

1. **Backend** (1-1.5ч):
   - Добавить `calculate_gauge_signal()` и endpoint в `market.py`
   - Тест через Swagger/curl

2. **RSIGauge component** (1ч):
   - SVG полукруг, стрелка, цветные зоны
   - Проверить на 0, 50, 100

3. **MACDGauge component** (0.5ч):
   - 5 bar-ов, цвет, тренд

4. **MarketGauge container** (1ч):
   - Хедер, layout, fetch, auto-refresh

5. **Интеграция в /app** (0.5ч):
   - Добавить в AppClient.tsx
   - Tier logic (Free vs Trader)

6. **Тестирование** (0.5ч):
   - Разные значения RSI/MACD
   - Проверить все 8 интерпретаций
   - Проверить mobile responsive

---

## Важные замечания

### Нейтральность формулировок (критично)
НИКОГДА не использовать:
- ❌ "КУПИТЬ" / "ПРОДАТЬ"
- ❌ "СИГНАЛ ЛОНГ" / "СИГНАЛ ШОРТ"
- ❌ "ВХОД" / "ВЫХОД"
- ❌ "ОБЯЗАТЕЛЬНО"

Использовать:
- ✅ "Рассматривать лонги"
- ✅ "Рассматривать шорты"
- ✅ "Вероятна коррекция"
- ✅ "Возможен отскок"
- ✅ "Нейтрально"

### Ответственность
Это аналитический инструмент. Пользователь сам принимает решение.
Добавить мелким шрифтом внизу карточки: "Не является инвестиционной рекомендацией".

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `backend/routers/market.py` | Добавить `/gauge` endpoint + helper функции |
| `frontend/app/components/MarketGauge.tsx` | Создать (новый) |
| `frontend/app/components/RSIGauge.tsx` | Создать (новый) |
| `frontend/app/components/MACDGauge.tsx` | Создать (новый) |
| `frontend/app/app/AppClient.tsx` | Импортировать и разместить MarketGauge |
| `frontend/app/lib/api.ts` | Убедиться что `API_BASE_URL` экспортируется |

---

Готово. Начинай с backend endpoint, затем компоненты gauge, потом сборка в MarketGauge.
