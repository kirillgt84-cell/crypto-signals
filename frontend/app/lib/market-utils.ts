// Market analysis helper functions
// Extracted from page.tsx for better testability

export const getRSIInterpretation = (
  rsi: number,
  timeframe: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): { text: string; color: string; detail: string } => {
  const thresholds = {
    "15": { overbought: 75, oversold: 25 },
    "60": { overbought: 72, oversold: 28 },
    "240": { overbought: 70, oversold: 30 },
    "D": { overbought: 65, oversold: 35 },
  }
  const tf = thresholds[timeframe as keyof typeof thresholds] || thresholds["60"]
  const tfLabel = timeframe === "15" ? "M15" : timeframe === "60" ? "1H" : timeframe === "240" ? "4H" : "1D"

  if (rsi > tf.overbought) {
    return {
      text: t("market.rsiOverbought", { tf: tfLabel }),
      color: "text-red-500",
      detail:
        timeframe === "15"
          ? t("market.rsiDetailScalpShort")
          : timeframe === "D"
          ? t("market.rsiDetailTrendReversal")
          : t("market.rsiDetailProfitTaking"),
    }
  }
  if (rsi < tf.oversold) {
    return {
      text: t("market.rsiOversold", { tf: tfLabel }),
      color: "text-emerald-500",
      detail:
        timeframe === "15"
          ? t("market.rsiDetailScalpLong")
          : timeframe === "D"
          ? t("market.rsiDetailAccumulation")
          : t("market.rsiDetailBounce"),
    }
  }
  return {
    text: t("market.rsiNeutral", { tf: tfLabel }),
    color: "text-amber-500",
    detail:
      timeframe === "15"
        ? t("market.rsiDetailWaitBreakout")
        : timeframe === "D"
        ? t("market.rsiDetailTrendContinuation")
        : t("market.rsiDetailImpulseBuilding"),
  }
}

export const getMACDInterpretation = (
  macd: number,
  signal: number,
  timeframe: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): { text: string; color: string; detail: string } => {
  const isBullish = macd > signal
  const isPositive = macd > 0
  const tfLabel = timeframe === "15" ? "M15" : timeframe === "60" ? "1H" : timeframe === "240" ? "4H" : "1D"

  if (isBullish && isPositive) {
    return {
      text: t("market.macdBullish", { tf: tfLabel }),
      color: "text-emerald-500",
      detail:
        timeframe === "15"
          ? t("market.macdDetailMomentumShift")
          : timeframe === "D"
          ? t("market.macdDetailStrongUptrend")
          : t("market.macdDetailTrendGaining"),
    }
  }
  if (!isBullish && !isPositive) {
    return {
      text: t("market.macdBearish", { tf: tfLabel }),
      color: "text-red-500",
      detail:
        timeframe === "15"
          ? t("market.macdDetailDownwardMomentum")
          : timeframe === "D"
          ? t("market.macdDetailDowntrend")
          : t("market.macdDetailSellingPressure"),
    }
  }
  if (isBullish && !isPositive) {
    return {
      text: t("market.macdCrossingUp", { tf: tfLabel }),
      color: "text-emerald-500",
      detail:
        timeframe === "15"
          ? t("market.macdDetailEarlyReversal")
          : timeframe === "D"
          ? t("market.macdDetailMajorReversal")
          : t("market.macdDetailPossibleBottom"),
    }
  }
  return {
    text: t("market.macdCrossingDown", { tf: tfLabel }),
    color: "text-red-500",
    detail:
      timeframe === "15"
        ? t("market.macdDetailEarlyWeakness")
        : timeframe === "D"
        ? t("market.macdDetailMajorTop")
        : t("market.macdDetailPossibleReversal"),
  }
}

export const getFundingInterpretation = (
  funding: number,
  timeframe: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): { text: string; color: string; detail: string } => {
  const tfLabel = timeframe === "15" ? t("market.fundingScalp") : timeframe === "60" ? t("market.fundingIntraday") : timeframe === "240" ? t("market.fundingSwing") : t("market.fundingPosition")

  if (funding > 0.03) {
    return {
      text: t("market.fundingExtremeLong", { tf: tfLabel }),
      color: "text-red-500",
      detail:
        timeframe === "15"
          ? t("market.fundingDetailShortSqueeze")
          : timeframe === "D"
          ? t("market.fundingDetailUnsustainable")
          : t("market.fundingDetailFundingSqueeze"),
    }
  }
  if (funding > 0.01) {
    return {
      text: t("market.fundingLongsPay", { tf: tfLabel }),
      color: "text-amber-500",
      detail:
        timeframe === "15"
          ? t("market.fundingDetailMinorCost")
          : timeframe === "D"
          ? t("market.fundingDetailAvoidLongs")
          : t("market.fundingDetailReduceSize"),
    }
  }
  if (funding < -0.03) {
    return {
      text: t("market.fundingExtremeShort", { tf: tfLabel }),
      color: "text-emerald-500",
      detail:
        timeframe === "15"
          ? t("market.fundingDetailLongSqueeze")
          : timeframe === "D"
          ? t("market.fundingDetailCapitulation")
          : t("market.fundingDetailShortsSqueezed"),
    }
  }
  if (funding < -0.01) {
    return {
      text: t("market.fundingShortsPay", { tf: tfLabel }),
      color: "text-emerald-500",
      detail:
        timeframe === "15"
          ? t("market.fundingDetailPaidForLongs")
          : timeframe === "D"
          ? t("market.fundingDetailIdealLongs")
          : t("market.fundingDetailAccumulationFavorable"),
    }
  }
  return {
    text: t("market.fundingBalanced", { tf: tfLabel }),
    color: "text-muted-foreground",
    detail: t("market.fundingDetailNoPressure"),
  }
}

export const getCVDInterpretation = (
  cvd: number,
  cvdChange: number,
  t: (key: string, vars?: Record<string, string | number>) => string
): { text: string; color: string; detail: string } => {
  if (cvd > 1000000) {
    return {
      text: t("market.cvdStrongBuyers"),
      color: "text-emerald-500",
      detail: t("market.cvdDetailAggressiveBuying"),
    }
  }
  if (cvd > 0) {
    return {
      text: t("market.cvdBuyersDominate"),
      color: "text-emerald-500",
      detail: t("market.cvdDetailMarketBuyOrders"),
    }
  }
  if (cvd < -1000000) {
    return {
      text: t("market.cvdStrongSellers"),
      color: "text-red-500",
      detail: t("market.cvdDetailAggressiveSelling"),
    }
  }
  if (cvd < 0) {
    return {
      text: t("market.cvdSellersDominate"),
      color: "text-red-500",
      detail: t("market.cvdDetailMarketSellOrders"),
    }
  }
  return {
    text: t("market.cvdNeutral"),
    color: "text-amber-500",
    detail: t("market.cvdDetailBalance"),
  }
}

export const getFuturesSpotRatioInterpretation = (
  ratio: number,
  timeframe: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): { text: string; trend: "up" | "down"; detail: string } => {
  const tfLabel = timeframe === "15" ? t("market.fundingScalp") : timeframe === "60" ? t("market.fundingIntraday") : timeframe === "240" ? t("market.fundingSwing") : t("market.fundingPosition")

  if (ratio > 8) {
    return {
      text: t("market.ratioSpeculativeHigh"),
      trend: "down",
      detail: t("market.ratioDetailCrowdedLeverage", { tf: tfLabel }),
    }
  }
  if (ratio > 5) {
    return {
      text: t("market.ratioSpeculative"),
      trend: "down",
      detail: t("market.ratioDetailElevatedFutures", { tf: tfLabel }),
    }
  }
  if (ratio > 0 && ratio < 2) {
    return {
      text: t("market.ratioSpotDriven"),
      trend: "up",
      detail: t("market.ratioDetailSpotAccumulation", { tf: tfLabel }),
    }
  }
  if (ratio > 0 && ratio < 3) {
    return {
      text: t("market.ratioBalanced"),
      trend: "up",
      detail: t("market.ratioDetailLowLeverage", { tf: tfLabel }),
    }
  }
  return {
    text: t("market.ratioNeutral"),
    trend: "up",
    detail: t("market.ratioDetailTypicalPremium", { tf: tfLabel }),
  }
}
