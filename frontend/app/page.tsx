"use client"

import { useEffect, useRef, useState } from "react"
import { useSidebar } from "@/hooks/useSidebar"
import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Wallet, Target, Zap, Loader2, ArrowRight, Radio } from "lucide-react"
import { UserMenu } from "./components/UserMenu"
import { AuthModal } from "./components/AuthModal"
import { ProBlurOverlay } from "./components/ProBlurOverlay"
import { useAuth } from "./context/AuthContext"
import { useLanguage } from "./context/LanguageContext"
import { getRSIInterpretation, getMACDInterpretation, getFundingInterpretation, getExchangeFlowInterpretation, getCVDInterpretation } from "./lib/market-utils"
import { Logo, LogoIcon } from "./components/Logo"
import { ThemeToggle } from "./components/ThemeToggle"
import { LanguageSwitcher } from "./components/LanguageSwitcher"
import { useTheme } from "next-themes"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TradingViewChart } from "./components/TradingViewChart"
import CoinSearch from "./components/CoinSearch"
import { OITerminal } from "./components/OITerminal"
import { EntryLevels } from "./components/EntryLevels"

import { FundamentalsCard } from "./components/FundamentalsCard"
import Sidebar from "./components/admin/Sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts"

// API Base URL - hardcoded to ensure correct path (updated)
const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const symbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK", "AVAX", "POL"]

const timeframes = [
  { value: "15", label: "M15", api: "1h" },
  { value: "60", label: "1H", api: "1h" },
  { value: "240", label: "4H", api: "4h" },
  { value: "D", label: "1D", api: "1d" },
  { value: "3D", label: "3D", api: "3d" },
  { value: "1W", label: "1W", api: "1w" },
]

function formatTfLabel(tf: string) {
  const mapping: Record<string, string> = {
    "15": "15m",
    "60": "1h",
    "240": "4h",
    "D": "1d",
    "3D": "3d",
    "1W": "1w",
  }
  return mapping[tf] || tf
}

interface MarketData {
  symbol: string
  price: number
  change_24h: number
  oi: number
  oi_change: number
  volume: number
  volume_change: number
  spot_volume: number
  spot_volume_change: number
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
  sentiment: {
    long_short_ratio: number
    long_accounts_pct: number
    short_accounts_pct: number
    top_trader_ratio: number
    top_long_pct: number
    top_short_pct: number
    taker_volume_ratio: number
    taker_buy: number
    taker_sell: number
    sentiment_signal: "bullish" | "bearish" | "neutral"
  }
}

interface OIAnalysis {
  status: string
  signal: string
  description: string
  detailed?: string
  action: string
  tactic?: string
  color: string
  strength: number
  oi_change_pct?: number
  price_change_pct?: number
  volume_change_pct?: number
}


function formatVolumeUSD(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
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
    <Card className="bg-gradient-to-t from-primary/5 to-card dark:from-primary/10">
      <CardHeader className="p-3 flex flex-row items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardDescription className="text-xs font-bold uppercase tracking-wide">{title}</CardDescription>
          </div>
          {loading ? (
            <div className="h-8 flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CardTitle className="text-xl font-bold tabular-nums tracking-tight">
              {value || "--"}
            </CardTitle>
          )}
          {subvalue && !loading && (
            <p className="text-xs text-muted-foreground font-medium mt-1">{subvalue}</p>
          )}
        </div>
        
        <CardAction className="ml-3">
          <div className={cn(
            "flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-md border min-h-[80px] min-w-[70px]",
            trend === "Rising" || trend === "High" || trend === "Buying"
              ? "text-emerald-700 bg-emerald-100 border-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-700" 
              : trend === "Falling" || trend === "Low" || trend === "Selling"
              ? "text-red-700 bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700"
              : "text-amber-700 bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700"
          )}>
            <span className="text-sm font-bold">{trend}</span>
            {trend === "Rising" || trend === "High" || trend === "Buying" ? (
              <TrendingUp className="h-6 w-6" />
            ) : trend === "Falling" || trend === "Low" || trend === "Selling" ? (
              <TrendingDown className="h-6 w-6" />
            ) : (
              <Minus className="h-6 w-6" />
            )}
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

// Row 1: OI Analysis Cards
function OIAnalysisCards({ data, loading, timeframe }: { data: MarketData; loading: boolean; timeframe: string }) {
  const { t } = useLanguage()
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3 lg:px-6">
      <MetricCard
        title={t("dashboard.price")}
        value={price > 0 ? `$${price.toLocaleString(undefined, {maximumFractionDigits: decimals})}` : "--"}
        subvalue={`24h: ${(data?.change_24h || 0) >= 0 ? "+" : ""}${(data?.change_24h || 0).toFixed(2)}%`}
        trend={(data?.change_24h || 0) >= 0 ? "Rising" : "Falling"}
        trendUp={(data?.change_24h || 0) >= 0}
        icon={BarChart3}
        loading={loading}
      />
      <MetricCard
        title={t("dashboard.openInterest")}
        value={formatVolumeUSD((data?.oi || 0) * (data?.price || 0))}
        subvalue={`${(data?.oi / 1e6)?.toFixed(2) || "0.00"}M contracts`}
        trend={data?.oi_change > 0 ? "Rising" : data?.oi_change < 0 ? "Falling" : "Stable"}
        trendUp={data?.oi_change >= 0}
        icon={Activity}
        loading={loading}
      />
      <MetricCard
        title="Futures Volume"
        value={formatVolumeUSD((data?.volume || 0) * (data?.price || 0))}
        subvalue={data?.volume_change !== undefined && data?.volume_change !== 0 ? `${data.volume_change >= 0 ? "+" : ""}${data.volume_change.toFixed(2)}% (${formatTfLabel(timeframe)})` : `${formatTfLabel(timeframe)} volume`}
        trend={data?.volume_change > 0 ? "Rising" : data?.volume_change < 0 ? "Falling" : "Stable"}
        trendUp={data?.volume_change >= 0}
        icon={BarChart3}
        loading={loading}
      />
      <MetricCard
        title="Spot Volume"
        value={formatVolumeUSD((data?.spot_volume || 0) * (data?.price || 0))}
        subvalue={data?.spot_volume_change !== undefined && data?.spot_volume_change !== 0 ? `${data.spot_volume_change >= 0 ? "+" : ""}${data.spot_volume_change.toFixed(2)}% (${formatTfLabel(timeframe)})` : `${formatTfLabel(timeframe)} volume`}
        trend={data?.spot_volume_change > 0 ? "Rising" : data?.spot_volume_change < 0 ? "Falling" : "Stable"}
        trendUp={data?.spot_volume_change >= 0}
        icon={BarChart3}
        loading={loading}
      />
      <MetricCard
        title="CVD"
        value={`${(data?.cvd || 0) > 0 ? "+" : ""}${((data?.cvd || 0) / 1e6).toFixed(2)} mln`}
        subvalue={getCVDInterpretation(data?.cvd || 0, data?.cvd_change || 0).text}
        trend={(data?.cvd || 0) > 0 ? "Buying" : (data?.cvd || 0) < 0 ? "Selling" : "Neutral"}
        trendUp={(data?.cvd || 0) > 0}
        icon={Activity}
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
        <p className="font-mono font-medium">{formatVolumeUSD((data?.oi || 0) * (data?.price || 0))}</p>
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
function ChartSection({ symbol, timeframe, data, loading, className }: { symbol: string; timeframe: string; data: MarketData; loading: boolean; className?: string }) {
  const { t } = useLanguage()
  const price = data?.price || 0
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0
  const { theme } = useTheme()
  
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="gap-2 shrink-0">
        <CardTitle>{t("dashboard.chart")}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 px-2 sm:px-6 flex flex-col">
        <div className="mb-4 min-h-[300px] flex-1">
          <TradingViewChart 
            symbol={symbol} 
            timeframe={timeframe} 
            ema20={data?.ema20} 
            ema50={data?.ema50} 
            poc={data?.poc}
            theme={theme === "light" ? "light" : "dark"}
          />
        </div>
        <ChartLegend data={data} loading={loading} />
      </CardContent>
    </Card>
  )
}


// Row 3: Secondary Indicators
function SecondaryIndicators({ data, timeframe, loading }: { data: MarketData; timeframe: string; loading: boolean }) {
  const { t } = useLanguage()
  const rsi = data?.rsi || 50
  const macd = data?.macd || 0
  const macdSignal = data?.macd_signal || 0
  const funding = data?.funding || 0
  const exchangeFlow = data?.exchange_flow || 0
  
  const rsiInterp = getRSIInterpretation(rsi, timeframe)
  const macdInterp = getMACDInterpretation(macd, macdSignal, timeframe)
  const fundingInterp = getFundingInterpretation(funding, timeframe)
  const flowInterp = getExchangeFlowInterpretation(exchangeFlow, timeframe)
  const cvdInterp = getCVDInterpretation(data.cvd, data.cvd_change)
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-6 lg:px-6">
      {/* Funding Rate */}
      <Card className="bg-gradient-to-t from-orange-500/5 to-card">
        <CardHeader className="pb-2">
          <CardDescription>{t("dashboard.fundingRate")} (8h)</CardDescription>
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


// Main Dashboard Component
export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar()
  const [authOpen, setAuthOpen] = useState(false)
  const isFirstLoad = useRef(true)
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const handler = () => setAuthOpen(true)
    window.addEventListener("open-auth-modal", handler)
    return () => window.removeEventListener("open-auth-modal", handler)
  }, [])
  const [symbol, setSymbol] = useState("BTC")
  const [timeframe, setTimeframe] = useState("60")
  const [marketData, setMarketData] = useState<MarketData>({
    symbol: "BTC",
    price: 67234,
    change_24h: 0,
    oi: 15.5e9,
    oi_change: 0,
    volume: 28.3e9,
    volume_change: 0,
    spot_volume: 25.5e9,
    spot_volume_change: 0,
    cvd: 2450000,
    cvd_change: 0,
    signal: "NEUTRAL",
    score: 0,
    ema20: 66800,
    ema50: 65300,
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
    sentiment: {
      long_short_ratio: 1.0,
      long_accounts_pct: 50.0,
      short_accounts_pct: 50.0,
      top_trader_ratio: 1.0,
      top_long_pct: 50.0,
      top_short_pct: 50.0,
      taker_volume_ratio: 1.0,
      taker_buy: 1.0,
      taker_sell: 1.0,
      sentiment_signal: "neutral",
    },
  })
  const [oiAnalysis, setOiAnalysis] = useState<OIAnalysis | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ETF card hidden until live data source is restored
  // const [etfSummary, setEtfSummary] = useState<any>(null)
  // useEffect(() => { async function fetchETF() { ... } fetchETF() }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Map frontend timeframe to backend API timeframe
  const getApiTimeframe = (tf: string) => {
    const mapping: Record<string, string> = {
      "15": "1h",
      "60": "1h",
      "240": "4h",
      "D": "1d",
      "3D": "3d",
      "1W": "1w",
    }
    return mapping[tf] || "1h"
  }

  useEffect(() => {
    async function fetchData() {
      // Only show loading on first load, not on background refreshes
      if (isFirstLoad.current) {
        setLoading(true)
      }
      setError(null)
      
      try {
        const apiTf = getApiTimeframe(timeframe)
        
        // Fetch all data in parallel with cache busting
        const cacheBuster = Date.now()
        const results = await Promise.allSettled([
          fetch(`${API_BASE_URL}/market/oi/${symbol}?timeframe=${apiTf}&_cb=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/levels/${symbol}?timeframe=${apiTf}&_cb=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/profile/${symbol}?_cb=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/spot-volume/${symbol}?timeframe=${apiTf}&_cb=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/cvd/${symbol}?timeframe=${apiTf}&_cb=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/market/sentiment/${symbol}?_cb=${cacheBuster}`, { cache: 'no-store' }),
        ])
        
        const oiRes = results[0].status === 'fulfilled' ? results[0].value : { ok: false, status: 'rejected' } as unknown as Response
        const levelsRes = results[1].status === 'fulfilled' ? results[1].value : { ok: false, status: 'rejected' } as unknown as Response
        const profileRes = results[2].status === 'fulfilled' ? results[2].value : { ok: false, status: 'rejected' } as unknown as Response
        const spotVolumeRes = results[3].status === 'fulfilled' ? results[3].value : { ok: false, status: 'rejected' } as unknown as Response
        const cvdRes = results[4].status === 'fulfilled' ? results[4].value : { ok: false, status: 'rejected' } as unknown as Response
        const sentimentRes = results[5].status === 'fulfilled' ? results[5].value : { ok: false, status: 'rejected' } as unknown as Response

        // Parse responses
        let oiData: any = {}, levelsData: any = {}, profileData: any = {}, spotVolumeData: any = {}, cvdData: any = {}
        let hasApiError = false
        
        console.log(`API Responses for ${symbol}:`, { oiOk: oiRes.ok, levelsOk: levelsRes.ok, profileOk: profileRes.ok })
        
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
        

        
        if (levelsRes.ok) {
          levelsData = await levelsRes.json()
        } else {
          console.error("Levels API error:", levelsRes.status)
          hasApiError = true
        }
        
        if (profileRes.ok) {
          profileData = await profileRes.json()
          console.log(`Profile data for ${symbol}:`, profileData)
        } else {
          console.error("Profile API error:", profileRes.status)
          hasApiError = true
        }
        
        if (spotVolumeRes.ok) {
          spotVolumeData = await spotVolumeRes.json()
        } else {
          console.error("Spot Volume API error:", spotVolumeRes.status)
        }
        
        if (cvdRes.ok) {
          cvdData = await cvdRes.json()
        } else {
          console.error("CVD API error:", cvdRes.status)
        }
        
        let sentimentData: any = {}
        if (sentimentRes.ok) {
          sentimentData = await sentimentRes.json()
        } else {
          console.error("Sentiment API error:", sentimentRes.status)
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
          volume_change: Number(oiData.volume_change) || 0,
          spot_volume: Number(spotVolumeData.spot_volume) || 0,
          spot_volume_change: Number(spotVolumeData.spot_volume_change) || 0,
          cvd: Number(cvdData.cvd_value) || Number(cvdData.cvd) || 0,
          cvd_change: 0,
          signal: oiData?.analysis?.signal?.includes("bullish") ? "LONG" : 
                  oiData?.analysis?.signal?.includes("bearish") ? "SHORT" : "NEUTRAL",
          score: oiData?.analysis?.strength || 0,
          ema20: Number(levelsData?.ema_levels?.ema20) || Number(profileData?.ema20) || price * 0.99,
          ema50: Number(levelsData?.ema_levels?.ema50) || Number(profileData?.ema50) || price * 0.98,
          ema200: Number(levelsData?.ema_levels?.ema200) || price * 0.95,
          poc: Number(profileData?.poc) || Number(levelsData?.poc) || price,
          vah: Number(profileData?.vah) || price * 1.02,
          val: Number(profileData?.val) || price * 0.98,
          atr: Number(levelsData?.atr) || price * 0.008,
          funding: Number(oiData.funding_rate) || Number(oiData.funding) || Number(levelsData?.liquidation_levels?.funding_rate) || 0,
          rsi: Number(levelsData?.ema_levels?.rsi) || Number(oiData.rsi) || 50,
          macd: Number(levelsData?.ema_levels?.macd) || Number(oiData.macd) || 0,
          macd_signal: Number(levelsData?.ema_levels?.macd_signal) || Number(oiData.macd_signal) || 0,
          exchange_flow: Number(oiData.exchange_flow) || 0,
          sentiment: {
            long_short_ratio: Number(sentimentData.long_short_ratio) || 1.0,
            long_accounts_pct: Number(sentimentData.long_accounts_pct) || 50.0,
            short_accounts_pct: Number(sentimentData.short_accounts_pct) || 50.0,
            top_trader_ratio: Number(sentimentData.top_trader_ratio) || 1.0,
            top_long_pct: Number(sentimentData.top_long_pct) || 50.0,
            top_short_pct: Number(sentimentData.top_short_pct) || 50.0,
            taker_volume_ratio: Number(sentimentData.taker_volume_ratio) || 1.0,
            taker_buy: Number(sentimentData.taker_buy) || 1.0,
            taker_sell: Number(sentimentData.taker_sell) || 1.0,
            sentiment_signal: sentimentData.sentiment_signal || "neutral",
          },
        }
        
        console.log(`DEBUG final values for ${symbol}:`, {
          poc: combinedData.poc,
          vah: combinedData.vah,
          val: combinedData.val,
          ema20: combinedData.ema20,
          ema50: combinedData.ema50,
          price: combinedData.price
        })
        
        setMarketData(combinedData)
        console.log(`MarketData set for ${symbol}:`, combinedData)
        // Use analysis directly - backend now includes change percentages
        const enrichedAnalysis = oiData?.analysis ? {
          ...oiData.analysis,
          // Use calculated values from marketData (more accurate)
          oi_change_pct: combinedData.oi_change,
          price_change_pct: combinedData.change_24h,
          volume_change_pct: combinedData.volume_change,
        } : null
        setOiAnalysis(enrichedAnalysis)
        

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
            volume_change: 2.5,
            spot_volume: 25.5e9,
            spot_volume_change: 1.8,
            cvd: 2450000,
            cvd_change: 3.5,
            signal: "LONG",
            score: 5,
            ema20: fallbackPrice * 0.99,
            ema50: fallbackPrice * 0.97,
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
            sentiment: {
              long_short_ratio: 1.0,
              long_accounts_pct: 50.0,
              short_accounts_pct: 50.0,
              top_trader_ratio: 1.0,
              top_long_pct: 50.0,
              top_short_pct: 50.0,
              taker_volume_ratio: 1.0,
              taker_buy: 1.0,
              taker_sell: 1.0,
              sentiment_signal: "neutral",
            },
          })
        }
        
        setOiAnalysis({
          status: "long_buildup",
          signal: "strong_bullish",
          description: "OI↑ Цена↑ Объем↑ — Крупные игроки покупают, толпа шортит.",
          detailed: "Рано или поздно толпа закроет шорты по стопам — цена пойдет вверх.",
          action: "Рассматривать покупки (лонг)",
          tactic: "Искать точки входа на ретестах. Ложный пробой или откат на 1-3%.",
          color: "#22c55e",
          strength: 4
        })
        
        const liqPrice = (!marketData || marketData.price === 0) ? fallbackPrice : marketData.price

      } finally {
        setLoading(false)
        isFirstLoad.current = false
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
            <h2 className="text-xl font-bold tracking-tight uppercase">MIRKASO</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("common.loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold uppercase">MIRKASO</h1>
            <CoinSearch onSelect={(sym) => setSymbol(sym.replace("USDT", ""))} currentSymbol={symbol + "USDT"} />
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
            <UserMenu onOpenAuth={() => setAuthOpen(true)} />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Connect
            </Button>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600">
            ⚠️ {error}
          </div>
        )}

        {/* Row 1: OI Analysis Cards */}
        <OIAnalysisCards data={marketData} loading={loading} timeframe={timeframe} />

        {/* Row 2: TradingView Chart + OI Analysis + Fundamentals */}
        <div className="flex flex-col lg:flex-row gap-4 px-4 py-4 lg:px-6">
          <div className="lg:w-2/3 flex flex-col">
            <ChartSection className="flex-1" symbol={symbol} timeframe={timeframe} data={marketData} loading={loading} />
          </div>
          <div className="lg:w-1/3 flex flex-col">
            <OITerminal analysis={oiAnalysis} loading={loading} />
          </div>
        </div>

        {/* Row 4: Short Term Points + Fundamentals */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-2 lg:px-6 items-stretch">
          <Card className="flex flex-col">
            <CardHeader className="gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-amber-500">
                <Target className="w-4 h-4" />
                {t("dashboard.entryLevels")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <ProBlurOverlay title={t("dashboard.entryLevels")} description="Get exact entry, stop, and take-profit levels with scenario planning.">
                <EntryLevels data={marketData} sentiment={marketData.sentiment} loading={loading} />
              </ProBlurOverlay>
            </CardContent>
          </Card>
          <ProBlurOverlay title={t("dashboard.fundamentals")} description="MVRV, NUPL, and funding context with trading interpretation.">
            <FundamentalsCard symbol={symbol} loading={loading} />
          </ProBlurOverlay>
        </div>

        {/* Row 6: Secondary Indicators */}
        <SecondaryIndicators data={marketData} timeframe={timeframe} loading={loading} />
        
        {/* Auth Modal */}
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </main>
    </div>
  )
}
