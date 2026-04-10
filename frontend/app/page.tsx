"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3, Wallet, Target, Zap, Sigma } from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TradingViewChart } from "./components/TradingViewChart"
import Sidebar from "./components/admin/Sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const symbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK", "AVAX", "MATIC"]

const timeframes = [
  { value: "15", label: "M15" },
  { value: "60", label: "1H" },
  { value: "240", label: "4H" },
  { value: "D", label: "1D" },
]

interface MarketData {
  symbol: string
  price: number
  change_24h: number
  oi: number
  oi_change: number
  volume: number
  cvd: number
  cvd_change: number
  signal: "LONG" | "SHORT" | "NEUTRAL"
  score?: number
  ema20: number
  ema50: number
  ema200: number
  poc: number
  vah: number
  val: number
  atr: number
  funding: number
  rsi: number
  macd: number
  macd_signal: number
  exchange_flow: number
}

interface ChecklistItem {
  name: string
  passed: boolean
  description: string
}

interface ChecklistData {
  symbol: string
  score: number
  total: number
  items: ChecklistItem[]
  recommendation: string
  timestamp: string
}

interface LiquidationLevel {
  price: number
  side: "Long" | "Short"
  size: number
}

// Base prices for different symbols
const basePrices: Record<string, number> = {
  BTC: 67234,
  ETH: 3456,
  SOL: 145,
  BNB: 590,
  XRP: 0.62,
  DOGE: 0.16,
  ADA: 0.45,
  LINK: 14.2,
  AVAX: 35.5,
  MATIC: 0.58
}

// Mock data for fallback - adapts to symbol and timeframe
const getMockMarketData = (symbol: string, timeframe: string): MarketData => {
  const basePrice = basePrices[symbol] || 100
  const priceVariation = (Math.random() * 0.02 - 0.01) // ±1%
  const currentPrice = basePrice * (1 + priceVariation)
  
  // Calculate levels based on current price (not hardcoded)
  const ema20 = currentPrice * (1 + (Math.random() * 0.02 - 0.01))
  const ema50 = currentPrice * (1 + (Math.random() * 0.04 - 0.02))
  const ema200 = currentPrice * (1 + (Math.random() * 0.1 - 0.05))
  const poc = currentPrice * (1 + (Math.random() * 0.015 - 0.0075))
  const vah = currentPrice * 1.02
  const val = currentPrice * 0.98
  
  return {
    symbol,
    price: currentPrice,
    change_24h: Math.random() * 10 - 3,
    oi: 15.5e9 * (timeframe === "15" ? 1 : timeframe === "60" ? 1.02 : timeframe === "240" ? 1.05 : 1.1),
    oi_change: Math.random() * 5 - 1,
    volume: 28.3e9 * (timeframe === "15" ? 0.1 : timeframe === "60" ? 0.3 : timeframe === "240" ? 0.6 : 1),
    cvd: 2450000 * (timeframe === "15" ? 1 : timeframe === "60" ? 2.5 : timeframe === "240" ? 6 : 15),
    cvd_change: 5.2 * (Math.random() * 2 - 0.5),
    signal: Math.random() > 0.5 ? "LONG" : "SHORT",
    score: Math.floor(Math.random() * 7),
    ema20,
    ema50,
    ema200,
    poc,
    vah,
    val,
    atr: currentPrice * 0.008 * (timeframe === "15" ? 0.3 : timeframe === "60" ? 0.6 : timeframe === "240" ? 1.2 : 2.5),
    funding: (Math.random() - 0.5) * 0.02,
    rsi: 30 + Math.random() * 50,
    macd: (Math.random() - 0.5) * 200,
    macd_signal: (Math.random() - 0.5) * 150,
    exchange_flow: (Math.random() - 0.5) * 1000,
  }
}

const getMockChecklist = (symbol: string, timeframe: string): ChecklistData => ({
  symbol,
  score: Math.floor(Math.random() * 5) + 2,
  total: 7,
  items: [
    { name: "Trend", passed: Math.random() > 0.3, description: timeframe === "15" ? "Short-term trend" : timeframe === "60" ? "Hourly trend" : timeframe === "240" ? "4H trend" : "Daily trend" },
    { name: "OI Rising", passed: Math.random() > 0.4, description: `OI ${Math.random() > 0.5 ? "+" : "-"}${(Math.random() * 5).toFixed(1)}%` },
    { name: "Volume", passed: Math.random() > 0.3, description: timeframe === "15" ? "M15 Volume" : timeframe === "60" ? "H1 Volume" : timeframe === "240" ? "H4 Volume" : "Daily Volume" },
    { name: "CVD", passed: Math.random() > 0.5, description: Math.random() > 0.5 ? "Bid dominant" : "Ask dominant" },
    { name: "Liquidations", passed: Math.random() > 0.4, description: timeframe === "15" ? "Recent liqs" : "Accumulated liqs" },
    { name: "Levels", passed: Math.random() > 0.5, description: Math.random() > 0.5 ? "At support" : "At resistance" },
    { name: "Funding", passed: Math.random() > 0.5, description: "Funding check" },
  ],
  recommendation: Math.random() > 0.5 ? "Strong LONG setup" : Math.random() > 0.5 ? "LONG setup" : Math.random() > 0.5 ? "NEUTRAL" : "SHORT setup",
  timestamp: new Date().toISOString(),
})

const getMockLiquidations = (symbol: string, timeframe: string): LiquidationLevel[] => {
  const basePrice = basePrices[symbol] || 100
  const multiplier = timeframe === "15" ? 1 : timeframe === "60" ? 1.5 : timeframe === "240" ? 2.5 : 5
  
  return [
    { price: basePrice * 0.97 - (multiplier * basePrice * 0.001), side: "Long", size: 125000000 * multiplier },
    { price: basePrice * 1.03 + (multiplier * basePrice * 0.001), side: "Short", size: 98000000 * multiplier },
    { price: basePrice * 0.95 - (multiplier * basePrice * 0.002), side: "Long", size: 85000000 * multiplier },
    { price: basePrice * 1.05 + (multiplier * basePrice * 0.002), side: "Short", size: 72000000 * multiplier },
  ]
}

// Helper functions with timeframe context
const getRSIInterpretation = (rsi: number, timeframe: string): { text: string; color: string; detail: string } => {
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

const getMACDInterpretation = (macd: number, signal: number, timeframe: string): { text: string; color: string; detail: string } => {
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

const getFundingInterpretation = (funding: number, timeframe: string): { text: string; color: string; detail: string } => {
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

const getExchangeFlowInterpretation = (flow: number, timeframe: string): { text: string; trend: "up" | "down"; detail: string } => {
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

// Section Card Component
function MetricCard({
  title,
  value,
  subvalue,
  trend,
  trendUp,
  icon: Icon,
}: {
  title: string
  value: string
  subvalue?: string
  trend: string
  trendUp: boolean
  icon: React.ElementType
}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardDescription>{title}</CardDescription>
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
        {subvalue && (
          <p className="text-xs text-muted-foreground">{subvalue}</p>
        )}
        <CardAction>
          <Badge variant="outline" className={cn(
            "gap-1 text-xs",
            trendUp ? "text-emerald-500" : "text-red-500"
          )}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

// Row 1: OI Analysis Cards
function OIAnalysisCards({ data }: { data: MarketData }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <MetricCard
        title="Open Interest"
        value={`$${((data.oi || 0) / 1e9).toFixed(2)}B`}
        subvalue={`Change: ${(data.oi_change || 0).toFixed(2)}%`}
        trend={(data.oi_change || 0) >= 0 ? "Rising" : "Falling"}
        trendUp={(data.oi_change || 0) >= 0}
        icon={BarChart3}
      />
      <MetricCard
        title="24h Volume"
        value={`$${((data.volume || 0) / 1e9).toFixed(2)}B`}
        subvalue="Trading Activity"
        trend="High"
        trendUp={true}
        icon={Activity}
      />
      <MetricCard
        title="CVD (Delta)"
        value={`${(data.cvd / 1e6).toFixed(2)}M`}
        subvalue={`Change: ${data.cvd_change >= 0 ? "+" : ""}${data.cvd_change.toFixed(2)}%`}
        trend={data.cvd_change >= 0 ? "Bid Dominance" : "Ask Dominance"}
        trendUp={data.cvd_change >= 0}
        icon={Sigma}
      />
      <MetricCard
        title="Signal"
        value={data.signal || "NEUTRAL"}
        subvalue={data.score !== undefined ? `Score: ${data.score}/7` : "Analyzing..."}
        trend={data.signal === "LONG" ? "Bullish" : data.signal === "SHORT" ? "Bearish" : "Neutral"}
        trendUp={data.signal === "LONG"}
        icon={Target}
      />
    </div>
  )
}

// Chart Legend Component
function ChartLegend({ data }: { data: MarketData }) {
  const distanceToEMA20 = ((data.price - data.ema20) / data.price * 100)
  const distanceToEMA50 = ((data.price - data.ema50) / data.price * 100)
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">OI Value</p>
        <p className="font-mono font-medium">${(data.oi / 1e9).toFixed(2)}B</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">CVD</p>
        <p className={cn("font-mono font-medium", data.cvd >= 0 ? "text-emerald-500" : "text-red-500")}>
          {(data.cvd / 1e6).toFixed(2)}M
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">To EMA 20</p>
        <p className={cn("font-mono font-medium", distanceToEMA20 >= 0 ? "text-emerald-500" : "text-red-500")}>
          {distanceToEMA20 >= 0 ? "+" : ""}{distanceToEMA20.toFixed(2)}%
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">To EMA 50</p>
        <p className={cn("font-mono font-medium", distanceToEMA50 >= 0 ? "text-emerald-500" : "text-red-500")}>
          {distanceToEMA50 >= 0 ? "+" : ""}{distanceToEMA50.toFixed(2)}%
        </p>
      </div>
    </div>
  )
}

// Row 2: TradingView Chart with levels
function ChartSection({ symbol, timeframe, data }: { symbol: string; timeframe: string; data: MarketData }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <CardTitle>Price Action & OI Analysis</CardTitle>
        <CardDescription>
          Real-time chart with POC, EMA levels for {symbol} at ${data.price.toLocaleString(undefined, {maximumFractionDigits: 2})} on {timeframes.find(tf => tf.value === timeframe)?.label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 sm:px-6">
        <div className="mb-4">
          <TradingViewChart symbol={symbol} timeframe={timeframe} ema20={data.ema20} ema50={data.ema50} poc={data.poc} />
        </div>
        <ChartLegend data={data} />
      </CardContent>
    </Card>
  )
}

// Checklist Score Card
function ChecklistScoreCard({ 
  symbol, 
  checklist, 
  loading 
}: { 
  symbol: string
  checklist: ChecklistData | null
  loading: boolean 
}) {
  const items = checklist?.items || []
  const passedCount = items.filter((i: ChecklistItem) => i.passed).length
  const total = checklist?.total || 7
  const percentage = total > 0 ? Math.round((passedCount / total) * 100) : 0
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <CardTitle>Entry Checklist</CardTitle>
        <CardDescription>
          7-filter system score for {symbol}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center py-10">
        {loading ? (
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Analyzing market conditions...</p>
          </div>
        ) : checklist ? (
          <div className="text-center">
            <div className={cn(
              "mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-bold",
              percentage >= 70 ? "border-emerald-500 text-emerald-500" : 
              percentage >= 40 ? "border-amber-500 text-amber-500" : "border-red-500 text-red-500"
            )}>
              {passedCount}/{total}
            </div>
            <p className="mb-2 text-lg font-medium">{checklist.recommendation || "Analyzing..."}</p>
            {items.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {items.map((item: ChecklistItem, idx: number) => (
                  <Badge 
                    key={idx} 
                    variant={item.passed ? "default" : "secondary"}
                    className={item.passed ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : ""}
                  >
                    {item.passed ? "✓" : "✗"} {item.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Select a symbol to view checklist
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Row 4: Entry Levels with distances
function EntryLevelsCard({ data }: { data: MarketData }) {
  const distanceToEMA20 = data.price - data.ema20
  const distanceToEMA50 = data.price - data.ema50
  const distanceToPOC = data.price - data.poc
  const distanceToVAH = data.price - data.vah
  
  // Determine number of decimal places based on price magnitude
  const decimals = data.price < 1 ? 4 : data.price < 100 ? 2 : 0
  
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Entry Levels</CardTitle>
        <CardDescription>
          Key levels and distances from current price <span className="font-mono font-bold">${data.price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div>
              <span className="text-sm font-medium">EMA 20</span>
              <p className="text-xs text-muted-foreground">Dynamic support/resistance</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-medium">${data.ema20.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
              <p className={cn("text-xs", distanceToEMA20 >= 0 ? "text-emerald-500" : "text-red-500")}>
                {distanceToEMA20 >= 0 ? "+" : ""}${Math.abs(distanceToEMA20).toFixed(decimals)} ({(distanceToEMA20/data.price*100).toFixed(2)}%)
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div>
              <span className="text-sm font-medium">EMA 50</span>
              <p className="text-xs text-muted-foreground">Trend direction</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-medium">${data.ema50.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
              <p className={cn("text-xs", distanceToEMA50 >= 0 ? "text-emerald-500" : "text-red-500")}>
                {distanceToEMA50 >= 0 ? "+" : ""}${Math.abs(distanceToEMA50).toFixed(decimals)} ({(distanceToEMA50/data.price*100).toFixed(2)}%)
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div>
              <span className="text-sm font-medium">POC</span>
              <p className="text-xs text-muted-foreground">Point of Control - high volume node</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-medium">${data.poc.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
              <p className={cn("text-xs", distanceToPOC >= 0 ? "text-emerald-500" : "text-red-500")}>
                {distanceToPOC >= 0 ? "+" : ""}${Math.abs(distanceToPOC).toFixed(decimals)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div>
              <span className="text-sm font-medium">VAH</span>
              <p className="text-xs text-muted-foreground">Value Area High - resistance zone</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-medium">${data.vah.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
              <p className={cn("text-xs", distanceToVAH >= 0 ? "text-emerald-500" : "text-red-500")}>
                {distanceToVAH >= 0 ? "+" : ""}${Math.abs(distanceToVAH).toFixed(decimals)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 border border-primary/20">
            <div>
              <span className="text-sm font-medium">ATR (Volatility)</span>
              <p className="text-xs text-muted-foreground">Average True Range - position sizing</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-medium">${data.atr.toFixed(decimals)}</span>
              <p className="text-xs text-muted-foreground">
                Stop = 2×ATR = ${(data.atr * 2).toFixed(decimals)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Row 5: Secondary Indicators
function SecondaryIndicators({ data, timeframe }: { data: MarketData; timeframe: string }) {
  const rsiInterp = getRSIInterpretation(data.rsi, timeframe)
  const macdInterp = getMACDInterpretation(data.macd, data.macd_signal, timeframe)
  const fundingInterp = getFundingInterpretation(data.funding, timeframe)
  const flowInterp = getExchangeFlowInterpretation(data.exchange_flow, timeframe)
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-6 lg:px-6">
      {/* Funding Rate */}
      <Card className="bg-gradient-to-t from-orange-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>Funding Rate (8h)</CardDescription>
          <CardTitle className="text-xl">{(data.funding * 100).toFixed(3)}%</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xs", fundingInterp.color)}>{fundingInterp.text}</p>
          <p className="text-xs text-muted-foreground mt-1">{fundingInterp.detail}</p>
        </CardContent>
      </Card>
      
      {/* RSI */}
      <Card className="bg-gradient-to-t from-purple-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>RSI (14)</CardDescription>
          <CardTitle className="text-xl">{data.rsi.toFixed(1)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xs", rsiInterp.color)}>{rsiInterp.text}</p>
          <p className="text-xs text-muted-foreground mt-1">{rsiInterp.detail}</p>
        </CardContent>
      </Card>
      
      {/* MACD */}
      <Card className="bg-gradient-to-t from-blue-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>MACD</CardDescription>
          <CardTitle className="text-xl">{data.macd > 0 ? "+" : ""}{data.macd.toFixed(0)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xs", macdInterp.color)}>{macdInterp.text}</p>
          <p className="text-xs text-muted-foreground mt-1">{macdInterp.detail}</p>
        </CardContent>
      </Card>
      
      {/* Exchange Flows */}
      <Card className="bg-gradient-to-t from-pink-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>Exchange Flows (24h)</CardDescription>
          <CardTitle className="text-xl flex items-center gap-1">
            {data.exchange_flow > 0 ? "+" : ""}{data.exchange_flow.toFixed(0)} {data.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xs", flowInterp.trend === "up" ? "text-emerald-500" : "text-red-500")}>
            {flowInterp.text}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{flowInterp.detail}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Liquidation Map Component
function LiquidationMap({ liquidations, currentPrice, symbol }: { liquidations: LiquidationLevel[]; currentPrice: number; symbol: string }) {
  const sortedLiquidations = [...liquidations].sort((a, b) => a.price - b.price)
  const maxSize = Math.max(...liquidations.map(l => l.size), 1)
  
  // Determine decimal places based on price
  const decimals = currentPrice < 1 ? 4 : currentPrice < 100 ? 2 : 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidation Map</CardTitle>
        <CardDescription>Concentrated liquidation levels - where price may hunt (Current: ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedLiquidations.map((level, i) => {
            const isBelow = level.price < currentPrice
            const distance = Math.abs((level.price - currentPrice) / currentPrice * 100)
            const width = Math.max(10, (level.size / maxSize * 100))
            
            return (
              <div key={i} className="relative">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={cn(
                    "font-mono",
                    level.side === "Long" ? "text-red-500" : "text-emerald-500"
                  )}>
                    {level.side}s at ${level.price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
                  </span>
                  <span className="text-muted-foreground">{distance.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      level.side === "Long" ? "bg-red-500/70" : "bg-emerald-500/70"
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Size: ${(level.size / 1e6).toFixed(1)}M
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tactic:</strong> Set TP before liquidation clusters, SL beyond nearest zone
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [symbol, setSymbol] = useState("BTC")
  const [timeframe, setTimeframe] = useState("60")
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [liquidations, setLiquidations] = useState<LiquidationLevel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Simulate API calls with mock data for now
        const mockData = getMockMarketData(symbol, timeframe)
        const mockChecklist = getMockChecklist(symbol, timeframe)
        const mockLiquidations = getMockLiquidations(symbol, timeframe)
        
        setMarketData(mockData)
        setChecklist(mockChecklist)
        setLiquidations(mockLiquidations)
      } catch (error) {
        console.error("Failed to fetch market data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [symbol, timeframe])

  if (!marketData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="TF" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map(tf => (
                  <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Connect
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Zap className="mr-1.5 h-4 w-4" />
              Trade
            </Button>
          </div>
        </header>

        {/* Row 1: OI Analysis Cards */}
        <OIAnalysisCards data={marketData} />

        {/* Row 2: TradingView Chart + Checklist */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-3 lg:px-6">
          <div className="lg:col-span-2">
            <ChartSection symbol={symbol} timeframe={timeframe} data={marketData} />
          </div>
          <ChecklistScoreCard 
            symbol={symbol} 
            checklist={checklist} 
            loading={loading} 
          />
        </div>

        {/* Row 4: Entry Levels + Liquidation Map */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-2 lg:px-6">
          <EntryLevelsCard data={marketData} />
          <LiquidationMap liquidations={liquidations} currentPrice={marketData.price} symbol={symbol} />
        </div>

        {/* Row 5: Secondary Indicators */}
        <SecondaryIndicators data={marketData} timeframe={timeframe} />
      </main>
    </div>
  )
}
