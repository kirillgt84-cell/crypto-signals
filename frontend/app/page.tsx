"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3, Wallet, Target, Zap, Loader2 } from "lucide-react"
import { getRSIInterpretation, getMACDInterpretation, getFundingInterpretation, getExchangeFlowInterpretation } from "./lib/market-utils"
import { Logo, LogoIcon } from "./components/Logo"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TradingViewChart } from "./components/TradingViewChart"
import Sidebar from "./components/admin/Sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// API Base URL - hardcoded to ensure correct path (updated)
const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const symbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK", "AVAX", "MATIC"]

const timeframes = [
  { value: "15", label: "M15", api: "1h" },  // Map to backend timeframe
  { value: "60", label: "1H", api: "1h" },
  { value: "240", label: "4H", api: "4h" },
  { value: "D", label: "1D", api: "1d" },
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

// Section Card Component
function MetricCard({
  title,
  value,
  subvalue,
  trend,
  trendUp,
  icon: Icon,
  loading = false,
}: {
  title: string
  value: string
  subvalue?: string
  trend: string
  trendUp: boolean
  icon: React.ElementType
  loading?: boolean
}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardDescription>{title}</CardDescription>
        </div>
        {loading ? (
          <div className="h-8 flex items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {value || "--"}
          </CardTitle>
        )}
        {subvalue && !loading && (
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
function OIAnalysisCards({ data, loading }: { data: MarketData; loading: boolean }) {
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <MetricCard
        title="Price"
        value={price > 0 ? `$${price.toLocaleString(undefined, {maximumFractionDigits: decimals})}` : "--"}
        subvalue={`24h: ${(data?.change_24h || 0) >= 0 ? "+" : ""}${(data?.change_24h || 0).toFixed(2)}%`}
        trend={(data?.change_24h || 0) >= 0 ? "Rising" : "Falling"}
        trendUp={(data?.change_24h || 0) >= 0}
        icon={BarChart3}
        loading={loading}
      />
      <MetricCard
        title="Open Interest"
        value={`$${((data?.oi || 0) / 1e9).toFixed(2)}B`}
        subvalue={`Change: ${(data?.oi_change || 0).toFixed(2)}%`}
        trend={(data?.oi_change || 0) >= 0 ? "Rising" : "Falling"}
        trendUp={(data?.oi_change || 0) >= 0}
        icon={Activity}
        loading={loading}
      />
      <MetricCard
        title="24h Volume"
        value={`$${((data?.volume || 0) / 1e9).toFixed(2)}B`}
        subvalue="Trading Activity"
        trend="High"
        trendUp={true}
        icon={BarChart3}
        loading={loading}
      />
      <MetricCard
        title="Signal"
        value={data?.signal || "NEUTRAL"}
        subvalue={data?.score !== undefined ? `Score: ${data.score}/7` : "Analyzing..."}
        trend={data?.signal === "LONG" ? "Bullish" : data?.signal === "SHORT" ? "Bearish" : "Neutral"}
        trendUp={data?.signal === "LONG"}
        icon={Target}
        loading={loading}
      />
    </div>
  )
}

// Chart Legend Component
function ChartLegend({ data, loading }: { data: MarketData; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-8 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }
  
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  const distanceToEMA20 = price > 0 ? ((price - (data?.ema20 || 0)) / price * 100) : 0
  const distanceToEMA50 = price > 0 ? ((price - (data?.ema50 || 0)) / price * 100) : 0
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">Price</p>
        <p className="font-mono font-medium">${price > 0 ? price.toLocaleString(undefined, {maximumFractionDigits: decimals}) : "--"}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">OI Value</p>
        <p className="font-mono font-medium">${((data?.oi || 0) / 1e9).toFixed(2)}B</p>
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
function ChartSection({ symbol, timeframe, data, loading }: { symbol: string; timeframe: string; data: MarketData; loading: boolean }) {
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  
  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <CardTitle>Price Action & OI Analysis</CardTitle>
        <CardDescription>
          {loading ? (
            "Loading market data..."
          ) : (
            <>Real-time chart with POC, EMA levels for <strong>{symbol}</strong> at <span className="font-mono font-bold">${price > 0 ? price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "--"}</span> on {timeframes.find(tf => tf.value === timeframe)?.label}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 sm:px-6">
        <div className="mb-4">
          <TradingViewChart symbol={symbol} timeframe={timeframe} ema20={data?.ema20} ema50={data?.ema50} poc={data?.poc} />
        </div>
        <ChartLegend data={data} loading={loading} />
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
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
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
function EntryLevelsCard({ data, loading }: { data: MarketData; loading: boolean }) {
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  const distanceToEMA20 = price - (data?.ema20 || 0)
  const distanceToEMA50 = price - (data?.ema50 || 0)
  const distanceToPOC = price - (data?.poc || 0)
  const distanceToVAH = price - (data?.vah || 0)
  
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Entry Levels</CardTitle>
        <CardDescription>
          Key levels and distances from current price {loading ? (
            <Loader2 className="inline h-3 w-3 animate-spin" />
          ) : (
            <span className="font-mono font-bold">${price > 0 ? price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "--"}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  )
}

// Row 5: Secondary Indicators
function SecondaryIndicators({ data, timeframe, loading }: { data: MarketData; timeframe: string; loading: boolean }) {
  const rsi = data?.rsi || 50
  const macd = data?.macd || 0
  const macdSignal = data?.macd_signal || 0
  const funding = data?.funding || 0
  const exchangeFlow = data?.exchange_flow || 0
  
  const rsiInterp = getRSIInterpretation(rsi, timeframe)
  const macdInterp = getMACDInterpretation(macd, macdSignal, timeframe)
  const fundingInterp = getFundingInterpretation(funding, timeframe)
  const flowInterp = getExchangeFlowInterpretation(exchangeFlow, timeframe)
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-6 lg:px-6">
      {/* Funding Rate */}
      <Card className="bg-gradient-to-t from-orange-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>Funding Rate (8h)</CardDescription>
          {loading ? (
            <div className="h-7 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="text-xl">{(data.funding * 100).toFixed(3)}%</CardTitle>
          )}
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
          {loading ? (
            <div className="h-7 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="text-xl">{data.rsi.toFixed(1)}</CardTitle>
          )}
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
          {loading ? (
            <div className="h-7 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="text-xl">{data.macd > 0 ? "+" : ""}{data.macd.toFixed(0)}</CardTitle>
          )}
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
          {loading ? (
            <div className="h-7 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="text-xl flex items-center gap-1">
              {data.exchange_flow > 0 ? "+" : ""}{data.exchange_flow.toFixed(0)} {data.symbol}
            </CardTitle>
          )}
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
function LiquidationMap({ liquidations, currentPrice, symbol, loading }: { liquidations: LiquidationLevel[]; currentPrice: number; symbol: string; loading: boolean }) {
  const safeLiquidations = liquidations || []
  const sortedLiquidations = [...safeLiquidations].sort((a, b) => (a?.price || 0) - (b?.price || 0))
  const maxSize = Math.max(...safeLiquidations.map(l => l?.size || 0), 1)
  const price = currentPrice || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidation Map</CardTitle>
        <CardDescription>
          Concentrated liquidation levels (Current: {loading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : `$${price > 0 ? price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "--"}`})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-12 flex items-center justify-center bg-muted rounded">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sortedLiquidations.map((level, i) => {
                const levelPrice = level?.price || 0
                const distance = price > 0 ? Math.abs((levelPrice - price) / price * 100) : 0
                const width = Math.max(10, ((level?.size || 0) / maxSize * 100))
                
                return (
                  <div key={i} className="relative">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={cn(
                        "font-mono",
                        level?.side === "Long" ? "text-red-500" : "text-emerald-500"
                      )}>
                        {level?.side || "Unknown"}s at ${levelPrice > 0 ? levelPrice.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : "--"}
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
                      Size: ${((level?.size || 0) / 1e6).toFixed(1)}M
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
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [symbol, setSymbol] = useState("BTC")
  const [timeframe, setTimeframe] = useState("60")
  const [marketData, setMarketData] = useState<MarketData>({
    symbol: "BTC",
    price: 67234,
    change_24h: 0,
    oi: 15.5e9,
    oi_change: 0,
    volume: 28.3e9,
    cvd: 2450000,
    cvd_change: 0,
    signal: "NEUTRAL",
    score: 0,
    ema20: 66800,
    ema50: 65800,
    ema200: 62800,
    poc: 66800,
    vah: 68200,
    val: 65400,
    atr: 450,
    funding: 0.008,
    rsi: 50,
    macd: 0,
    macd_signal: 0,
    exchange_flow: 0,
  })
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [liquidations, setLiquidations] = useState<LiquidationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Map frontend timeframe to backend API timeframe
  const getApiTimeframe = (tf: string) => {
    const mapping: Record<string, string> = {
      "15": "1h",
      "60": "1h", 
      "240": "4h",
      "D": "1d"
    }
    return mapping[tf] || "1h"
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      
      try {
        const apiTf = getApiTimeframe(timeframe)
        
        // Fetch all data in parallel with individual error handling
        const results = await Promise.allSettled([
          fetch(`${API_BASE_URL}/market/oi/${symbol}?timeframe=${apiTf}`),
          fetch(`${API_BASE_URL}/market/checklist/${symbol}?timeframe=${apiTf}`),
          fetch(`${API_BASE_URL}/market/levels/${symbol}?timeframe=${apiTf}`),
          fetch(`${API_BASE_URL}/market/profile/${symbol}`),
        ])
        
        const oiRes: Response = results[0].status === 'fulfilled' ? results[0].value : { ok: false, status: 'rejected' } as Response
        const checklistRes: Response = results[1].status === 'fulfilled' ? results[1].value : { ok: false, status: 'rejected' } as Response
        const levelsRes: Response = results[2].status === 'fulfilled' ? results[2].value : { ok: false, status: 'rejected' } as Response
        const profileRes: Response = results[3].status === 'fulfilled' ? results[3].value : { ok: false, status: 'rejected' } as Response

        // Parse responses
        let oiData: any = {}, checklistData = null, levelsData: any = {}, profileData: any = {}
        let hasApiError = false
        
        console.log(`API Responses for ${symbol}:`, { oiOk: oiRes.ok, checklistOk: checklistRes.ok, levelsOk: levelsRes.ok, profileOk: profileRes.ok })
        
        if (oiRes.ok) {
          try {
            oiData = await oiRes.json()
            console.log(`OI data received for ${symbol}:`, oiData)
          } catch (e) {
            console.error(`Failed to parse OI data for ${symbol}:`, e)
            hasApiError = true
          }
        } else {
          console.error("OI API error:", oiRes.status)
          hasApiError = true
        }
        
        if (checklistRes.ok) {
          checklistData = await checklistRes.json()
        } else {
          console.error("Checklist API error:", checklistRes.status)
          hasApiError = true
        }
        
        if (levelsRes.ok) {
          levelsData = await levelsRes.json()
        } else {
          console.error("Levels API error:", levelsRes.status)
          hasApiError = true
        }
        
        if (profileRes.ok) {
          profileData = await profileRes.json()
        } else {
          console.error("Profile API error:", profileRes.status)
          hasApiError = true
        }

        // Combine data into MarketData format with safe defaults
        console.log("OI API response:", oiData)
        // Validate price: must be a number > 0 (don't use || which treats 0 as falsy)
        const rawPrice = Number(oiData.price)
        const price = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice : 0
        const oi = Number(oiData.open_interest) || 0
        
        // Clear error if we have valid price, otherwise set appropriate error
        if (price > 0) {
          setError(null)
        } else if (hasApiError) {
          setError("API error. Using demo data.")
        }
        
        console.log(`Setting price for ${symbol}:`, price)
        
        const combinedData: MarketData = {
          symbol,
          price: price,
          change_24h: Number(oiData.change_24h) || Number(oiData.price_change_24h) || 0,
          oi: oi,
          oi_change: Number(oiData.oi_change_24h) || Number(oiData.oi_change) || 0,
          volume: Number(oiData.volume) || Number(oiData.volume_24h) || 0,
          cvd: Number(oiData.cvd) || 0,
          cvd_change: 0,
          signal: checklistData?.recommendation?.includes("LONG") ? "LONG" : 
                  checklistData?.recommendation?.includes("SHORT") ? "SHORT" : "NEUTRAL",
          score: Number(checklistData?.score) || 0,
          ema20: Number(levelsData?.ema20) || Number(profileData?.ema20) || price * 0.99,
          ema50: Number(levelsData?.ema50) || Number(profileData?.ema50) || price * 0.98,
          ema200: Number(levelsData?.ema200) || price * 0.95,
          poc: Number(profileData?.poc) || Number(levelsData?.poc) || price,
          vah: Number(profileData?.vah) || price * 1.02,
          val: Number(profileData?.val) || price * 0.98,
          atr: Number(levelsData?.atr) || price * 0.008,
          funding: Number(oiData.funding_rate) || Number(oiData.funding) || 0,
          rsi: Number(levelsData?.rsi) || Number(oiData.rsi) || 50,
          macd: Number(levelsData?.macd) || 0,
          macd_signal: Number(levelsData?.macd_signal) || 0,
          exchange_flow: Number(oiData.exchange_flow) || 0,
        }
        
        setMarketData(combinedData)
        console.log(`MarketData set for ${symbol}:`, combinedData)
        setChecklist(checklistData)
        
        // Set liquidations from levels data
        if (levelsData.liquidation_levels || levelsData.liquidations) {
          setLiquidations(levelsData.liquidation_levels || levelsData.liquidations || [])
        } else {
          // Fallback: generate from price
          setLiquidations([
            { price: combinedData.price * 0.97, side: "Long", size: 125000000 },
            { price: combinedData.price * 1.03, side: "Short", size: 98000000 },
          ])
        }
        
      } catch (err) {
        console.error("Failed to fetch market data:", err)
        setError("API error. Using demo data.")
        
        // Use fallback demo data based on symbol
        const fallbackPrice = symbol === "BTC" ? 70000 : symbol === "ETH" ? 3500 : symbol === "SOL" ? 145 : 100
        
        // Only use fallback if we don't have valid price from OI API
        // Check if we already got valid data before catch block
        if (!marketData || marketData.price === 0) {
          setMarketData({
            symbol,
            price: fallbackPrice,
            change_24h: 2.5,
            oi: 15.5e9,
            oi_change: 5.2,
            volume: 28.3e9,
            cvd: 2450000,
            cvd_change: 3.5,
            signal: "LONG",
            score: 5,
            ema20: fallbackPrice * 0.99,
            ema50: fallbackPrice * 0.98,
            ema200: fallbackPrice * 0.95,
            poc: fallbackPrice,
            vah: fallbackPrice * 1.02,
            val: fallbackPrice * 0.98,
            atr: fallbackPrice * 0.008,
            funding: 0.008,
            rsi: 58,
            macd: 125,
            macd_signal: 98,
            exchange_flow: -450,
          })
        }
        
        setChecklist({
          symbol,
          score: 5,
          total: 7,
          items: [
            { name: "Trend", passed: true, description: "Above EMA20" },
            { name: "OI Rising", passed: true, description: "OI +5%" },
            { name: "Volume", passed: true, description: "High volume" },
            { name: "CVD", passed: false, description: "Neutral" },
            { name: "Liquidations", passed: true, description: "Shorts liquidated" },
            { name: "Levels", passed: false, description: "At resistance" },
            { name: "Funding", passed: true, description: "Negative funding" },
          ],
          recommendation: "Strong LONG setup",
          timestamp: new Date().toISOString(),
        })
        
        const liqPrice = (!marketData || marketData.price === 0) ? fallbackPrice : marketData.price
        setLiquidations([
          { price: liqPrice * 0.97, side: "Long", size: 125000000 },
          { price: liqPrice * 1.03, side: "Short", size: 98000000 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [symbol, timeframe])

  // Prevent hydration issues - show loading until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          {/* Animated Logo */}
          <div className="relative">
            <div className="w-20 h-20 animate-pulse">
              <LogoIcon className="w-full h-full" />
            </div>
            {/* Spinning ring around logo */}
            <div className="absolute inset-0 -m-2">
              <Loader2 className="w-24 h-24 animate-spin text-primary/30" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight">FAST LANE</h2>
            <p className="text-sm text-muted-foreground mt-1">Loading market data...</p>
          </div>
        </div>
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
            <h1 className="text-xl font-semibold">Fast Lane</h1>
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
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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

        {error && (
          <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600">
            ⚠️ {error}
          </div>
        )}

        {/* Row 1: OI Analysis Cards */}
        <OIAnalysisCards data={marketData} loading={loading} />

        {/* Row 2: TradingView Chart + Checklist */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-3 lg:px-6">
          <div className="lg:col-span-2">
            <ChartSection symbol={symbol} timeframe={timeframe} data={marketData} loading={loading} />
          </div>
          <ChecklistScoreCard 
            symbol={symbol} 
            checklist={checklist} 
            loading={loading} 
          />
        </div>

        {/* Row 4: Entry Levels + Liquidation Map */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-2 lg:px-6">
          <EntryLevelsCard data={marketData} loading={loading} />
          <LiquidationMap liquidations={liquidations} currentPrice={marketData.price} symbol={symbol} loading={loading} />
        </div>

        {/* Row 5: Secondary Indicators */}
        <SecondaryIndicators data={marketData} timeframe={timeframe} loading={loading} />
      </main>
    </div>
  )
}
