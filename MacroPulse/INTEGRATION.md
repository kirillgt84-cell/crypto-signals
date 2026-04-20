# Интеграция Yield Curve Intelligence в существующий проект

## Быстрая установка через Kimi Extension

### Шаг 1: Скачивание файлов

В VSCode с Kimi Extension выполни:

```
@Kimi скопируй yield curve модуль в мой проект
```

Или скачай вручную из:
```
/projects/yield-curve-intelligence/backend/app/
```

### Шаг 2: Копирование файлов

**Структура для копирования:**

```
ТВОЙ_ПРОЕКT/
├── app/
│   ├── services/
│   │   ├── fred_client.py          ← НОВОЕ (Yield Curve API)
│   │   ├── pattern_engine.py       ← НОВОЕ (Исторические аналоги)
│   │   ├── cross_market.py         ← НОВОЕ (Cross-market анализ)
│   │   ├── telegram.py             ← НОВОЕ (Алерты)
│   │   └── macro_data.py           ← НОВОЕ (Интеграция с твоим Macro)
│   ├── models/
│   │   ├── yield_curve.py          ← НОВОЕ (Pydantic модели)
│   │   └── unified_state.py        ← НОВОЕ (Unified dashboard)
│   └── main.py                     ← ОБНОВИТЬ (добавить роутеры)
```

### Шаг 3: Установка зависимостей

```bash
pip install aiohttp numpy pandas
```

### Шаг 4: Настройка окружения

Добавь в `.env`:

```env
# FRED API (уже есть ключ)
FRED_API_KEY=44fd19414c58a4227405bd187b743d1e

# Telegram (опционально)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Шаг 5: Интеграция роутеров

В твоём `main.py` добавь:

```python
from app.services.fred_client import FREDClient, YieldCurveCalculator
from app.services.pattern_engine import get_pattern_engine, MarketState
from app.services.cross_market import get_cross_market_analyzer

# Инициализация в lifespan
fred_client = FREDClient()
pattern_engine = get_pattern_engine()
cross_market = get_cross_market_analyzer()

# Новые эндпоинты
@app.get("/api/v1/yield-curve/current")
@app.get("/api/v1/analogs")
@app.get("/api/v1/cross-market/signal")
@app.get("/api/v1/dashboard")  # Unified
```

### Шаг 6: Проверка

```bash
curl http://localhost:8000/api/v1/dashboard
```

## Файлы для скачивания

### Обязательные (core)

| Файл | Размер | Назначение |
|------|--------|------------|
| `services/fred_client.py` | 6.4 KB | FRED API + расчёты |
| `services/pattern_engine.py` | 18 KB | Исторические аналоги |
| `services/cross_market.py` | 12.7 KB | Cross-market сигналы |
| `models/yield_curve.py` | 3.1 KB | Pydantic модели |
| `models/unified_state.py` | 3.3 KB | Unified state |

### Опциональные

| Файл | Назначение |
|------|------------|
| `services/telegram.py` | Алерты в Telegram |
| `services/macro_data.py` | Интеграция с твоим Macro модулем |

## API Endpoints после интеграции

```
# Существующие (твои)
GET /api/v1/macro/latest
GET /api/v1/macro/correlations

# Новые (Yield Curve)
GET /api/v1/yield-curve/current
GET /api/v1/yield-curve/spreads
GET /api/v1/yield-curve/recession-probability

# Новые (Analysis)
GET /api/v1/analogs
GET /api/v1/cross-market/signal

# Unified (всё вместе)
GET /api/v1/dashboard
```

## Пример использования

```python
import requests

# Полный dashboard
response = requests.get("http://localhost:8000/api/v1/dashboard")
data = response.json()

# Доступ к данным
yield_curve = data["yield_curve"]
recession_prob = data["recession"]["probability_12m"]
top_analog = data["historical_analogs"]["top_match"]
regime = data["market_regime"]["regime"]
```

## Интеграция с Frontend

Твой frontend может использовать:

```typescript
// Unified endpoint
const dashboard = await fetch('/api/v1/dashboard').then(r => r.json());

// Или отдельные
const yieldCurve = await fetch('/api/v1/yield-curve/current');
const analogs = await fetch('/api/v1/analogs');
const macro = await fetch('/api/v1/macro/latest'); // твой существующий
```

## Troubleshooting

**Ошибка: FRED API не работает**
- Проверь `.env` файл
- Ключ: `44fd19414c58a4227405bd187b743d1e`

**Ошибка: CORS**
- Убедись что CORS middleware включён

**Ошибка: Module not found**
- Установи зависимости: `pip install aiohttp numpy pandas`

## Поддержка

Если что-то не работает — пиши в чат, разберёмся.
