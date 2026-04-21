"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../context/LanguageContext"
import Link from "next/link"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Bitcoin, Activity, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
  Area,
} from "recharts"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

interface FlowPoint {
  date: string
  daily_flow: number
  cumulative_flow: number
  btc_price: number
}

interface AUMPoint {
  date: string
  total_flow_usd: number
  total_aum_usd: number
  total_btc_held: number
  btc_price: number
}

interface FundStat {
  fund_ticker: string
  fund_name: string
  total_invested_usd: number
  total_btc_held: number
  avg_btc_price: number
  latest_aum_usd: number
  unrealized_pnl_usd: number
  unrealized_pnl_pct: number
}

interface LatestFlow {
  fund_ticker: string
  fund_name: string
  flow_usd: number
  total_btc_held?: number
  avg_btc_price?: number
  latest_aum_usd?: number
  unrealized_pnl_usd?: number
  unrealized_pnl_pct?: number
}

function formatUSD(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border bg-card p-3 text-sm shadow-sm">
        <p className="font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="mt-1" style={{ color: p.color }}>
            {p.name}: {p.name?.includes("BTC") ? `$${Number(p.value).toLocaleString()}` : formatUSD(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function EtfPage() {
  const { t } = useLanguage()
  const [summary, setSummary] = useState<any>(null)
  const [latest, setLatest] = useState<{ date: string; flows: LatestFlow[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, latRes] = await Promise.all([
          fetch(`${API_BASE_URL}/etf/summary`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/etf/flows/latest`, { cache: "no-store" }),
        ])
        if (!sumRes.ok || !latRes.ok) throw new Error("Failed to load ETF data")
        const sumData = await sumRes.json()
        const latData = await latRes.json()
        setSummary(sumData)
        setLatest(latData)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totals = summary?.totals
  const cumulative = summary?.cumulative || []
  const aumHistory = summary?.aum_history || []
  const funds = summary?.funds || []

  const flowChartData = cumulative.map((d: FlowPoint) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    dailyFlow: d.daily_flow,
    cumulativeFlow: d.cumulative_flow,
    btcPrice: d.btc_price,
  }))

  const aumChartData = aumHistory.map((d: AUMPoint) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    totalAUM: d.total_aum_usd,
    btcPrice: d.btc_price,
  }))

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Bitcoin Spot ETFs</h1>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Daily flows, AUM and P&L across all US spot Bitcoin ETFs
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 lg:space-y-8 lg:p-6">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total AUM"
            value={loading ? "--" : formatUSD(totals?.aum_usd || 0)}
            sub={loading ? "" : `${formatUSD(totals?.invested_usd || 0)} invested`}
            icon={DollarSign}
            tone="neutral"
          />
          <MetricCard
            title="Unrealized P&L"
            value={loading ? "--" : formatUSD(totals?.pnl_usd || 0)}
            sub={loading ? "" : `${totals?.pnl_pct?.toFixed(2) || 0}%`}
            icon={totals?.pnl_usd >= 0 ? TrendingUp : TrendingDown}
            tone={totals?.pnl_usd >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            title="Total BTC Held"
            value={loading ? "--" : `${(totals?.btc_held || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sub={loading ? "" : `~${formatUSD(totals?.avg_btc_price || 0)} avg price`}
            icon={Bitcoin}
            tone="neutral"
          />
          <MetricCard
            title="Latest Daily Flow"
            value={loading ? "--" : formatUSD(latest?.flows?.find((f: any) => f.fund_ticker === "TOTAL")?.flow_usd || 0)}
            sub={loading ? "" : latest?.date ? new Date(latest.date).toLocaleDateString() : ""}
            icon={Activity}
            tone={latest?.flows?.find((f: any) => f.fund_ticker === "TOTAL")?.flow_usd >= 0 ? "positive" : "negative"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Daily Net Flows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatUSD(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="dailyFlow"
                        name="Daily Flow"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Total AUM vs BTC Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={aumChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => formatUSD(v)}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalAUM"
                        name="Total AUM"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.15}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="btcPrice"
                        name="BTC Price"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fund Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("etf.fund")}</TableHead>
                    <TableHead className="text-right">AUM</TableHead>
                    <TableHead className="text-right">BTC Held</TableHead>
                    <TableHead className="text-right">Avg BTC Price</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    funds.map((f: FundStat) => (
                      <TableRow key={f.fund_ticker}>
                        <TableCell>
                          <div className="font-medium">{f.fund_name}</div>
                          <div className="text-xs text-muted-foreground">{f.fund_ticker}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatUSD(f.latest_aum_usd)}</TableCell>
                        <TableCell className="text-right font-mono">{f.total_btc_held.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono">{formatUSD(f.avg_btc_price)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={f.unrealized_pnl_usd >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {formatUSD(f.unrealized_pnl_usd)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              f.unrealized_pnl_usd >= 0
                                ? "border-emerald-200 text-emerald-600"
                                : "border-red-200 text-red-600"
                            )}
                          >
                            {f.unrealized_pnl_usd >= 0 ? "Profit" : "Loss"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!loading && funds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No ETF data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Latest Daily Breakdown {latest?.date && `· ${new Date(latest.date).toLocaleDateString()}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("etf.fund")}</TableHead>
                    <TableHead className="text-right">Flow</TableHead>
                    <TableHead className="text-right">BTC Held</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">Direction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    latest?.flows
                      ?.filter((f) => f.fund_ticker !== "TOTAL")
                      ?.map((f) => (
                        <TableRow key={f.fund_ticker}>
                          <TableCell>
                            <div className="font-medium">{f.fund_name}</div>
                            <div className="text-xs text-muted-foreground">{f.fund_ticker}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={f.flow_usd >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {formatUSD(f.flow_usd)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(f.total_btc_held ?? 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatUSD(f.avg_btc_price ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={(f.unrealized_pnl_usd ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {formatUSD(f.unrealized_pnl_usd ?? 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                f.flow_usd >= 0
                                  ? "border-emerald-200 text-emerald-600"
                                  : "border-red-200 text-red-600"
                              )}
                            >
                              {f.flow_usd >= 0 ? "Inflow" : "Outflow"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                  {!loading && (latest?.flows || []).filter((f: any) => f.fund_ticker !== "TOTAL").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No daily breakdown available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  tone: "positive" | "negative" | "neutral"
}) {
  return (
    <Card className={cn(
      "border",
      tone === "positive" && "border-emerald-500/20 bg-emerald-500/5",
      tone === "negative" && "border-red-500/20 bg-red-500/5",
      tone === "neutral" && "border-border bg-card"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-red-600",
          tone === "neutral" && "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
