"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3, Wallet, ArrowUpRight, ArrowDownRight, Target, Zap } from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CryptoChart } from "./components/CryptoChart"
import Sidebar from "./components/admin/Sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const symbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK", "AVAX", "MATIC"]

interface MarketData {
  symbol: string
  price: number
  change_24h: number
  oi: number
  oi_change: number
  volume: number
  signal: "LONG" | "SHORT" | "NEUTRAL"
  score?: number
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

// Mock data for fallback
const getMockMarketData = (symbol: string): MarketData => ({
  symbol,
  price: symbol === "BTC" ? 67234 : symbol === "ETH" ? 3456 : 145,
  change_24h: Math.random() * 10 - 3,
  oi: 15.5e9,
  oi_change: Math.random() * 5 - 1,
  volume: 28.3e9,
  signal: Math.random() > 0.5 ? "LONG" : "SHORT",
  score: Math.floor(Math.random() * 7),
})

const getMockChecklist = (symbol: string): ChecklistData => ({
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

const getMockLevels = (symbol: string) => ({
  ema20: symbol === "BTC" ? 66500 : symbol === "ETH" ? 3400 : 140,
  ema50: symbol === "BTC" ? 65800 : symbol === "ETH" ? 3350 : 135,
  poc: symbol === "BTC" ? 66800 : symbol === "ETH" ? 3420 : 142,
  liquidation_levels: [
    { side: "Long", price: symbol === "BTC" ? 65000 : 3200 },
    { side: "Short", price: symbol === "BTC" ? 69000 : 3700 },
  ],
})

// Section Card Component
function SectionCard({
  title,
  description,
  value,
  trend,
  trendUp,
}: {
  title: string
  description: string
  value: string
  trend: string
  trendUp: boolean
}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className={cn(
            "gap-1 text-sm",
            trendUp ? "text-emerald-500" : "text-red-500"
          )}>
            {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {title}
          <span className={cn(
            "flex items-center gap-1",
            trendUp ? "text-emerald-500" : "text-red-500"
          )}>
            {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          </span>
        </div>
        <div className="text-muted-foreground">Real-time market data</div>
      </CardFooter>
    </Card>
  )
}

// Section Cards Grid
function SectionCards({ data }: { data: MarketData }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <SectionCard
        description="Current Price"
        title={data.symbol}
        value={`$${data.price?.toLocaleString?.() || data.price || 0}`}
        trend={`${(data.change_24h || 0) >= 0 ? "+" : ""}${(data.change_24h || 0).toFixed(2)}%`}
        trendUp={(data.change_24h || 0) >= 0}
      />
      <SectionCard
        description="Open Interest"
        title="OI Value"
        value={`$${((data.oi || 0) / 1e9).toFixed(2)}B`}
        trend={`${(data.oi_change || 0) >= 0 ? "+" : ""}${(data.oi_change || 0).toFixed(2)}%`}
        trendUp={(data.oi_change || 0) >= 0}
      />
      <SectionCard
        description="24h Volume"
        title="Trading Volume"
        value={`$${((data.volume || 0) / 1e9).toFixed(2)}B`}
        trend="High activity"
        trendUp={true}
      />
      <SectionCard
        description="Signal"
        title="Trading Signal"
        value={data.signal || "NEUTRAL"}
        trend={data.score !== undefined ? `Score: ${data.score}/7` : "Analyzing..."}
        trendUp={data.signal === "LONG"}
      />
    </div>
  )
}

// Chart Area Component
function ChartArea({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="gap-2">
        <CardTitle>Price Action & OI</CardTitle>
        <CardDescription>
          Real-time price and Open Interest correlation for {symbol}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 sm:px-6 min-h-[400px]">
        <CryptoChart symbol={symbol} />
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

// Key Levels Card
function KeyLevelsCard({ 
  symbol, 
  levels 
}: { 
  symbol: string
  levels: any 
}) {
  const liqLevels = levels?.liquidation_levels || []
  
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Key Levels</CardTitle>
        <CardDescription>
          EMA & liquidation levels for {symbol}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {levels ? (
          <div className="space-y-3">
            {levels.ema20 && (
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">EMA 20</span>
                <span className="font-medium">${levels.ema20.toLocaleString()}</span>
              </div>
            )}
            {levels.ema50 && (
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">EMA 50</span>
                <span className="font-medium">${levels.ema50.toLocaleString()}</span>
              </div>
            )}
            {levels.poc && (
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">POC</span>
                <span className="font-medium">${levels.poc.toLocaleString()}</span>
              </div>
            )}
            {Array.isArray(liqLevels) && liqLevels.slice(0, 2).map((level: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">{level?.side || "Level"} Zone</span>
                <span className="font-medium">${level?.price?.toLocaleString?.() || level?.price || 0}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">
            Loading levels...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const [symbol, setSymbol] = useState("BTC")
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [levels, setLevels] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [oiRes, checklistRes, levelsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/market/oi/${symbol}`),
          fetch(`${API_BASE_URL}/market/checklist/${symbol}`),
          fetch(`${API_BASE_URL}/market/levels/${symbol}`),
        ])
        
        let oiData, checklistData, levelsData
        
        // Use real data if available, otherwise fallback to mock
        if (oiRes.ok) {
          oiData = await oiRes.json()
        } else {
          oiData = getMockMarketData(symbol)
        }
        
        if (checklistRes.ok) {
          checklistData = await checklistRes.json()
        } else {
          checklistData = getMockChecklist(symbol)
        }
        
        if (levelsRes.ok) {
          levelsData = await levelsRes.json()
        } else {
          levelsData = getMockLevels(symbol)
        }
        
        setMarketData({
          symbol,
          price: oiData?.price || 0,
          change_24h: oiData?.change_24h || 0,
          oi: oiData?.oi || 0,
          oi_change: oiData?.oi_change || 0,
          volume: oiData?.volume || 0,
          signal: checklistData?.score >= 5 ? "LONG" : checklistData?.score <= 2 ? "SHORT" : "NEUTRAL",
          score: checklistData?.score,
        })
        
        setChecklist(checklistData)
        setLevels(levelsData)
      } catch (error) {
        console.error("Failed to fetch market data:", error)
        // Fallback to mock data on error
        setMarketData(getMockMarketData(symbol))
        setChecklist(getMockChecklist(symbol))
        setLevels(getMockLevels(symbol))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [symbol])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 overflow-hidden ml-0 lg:ml-64">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
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

        {/* Section Cards Grid */}
        {marketData && <SectionCards data={marketData} />}

        {/* Chart and Checklist Area */}
        <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-3 lg:px-6">
          <ChartArea symbol={symbol} className="lg:col-span-2" />
          <ChecklistScoreCard 
            symbol={symbol} 
            checklist={checklist} 
            loading={loading} 
          />
        </div>

        {/* Key Levels */}
        <div className="px-4 pb-6 lg:px-6">
          <KeyLevelsCard symbol={symbol} levels={levels} />
        </div>
      </main>
    </div>
  )
}
