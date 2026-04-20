#!/bin/bash
# Интеграция Yield Curve Intelligence в существующий проект
# Запуск: ./install.sh /path/to/your/project

set -e

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-.}"

echo "🚀 Yield Curve Intelligence Integration"
echo "========================================"
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

# Проверка структуры целевого проекта
if [ ! -d "$TARGET_DIR/app" ]; then
    echo "❌ Ошибка: Не найдена директория app/ в целевом проекте"
    echo "Убедись что ты запускаешь скрипт из корня своего проекта"
    exit 1
fi

# Создание директорий
echo "📁 Создание директорий..."
mkdir -p "$TARGET_DIR/app/services"
mkdir -p "$TARGET_DIR/app/models"

# Копирование core файлов
echo "📦 Копирование core модулей..."

cp "$SOURCE_DIR/backend/app/services/fred_client.py" "$TARGET_DIR/app/services/"
cp "$SOURCE_DIR/backend/app/services/pattern_engine.py" "$TARGET_DIR/app/services/"
cp "$SOURCE_DIR/backend/app/services/cross_market.py" "$TARGET_DIR/app/services/"
cp "$SOURCE_DIR/backend/app/models/yield_curve.py" "$TARGET_DIR/app/models/"
cp "$SOURCE_DIR/backend/app/models/unified_state.py" "$TARGET_DIR/app/models/"

# Опциональные файлы
if [ -f "$SOURCE_DIR/backend/app/services/telegram.py" ]; then
    cp "$SOURCE_DIR/backend/app/services/telegram.py" "$TARGET_DIR/app/services/"
    echo "  ✓ telegram.py"
fi

if [ -f "$SOURCE_DIR/backend/app/services/macro_data.py" ]; then
    cp "$SOURCE_DIR/backend/app/services/macro_data.py" "$TARGET_DIR/app/services/"
    echo "  ✓ macro_data.py (интеграция с существующим Macro модулем)"
fi

echo ""
echo "✅ Файлы скопированы:"
echo "  ✓ fred_client.py"
echo "  ✓ pattern_engine.py"
echo "  ✓ cross_market.py"
echo "  ✓ yield_curve.py (models)"
echo "  ✓ unified_state.py (models)"
echo ""

# Проверка .env
echo "🔧 Проверка .env..."
if [ -f "$TARGET_DIR/.env" ]; then
    if ! grep -q "FRED_API_KEY" "$TARGET_DIR/.env"; then
        echo "" >> "$TARGET_DIR/.env"
        echo "# Yield Curve Intelligence" >> "$TARGET_DIR/.env"
        echo "FRED_API_KEY=44fd19414c58a4227405bd187b743d1e" >> "$TARGET_DIR/.env"
        echo "  ✓ FRED_API_KEY добавлен в .env"
    else
        echo "  ✓ FRED_API_KEY уже есть в .env"
    fi
else
    echo "FRED_API_KEY=44fd19414c58a4227405bd187b743d1e" > "$TARGET_DIR/.env"
    echo "  ✓ Создан .env с FRED_API_KEY"
fi

echo ""
echo "📋 Следующие шаги:"
echo "=================="
echo ""
echo "1. Установи зависимости:"
echo "   pip install aiohttp numpy pandas"
echo ""
echo "2. Добавь импорты в main.py:"
echo "   from app.services.fred_client import FREDClient, YieldCurveCalculator"
echo "   from app.services.pattern_engine import get_pattern_engine"
echo "   from app.services.cross_market import get_cross_market_analyzer"
echo ""
echo "3. Добавь роутеры (см. INTEGRATION.md)"
echo ""
echo "4. Перезапусти сервер и проверь:"
echo "   curl http://localhost:8000/api/v1/dashboard"
echo ""
echo "🎉 Готово!"
