# Kimi Extension для VSCode — Интеграция

## Быстрый старт (3 клика)

### Способ 1: Через чат с Kimi

В VSCode открой чат с Kimi и напиши:

```
@Kimi интегрируй yield curve модуль из /projects/yield-curve-intelligence в мой проект
```

Kimi автоматически:
1. Проанализирует структуру твоего проекта
2. Скопирует нужные файлы
3. Добавит импорты в main.py
4. Обновит .env

### Способ 2: Через Command Palette

1. `Ctrl+Shift+P` → "Kimi: Copy Files"
2. Выбери исходную директорию: `/projects/yield-curve-intelligence/backend/app`
3. Выбери целевую директорию: `ТВОЙ_ПРОЕКТ/app`

### Способ 3: Ручное копирование

```bash
# Клонируй или скачай файлы
cp -r /projects/yield-curve-intelligence/backend/app/services/* твой_проект/app/services/
cp -r /projects/yield-curve-intelligence/backend/app/models/* твой_проект/app/models/
```

## Структура файлов для копирования

```
📁 Обязательные (скопировать все):
├── app/services/
│   ├── fred_client.py          ⭐ Core - FRED API
│   ├── pattern_engine.py       ⭐ Core - Исторические аналоги
│   └── cross_market.py         ⭐ Core - Cross-market анализ
└── app/models/
    ├── yield_curve.py          ⭐ Core - Модели
    └── unified_state.py        ⭐ Core - Unified state

📁 Опциональные:
├── app/services/
│   ├── telegram.py             🔔 Алерты
│   └── macro_data.py           🔗 Интеграция с твоим Macro
└── database/
    └── schema.sql              🗄️ SQL схема
```

## Что нужно добавить в main.py

### Импорты (в начало файла)

```python
# === YIELD CURVE INTELLIGENCE ===
from app.services.fred_client import FREDClient, YieldCurveCalculator
from app.services.pattern_engine import get_pattern_engine, MarketState
from app.services.cross_market import get_cross_market_analyzer
from app.models.unified_state import UnifiedDashboardState
from datetime import datetime
```

### Инициализация (в lifespan)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... твоя текущая инициализация ...
    
    # === YIELD CURVE MODULES ===
    global fred_client, calculator, pattern_engine, cross_market
    
    fred_client = FREDClient()
    calculator = YieldCurveCalculator()
    pattern_engine = get_pattern_engine()
    cross_market = get_cross_market_analyzer()
    
    logger.info("✅ Yield Curve Intelligence modules loaded")
    
    yield
```

### Эндпоинты (добавь в конец файла)

```python
# === YIELD CURVE ENDPOINTS ===

@app.get("/api/v1/yield-curve/current")
async def get_yield_curve():
    data = await fred_client.get_yield_curve()
    # ... (полный код в fred_client.py)

@app.get("/api/v1/analogs")
async def get_analogs():
    # Использует pattern_engine
    pass

@app.get("/api/v1/cross-market/signal")
async def get_cross_market():
    # Использует cross_market
    pass

@app.get("/api/v1/dashboard")
async def get_unified_dashboard():
    # Unified state со всеми модулями
    pass
```

## Проверка после установки

```bash
# 1. Запусти сервер
uvicorn app.main:app --reload

# 2. Проверь health
curl http://localhost:8000/

# 3. Проверь yield curve
curl http://localhost:8000/api/v1/yield-curve/current

# 4. Проверь аналоги
curl http://localhost:8000/api/v1/analogs

# 5. Проверь unified dashboard
curl http://localhost:8000/api/v1/dashboard
```

## Устранение проблем

### Ошибка: ModuleNotFoundError
```bash
pip install aiohttp numpy pandas
```

### Ошибка: FRED API Key
Проверь `.env`:
```env
FRED_API_KEY=44fd19414c58a4227405bd187b743d1e
```

### Ошибка: CORS
Убедись что в main.py есть:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    ...
)
```

## Полная интеграция: пример main.py

См. файл `/projects/yield-curve-intelligence/backend/app/main.py` — там полный пример с всеми роутерами.

## Поддержка

Если через Kimi Extension не получается:
1. Открой терминал в VSCode
2. Запусти `./install.sh` из директории модуля
3. Или скопируй файлы вручную по списку выше
