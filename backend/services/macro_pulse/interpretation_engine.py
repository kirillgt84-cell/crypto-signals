"""
Interpretation Engine (Yield Curve Intelligence)
Развёрнутые интерпретации для каждой метрики + actionable advice.

Формат: блок с заголовком + 2-3 предложения + actionable advice.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class MetricInterpretation:
    metric: str
    status: str          # например: "normal", "warning", "critical"
    headline: str        # заголовок (1 строка)
    explanation: str     # развёрнутое объяснение (2-3 предложения)
    actionable: str      # что делать (конкретный совет)
    color: str           # css-цвет: green / yellow / orange / red / blue
    icon: str            # emoji / lucide icon name


@dataclass
class DashboardInterpretation:
    timestamp: datetime
    overall_assessment: str       # общая оценка ситуации
    overall_risk_level: str       # LOW / MODERATE / ELEVATED / HIGH / EXTREME
    overall_color: str            # цвет для UI
    metrics: List[MetricInterpretation] = field(default_factory=list)
    signals: List[str] = field(default_factory=list)  # ключевые сигналы (список строк)
    trade_actions: List[str] = field(default_factory=list)  # торговые действия


class InterpretationEngine:
    """Генератор интерпретаций для всех метрик Yield Curve Intelligence."""

    def __init__(self):
        pass

    # ────────────────────────────────
    # Вспомогательные методы
    # ────────────────────────────────

    @staticmethod
    def _recession_color(prob: float) -> str:
        if prob < 10:   return "green"
        if prob < 25:   return "yellow"
        if prob < 50:   return "orange"
        return "red"

    @staticmethod
    def _risk_level(prob: float, shape: str) -> str:
        if prob >= 50 or shape == "inverted":
            return "HIGH"
        if prob >= 25 or shape == "flat":
            return "ELEVATED"
        if prob >= 10:
            return "MODERATE"
        return "LOW"

    # ────────────────────────────────
    # 1. Curve Shape
    # ────────────────────────────────

    def interpret_curve_shape(self, shape: str) -> MetricInterpretation:
        """Интерпретация формы кривой доходности."""

        interpretations = {
            "normal": {
                "status": "normal",
                "headline": "Кривая нормальной формы — экономика в стандартном режиме",
                "explanation": (
                    "Долгосрочные ставки выше краткосрочных, что отражает здоровые ожидания инфляции и роста. "
                    "Рынок дисконтирует стабильное будущее без сильных шоков. Кредитование активно, банки зарабатывают на развороте ставок."
                ),
                "actionable": (
                    "Базовый сценарий — risk-on. Акции и крипто растут в среднем. "
                    "Держать стандартное распределение: 60% SPX/NASDAQ, 20% BTC/ETH, 10% GOLD, 10% кэш."
                ),
                "color": "green",
                "icon": "trending-up",
            },
            "flat": {
                "status": "warning",
                "headline": "Кривая сплющена — рынок теряет уверенность в будущем",
                "explanation": (
                    "Спреды между кратко- и долгосрочными ставками минимальны. Это говорит о том, что инвесторы не требуют премии за риск времени — "
                    "или потому что ожидают замедления роста, или потому что Fed удерживает краткосрочные ставки искусственно высоко. "
                    "Каждая плоская кривая в истории предшествовала инверсии или резкому замедлению."
                ),
                "actionable": (
                    "Сократить волатильные позиции на 20-30%. Увеличить долю облигаций/кэша. "
                    "Пересмотреть leverage в крипте. Если кривая плоская >30 дней — готовить hedge через VIX или put-спреды на SPX."
                ),
                "color": "yellow",
                "icon": "alert-triangle",
            },
            "inverted": {
                "status": "critical",
                "headline": "Инвертированная кривая — классический предвестник рецессии",
                "explanation": (
                    "Краткосрочные ставки выше долгосрочных. Рынок дисконтирует резкое замедление: инвесторы бегут в длинные облигации, "
                    "подавляя их доходность, при этом Fed держит короткие ставки высокими для борьбы с инфляцией. "
                    "В 8 из 9 случаев за последние 50 лет инверсия 10Y-2Y предшествовала рецессии (средний лаг 12-18 мес)."
                ),
                "actionable": (
                    "Активный risk-off. Сократить акции до 30-40% портфеля, крипту до 10%. "
                    "Увеличить GOLD до 15-20% и кэш/краткосрочные облигации до 30-40%. "
                    "Рассмотреть short на высокобета секторы (технологии, меме-акции). Обязательные стоп-лоссы на всех позициях."
                ),
                "color": "red",
                "icon": "trending-down",
            },
            "humped": {
                "status": "warning",
                "headline": "Горбатая кривая — нестабильность, скоро изменение фазы",
                "explanation": (
                    "Среднесрочные ставки (5-7Y) выше долгосрочных (10-30Y), но кривая ещё не полностью инвертирована. "
                    "Это редкая и кратковременная фаза — обычно предшествует полной инверсии или резкому развороту Fed. "
                    "Рынок не верит в среднесрочный рост, но ещё не уверен в долгосрочном кризисе."
                ),
                "actionable": (
                    "Тактика 'летать на низкой высоте'. Сократить среднесрочные облигации (5-7Y), перейти в краткосрочные (1-2Y) или TIPS. "
                    "Акции — только defensive (utilities, healthcare, consumer staples). Крипта — только BTC, без альтов."
                ),
                "color": "orange",
                "icon": "activity",
            },
        }

        data = interpretations.get(shape.lower(), interpretations["normal"])
        return MetricInterpretation(metric="curve_shape", **data)

    # ────────────────────────────────
    # 2. Spreads (10Y-2Y, 10Y-3M)
    # ────────────────────────────────

    def interpret_10y2y_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="unknown",
                headline="Данные 10Y-2Y недоступны",
                explanation="Не удалось получить текущий спред 10Y-2Y. Проверьте подключение к FRED API.",
                actionable="Обновить страницу или проверить API-ключ. Использовать альтернативные источники (TradingView, Investing).",
                color="gray",
                icon="help-circle",
            )

        if spread > 1.0:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y спред {spread:.2f}% — кривая крутая, ростовой сценарий",
                explanation=(
                    f"Спред {spread:.2f}% говорит о здоровом премиальном требовании за время. "
                    "Рынок ожидает стабильный рост и инфляцию в пределах таргета. "
                    "Банки активно кредитуют, margin lending растёт — классическая risk-on фаза."
                ),
                actionable=(
                    "Увеличить долю акций и крипты. Рассмотреть leveraged ETF (TQQQ, SOXL) для агрессивного роста. "
                    "Краткосрочные облигации можно сократить — они теряют привлекательность против акций."
                ),
                color="green",
                icon="arrow-up-right",
            )
        elif spread > 0.25:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y спред {spread:.2f}% — нормальная кривая, но внимание",
                explanation=(
                    f"Спред положительный, но уже не агрессивный. Рынок начинает закладывать риск замедления, но пока не паникует. "
                    "Это типичная фаза позднего цикла — рост продолжается, но его скорость замедляется."
                ),
                actionable=(
                    "Балансировать growth и value. Не добавлять leverage. Начать фиксировать прибыль в высокорисковых позициях. "
                    "Увеличить dividend-акции (Schwab US Dividend ETF)."
                ),
                color="blue",
                icon="minus",
            )
        elif spread > -0.10:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="warning",
                headline=f"10Y-2Y спред {spread:.2f}% — кривая почти плоская, раннее предупреждение",
                explanation=(
                    f"Спред сжался до {spread:.2f}%. Каждый раз, когда 10Y-2Y приближался к нулю за последние 50 лет, "
                    "в последующие 6-18 месяцев либо начиналась рецессия, либо Fed резко снижал ставки. "
                    "Это не повод паниковать, но повод пересмотреть risk exposure."
                ),
                actionable=(
                    "Сократить крипто-экспозицию на 30-40%. Перейти в качественные облигации (Treasury 2Y, TIPS). "
                    "Акции — только крупный кап (SPY, QQQ), без мелких growth/meme. Начать складывать VIX calls на 3-6 мес."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        else:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="critical",
                headline=f"10Y-2Y спред {spread:.2f}% — ИНВЕРСИЯ, исторически надёжный сигнал рецессии",
                explanation=(
                    f"Инверсия 10Y-2Y на уровне {spread:.2f}% активна. Согласно данным ФРБ Сан-Франциско, "
                    "с 1955 года каждая инверсия предшествовала рецессии (средний лаг 12-18 мес). "
                    "Единственное ложное срабатывание — 1966 (мягкая посадка без спада ВВП). "
                    f"Текущая инверсия уже длится N дней — чем дольше, тем выше вероятность рецессии."
                ),
                actionable=(
                    "Агрессивный risk-off. Сократить SPX до 20-30%, NASDAQ до 10%. Крипта — только BTC как цифровое золото, 5-10%. "
                    "Gold: увеличить до 20-25%. Кэш/T-bills: 40-50%. Рассмотреть bear-ETF (SQQQ, UVXY). "
                    "Все позиции со стопами. Не ловить падающий нож."
                ),
                color="red",
                icon="trending-down",
            )

    def interpret_10y3m_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="unknown",
                headline="Данные 10Y-3M недоступны",
                explanation="Не удалось получить текущий спред 10Y-3M.",
                actionable="Проверить API-ключ FRED. 10Y-3M — ключевой предиктор, использовать альтернативные данные.",
                color="gray",
                icon="help-circle",
            )

        # 10Y-3M — предиктор от NY Fed, более чувствительный
        if spread > 1.5:
            status = "normal"
            headline = f"10Y-3M спред {spread:.2f}% — крутая кривая, нет риска рецессии"
            explanation = (
                f"10Y-3M на {spread:.2f}% — это 'безопасная зона'. NY Fed model даёт вероятность рецессии <5%. "
                "Краткосрочные ставки значительно ниже долгосрочных, что стимулирует кредитование и инвестиции."
            )
            actionable = "Полный risk-on. Увеличить акции, крипту, high-yield bonds. Сократить кэш до минимума."
            color = "green"
        elif spread > 0.0:
            status = "normal"
            headline = f"10Y-3M спред {spread:.2f}% — позитивный, но снижающийся"
            explanation = (
                f"Спред ещё положительный ({spread:.2f}%), но уже не такой агрессивный. "
                "Вероятность рецессии по NY Fed модели ниже 10%. Это поздняя фаза расширения, но не повод для паники."
            )
            actionable = "Стандартное распределение. Не добавлять риск. Фиксировать прибыль в спекулятивных позициях."
            color = "blue"
        elif spread > -0.50:
            status = "warning"
            headline = f"10Y-3M спред {spread:.2f}% — близко к инверсии, повышенное внимание"
            explanation = (
                f"10Y-3M приближается к нулю ({spread:.2f}%). Это более ранний и чувствительный индикатор, чем 10Y-2Y. "
                "NY Fed использует именно этот спред для расчёта вероятности рецессии. "
                "Если инверсия 10Y-3M произойдёт — вероятность рецессии резко вырастет."
            )
            actionable = (
                "Начать консервативный shift: увеличить кэш до 20%, сократить крипту до 10-15%, добавить GOLD. "
                "Следить за динамикой: если спред продолжает снижаться — усиливать защиту."
            )
            color = "yellow"
        else:
            status = "critical"
            headline = f"10Y-3M спред {spread:.2f}% — ИНВЕРСИЯ, NY Fed модель активна"
            explanation = (
                f"Инверсия 10Y-3M на {spread:.2f}% — ключевой вход для NY Fed Logistic Model. "
                "Этот спред предсказал все рецессии с 1960-х (включая 2008, 2001, 1990). "
                "Единственное исключение — 1998 (кратковременная инверсия, быстрый разворот Fed). "
                f"Текущая вероятность рецессии 12 мес: смотри метрику Recession Probability."
            )
            actionable = (
                "Максимальная защита. SPX ≤25%, крипта ≤10%, GOLD 20-25%, кэш/T-bills 40-50%. "
                "Рассмотреть обратные ETF (SH, PSQ, UVXY). Все новые входы — только после подтверждения разворота кривой."
            )
            color = "red"

        return MetricInterpretation(
            metric="10y3m_spread",
            status=status,
            headline=headline,
            explanation=explanation,
            actionable=actionable,
            color=color,
            icon="trending-down" if spread < 0 else "trending-up",
        )

    # ────────────────────────────────
    # 3. Recession Probability
    # ────────────────────────────────

    def interpret_recession_probability(self, prob: Optional[float]) -> MetricInterpretation:
        if prob is None:
            return MetricInterpretation(
                metric="recession_probability",
                status="unknown",
                headline="Вероятность рецессии неизвестна",
                explanation="Нет данных для расчёта. Возможно, 10Y-3M спред недоступен.",
                actionable="Проверить FRED API. Использовать альтернативные источники (Conference Board LEI, PMIs).",
                color="gray",
                icon="help-circle",
            )

        if prob < 10:
            return MetricInterpretation(
                metric="recession_probability",
                status="normal",
                headline=f"Вероятность рецессии: {prob:.1f}% — зелёная зона",
                explanation=(
                    f"NY Fed модель оценивает шанс рецессии в {prob:.1f}% на ближайшие 12 месяцев. "
                    "Это исторически низкий уровень. Экономика в фазе расширения, кредитные условия благоприятные."
                ),
                actionable=(
                    "Базовый risk-on. Акции и крипта растут. Можно увеличить leverage умеренно. "
                    "Краткосрочные облигации менее привлекательны — переключить в equities или REITs."
                ),
                color="green",
                icon="shield-check",
            )
        elif prob < 25:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Вероятность рецессии: {prob:.1f}% — жёлтая зона (первые признаки)",
                explanation=(
                    f"Модель выдаёт {prob:.1f}% — это выше исторического минимума, но ещё не критично. "
                    "Обычно такой уровень наблюдается в поздней фазе цикла, когда рост замедляется, но рецессии ещё нет. "
                    "Примеры: 2018 (предшествовало коррекции, но не рецессии), 1995 (мягкая посадка)."
                ),
                actionable=(
                    "Умеренная осторожность. Не открывать новые leveraged позиции. "
                    "Начать накапливать кэш (целевой уровень 15-20%). Добавить defensive sectors (utilities, healthcare)."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        elif prob < 50:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Вероятность рецессии: {prob:.1f}% — оранжевая зона (высокий риск)",
                explanation=(
                    f"{prob:.1f}% — это серьёзный уровень. Модель NY Fed считается одной из самых точных: "
                    "она предсказала рецессии 1970, 1973, 1980, 1981, 1990, 2001, 2007, 2020. "
                    "При 25-50% инвесторы уже начинают массово переключаться в defensive."
                ),
                actionable=(
                    "Существенный shift в защиту. Сократить SPX до 35-45%, NASDAQ до 15-20%. "
                    "Крипта: только BTC, 5-10%. GOLD: 15-20%. Кэш/T-bills: 25-35%. "
                    "Рассмотреть VIX hedges и put-спреды."
                ),
                color="orange",
                icon="alert-octagon",
            )
        else:
            return MetricInterpretation(
                metric="recession_probability",
                status="critical",
                headline=f"Вероятность рецессии: {prob:.1f}% — КРАСНАЯ ЗОНА",
                explanation=(
                    f"{prob:.1f}% — критический уровень. Такие значения наблюдались непосредственно перед: "
                    "2008 (пик ~45% в 2006, потом рост), 2001 (пик ~50% в 2000), 1990 (пик ~35% в 1989). "
                    "Рынок уже дисконтирует спад. Корпоративные прибыли начнут падать через 3-6 месяцев."
                ),
                actionable=(
                    "Экстренная защита капитала. SPX ≤20%, NASDAQ ≤10%, крипта ≤5-7%. "
                    "GOLD 25-30%, Treasury bonds 30-40%, кэш 20-30%. "
                    "Активно использовать inverse ETF (SH, SQQQ), VIX, USDJPY long как safe-haven."
                ),
                color="red",
                icon="skull",
            )

    # ────────────────────────────────
    # 4. Market Regime
    # ────────────────────────────────

    def interpret_market_regime(self, regime: str, sentiment: str = "neutral") -> MetricInterpretation:
        regimes = {
            "risk-on": {
                "headline": "Режим RISK-ON — рынки растут, страха нет",
                "explanation": (
                    "Все классы активов показывают позитивную динамику. VIX низкий, кредитные спреды сжаты, "
                    "инвесторы покупают growth и high-beta. Фаза 'жадности' по шкале Fear&Greed. "
                    "Такой режим может длиться месяцами, но не вечно — следить за первыми трещинами."
                ),
                "actionable": (
                    "Максимизировать growth: QQQ, ARKK, SOL, ETH. Использовать margin умеренно. "
                    "Кэш — минимальный (5-10%). Короткие облигации не нужны."
                ),
                "color": "green",
                "icon": "rocket",
            },
            "risk-off": {
                "headline": "Режим RISK-OFF — бегство от риска, защита капитала",
                "explanation": (
                    "Рынки падают, VIX взлетает, инвесторы массово продают акции и крипту, переходя в кэш и облигации. "
                    "Кредитные спреды расширяются — банки перестают кредитовать. "
                    "Это либо коррекция (-10-20%), либо начало bear market (-30%+)."
                ),
                "actionable": (
                    "Минимизировать equities. Перейти в US Treasuries (TLT), GOLD (GLD), USD (UUP). "
                    "Крипта: только BTC, минимальная позиция. Кэш: 30-50%. "
                    "Рассмотреть short ETF (SQQQ, UVXY). Не ловить дно."
                ),
                "color": "red",
                "icon": "shield",
            },
            "transition": {
                "headline": "Режим TRANSITION — переломный момент, неопределённость",
                "explanation": (
                    "Рынок не может выбрать направление. Отдельные секторы растут, другие падают. "
                    "Лидеры прошлого цикла (tech) слабеют, новые лидеры (energy, staples) ещё не определились. "
                    "Это самая опасная фаза — ловушка для тех, кто 'покупает просадку' слишком рано."
                ),
                "actionable": (
                    "Нейтральная позиция. 40% equities (равномерно growth+value), 20% bonds, 20% gold, 20% cash. "
                    "Не использовать leverage. Ждать чёткого сигнала разворота (breakout/breakdown). "
                    "Скальпинг допустим, но swing- и позиционные сделки — только после формирования тренда."
                ),
                "color": "yellow",
                "icon": "git-branch",
            },
            "undefined": {
                "headline": "Режим UNDEFINED — недостаточно данных",
                "explanation": (
                    "Cross-market анализ не смог определить текущий режим. Возможные причины: "
                    "конфликтующие сигналы между активами, недостаточная волатильность для анализа, "
                    "или технические проблемы с получением данных."
                ),
                "actionable": (
                    "Воздержаться от крупных решений. Использовать только базовое распределение (60/40). "
                    "Обновить данные и перепроверить через 24 часа."
                ),
                "color": "gray",
                "icon": "help-circle",
            },
        }

        data = regimes.get(regime.lower(), regimes["undefined"])
        return MetricInterpretation(metric="market_regime", status=regime.lower(), **data)

    # ────────────────────────────────
    # 5. Historical Analog
    # ────────────────────────────────

    def interpret_top_analog(
        self,
        analog_name: str,
        similarity: float,
        recession_followed: bool,
        lead_time_months: Optional[int],
        sp500_outcome: Optional[float],
    ) -> MetricInterpretation:

        if similarity < 30:
            return MetricInterpretation(
                metric="top_analog",
                status="low_relevance",
                headline=f"Топ-аналогия: {analog_name} ({similarity:.0f}% match) — слабая связь",
                explanation=(
                    f"Сходство всего {similarity:.0f}%. Текущая ситуация уникальна и не имеет чёткого исторического прецедента. "
                    "Это может означать либо 'мягкую посадку' (как 1966 или 1995), либо новый тип кризиса."
                ),
                actionable=(
                    "Не полагаться на исторические аналогии. Использовать только текущие макро-данные (PMI, NFP, CPI). "
                    "Удерживать диверсифицированный портфель без экстремальных ставок."
                ),
                color="blue",
                icon="history",
            )

        status = "warning" if recession_followed else "normal"
        color = "red" if recession_followed else "green"

        recession_text = "с рецессией" if recession_followed else "без рецессии"
        lead_text = f" через {lead_time_months} мес." if lead_time_months else ""
        outcome_text = f" SPX: {sp500_outcome:+.0f}%." if sp500_outcome else ""

        headline = f"Топ-аналогия: {analog_name} ({similarity:.0f}% match) — {recession_text}"

        explanation = (
            f"Текущая кривая и макро-контекст на {similarity:.0f}% совпадают с периодом {analog_name}. "
            f"Тогда рецессия {'наступила' if recession_followed else 'не наступила'}{lead_text}.{outcome_text} "
            f"Это {'предупреждает о риске спада' if recession_followed else 'указывает на возможность мягкой посадки'}."
        )

        if recession_followed:
            actionable = (
                f"Изучить уроки {analog_name}: {self._analog_lessons(analog_name)} "
                f"Сократить equities, увеличить кэш. Помнить — лаг {lead_time_months or 'N'} мес., "
                "не распродавать всё сразу, но стопы обязательны."
            )
        else:
            actionable = (
                f"Сценарий мягкой посадки возможен. Удерживать core-positions, не паниковать. "
                f"Но иметь 15-20% кэша на случай, если аналогия всё-таки даст сбой."
            )

        return MetricInterpretation(
            metric="top_analog",
            status=status,
            headline=headline,
            explanation=explanation,
            actionable=actionable,
            color=color,
            icon="history",
        )

    @staticmethod
    def _analog_lessons(analog_name: str) -> str:
        lessons = {
            "2006-2007": "пузырь на рынке недвижимости, банки сильно leveredged",
            "2000": "переоценка tech, IPO-безумие, margin debt на пике",
            "1989": "банковский кризис S&L, геополитика",
            "1978-1980": " stagflation, Volcker shock, двойная рецессия",
            "1998": "LTCM, Russian default — Fed спас рынок",
            "1966": "credit crunch, но быстрое восстановление",
            "2019": "trade wars, COVID shock (внешний, не финансовый)",
        }
        return lessons.get(analog_name, "внимание к макро-шокам")

    # ────────────────────────────────
    # 6. Cross-Market Impact (по каждому активу)
    # ────────────────────────────────

    def interpret_cross_market(
        self,
        asset: str,
        impact_3m: float,
        impact_6m: float,
        risk_level: str,
    ) -> MetricInterpretation:
        """Интерпретация прогноза для конкретного актива."""

        asset_names = {
            "SP500": "S&P 500",
            "NASDAQ": "NASDAQ",
            "BTC": "Bitcoin",
            "ETH": "Ethereum",
            "GOLD": "Золото",
            "OIL": "Нефть",
            "DXY": "Индекс доллара (DXY)",
        }
        name = asset_names.get(asset, asset)

        avg_impact = (impact_3m + impact_6m) / 2

        if avg_impact > 5:
            status = "positive"
            color = "green"
            headline = f"{name}: прогноз +{avg_impact:.0f}% (3-6 мес.) — сильный позитив"
            explanation = (
                f"Yield-curve модель прогнозирует рост {name} на +{impact_3m:.0f}% (3M) и +{impact_6m:.0f}% (6M). "
                f"При текущей форме кривой {asset} обычно outperform. "
                "Рекомендуется overweight в портфеле."
            )
            actionable = f"Увеличить позицию {asset} на 20-30% от текущего веса. Рассмотреть leverage через futures/опционы."
        elif avg_impact > 0:
            status = "neutral-positive"
            color = "blue"
            headline = f"{name}: прогноз +{avg_impact:.0f}% (3-6 мес.) — слабый позитив"
            explanation = (
                f"Ожидается умеренный рост {name} (+{impact_3m:.0f}% / +{impact_6m:.0f}%). "
                "Не самый сильный сигнал, но направление позитивное."
            )
            actionable = f"Удерживать текущую позицию {asset}. Не добавлять, но и не сокращать."
        elif avg_impact > -5:
            status = "neutral-negative"
            color = "yellow"
            headline = f"{name}: прогноз {avg_impact:.0f}% (3-6 мес.) — слабый негатив"
            explanation = (
                f"Ожидается лёгкое снижение {name} ({impact_3m:.0f}% / {impact_6m:.0f}%). "
                "Возможна боковика или коррекция 5-10%. Не критично, но негативный bias."
            )
            actionable = f"Сократить {asset} на 10-15%. Перевести в более сильные активы или кэш."
        else:
            status = "negative"
            color = "red"
            headline = f"{name}: прогноз {avg_impact:.0f}% (3-6 мес.) — сильный негатив"
            explanation = (
                f"Модель прогнозирует значительное снижение {name}: {impact_3m:.0f}% (3M), {impact_6m:.0f}% (6M). "
                f"При текущей yield-curve конфигурации {asset} historically underperform. "
                f"Risk level: {risk_level}."
            )
            actionable = f"Агрессивно сократить {asset} на 40-60% или полностью закрыть. Рассмотреть short/put-опционы."

        return MetricInterpretation(
            metric=f"cross_market_{asset.lower()}",
            status=status,
            headline=headline,
            explanation=explanation,
            actionable=actionable,
            color=color,
            icon="trending-up" if avg_impact > 0 else "trending-down",
        )

    # ────────────────────────────────
    # 7. Aggregated Forecast
    # ────────────────────────────────

    def interpret_aggregated_forecast(
        self,
        recession_prob: float,
        confidence: str,
        sp500_range: Optional[List[float]],
        top_analogies: List[str],
    ) -> MetricInterpretation:

        if recession_prob < 30:
            headline = f"Агрегированный прогноз: мягкая посадка или продолжение роста ({recession_prob:.0f}% рецессии)"
            explanation = (
                f"На основе {len(top_analogies)} исторических аналогий вероятность рецессии низкая ({recession_prob:.0f}%). "
                f"Confidence: {confidence}. Большинство аналогий указывают на продолжение роста или мягкое замедление."
            )
            actionable = (
                "Базовый risk-on с умеренной защитой. Держать 10-15% кэша на случай внезапного шока. "
                "SPX range ожидается положительным."
            )
            color = "green"
        elif recession_prob < 60:
            headline = f"Агрегированный прогноз: неопределённость, бифуркация сценариев ({recession_prob:.0f}% рецессии)"
            explanation = (
                f"Модель даёт {recession_prob:.0f}% — зона неопределённости. Аналогии противоречивы: "
                f"{', '.join(top_analogies[:3])}. Рынок может пойти в обе стороны. "
                f"SPX range: {sp500_range[0]:.0f}%...{sp500_range[1]:.0f}% если рецессия всё-таки случится."
            )
            actionable = (
                "Нейтральная позиция. 50% equities, 25% bonds/gold, 25% cash. "
                "Не делать крупных ставок. Ждать разрешения неопределённости (break кривой, данные PMI/NFP)."
            )
            color = "yellow"
        else:
            headline = f"Агрегированный прогноз: ВЫСОКАЯ ВЕРОЯТНОСТЬ РЕЦЕССИИ ({recession_prob:.0f}%)"
            explanation = (
                f"{recession_prob:.0f}% — большинство исторических аналогий предсказывают рецессию. "
                f"SPX historical range при таких аналогиях: {sp500_range[0]:.0f}%...{sp500_range[1]:.0f}%. "
                "Корпоративные прибыли начнут снижаться через 2-4 квартала после сигнала."
            )
            actionable = (
                "Агрессивный risk-off. Сократить equities до 20-30%, крипту до 5-10%. "
                "Treasury bonds 30-40%, gold 15-20%, cash 20-30%. Не пытаться ловить дно."
            )
            color = "red"

        return MetricInterpretation(
            metric="aggregated_forecast",
            status="warning" if recession_prob < 60 else "critical",
            headline=headline,
            explanation=explanation,
            actionable=actionable,
            color=color,
            icon="activity",
        )

    # ────────────────────────────────
    # ГЛАВНЫЙ МЕТОД: собрать всё
    # ────────────────────────────────

    def interpret_dashboard(
        self,
        curve_shape: str,
        spread_10y2y: Optional[float],
        spread_10y3m: Optional[float],
        recession_prob: Optional[float],
        market_regime: str,
        analog_name: str,
        analog_similarity: float,
        analog_recession: bool,
        analog_lead: Optional[int],
        analog_sp500: Optional[float],
        cross_market: Optional[Dict[str, Dict]] = None,
        aggregated: Optional[Dict] = None,
    ) -> DashboardInterpretation:
        """Сгенерировать полную интерпретацию дашборда."""

        metrics = []

        # 1. Curve Shape
        metrics.append(self.interpret_curve_shape(curve_shape))

        # 2. Spreads
        metrics.append(self.interpret_10y2y_spread(spread_10y2y))
        metrics.append(self.interpret_10y3m_spread(spread_10y3m))

        # 3. Recession Probability
        metrics.append(self.interpret_recession_probability(recession_prob))

        # 4. Market Regime
        metrics.append(self.interpret_market_regime(market_regime))

        # 5. Top Analog
        metrics.append(self.interpret_top_analog(
            analog_name, analog_similarity, analog_recession, analog_lead, analog_sp500
        ))

        # 6. Cross-Market (по каждому активу)
        if cross_market:
            for asset, data in cross_market.items():
                metrics.append(self.interpret_cross_market(
                    asset,
                    data.get("impact_3m", 0),
                    data.get("impact_6m", 0),
                    data.get("risk_level", "unknown"),
                ))

        # 7. Aggregated Forecast
        if aggregated:
            metrics.append(self.interpret_aggregated_forecast(
                aggregated.get("recession_probability", 0),
                aggregated.get("confidence", "LOW"),
                aggregated.get("sp500_range"),
                aggregated.get("top_analogies", []),
            ))

        # Определить общий риск
        risk = self._risk_level(recession_prob or 0, curve_shape)
        risk_colors = {
            "LOW": "green",
            "MODERATE": "blue",
            "ELEVATED": "yellow",
            "HIGH": "red",
            "EXTREME": "darkred",
        }

        # Ключевые сигналы (если есть критичные)
        signals = []
        for m in metrics:
            if m.status in ("critical", "negative"):
                signals.append(f"🔴 {m.metric}: {m.headline}")
            elif m.status == "warning":
                signals.append(f"🟡 {m.metric}: {m.headline}")

        # Торговые действия (объединённые)
        trade_actions = []
        if risk in ("HIGH", "EXTREME"):
            trade_actions.extend([
                "Сократить SPX/NASDAQ до 20-30% от портфеля",
                "Крипта: только BTC, 5-10%",
                "Gold: 15-20%",
                "Кэш/T-bills: 40-50%",
                "Рассмотреть inverse ETF (SH, SQQQ)",
            ])
        elif risk == "ELEVATED":
            trade_actions.extend([
                "Сократить growth-акции на 30%",
                "Кэш: 20-30%",
                "Gold: 10-15%",
                "Стоп-лоссы на всех позициях",
            ])
        else:
            trade_actions.extend([
                "Базовое распределение: 60% equities, 20% крипта, 10% gold, 10% cash",
                "Можно увеличить leverage умеренно",
            ])

        return DashboardInterpretation(
            timestamp=datetime.utcnow(),
            overall_assessment=self._overall_assessment(risk, curve_shape, analog_name),
            overall_risk_level=risk,
            overall_color=risk_colors.get(risk, "gray"),
            metrics=metrics,
            signals=signals,
            trade_actions=trade_actions,
        )

    @staticmethod
    def _overall_assessment(risk: str, shape: str, analog: str) -> str:
        if risk in ("HIGH", "EXTREME"):
            return (
                f"Критическая ситуация: кривая {shape}, аналогия с {analog}, "
                f"риск-уровень {risk}. Требуется немедленная защита капитала."
            )
        elif risk == "ELEVATED":
            return (
                f"Повышенный риск: кривая {shape}, исторический прецедент {analog}. "
                f"Рекомендуется консервативная позиция и повышенная бдительность."
            )
        elif risk == "MODERATE":
            return (
                f"Умеренный риск: кривая {shape}. Неопределённость нарастает, "
                f"но пока нет критических сигналов."
            )
        else:
            return (
                f"Низкий риск: кривая {shape}, благоприятные условия для роста. "
                f"Стандартная risk-on стратегия."
            )


# Singleton
_interpretation_engine = None

def get_interpretation_engine() -> InterpretationEngine:
    global _interpretation_engine
    if _interpretation_engine is None:
        _interpretation_engine = InterpretationEngine()
    return _interpretation_engine
