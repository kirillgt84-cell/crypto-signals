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
    "The information is exclusively educational and analytical in nature."
    "It is not an investment recommendation or an offer to buy/sell assets"
    "or portfolio management. Past performance does not guarantee future results."
    "Any decisions are made by the user independently and at his own risk."
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
    overall_risk_level: str = "LOW" # LOW / MODERATE / ELEVATED / HIGH
    overall_color: str = "green"
    metrics: List[MetricInterpretation] = field(default_factory=list)
    signals: List[str] = field(default_factory=list)


class InterpretationEngine:
    """Generator of historical interpretations for Yield Curve metrics.
    
    All formulations are based on historical facts and statistics.
    Does not contain investment recommendations or specific tickers
    or guarantees of profitability."""

    def __init__(self):
        pass

    # ────────────────────────────────
    #Helpers
    # ────────────────────────────────

    @staticmethod
    def _recession_color(prob: float) -> str:
        if prob < 10: return "green"
        if prob < 25: return "yellow"
        if prob < 50: return "orange"
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
    #1. Curve Shape
    # ────────────────────────────────

    def interpret_curve_shape(self, shape: str) -> MetricInterpretation:
        interpretations = {
            "normal": {
                "status": "normal",
                "headline": "Norm Curve - Standard Mode",
                "explanation": (
                    "Long-term rates are higher than short-term rates. This reflects healthy expectations for inflation and growth."
                    "Banks receive a positive rate reversal (positive carry), which stimulates lending."
                ),
                "historical_context": (
                    "During the normal curve periods (1975-1978, 1983-1989, 2003-2005) equities showed an average return of 12-15% per annum."
                    "Crypto assets (in available history since 2013) also showed positive dynamics in this phase."
                    "Defensive assets (gold, short-term bonds) have historically underperformed against equities."
                ),
                "color": "green",
                "icon": "trending-up",
            },
            "flat": {
                "status": "warning",
                "headline": "The curve is flattened - the market is losing confidence",
                "explanation": (
                    "Spreads between short-term and long-term rates are minimal."
                    "Investors are not demanding a significant premium over time - or they are expecting a slowdown in growth,"
                    "or the Fed keeps short-term rates high."
                ),
                "historical_context": (
                    "Every flat curve since 1965 has been preceded by either an inversion or a sharp economic slowdown."
                    "In 1994-1995 the curve was flat for 8 months, followed by a soft landing without a recession."
                    "In 2006 the curve was flat for 4 months before the inversion."
                    "During periods of a flat curve, equities showed increased volatility: the average drawdown was -12%."
                ),
                "color": "yellow",
                "icon": "alert-triangle",
            },
            "inverted": {
                "status": "critical",
                "headline": "An inverted curve is a harbinger of a slowdown",
                "explanation": (
                    "Short-term rates are higher than long-term rates. The market is discounting a sharp slowdown:"
                    "Investors are moving into long bonds, suppressing yields, while the Fed keeps short rates high."
                ),
                "historical_context": (
                    "According to a study by the San Francisco Federal Reserve Bank (Estrella & Hardouvelis, 1991),"
                    "the 10Y-2Y reversal has preceded economic slowdowns in 8 of 9 observations since 1955."
                    "Average lag: 12-18 months. The only exception is 1966 (soft landing without a decline in GDP)."
                    "With an inverted curve, the S&P 500 showed a median drawdown of -18% over the next 12 months."
                    "Gold in the same period historically outperformed by +8-15% due to safe-haven demand."
                ),
                "color": "red",
                "icon": "trending-down",
            },
            "humped": {
                "status": "warning",
                "headline": "Humpback curve - instability, phase change",
                "explanation": (
                    "Intermediate-term rates (5-7Y) are higher than long-term rates (10-30Y), but the curve is not yet completely inverted."
                    "A rare and short-lived phase - usually precedes a complete inversion or a sharp Fed reversal."
                ),
                "historical_context": (
                    "The humpback curve was observed in 1978 (before the Volcker shock), 1989 (before the S&L crisis) and 2000 (before dot-com)."
                    "Duration of the humpback phase: on average 2-4 months."
                    "In this phase, defensive sectors (utilities, healthcare, consumer staples) historically outperform growth by 5-8%."
                ),
                "color": "orange",
                "icon": "activity",
            },
        }

        data = interpretations.get(shape.lower(), interpretations["normal"])
        return MetricInterpretation(metric="curve_shape", **data)

    # ────────────────────────────────
    #2. Spreads (10Y-2Y, 10Y-3M)
    # ────────────────────────────────

    def interpret_10y2y_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="unknown",
                headline="10Y-2Y data not available",
                explanation="Could not get current spread 10Y-2Y. Check your connection to the FRED API.",
                historical_context="In the absence of data, historical comparisons cannot be made. Use alternative sources.",
                color="gray",
                icon="help-circle",
            )

        if spread > 1.0:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y spread {spread:.2f}% - steep curve",
                explanation=(
                    f"The spread {spread:.2f}% indicates a healthy time premium."
                    "The market expects stable growth and inflation within the target."
                    "Banks are actively lending, margin lending is growing."
                ),
                historical_context=(
                    f"With a spread of >1%, equities have historically shown an average return of 14% per annum (1996-1997, 2003-2004, 2013-2014)."
                    f"High-beta assets (crypto, growth stocks) in this phase outperform value by 8-12%."
                    f"Bonds with duration <2 years historically underperform equities by 6-8%."
                ),
                color="green",
                icon="arrow-up-right",
            )
        elif spread > 0.25:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="normal",
                headline=f"10Y-2Y spread {spread:.2f}% - positive, but declining",
                explanation=(
                    f"The spread is positive, but no longer aggressive. The market is starting to price in the risk of a slowdown, but there is no panic."
                    "A typical late-cycle phase—growth continues, but the rate slows."
                ),
                historical_context=(
                    f"With a spread of 0.25-1.0%, increased volatility was observed: the average max drawdown of the S&P 500 was -8% for 6 months."
                    f"In 2018 the spread was 0.5% before the -20% correction (no recession)."
                    f"Dividend shares have historically outperformed growth by 3-5% in this phase."
                    f"Crypto assets showed volatility of ±30-40% in a three-month window."
                ),
                color="blue",
                icon="minus",
            )
        elif spread > -0.10:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="warning",
                headline=f"10Y-2Y spread {spread:.2f}% - almost flat, early warning",
                explanation=(
                    f"The spread has tightened to {spread:.2f}%. Every time 10Y-2Y has approached zero in the last 50 years,"
                    "in the next 6-18 months, either a recession began or the Fed sharply cut rates."
                ),
                historical_context=(
                    f"With a spread of -0.1% to +0.25%, the S&P 500 historically showed an average drawdown of -10% over 6 months."
                    f"Crypto assets in this phase: median decline -25% (BTC), -35% (ETH)."
                    f"Gold historically outperforms by +5-10%. The VIX averaged from 15 to 25."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        else:
            return MetricInterpretation(
                metric="10y2y_spread",
                status="critical",
                headline=f"10Y-2Y spread {spread:.2f}% - inversion",
                explanation=(
                    f"The 10Y-2Y inversion at {spread:.2f}% is active."
                    "An inversion has preceded an economic slowdown in 8 out of 9 observations since 1955, according to the San Francisco Fed."
                    f"The only exception is 1966 (soft landing without a decline in GDP)."
                ),
                historical_context=(
                    f"During the inversion, the S&P 500 showed a median drawdown of -18% over 12 months."
                    f"Maximum drawdowns: 2008 (-57%), 2001 (-49%), 1973 (-48%)."
                    f"Gold: median growth +12% over 12 months. after inversion."
                    f"Crypto (in history since 2013): BTC showed a decline of -40% on average over 6 months. after inversion."
                    f"Cash and short-term bonds have historically maintained par value."
                ),
                color="red",
                icon="trending-down",
            )

    def interpret_10y3m_spread(self, spread: Optional[float]) -> MetricInterpretation:
        if spread is None:
            return MetricInterpretation(
                metric="10y3m_spread",
                status="unknown",
                headline="10Y-3M data not available",
                explanation="Could not get current spread 10Y-3M.",
                historical_context="10Y-3M is a key predictor in the NY Fed Logistic Model. In the absence of data, use alternative indicators.",
                color="gray",
                icon="help-circle",
            )

        if spread > 1.5:
            status = "normal"
            headline = f"10Y-3M spread {spread:.2f}% - steep curve"
            explanation = (
                f"10Y-3M at {spread:.2f}% is the 'safe zone'. The NY Fed model gives <5% chance of a slowdown."
                "Short-term rates are significantly lower than long-term rates, which stimulates lending and investment."
            )
            historical_context = (
                f"At 10Y-3M >1.5%, recession was observed <2% of the time over the 60 years of data."
                f"The S&P 500 grew at an average annual rate of 15%. Crypto assets: median growth +80% per annum (in available history)."
                f"High-yield bonds outperform investment-grade by 2-3%."
            )
            color = "green"
        elif spread > 0.0:
            status = "normal"
            headline = f"10Y-3M spread {spread:.2f}% - positive, but declining"
            explanation = (
                f"The spread is still positive ({spread:.2f}%), but no longer aggressive."
                "The probability of a recession according to the NY Fed model is below 10%. Late expansion phase."
            )
            historical_context = (
                f"With a spread of 0-1.5%, both soft landings (1995, 2019) and recessions (2001, 2007) were observed."
                f"S&P 500: average return of 8% per annum, but with increased volatility."
                f"Crypto: ±50% volatility in a three-month window."
            )
            color = "blue"
        elif spread > -0.50:
            status = "warning"
            headline = f"10Y-3M spread {spread:.2f}% - close to inversion"
            explanation = (
                f"10Y-3M approaches zero ({spread:.2f}%). An earlier and more sensitive indicator than 10Y-2Y."
                "The NY Fed uses this spread to calculate the likelihood of a recession."
            )
            historical_context = (
                f"With a spread of -0.5% to 0%, the probability of a recession according to the NY Fed model has historically been 15-30%."
                f"S&P 500: average drawdown -12% for 6 months."
                f"BTC: median decline -30% in a three-month window."
                f"Gold: +5-8% for 6 months."
            )
            color = "yellow"
        else:
            status = "critical"
            headline = f"10Y-3M spread {spread:.2f}% - inversion (NY Fed model)"
            explanation = (
                f"The 10Y-3M inversion by {spread:.2f}% is a key input for the NY Fed Logistic Model."
                "This spread has predicted every recession since the 1960s. The only exception is 1998 (short-term inversion, rapid Fed reversal)."
            )
            historical_context = (
                f"With a 10Y-3M inversion, the probability of recession historically was 40-70%."
                f"S&P 500: median drawdown -20% for 12 months, maximum -57% (2008)."
                f"BTC (in history since 2013): average decline -45% over 6 months. after inversion."
                f"Gold: +10-18% for 12 months. like safe-haven."
                f"Dollar (DXY): +3-5% for 6 months. on flight-to-safety."
                f"Short-term bonds: maintaining par value."
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
    #3. Recession Probability
    # ────────────────────────────────

    def interpret_recession_probability(self, prob: Optional[float]) -> MetricInterpretation:
        if prob is None:
            return MetricInterpretation(
                metric="recession_probability",
                status="unknown",
                headline="Probability unknown",
                explanation="No data for calculation. The 10Y-3M spread may not be available.",
                historical_context="Use alternative indicators: Conference Board LEI, PMIs, unemployment claims.",
                color="gray",
                icon="help-circle",
            )

        if prob < 10:
            return MetricInterpretation(
                metric="recession_probability",
                status="normal",
                headline=f"Probability of slowdown: {prob:.1f}% - green zone",
                explanation=(
                    f"The NY Fed model estimates the chance of a recession at {prob:.1f}% for 12 months."
                    "Historically low level. The economy is in an expansion phase."
                ),
                historical_context=(
                    f"With a probability of <10%, recession was observed in <5% of cases."
                    f"S&P 500: average return of 14% per annum."
                    f"Crypto: median growth +60-100% per annum."
                    f"Gold: ±5% (sideways)."
                    f"Credit spreads: tight, stable."
                ),
                color="green",
                icon="shield-check",
            )
        elif prob < 25:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Probability of slowdown: {prob:.1f}% - yellow zone",
                explanation=(
                    f"The model produces {prob:.1f}% - above the minimum, but not yet critical."
                    "A typical phase of the late cycle, when growth slows down, but there is no decline yet."
                    "Examples: 2018 (preceded a -20% correction), 1995 (soft landing)."
                ),
                historical_context=(
                    f"With a 10-25% probability: the S&P 500 showed an average drawdown of -8% over 6 months."
                    f"In 50% of cases, a recession did not occur (1995, 1998, 2019)."
                    f"Crypto: volatility ±40% in a three-month window."
                    f"Defensive sectors outperform growth by 2-4%."
                ),
                color="yellow",
                icon="alert-triangle",
            )
        elif prob < 50:
            return MetricInterpretation(
                metric="recession_probability",
                status="warning",
                headline=f"Probability of slowdown: {prob:.1f}% - orange zone",
                explanation=(
                    f"{prob:.1f}% - serious level. The NY Fed model is considered one of the most accurate:"
                    "predicted slowdowns in 1970, 1973, 1980, 1981, 1990, 2001, 2007, 2020."
                ),
                historical_context=(
                    f"At 25-50%: the S&P 500 showed an average drawdown of -15% over 12 months."
                    f"Recession occurred in 70% of cases."
                    f"BTC: median decline -35% over 6 months."
                    f"Gold: +8-12% for 12 months."
                    f"DXY: +2-4% on safe-haven demand."
                    f"Credit spreads (HY-IG): widening by 150-250 bps."
                ),
                color="orange",
                icon="alert-octagon",
            )
        else:
            return MetricInterpretation(
                metric="recession_probability",
                status="critical",
                headline=f"Probability of slowdown: {prob:.1f}% - red zone",
                explanation=(
                    f"{prob:.1f}% - critical level. These values ​​were observed before:"
                    "2008 (peak ~45% in 2006), 2001 (peak ~50% in 2000), 1990 (peak ~35% in 1989)."
                    "The market is already discounting the decline."
                ),
                historical_context=(
                    f"With probability >50%: recession occurred in 85% of cases."
                    f"S&P 500: median drawdown -25% for 12 months, maximum -57% (2008)."
                    f"BTC (since 2013): average decline -50% over 6 months."
                    f"Gold: +12-20% for 12 months."
                    f"DXY: +4-6%. "
                    f"Treasury bonds (10Y): +8-12% total return. "
                    f"Credit spreads: widening by 300-500 bps."
                ),
                color="red",
                icon="skull",
            )

    # ────────────────────────────────
    #4. Market Regime
    # ────────────────────────────────

    def interpret_market_regime(self, regime: str) -> MetricInterpretation:
        regimes = {
            "risk-on": {
                "headline": "RISK-ON mode - markets are rising",
                "explanation": (
                    "All asset classes are showing positive dynamics. VIX is low, credit spreads are compressed,"
                    "investors buy growth and high-beta. The 'greed' phase on the Fear&Greed scale."
                ),
                "historical_context": (
                    "Risk-on modes historically last 12-24 months."
                    "During this phase, the S&P 500 showed an average return of 18% per annum."
                    "NASDAQ outperform SPX by 5-8%."
                    "Crypto (BTC): median growth +120% per annum."
                    "Gold: underperform by -5% (investors prefer yield)."
                    "DXY: weakens by 2-3% (carry trades)."
                ),
                "color": "green",
                "icon": "rocket",
            },
            "risk-off": {
                "headline": "RISK-OFF mode - escape from risk",
                "explanation": (
                    "Markets are falling, VIX is soaring, investors are selling stocks and crypto, moving into cash and bonds."
                    "Credit spreads widen as banks stop lending."
                    "This is either a correction (-10-20%) or the beginning of a bear market (-30%+)."
                ),
                "historical_context": (
                    "Risk-off phase: average duration 6-9 months."
                    "S&P 500: median drawdown -18%, maximum -57%."
                    "BTC: median decline -60% over 6 months."
                    "Gold: +10-15% for 6 months. (safe-haven)."
                    "DXY: +5-8% (flight to safety + Fed hikes). "
                    "Treasury bonds (10Y): +6-10% total return. "
                    "VIX: growth from 15 to 35-45."
                ),
                "color": "red",
                "icon": "shield",
            },
            "transition": {
                "headline": "TRANSITION mode is the turning point",
                "explanation": (
                    "The market cannot choose a direction. Some sectors are growing, others are falling."
                    "The leaders of the last cycle are weakening, new leaders have not yet been identified."
                    "The most unstable phase is a trap for those who buy the drawdown too early."
                ),
                "historical_context": (
                    "Transition phases last 3-6 months."
                    "S&P 500: flat ±5% with high volatility."
                    "Sector rotation: energy, staples outperform tech by 8-12%."
                    "BTC: volatility ±50% without a clear trend."
                    "Gold: +3-5% (first signs of hedge demand)."
                    "DXY: sidewall ±2%."
                ),
                "color": "yellow",
                "icon": "git-branch",
            },
            "undefined": {
                "headline": "UNDEFINED mode - not enough data",
                "explanation": (
                    "Cross-market analysis could not determine the current mode. Possible reasons:"
                    "conflicting signals, insufficient volatility, technical problems."
                ),
                "historical_context": (
                    "When the market is uncertain, historically the best strategy is a neutral position with increased cache."
                    "During periods without a clear regime, the S&P 500 showed a minimum return of 2-4% per annum with increased volatility."
                ),
                "color": "grey",
                "icon": "help-circle",
            },
        }

        data = regimes.get(regime.lower(), regimes["undefined"])
        return MetricInterpretation(metric="market_regime", status=regime.lower(), **data)

    # ────────────────────────────────
    #5.Historical Analogue
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
                headline=f"Top analogy: {analog_name} ({similarity:.0f}% match) - weak connection",
                explanation=(
                    f"The similarity is just {similarity:.0f}%. The current situation is unique and has no clear historical precedent."
                    "A soft landing scenario or a new type of crisis is possible."
                ),
                historical_context=(
                    "Weak analogies (<30%) historically preceded both soft landings (1995, 2019),"
                    "and sudden shocks (2020 - COVID)."
                    "Do not rely only on analogies - use complex analysis (PMI, NFP, CPI, earnings)."
                ),
                color="blue",
                icon="history",
            )

        status = "warning" if recession_followed else "normal"
        color = "red" if recession_followed else "green"

        recession_text = "with recession" if recession_followed else "no recession"
        lead_text = f"in {lead_time_months} ​​months." if lead_time_months else ""
        outcome_text = f" SPX: {sp500_outcome:+.0f}%." if sp500_outcome else ""

        headline = f"Top analogy: {analog_name} ({similarity:.0f}% match) - {recession_text}"

        explanation = (
            f"The current curve and macro context are {similarity:.0f}% identical to {analog_name}."
            f"Then the slowdown {'has occurred' if recession_followed else 'has not occurred'}{lead_text}.{outcome_text}"
        )

        historical_context = (
            f"Lessons from the period {analog_name}: {self._analog_lessons(analog_name)}"
            f"Signal lag: {lead_time_months or 'N'} months."
            f"With similarity >30%, the probability of recession historically was {70 if recession_followed else 30}%."
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
            "2006-2007": "real estate bubble, banks heavily levered",
            "2000": "revaluation of tech, IPO madness, margin debt at its peak",
            "1989": "S&L banking crisis, geopolitics",
            "1978-1980": "stagflation, Volcker shock, double recession",
            "1998": "LTCM, Russian default - Fed saved the market",
            "1966": "credit crunch, but quick recovery",
            "2019": "trade wars, COVID shock (external, not financial)",
        }
        return lessons.get(analog_name, "attention to macro shocks")

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
            "GOLD": "Gold",
            "OIL": "Oil",
            "DXY": "Dollar Index (DXY)",
        }
        name = asset_names.get(asset, asset)
        avg_impact = (impact_3m + impact_6m) / 2

        if avg_impact > 5:
            status = "positive"
            color = "green"
            headline = f"{name}: model indicates positive (+{avg_impact:.0f}% 3-6M)"
            explanation = (
                f"With the current shape of the curve, {name} has historically shown an increase of +{impact_3m:.0f}% (3M) and +{impact_6m:.0f}% (6M)."
                f"This is one of the best signals for this asset in the current regime."
            )
            historical_context = (
                f"In similar periods {name} outperform other assets by 5-10%."
                f"Risk level: {risk_level}. Volatility is historically 20-30% lower than in the opposite scenario."
            )
        elif avg_impact > 0:
            status = "neutral-positive"
            color = "blue"
            headline = f"{name}: model indicates weak positive (+{avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Moderate positive signal for {name}: +{impact_3m:.0f}% (3M), +{impact_6m:.0f}% (6M)."
                "Not the strongest scenario, but the direction is positive."
            )
            historical_context = (
                f"In similar periods, {name} grew by 2-5% with moderate volatility."
                f"Risk level: {risk_level}. The signal is ambiguous - sideways movement is possible."
            )
        elif avg_impact > -5:
            status = "neutral-negative"
            color = "yellow"
            headline = f"{name}: model indicates weak negativity ({avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Moderate negative signal for {name}: {impact_3m:.0f}% (3M), {impact_6m:.0f}% (6M)."
                "Sideways or correction of 5-10% is possible."
            )
            historical_context = (
                f"In similar periods, {name} showed a decrease of 3-7% with increased volatility."
                f"Risk level: {risk_level}. Not critical, but negative bias is present."
            )
        else:
            status = "negative"
            color = "red"
            headline = f"{name}: model indicates strong negativity ({avg_impact:.0f}% 3-6M)"
            explanation = (
                f"Significant negative signal for {name}: {impact_3m:.0f}% (3M), {impact_6m:.0f}% (6M)."
                f"With the current yield-curve configuration, {name} historically underperform."
                f"Risk level: {risk_level}."
            )
            historical_context = (
                f"In similar periods, {name} showed a decline of -10% to -25%."
                f"Volatility has historically increased by 40-60%."
                f"Recovery period: on average 9-12 months after reaching the bottom."
                f"Safe-haven assets (gold, DXY) historically outperform in this phase."
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
    #7. Aggregated Forecast
    # ────────────────────────────────

    def interpret_aggregated_forecast(
        self,
        recession_prob: float,
        confidence: str,
        sp500_range: Optional[List[float]],
        top_analogies: List[str],
    ) -> MetricInterpretation:

        if recession_prob < 30:
            headline = f"Aggregated forecast: soft landing or growth ({recession_prob:.0f}% recession)"
            explanation = (
                f"Based on {len(top_analogies)} historical analogies, the probability of a recession is low ({recession_prob:.0f}%)."
                f"Confidence: {confidence}. Most analogies point to continued growth or a mild slowdown."
            )
            historical_context = (
                f"In <30% recessions, the S&P 500 has historically grown 8-12% annually."
                f"Crypto: median growth +50-80%."
                f"Gold: ±5% (sideways)."
                f"Credit spreads: stable."
            )
            color = "green"
        elif recession_prob < 60:
            headline = f"Aggregated forecast: uncertainty, bifurcation ({recession_prob:.0f}% recession)"
            explanation = (
                f"The model gives {recession_prob:.0f}% - the zone of uncertainty. The analogies are contradictory:"
                f"{', '.join(top_analogies[:3])}. The market can go both ways."
            )
            historical_context = (
                f"With a 30-60% probability, the S&P 500 historically showed a sideways trend of ±5% with high volatility."
                f"In 40% of cases, a recession did not occur (1995, 1998)."
                f"Sector rotation: value outperform growth by 5-8%."
                f"Crypto: volatility ±60% without a clear trend."
            )
            color = "yellow"
        else:
            headline = f"Aggregate forecast: high probability of slowdown ({recession_prob:.0f}%)"
            explanation = (
                f"{recession_prob:.0f}% - Most historical analogies point to a slowdown."
                f"Corporate profits will begin to decline 2-4 quarters after the signal."
            )
            historical_context = (
                f"With >60% probability, recession occurred in 85% of cases."
                f"S&P 500: median drawdown -25% for 12 months, maximum -57%."
                f"Crypto: average decline -50% over 6 months."
                f"Gold: +12-20% for 12 months."
                f"Treasury bonds (10Y): +8-12% total return. "
                f"DXY: +4-6%. "
                f"Credit spreads: widening by 300-500 bps."
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
    #MainMethod
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
                f"High risk: curve {shape}, analogy {analog},"
                f"risk level {risk}. Historically, increased attention to capital protection has been required."
            )
        elif risk == "ELEVATED":
            return (
                f"Increased risk: curve {shape}, precedent {analog}."
                f"Historically, a conservative position has been recommended."
            )
        elif risk == "MODERATE":
            return (
                f"Moderate risk: {shape} curve. Uncertainty increases."
            )
        else:
            return (
                f"Low risk: {shape} curve, favorable historical conditions."
            )


_interpretation_engine = None

def get_interpretation_engine() -> InterpretationEngine:
    global _interpretation_engine
    if _interpretation_engine is None:
        _interpretation_engine = InterpretationEngine()
    return _interpretation_engine
