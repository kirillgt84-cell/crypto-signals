"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Activity, Wallet, AlertCircle, Loader2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

interface FundamentalsData {
  mvrv: {
    value: number
    raw_data: {
      interpretation: string
      description: string
    }
    computed_at: string
  } | null
  nupl: {
    value: number
    raw_data: {
      interpretation: string
      description: string
    }
    computed_at: string
  } | null
  composite: {
    score: number
    sentiment: string
    components: Record<
      string,
      { value: number; normalized: number; weight: number }
    >
    interpretation: Record<string, string>
  } | null
}

interface FundamentalsCardProps {
  symbol: string
  loading?: boolean
}

const METRIC_INFO: Record<string, string> = {
  mvrv: "Market Value to Realized Value — отношение рыночной капитализации к реализованной. Показывает, насколько актив переоценён или недооценён.",
  nupl: "Net Unrealized Profit/Loss — доля нераспределённой прибыли/убытка. Отражает эмоциональное состояние рынка.",
  funding: "Плата за удержание маржинальных позиций. Положительная = переплата лонгистов, отрицательная = шортистов.",
  market_momentum: "Изменение цены за 24 часа. Отражает краткосрочный рыночный импульс.",
}

function ZoneCard({
  title,
  valueFormatted,
  description,
  infoKey,
  children,
}: {
  title: string
  valueFormatted: string
  description: string
  infoKey: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{title}</span>
          <div className="group relative">
            <Info className="w-3 h-3 text-slate-600 cursor-help hover:text-slate-400 transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 p-2 bg-slate-900 border border-slate-700 rounded-md text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
              {METRIC_INFO[infoKey]}
            </div>
          </div>
        </div>
        <span className="text-xs font-bold font-mono text-white">{valueFormatted}</span>
      </div>

      {children}

      <p className="text-[10px] font-medium text-slate-400 leading-tight">{description}</p>
    </div>
  )
}

function ZoneBar({
  segments,
  indicatorPosition,
}: {
  segments: { color: string }[]
  indicatorPosition: number
}) {
  return (
    <div className="space-y-0.5">
      <div className="relative h-2 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => (
          <div key={i} className={cn("h-full flex-1 first:rounded-l-full last:rounded-r-full", seg.color, i > 0 && "ml-px")} />
        ))}
      </div>
      <div className="relative h-1">
        <div
          className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-white -translate-x-1/2 transition-all duration-500"
          style={{ left: `${Math.max(2, Math.min(98, indicatorPosition))}%` }}
        />
      </div>
    </div>
  )
}

export function FundamentalsCard({ symbol, loading: parentLoading }: FundamentalsCardProps) {
  const [data, setData] = useState<FundamentalsData>({ mvrv: null, nupl: null, composite: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFundamentals = async () => {
      setLoading(true)
      try {
        const [mvrvRes, nuplRes, compositeRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/mvrv`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/nupl`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/composite`, { cache: "no-store" }),
        ])

        const mvrv = mvrvRes.status === "fulfilled" && mvrvRes.value.ok ? await mvrvRes.value.json() : null
        const nupl = nuplRes.status === "fulfilled" && nuplRes.value.ok ? await nuplRes.value.json() : null
        const composite = compositeRes.status === "fulfilled" && compositeRes.value.ok ? await compositeRes.value.json() : null

        setData({ mvrv, nupl, composite })
      } catch (e) {
        console.error("Failed to fetch fundamentals:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchFundamentals()
  }, [symbol])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <Card className="bg-[#0b0f19] border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-amber-500">
            <Activity className="w-4 h-4" />
            FUNDAMENTAL HEALTH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnyData = data.mvrv || data.nupl || data.composite

  if (!hasAnyData) {
    return (
      <Card className="bg-[#0b0f19] border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-amber-500">
            <Activity className="w-4 h-4" />
            FUNDAMENTAL HEALTH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Fundamental data not available yet</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sentiment = data.composite?.sentiment || "NEUTRAL"
  const score = data.composite?.score || 0

  const getSentimentColor = (s: string) => {
    if (s === "BULLISH") return "text-emerald-500"
    if (s === "BEARISH") return "text-rose-500"
    return "text-amber-500"
  }

  const getSentimentBg = (s: string) => {
    if (s === "BULLISH") return "bg-emerald-500/10 border-emerald-500/30"
    if (s === "BEARISH") return "bg-rose-500/10 border-rose-500/30"
    return "bg-amber-500/10 border-amber-500/30"
  }

  const getSentimentEmoji = (s: string) => {
    if (s === "BULLISH") return "🚀"
    if (s === "BEARISH") return "🐻"
    return "⚖️"
  }

  const comps = data.composite?.components || {}

  return (
    <Card className="bg-[#0b0f19] border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-amber-500">
          <Activity className="w-4 h-4" />
          FUNDAMENTAL HEALTH
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">
          MVRV + NUPL + Funding composite index
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Composite Score */}
        <motion.div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            getSentimentBg(sentiment)
          )}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{getSentimentEmoji(sentiment)}</span>
            <div>
              <div className={cn("text-sm font-bold", getSentimentColor(sentiment))}>{sentiment}</div>
              <div className="text-[10px] text-slate-500">Composite score</div>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-xl font-mono font-bold", getSentimentColor(sentiment))}>
              {score > 0 ? "+" : ""}{score.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* MVRV */}
        {data.mvrv && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ZoneCard
              title="MVRV"
              valueFormatted={data.mvrv.value.toFixed(2)}
              description={data.mvrv.raw_data?.description || ""}
              infoKey="mvrv"
            >
              <ZoneBar
                segments={[
                  { color: "bg-emerald-500" },
                  { color: "bg-blue-400" },
                  { color: "bg-amber-500" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, (data.mvrv.value / 5) * 100)}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* NUPL */}
        {data.nupl && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <ZoneCard
              title="NUPL"
              valueFormatted={`${data.nupl.value > 0 ? "+" : ""}${data.nupl.value.toFixed(2)}`}
              description={data.nupl.raw_data?.description || ""}
              infoKey="nupl"
            >
              <ZoneBar
                segments={[
                  { color: "bg-blue-400" },
                  { color: "bg-emerald-500" },
                  { color: "bg-yellow-400" },
                  { color: "bg-amber-500" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((data.nupl.value + 0.5) / 1.5) * 100))}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* Market Momentum (alt fallback) */}
        {comps.market_momentum && !data.mvrv && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
          >
            <ZoneCard
              title="24h Momentum"
              valueFormatted={`${(comps.market_momentum.value * 100).toFixed(1)}%`}
              description={
                comps.market_momentum.value > 0.10
                  ? "Сильный бычий импульс"
                  : comps.market_momentum.value < -0.10
                  ? "Сильный медвежий импульс"
                  : "Умеренный рыночный импульс"
              }
              infoKey="market_momentum"
            >
              <ZoneBar
                segments={[
                  { color: "bg-rose-500" },
                  { color: "bg-orange-400" },
                  { color: "bg-emerald-500" },
                  { color: "bg-emerald-400" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((comps.market_momentum.value + 0.3) / 0.6) * 100))}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* Funding Rate */}
        {comps.funding && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 }}
          >
            <ZoneCard
              title="Funding Rate"
              valueFormatted={`${(comps.funding.value * 100).toFixed(3)}%`}
              description={
                comps.funding.value > 0.001
                  ? "Лонги перегреты"
                  : comps.funding.value < -0.001
                  ? "Шорты перегреты"
                  : "Нейтрально"
              }
              infoKey="funding"
            >
              <ZoneBar
                segments={[
                  { color: "bg-emerald-500" },
                  { color: "bg-slate-500" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((comps.funding.value + 0.002) / 0.004) * 100))}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* Components mini grid */}
        {data.composite && (
          <motion.div
            className={cn(
              "grid gap-2 pt-2 border-t border-slate-800",
              Object.keys(comps).length <= 2 ? "grid-cols-2" : Object.keys(comps).length === 3 ? "grid-cols-3" : "grid-cols-4"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {comps.mvrv && (
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase">MVRV</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {comps.mvrv.normalized > 0 ? "+" : ""}
                  {comps.mvrv.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.nupl && (
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase">NUPL</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {comps.nupl.normalized > 0 ? "+" : ""}
                  {comps.nupl.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.funding && (
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase">Funding</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {comps.funding.normalized > 0 ? "+" : ""}
                  {comps.funding.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.market_momentum && (
              <div className="text-center">
                <p className="text-[9px] text-slate-500 uppercase">Momentum</p>
                <p className="text-[10px] font-mono font-bold text-slate-300">
                  {comps.market_momentum.normalized > 0 ? "+" : ""}
                  {comps.market_momentum.normalized.toFixed(2)}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
