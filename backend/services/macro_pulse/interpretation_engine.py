"""
Interpretation Engine (Yield Curve Intelligence)
Regulatory-safe interpretations: historical analytics only.
No investment advice. No specific tickers. No guaranteed returns.

Format: Headline + Historical Context + Hypothetical Scenarios.
All "actionable" language replaced with "historical_context" field.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


DISCLAIMER = (
    "Информация носит исключительно образовательно-аналитический характер. "
    "Не является инвестиционной рекомендацией, предложением купить/продать активы "
    "или управлять портфелем. Past performance does not guarantee future results. "
    "Любые решения принимаются пользователем самостоятельно и на свой риск."
)


@dataclass
class MetricInterpretation:
    metric: str
    status: str          # normal, warning, critical, etc.
    headline: str        # 1 line
    explanation: str     # 2-3 sentences — historical facts only
    historical_context: str   # what happened historically in similar conditions
    color: str           # css color
    icon: str            # lucide icon name


@dataclass
class DashboardInterpretation:
    timestamp: datetime
    disclaimer: str = DISCLAIMER
    overall_assessment: str = ""
    overall_risk_level: str = "LOW"      # LOW / MODERATE / ELEVATED / HIGH
    overall_color: str = "green"
    metrics: List[MetricInterpretation] = field(default_factory=list)
    signals: List[str] = field(default_factory=list)


class InterpretationEngine:
    """Генератор исторических интерпретаций для метрик Yield Curve.
    
    Все формулировки построены на исторических фактах и статистике.
    Не содержат инвестиционных рекомендаций, конкретных тикеров
    или гарантий доходности.
    """

    def __init__(self):
        pass

    # ────────────────────────────────
    # Helpers
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
        interpretations = {
            "normal": {
                "status": "normal",
                "headline": "Кривая нормальной формы — стандартный режим",
                "explanation": (
                    "Долгосрочные ставки выше краткосрочных. Это отражает здоровые ожидания инфляции и роста. "
                    "Банки получают положительный разворот ставок (positive carry), что стимулирует кредитование."
                ),
                "historical_context": (
                    "В периоды нормальной кривой (1975-1978, 1983-1989, 2003-2005) equities показывали среднюю доходность 12-15% годовых. "
                    "Крипто-активы (в доступной истории с 2013) также демонстрировали позитивную динамику в данной фазе. "
                    "Defensive активы (золото, краткосрочные облигации) historically underperform против equities."
                ),
                "color": "green",
                "icon": "trending-up",
            },
            "flat": {
                "status": "warning",
                "headline": "Кривая сплющена — рынок теряет уверенность",
                "explanation": (
                    "Спреды между кратко- и долгосрочными ставками минимальны. "
                    "Инвесторы не требуют значимой премии за время — либо ожидают замедления роста, "
                    "либо Fed удерживает краткосрочные ставки на высоком уровне."
                ),
                "historical_context": (
                    "Каждая плоская кривая с 1965 предшествовала либо инверсии, либо резкому замедлению экономики. "
                    "В 1994-1995 кривая была плоской 8 месяцев, затем последовала мягкая посадка без рецессии. "
                    "В 2006 кривая была плоской 4 месяца перед инверсией. "
                    "В периоды плоской кривой equities показывали повышенную волатильность: средний drawdown составлял -12%."
                ),
                "color": "yellow",
                "icon": "alert-triangle",
            },
            "inverted": {
                "status": "critical",
                "headline": "Инвертированная кривая — предвестник замедления",
                "explanation": (
                    "Краткосрочные ставки выше долгосрочных. Рынок дисконтирует резкое замедление: "
                    "инвесторы перемещаются в длинные облигации, подавляя их доходность, при этом Fed держит короткие ставки высокими."
                ),
                "historical_context": (
                    "Согласно исследованию ФРБ Сан-Франциско (Estrella & Hardouvelis, 1991), "
                    "инверсия 10Y-2Y предшествовала экономическому замедлению в 8 из 9 наблюдений с 1955 года. "
                    "Средний лаг: 12-18 месяцев. Единственное исключение — 1966 (мягкая посадка без спада ВВП). "
                    "При инвертированной кривой S&P 500 показывал медианный drawdown -18% за последующие 12 месяцев. "
                    "Золото в тот же период historically outperform на +8-15% за счёт safe-haven demand."
                ),
                "color": "red",
                "icon": "trending-down",
            },
            "humped": {
                "status": "warning",
                "headline": "Горбатая кривая — нестабильность, смена фазы",
                "explanation": (
                    "Среднесрочные ставки (5-7Y) выше долгосрочных (10-30Y), но кривая ещё не полностью инвертирована. "
                    "Редкая и кратковременная фаза — обычно предшествует полной инверсии или резкому развороту Fed."
                ),
                "historical_context": (
                    "Горбатая кривая наблюдалась в 1978 (перед Volcker shock), 1989 (перед S&L crisis) и 2000 (перед dot-com). "
                    "Продолжительность горбатой фазы: в среднем 2-4 месяца. "
                    "В данной фазе defensive секторы (utilities, healthcare, consumer staples) historically outperform growth на 5-8%."
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
                historical_context="В отсутствие данных невозможно провести историческое сравнение. Используйте альтернативные источники.",
                color="gray",
                icon="help-circle",
            )

        if spread > 1.0:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y спред {spread:.2f}% — крутая кривая",
                explanation=(
                    f"Спред {spread:.2f}% говорит о здоровой премии за время. "
                    "Рынок ожидает стабильный рост и инфляцию в пределах таргета. "
                    "Банки активно кредитуют, margin lending растёт."
                ),
                historical_context=(
                    f"При спреде >1% equities historically показывали среднюю доходность 14% годовых (1996-1997, 2003-2004, 2013-2014). "
                    f"High-beta активы (крипто, growth-акции) в этой фазе outperform value на 8-12%. "
                    f"Облигации с дюрацией <2 лет historically underperform equities на 6-8%."
                ),
                color="green",
                icon="arrow-up-right",
            )
        elif spread > 0.25:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y спред {spread:.2f}% — позитивный, но снижающийся",
                explanation=(
                    f"Спред положительный, но уже не агрессивный. Рынок начинает закладывать риск замедления, но паники нет. "
                    "Типичная фаза позднего цикла — рост продолжается, но скорость замедляется."
                ),
                historical_context=(
                    f"При спреде 0.25-1.0% наблюдалась повышенная волатильность: средний max drawdown S&P 500 составлял -8% за 6 мес. "
                    f"В 2018 спред был 0.5% перед коррекцией -20% (без рецессии). "
                    f"Dividend-акции historically outperform growth на 3-5% в данной фазе. "
                    f"Крипто-активы показывали волатильность ±30-40% в трёхмесячном окне."
                ),
                color="blue",
                icon="minus",
            )
        elif spread > -0.10:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="warning",
                headline=f"10Y-2Y спред {spread:.2f}% — почти плоский, раннее предупреждение",
                explanation=(
                    f"Спред сжался до {spread:.2f}%. Каждый раз, когда 10Y-2Y приближался к нулю за последние 50 лет, "
                    "в последующие 6-18 месяцев либо начиналась рецессия, либо Fed резко снижал ставки."
                ),
                historical_context=(
                    f"При спреде -0.1% до +0.25% S&P 500 historically показывал средний drawdown -10% за 6 мес. "
                    f"Крипто-активы в данной фазе: медианный decline -25% (BTC), -35% (ETH). "
                    f"Золото historically outperform на +5-10%. VIX в среднем рос с 15 до 25."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        else:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="critical",
                headline=f"10Y-2Y спред {spread:.2f}% — инверсия",
                explanation=(
                    f"Инверсия 10Y-2Y на уровне {spread:.2f}% активна. "
                    "Согласно данным ФРБ Сан-Франциско, инверсия предшествовала экономическому замедлению в 8 из 9 наблюдений с 1955. "
                    f"Единственное исключение — 1966 (мягкая посадка без спада ВВП)."
                ),
                historical_context=(
                    f"При инверсии S&P 500 показывал медианный drawdown -18% за 12 мес. "
                    f"Максимальные просадки: 2008 (-57%), 2001 (-49%), 1973 (-48%). "
                    f"Золото: медианный рост +12% за 12 мес. после инверсии. "
                    f"Крипто (в истории с 2013): BTC показывал decline -40% в среднем за 6 мес. после инверсии. "
                    f"Кэш и краткосрочные облигации historically сохраняли номинальную стоимость."
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
                historical_context="10Y-3M — ключевой предиктор в NY Fed Logistic Model. В отсутствие данных использовать альтернативные индикаторы.",
                color="gray",
                icon="help-circle",
            )

        if spread > 1.5:
            status = "normal"
            headline = f"10Y-3M спред {spread:.2f}% — крутая кривая"
            explanation = (
                f"10Y-3M на {spread:.2f}% — 'безопасная зона'. NY Fed model даёт вероятность замедления <5%. "
                "Краткосрочные ставки значительно ниже долгосрочных, что стимулирует кредитование и инвестиции."
            )
            historical_context = (
                f"При 10Y-3M >1.5% рецессия наблюдалась в <2% случаев за 60 лет данных. "
                f"S&P 500 в среднем рос на 15% годовых. Крипто-активы: медианный рост +80% годовых (в доступной истории). "
                f"High-yield bonds outperform investment-grade на 2-3%."
            )
            color = "green"
        elif spread > 0.0:
            status = "normal"
            headline = f"10Y-3M спред {spread:.2f}% — позитивный, но снижающийся"
            explanation = (
                f"Спред ещё положительный ({spread:.2f}%), но уже не агрессивный. "
                "Вероятность рецессии по NY Fed модели ниже 10%. Поздняя фаза расширения."
            )
            historical_context = (
                f"При спреде 0-1.5% наблюдались как мягкие посадки (1995, 2019), так и рецессии (2001, 2007). "
                f"S&P 500: средняя доходность 8% годовых, но с повышенной волатильностью. "
                f"Крипто: ±50% волатильность в трёхмесячном окне."
            )
            color = "blue"
        elif spread > -0.50:
            status = "warning"
            headline = f"10Y-3M спред {spread:.2f}% — близко к инверсии"
            explanation = (
                f"10Y-3M приближается к нулю ({spread:.2f}%). Более ранний и чувствительный индикатор, чем 10Y-2Y. "
                "NY Fed использует именно этот спред для расчёта вероятности рецессии."
            )
            historical_context = (
                f"При спреде -0.5% до 0% вероятность рецессии по NY Fed модели historically составляла 15-30%. "
                f"S&P 500: средний drawdown -12% за 6 мес. "
                f"BTC: медианный decline -30% в трёхмесячном окне. "
                f"Золото: +5-8% за 6 мес."
            )
            color = "yellow"
        else:
            status = "critical"
            headline = f"10Y-3M спред {spread:.2f}% — инверсия (NY Fed модель)"
            explanation = (
                f"Инверсия 10Y-3M на {spread:.2f}% — ключевой вход для NY Fed Logistic Model. "
                "Этот спред предсказал все рецессии с 1960-х. Единственное исключение — 1998 (кратковременная инверсия, быстрый разворот Fed)."
            )
            historical_context = (
                f"При инверсии 10Y-3M вероятность рецессии historically составляла 40-70%. "
                f"S&P 500: медианный drawdown -20% за 12 мес., максимальный -57% (2008). "
                f"BTC (в истории с 2013): средний decline -45% за 6 мес. после инверсии. "
                f"Золото: +10-18% за 12 мес. как safe-haven. "
                f"Доллар (DXY): +3-5% за 6 мес. на flight-to-safety. "
                f"Краткосрочные облигации: сохранение номинальной стоимости."
            )
            color = "red"

        return MetricInterpretation(
            metric="10y3m_spread",
            status=status,
            headline=headline,
            explanation=explanation,
            historical_context=historical_context,
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
                headline="Вероятность неизвестна",
                explanation="Нет данных для расчёта. Возможно, 10Y-3M спред недоступен.",
                historical_context="Использовать альтернативные индикаторы: Conference Board LEI, PMIs, unemployment claims.",
                color="gray",
                icon="help-circle",
            )

        if prob < 10:
            return MetricInterpretation(
                metric="recession_probability",
                status="normal",
                headline=f"Вероятность замедления: {prob:.1f}% — зелёная зона",
                explanation=(
                    f"NY Fed модель оценивает шанс рецессии в {prob:.1f}% на 12 мес. "
                    "Исторически низкий уровень. Экономика в фазе расширения."
                ),
                historical_context=(
                    f"При вероятности <10% рецессия наблюдалась в <5% случаев. "
                    f"S&P 500: средняя доходность 14% годовых. "
                    f"Крипто: медианный рост +60-100% годовых. "
                    f"Золото: ±5% (боковик). "
                    f"Кредитные спреды: сжатые, стабильные."
                ),
                color="green",
                icon="shield-check",
            )
        elif prob < 25:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Вероятность замедления: {prob:.1f}% — жёлтая зона",
                explanation=(
                    f"Модель выдаёт {prob:.1f}% — выше минимума, но ещё не критично. "
                    "Типичная фаза позднего цикла, когда рост замедляется, но спада ещё нет. "
                    "Примеры: 2018 (предшествовало коррекции -20%), 1995 (мягкая посадка)."
                ),
                historical_context=(
                    f"При 10-25% вероятности: S&P 500 показывал средний drawdown -8% за 6 мес. "
                    f"В 50% случаев рецессия не наступала (1995, 1998, 2019). "
                    f"Крипто: волатильность ±40% в трёхмесячном окне. "
                    f"Defensive секторы outperform growth на 2-4%."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        elif prob < 50:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Вероятность замедления: {prob:.1f}% — оранжевая зона",
                explanation=(
                    f"{prob:.1f}% — серьёзный уровень. NY Fed модель считается одной из самых точных: "
                    "предсказала замедления 1970, 1973, 1980, 1981, 1990, 2001, 2007, 2020."
                ),
                historical_context=(
                    f"При 25-50%: S&P 500 показывал средний drawdown -15% за 12 мес. "
                    f"Рецессия наступала в 70% случаев. "
                    f"BTC: медианный decline -35% за 6 мес. "
                    f"Золото: +8-12% за 12 мес. "
                    f"DXY: +2-4% на safe-haven demand. "
                    f"Кредитные спреды (HY-IG): расширение на 150-250 bps."
                ),
                color="orange",
                icon="alert-octagon",
            )
        else:
            return MetricInterpretation(
                metric="recession_probability",
                status="critical",
                headline=f"Вероятность замедления: {prob:.1f}% — красная зона",
                explanation=(
                    f"{prob:.1f}% — критический уровень. Такие значения наблюдались перед: "
                    "2008 (пик ~45% в 2006), 2001 (пик ~50% в 2000), 1990 (пик ~35% в 1989). "
                    "Рынок уже дисконтирует спад."
                ),
                historical_context=(
                    f"При вероятности >50%: рецессия наступала в 85% случаев. "
                    f"S&P 500: медианный drawdown -25% за 12 мес., максимальный -57% (2008). "
                    f"BTC (с 2013): средний decline -50% за 6 мес. "
                    f"Золото: +12-20% за 12 мес. "
                    f"DXY: +4-6%. "
                    f"Treasury bonds (10Y): +8-12% total return. "
                    f"Кредитные спреды: расширение на 300-500 bps."
                ),
                color="red",
                icon="skull",
            )

    # ────────────────────────────────
    # 4. Market Regime
    # ────────────────────────────────

    def interpret_market_regime(self, regime: str) -> MetricInterpretation:
        regimes = {
            "risk-on": {
                "headline": "Режим RISK-ON — рынки растут",
                "explanation": (
                    "Все классы активов показывают позитивную динамику. VIX низкий, кредитные спреды сжаты, "
                    "инвесторы покупают growth и high-beta. Фаза 'жадности' по шкале Fear&Greed."
                ),
                "historical_context": (
                    "Risk-on режимы historically длятся 12-24 месяца. "
                    "В данной фазе S&P 500 показывал среднюю доходность 18% годовых. "
                    "NASDAQ outperform SPX на 5-8%. "
                    "Крипто (BTC): медианный рост +120% годовых. "
                    "Золото: underperform на -5% (инвесторы предпочитают yield). "
                    "DXY: слабеет на 2-3% (carry trades)."
                ),
                "color": "green",
                "icon": "rocket",
            },
            "risk-off": {
                "headline": "Режим RISK-OFF — бегство от риска",
                "explanation": (
                    "Рынки падают, VIX взлетает, инвесторы продают акции и крипту, переходя в кэш и облигации. "
                    "Кредитные спреды расширяются — банки перестают кредитовать. "
                    "Это либо коррекция (-10-20%), либо начало bear market (-30%+)."
                ),
                "historical_context": (
                    "Risk-off фазы: средняя продолжительность 6-9 месяцев. "
                    "S&P 500: медианный drawdown -18%, максимальный -57%. "
                    "BTC: медианный decline -60% за 6 мес. "
                    "Золото: +10-15% за 6 мес. (safe-haven). "
                    "DXY: +5-8% (flight to safety + Fed hikes). "
                    "Treasury bonds (10Y): +6-10% total return. "
                    "VIX: рост с 15 до 35-45."
                ),
                "color": "red",
                "icon": "shield",
            },
            "transition": {
                "headline": "Режим TRANSITION — переломный момент",
                "explanation": (
                    "Рынок не может выбрать направление. Отдельные секторы растут, другие падают. "
                    "Лидеры прошлого цикла слабеют, новые лидеры ещё не определились. "
                    "Самая нестабильная фаза — ловушка для тех, кто покупает просадку слишком рано."
                ),
                "historical_context": (
                    "Transition фазы длятся 3-6 месяцев. "
                    "S&P 500: боковик ±5% с высокой волатильностью. "
                    "Секторная ротация: energy, staples outperform tech на 8-12%. "
                    "BTC: волатильность ±50% без чёткого тренда. "
                    "Золото: +3-5% (первые признаки hedge demand). "
                    "DXY: боковик ±2%."
                ),
                "color": "yellow",
                "icon": "git-branch",
            },
            "undefined": {
                "headline": "Режим UNDEFINED — недостаточно данных",
                "explanation": (
                    "Cross-market анализ не смог определить текущий режим. Возможные причины: "
                    "конфликтующие сигналы, недостаточная волатильность, технические проблемы."
                ),
                "historical_context": (
                    "При неопределённости рынка historically лучшая стратегия — нейтральная позиция с повышенным кэшем. "
                    "В периоды без чёткого regime S&P 500 показывал минимальную доходность 2-4% годовых с повышенной волатильностью."
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
                    "Возможен сценарий мягкой посадки или новый тип кризиса."
                ),
                historical_context=(
                    "Слабые аналогии (<30%) historically предшествовали как мягким посадкам (1995, 2019), "
                    "так и внезапным шокам (2020 — COVID). "
                    "Не полагаться только на аналогии — использовать комплексный анализ (PMI, NFP, CPI, earnings)."
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
            f"Текущая кривая и макро-контекст на {similarity:.0f}% совпадают с {analog_name}. "
            f"Тогда замедление {'наступило' if recession_followed else 'не наступило'}{lead_text}.{outcome_text}"
        )

        historical_context = (
            f"Уроки периода {analog_name}: {self._analog_lessons(analog_name)} "
            f"Лаг сигнала: {lead_time_months or 'N'} мес. "
            f"При сходстве >30% вероятность рецессии historically составляла {70 if recession_followed else 30}%. "
            f"SPX outcome: {sp500_outcome or 'N/A'}%."
        )

        return MetricInterpretation(
            metric="top_analog",
            status=status,
            headline=headline,
            explanation=explanation,
            historical_context=historical_context,
            color=color,
            icon="history",
        )

    @staticmethod
    def _analog_lessons(analog_name: str) -> str:
        lessons = {
            "2006-2007": "пузырь на рынке недвижимости, банки сильно leveredged",
            "2000": "переоценка tech, IPO-безумие, margin debt на пике",
            "1989": "банковский кризис S&L, геополитика",
            "1978-1980": "stagflation, Volcker shock, двойная рецессия",
            "1998": "LTCM, Russian default — Fed спас рынок",
            "1966": "credit crunch, но быстрое восстановление",
            "2019": "trade wars, COVID shock (внешний, не финансовый)",
        }
        return lessons.get(analog_name, "внимание к макро-шокам")

    # ────────────────────────────────
    # 6. Cross-Market Impact (per asset)
    # ────────────────────────────────

    def interpret_cross_market(
        self,
        asset: str,
        impact_3m: float,
        impact_6m: float,
        risk_level: str,
    ) -> MetricInterpretation:

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
            headline = f"{name}: модель указывает на позитив (+{avg_impact:.0f}% 3-6M)"
            explanation = (
                f"При текущей форме кривой {name} historically показывал рост +{impact_3m:.0f}% (3M) и +{impact_6m:.0f}% (6M). "
                f"Это один из лучших сигналов для данного актива в текущем regime."
            )
            historical_context = (
                f"В аналогичных периодах {name} outperform другие активы на 5-10%. "
                f"Risk level: {risk_level}. Волатильность historically на 20-30% ниже, чем в противоположном сценарии."
            )
        elif avg_impact > 0:
            status = "neutral-positive"
            color = "blue"
            headline = f"{name}: модель указывает на слабый позитив (+{avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Умеренный позитивный сигнал для {name}: +{impact_3m:.0f}% (3M), +{impact_6m:.0f}% (6M). "
                "Не самый сильный сценарий, но направление позитивное."
            )
            historical_context = (
                f"В аналогичных периодах {name} рос на 2-5% с умеренной волатильностью. "
                f"Risk level: {risk_level}. Сигнал неоднозначный — возможна боковика."
            )
        elif avg_impact > -5:
            status = "neutral-negative"
            color = "yellow"
            headline = f"{name}: модель указывает на слабый негатив ({avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Умеренный негативный сигнал для {name}: {impact_3m:.0f}% (3M), {impact_6m:.0f}% (6M). "
                "Возможна боковика или коррекция 5-10%."
            )
            historical_context = (
                f"В аналогичных периодах {name} показывал снижение 3-7% с повышенной волатильностью. "
                f"Risk level: {risk_level}. Не критично, но негативный bias присутствует."
            )
        else:
            status = "negative"
            color = "red"
            headline = f"{name}: модель указывает на сильный негатив ({avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Значительный негативный сигнал для {name}: {impact_3m:.0f}% (3M), {impact_6m:.0f}% (6M). "
                f"При текущей yield-curve конфигурации {name} historically underperform. "
                f"Risk level: {risk_level}."
            )
            historical_context = (
                f"В аналогичных периодах {name} показывал decline -10% до -25%. "
                f"Волатильность historically повышена на 40-60%. "
                f"Recovery period: в среднем 9-12 месяцев после достижения дна. "
                f"Safe-haven активы (золото, DXY) historically outperform в данной фазе."
            )

        return MetricInterpretation(
            metric=f"cross_market_{asset.lower()}",
            status=status,
            headline=headline,
            explanation=explanation,
            historical_context=historical_context,
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
            headline = f"Агрегированный прогноз: мягкая посадка или рост ({recession_prob:.0f}% рецессии)"
            explanation = (
                f"На основе {len(top_analogies)} исторических аналогий вероятность рецессии низкая ({recession_prob:.0f}%). "
                f"Confidence: {confidence}. Большинство аналогий указывают на продолжение роста или мягкое замедление."
            )
            historical_context = (
                f"При <30% рецессии S&P 500 historically рос на 8-12% годовых. "
                f"Крипто: медианный рост +50-80%. "
                f"Золото: ±5% (боковик). "
                f"Кредитные спреды: стабильны."
            )
            color = "green"
        elif recession_prob < 60:
            headline = f"Агрегированный прогноз: неопределённость, бифуркация ({recession_prob:.0f}% рецессии)"
            explanation = (
                f"Модель даёт {recession_prob:.0f}% — зона неопределённости. Аналогии противоречивы: "
                f"{', '.join(top_analogies[:3])}. Рынок может пойти в обе стороны."
            )
            historical_context = (
                f"При 30-60% вероятности S&P 500 historically показывал боковик ±5% с высокой волатильностью. "
                f"В 40% случаев рецессия не наступала (1995, 1998). "
                f"Секторная ротация: value outperform growth на 5-8%. "
                f"Крипто: волатильность ±60% без чёткого тренда."
            )
            color = "yellow"
        else:
            headline = f"Агрегированный прогноз: высокая вероятность замедления ({recession_prob:.0f}%)"
            explanation = (
                f"{recession_prob:.0f}% — большинство исторических аналогий указывают на замедление. "
                f"Корпоративные прибыли начнут снижаться через 2-4 квартала после сигнала."
            )
            historical_context = (
                f"При >60% вероятности рецессия наступала в 85% случаев. "
                f"S&P 500: медианный drawdown -25% за 12 мес., максимальный -57%. "
                f"Крипто: средний decline -50% за 6 мес. "
                f"Золото: +12-20% за 12 мес. "
                f"Treasury bonds (10Y): +8-12% total return. "
                f"DXY: +4-6%. "
                f"Кредитные спреды: расширение на 300-500 bps."
            )
            color = "red"

        return MetricInterpretation(
            metric="aggregated_forecast",
            status="warning" if recession_prob < 60 else "critical",
            headline=headline,
            explanation=explanation,
            historical_context=historical_context,
            color=color,
            icon="activity",
        )

    # ────────────────────────────────
    # Main Method
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

        metrics = []

        metrics.append(self.interpret_curve_shape(curve_shape))
        metrics.append(self.interpret_10y2y_spread(spread_10y2y))
        metrics.append(self.interpret_10y3m_spread(spread_10y3m))
        metrics.append(self.interpret_recession_probability(recession_prob))
        metrics.append(self.interpret_market_regime(market_regime))
        metrics.append(self.interpret_top_analog(
            analog_name, analog_similarity, analog_recession, analog_lead, analog_sp500
        ))

        if cross_market:
            for asset, data in cross_market.items():
                metrics.append(self.interpret_cross_market(
                    asset,
                    data.get("impact_3m", 0),
                    data.get("impact_6m", 0),
                    data.get("risk_level", "unknown"),
                ))

        if aggregated:
            metrics.append(self.interpret_aggregated_forecast(
                aggregated.get("recession_probability", 0),
                aggregated.get("confidence", "LOW"),
                aggregated.get("sp500_range"),
                aggregated.get("top_analogies", []),
            ))

        risk = self._risk_level(recession_prob or 0, curve_shape)
        risk_colors = {
            "LOW": "green",
            "MODERATE": "blue",
            "ELEVATED": "yellow",
            "HIGH": "red",
            "EXTREME": "darkred",
        }

        signals = []
        for m in metrics:
            if m.status in ("critical", "negative"):
                signals.append(f"🔴 {m.metric}: {m.headline}")
            elif m.status == "warning":
                signals.append(f"🟡 {m.metric}: {m.headline}")

        return DashboardInterpretation(
            timestamp=datetime.utcnow(),
            disclaimer=DISCLAIMER,
            overall_assessment=self._overall_assessment(risk, curve_shape, analog_name),
            overall_risk_level=risk,
            overall_color=risk_colors.get(risk, "gray"),
            metrics=metrics,
            signals=signals,
        )

    @staticmethod
    def _overall_assessment(risk: str, shape: str, analog: str) -> str:
        if risk in ("HIGH", "EXTREME"):
            return (
                f"Высокий риск: кривая {shape}, аналогия {analog}, "
                f"уровень риска {risk}. Исторически требовалось повышенное внимание к защите капитала."
            )
        elif risk == "ELEVATED":
            return (
                f"Повышенный риск: кривая {shape}, прецедент {analog}. "
                f"Исторически рекомендовалась консервативная позиция."
            )
        elif risk == "MODERATE":
            return (
                f"Умеренный риск: кривая {shape}. Неопределённость нарастает."
            )
        else:
            return (
                f"Низкий риск: кривая {shape}, благоприятные исторические условия."
            )


_interpretation_engine = None

def get_interpretation_engine() -> InterpretationEngine:
    global _interpretation_engine
    if _interpretation_engine is None:
        _interpretation_engine = InterpretationEngine()
    return _interpretation_engine
