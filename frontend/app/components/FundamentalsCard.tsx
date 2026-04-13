"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Activity, Wallet, AlertCircle, Loader2, Zap } from "lucide-react"
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
            "flex items-center justify-between p-2 rounded border",
            getSentimentBg(sentiment)
          )}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            {sentiment === "BULLISH" ? (
              <TrendingUp className={cn("w-4 h-4", getSentimentColor(sentiment))} />
            ) : sentiment === "BEARISH" ? (
              <TrendingDown className={cn("w-4 h-4", getSentimentColor(sentiment))} />
            ) : (
              <Wallet className={cn("w-4 h-4", getSentimentColor(sentiment))} />
            )}
            <span className={cn("text-xs font-bold", getSentimentColor(sentiment))}>
              {sentiment}
            </span>
          </div>
          <span className={cn("text-sm font-mono font-bold", getSentimentColor(sentiment))}>
            {score > 0 ? "+" : ""}{score.toFixed(2)}
          </span>
        </motion.div>

        {/* MVRV */}
        {data.mvrv && (
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span>MVRV</span>
              <span className={cn(
                "font-bold",
                data.mvrv.value < 1.0 ? "text-emerald-500" :
                data.mvrv.value < 2.0 ? "text-blue-400" :
                data.mvrv.value < 3.5 ? "text-amber-500" : "text-rose-500"
              )}>
                {data.mvrv.value.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  data.mvrv.value < 1.0 ? "bg-emerald-500" :
                  data.mvrv.value < 2.0 ? "bg-blue-400" :
                  data.mvrv.value < 3.5 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min(100, (data.mvrv.value / 5) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">{data.mvrv.raw_data?.description}</p>
          </motion.div>
        )}

        {/* NUPL */}
        {data.nupl && (
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span>NUPL</span>
              <span className={cn(
                "font-bold",
                data.nupl.value > 0.75 ? "text-rose-500" :
                data.nupl.value > 0.50 ? "text-amber-500" :
                data.nupl.value > 0.25 ? "text-yellow-400" :
                data.nupl.value > 0 ? "text-emerald-500" : "text-blue-400"
              )}>
                {data.nupl.value > 0 ? "+" : ""}{data.nupl.value.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  data.nupl.value > 0.75 ? "bg-rose-500" :
                  data.nupl.value > 0.50 ? "bg-amber-500" :
                  data.nupl.value > 0.25 ? "bg-yellow-400" :
                  data.nupl.value > 0 ? "bg-emerald-500" : "bg-blue-400"
                )}
                style={{ width: `${Math.min(100, Math.max(0, (data.nupl.value + 0.5) / 1.25) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">{data.nupl.raw_data?.description}</p>
          </motion.div>
        )}

        {/* Market Momentum (ETH fallback) */}
        {comps.market_momentum && !data.mvrv && (
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span>24h Momentum</span>
              <span className={cn(
                "font-bold",
                comps.market_momentum.value > 0.10 ? "text-emerald-500" :
                comps.market_momentum.value < -0.10 ? "text-rose-500" : "text-amber-500"
              )}>
                {(comps.market_momentum.value * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  comps.market_momentum.value > 0.10 ? "bg-emerald-500" :
                  comps.market_momentum.value < -0.10 ? "bg-rose-500" : "bg-amber-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, (comps.market_momentum.value + 0.5) / 1.0) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Рыночный импульс за 24ч</p>
          </motion.div>
        )}

        {/* Components mini grid */}
        {data.composite && (
          <motion.div
            className={cn(
              "grid gap-2 pt-2 border-t border-slate-800",
              Object.keys(comps).length === 2 ? "grid-cols-2" : "grid-cols-3"
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
