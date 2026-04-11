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
      detail: timeframe === "15" ? " scalp short opportunity" : timeframe === "D" ? "swing reversal likely" : "consider taking profits"
    }
  }
  if (rsi < tf.oversold) {
    return { 
      text: `Oversold (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "scalp long opportunity" : timeframe === "D" ? "accumulation zone" : "bounce expected"
    }
  }
  return { 
    text: `Neutral (${tfLabel})`, 
    color: "text-amber-500",
    detail: timeframe === "15" ? "wait for breakout" : timeframe === "D" ? "trend continuation likely" : "momentum building"
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
      detail: timeframe === "15" ? "momentum down - quick short" : timeframe === "D" ? "downtrend established" : "selling pressure building"
    }
  }
  if (isBullish && !isPositive) {
    return { 
      text: `Crossing Up (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "early reversal signal" : timeframe === "D" ? "major trend reversal forming" : "potential bottom"
    }
  }
  return { 
    text: `Crossing Down (${tfLabel})`, 
    color: "text-red-500",
    detail: timeframe === "15" ? "early weakness signal" : timeframe === "D" ? "major top forming" : "potential reversal"
  }
}

export const getFundingInterpretation = (funding: number, timeframe: string): { text: string; color: string; detail: string } => {
  const tfLabel = timeframe === "15" ? "Scalp" : timeframe === "60" ? "Intraday" : timeframe === "240" ? "Swing" : "Position"
  
  if (funding > 0.03) {
    return { 
      text: `Extreme Long Bias (${tfLabel})`, 
      color: "text-red-500",
      detail: timeframe === "15" ? "short squeeze possible - scalp with caution" : timeframe === "D" ? "unsustainable - major correction coming" : "funding squeeze risk"
    }
  }
  if (funding > 0.01) {
    return { 
      text: `Longs Pay (${tfLabel})`, 
      color: "text-amber-500",
      detail: timeframe === "15" ? "slight overhead - manageable for scalps" : timeframe === "D" ? "avoid longs - pay every 8h" : "reduce position size"
    }
  }
  if (funding < -0.03) {
    return { 
      text: `Extreme Short Bias (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "long squeeze possible - quick bounces" : timeframe === "D" ? "capitulation - bottom forming" : "shorts getting squeezed"
    }
  }
  if (funding < -0.01) {
    return { 
      text: `Shorts Pay (${tfLabel})`, 
      color: "text-emerald-500",
      detail: timeframe === "15" ? "paid to hold longs - scalp advantage" : timeframe === "D" ? "ideal for long swing positions" : "accumulation favored"
    }
  }
  return { 
    text: `Balanced (${tfLabel})`, 
    color: "text-muted-foreground",
    detail: "no funding pressure either direction"
  }
}

export const getExchangeFlowInterpretation = (flow: number, timeframe: string): { text: string; trend: "up" | "down"; detail: string } => {
  const tfLabel = timeframe === "15" ? "scalp" : timeframe === "60" ? "intraday" : timeframe === "240" ? "swing" : "position"
  
  if (flow < -500) {
    return { 
      text: "Heavy Outflow (Bullish)", 
      trend: "up",
      detail: `strong accumulation for ${tfLabel} trades`
    }
  }
  if (flow < 0) {
    return { 
      text: "Outflow (Bullish)", 
      trend: "up",
      detail: `supply shock building - ${tfLabel} longs favored`
    }
  }
  if (flow > 500) {
    return { 
      text: "Heavy Inflow (Bearish)", 
      trend: "down",
      detail: `profit taking for ${tfLabel} - caution advised`
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
