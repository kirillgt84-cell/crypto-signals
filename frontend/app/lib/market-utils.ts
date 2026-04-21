// Market analysis helper functions
// Extracted from page.tsx for better testability

export const getRSIInterpretation = (rsi: number, timeframe: string): { text: string; color: string; detail: string } => {
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
      text: `Overbought (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "scalp short possible" : timeframe === "D" ? "trend reversal likely" : "consider profit taking"
    }
  }
  if (rsi < tf.oversold) {
    return { 
      text: `Oversold (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "scalp long possible" : timeframe === "D" ? "accumulation zone" : "bounce expected"
    }
  }
  return { 
    text: `Neutral (${tfLabel})`, 
    color: "text-amber-500",
    detail: timeframe === "15" ? "wait for breakout" : timeframe === "D" ? "trend continuation likely" : "impulse building"
  }
}

export const getMACDInterpretation = (macd: number, signal: number, timeframe: string): { text: string; color: string; detail: string } => {
  const isBullish = macd > signal
  const isPositive = macd > 0
  const tfLabel = timeframe === "15" ? "M15" : timeframe === "60" ? "1H" : timeframe === "240" ? "4H" : "1D"
  
  if (isBullish && isPositive) {
    return { 
      text: `Bullish (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "momentum shift - quick scalp" : timeframe === "D" ? "strong uptrend confirmed" : "trend gaining strength"
    }
  }
  if (!isBullish && !isPositive) {
    return { 
      text: `Bearish (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "downward momentum - quick short" : timeframe === "D" ? "downtrend established" : "selling pressure rising"
    }
  }
  if (isBullish && !isPositive) {
    return { 
      text: `Crossing up (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "early reversal signal" : timeframe === "D" ? "major reversal forming" : "possible bottom"
    }
  }
  return { 
    text: `Crossing down (${tfLabel})`, 
    color: "text-red-500",
    detail: timeframe === "15" ? "early weakness signal" : timeframe === "D" ? "major top forming" : "possible reversal"
  }
}

export const getFundingInterpretation = (funding: number, timeframe: string): { text: string; color: string; detail: string } => {
  const tfLabel = timeframe === "15" ? "Scalp" : timeframe === "60" ? "Intraday" : timeframe === "240" ? "Swing" : "Position"
  
  if (funding > 0.03) {
    return { 
      text: `Extreme long (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "possible short squeeze - caution" : timeframe === "D" ? "unsustainable - major correction near" : "funding squeeze risk"
    }
  }
  if (funding > 0.01) {
    return { 
      text: `Longs pay (${tfLabel})`, 
      color: "text-amber-500",
      detail: timeframe === "15" ? "minor cost - tolerable for scalps" : timeframe === "D" ? "avoid longs - pay every 8h" : "reduce position size"
    }
  }
  if (funding < -0.03) {
    return { 
      text: `Extreme short (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "possible long squeeze - quick bounces" : timeframe === "D" ? "capitulation - bottom forming" : "shorts getting squeezed"
    }
  }
  if (funding < -0.01) {
    return { 
      text: `Shorts pay (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "paid for longs - scalp advantage" : timeframe === "D" ? "ideal for long positions" : "accumulation favorable"
    }
  }
  return { 
    text: `Balanced (${tfLabel})`, 
    color: "text-muted-foreground",
    detail: "no funding pressure in either direction"
  }
}

export const getCVDInterpretation = (cvd: number, cvdChange: number): { text: string; color: string; detail: string } => {
  if (cvd > 1000000) {
    return { 
      text: "Strong buyer inflow", 
      color: "text-emerald-500",
      detail: "aggressive buying - bullish impulse"
    }
  }
  if (cvd > 0) {
    return { 
      text: "Buyers dominate", 
      color: "text-emerald-500",
      detail: "market buy orders prevailing"
    }
  }
  if (cvd < -1000000) {
    return { 
      text: "Strong seller inflow", 
      color: "text-red-500",
      detail: "aggressive selling - bearish impulse"
    }
  }
  if (cvd < 0) {
    return { 
      text: "Sellers dominate", 
      color: "text-red-500",
      detail: "market sell orders prevailing"
    }
  }
  return { 
    text: "Neutral", 
    color: "text-amber-500",
    detail: "balance between buyers and sellers"
  }
}

export const getExchangeFlowInterpretation = (flow: number, timeframe: string): { text: string; trend: "up" | "down"; detail: string } => {
  const tfLabel = timeframe === "15" ? "scalp" : timeframe === "60" ? "intraday" : timeframe === "240" ? "swing" : "position"
  
  if (flow < -500) {
    return { 
      text: "Strong outflow (Bullish)", 
      trend: "up",
      detail: `strong accumulation for ${tfLabel} trades`
    }
  }
  if (flow < 0) {
    return { 
      text: "Outflow (Bullish)", 
      trend: "up",
      detail: `accumulating deficit - ${tfLabel} longs favorable`
    }
  }
  if (flow > 500) {
    return { 
      text: "Strong inflow (Bearish)", 
      trend: "down",
      detail: `profit taking for ${tfLabel} - caution`
    }
  }
  if (flow > 0) {
    return { 
      text: "Inflow (Bearish)", 
      trend: "down",
      detail: `selling pressure for ${tfLabel} trades`
    }
  }
  return { 
    text: "Neutral", 
    trend: "up",
    detail: "no significant flow activity"
  }
}
