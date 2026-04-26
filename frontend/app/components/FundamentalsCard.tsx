"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Microscope, AlertCircle, Loader2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useLanguage } from "../context/LanguageContext"

import { API_BASE_URL } from "@/app/lib/api"

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
  sopr: {
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
    components: Record<string, { value: number; normalized: number; weight: number }>
    interpretation: Record<string, string>
  } | null
}

interface FundamentalsCardProps {
  symbol: string
  loading?: boolean
}

function ZoneCard({
  title,
  valueFormatted,
  interpretation,
  infoText,
  children,
}: {
  title: string
  valueFormatted: string
  interpretation: string
  infoText: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 p-5 rounded-lg bg-muted border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-slate-200 uppercase tracking-wider">{title}</span>
          <div className="group relative">
            <Info className="w-5 h-5 text-slate-600 cursor-help hover:text-slate-400 transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-popover border border-border rounded-md text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl leading-relaxed">
              {infoText}
            </div>
          </div>
        </div>
        <span className="text-lg font-bold font-mono text-foreground">{valueFormatted}</span>
      </div>

      {children}

      <p className="text-sm text-slate-400 leading-relaxed">{interpretation}</p>
    </div>
  )
}

function ZoneBar({
  segments,
  indicatorPosition,
  labels,
}: {
  segments: { color: string }[]
  indicatorPosition: number
  labels?: string[]
}) {
  return (
    <div className="space-y-1">
      <div className="relative h-4 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={cn("h-full flex-1 first:rounded-l-full last:rounded-r-full", seg.color, i > 0 && "ml-px")}
          />
        ))}
      </div>
      <div className="relative h-2">
        <div
          className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[7px] border-b-white -translate-x-1/2 transition-all duration-500"
          style={{ left: `${Math.max(2, Math.min(98, indicatorPosition))}%` }}
        />
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-slate-500 font-medium pt-1">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function FundamentalsCard({ symbol, loading: parentLoading }: FundamentalsCardProps) {
  const { t } = useLanguage()

  const getMVRVInterpretation = (value: number) => {
    if (value < 1.0) return t("fundamentals.mvrvDeepUndervalued")
    if (value < 2.5) return t("fundamentals.mvrvFair")
    if (value < 3.5) return t("fundamentals.mvrvOvervalued")
    return t("fundamentals.mvrvBubble")
  }

  const getNUPLInterpretation = (value: number) => {
    if (value < -0.25) return t("fundamentals.nuplCapitulation")
    if (value < 0) return t("fundamentals.nuplHope")
    if (value < 0.25) return t("fundamentals.nuplModerateProfit")
    if (value < 0.5) return t("fundamentals.nuplEuphoria")
    return t("fundamentals.nuplExtremeGreed")
  }

  const getFundingInterpretation = (value: number) => {
    if (value < -0.001) return t("fundamentals.fundingShortsOverpay")
    if (value <= 0.001) return t("fundamentals.fundingNeutral")
    return t("fundamentals.fundingLongsOverpay")
  }

  const getSOPRInterpretation = (value: number) => {
    if (value < 0.98) return t("fundamentals.soprCapitulation")
    if (value < 1.0) return t("fundamentals.soprLoss")
    if (value < 1.02) return t("fundamentals.soprProfit")
    return t("fundamentals.soprEuphoria")
  }

  const [data, setData] = useState<FundamentalsData>({ mvrv: null, nupl: null, sopr: null, composite: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFundamentals = async () => {
      setLoading(true)
      try {
        const [mvrvRes, nuplRes, soprRes, compositeRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/mvrv`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/nupl`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/sopr`, { cache: "no-store" }),
          fetch(`${API_BASE_URL}/fundamentals/${symbol}/composite`, { cache: "no-store" }),
        ])

        const mvrv = mvrvRes.status === "fulfilled" && mvrvRes.value.ok ? await mvrvRes.value.json() : null
        const nupl = nuplRes.status === "fulfilled" && nuplRes.value.ok ? await nuplRes.value.json() : null
        const sopr = soprRes.status === "fulfilled" && soprRes.value.ok ? await soprRes.value.json() : null
        const composite = compositeRes.status === "fulfilled" && compositeRes.value.ok ? await compositeRes.value.json() : null

        setData({ mvrv, nupl, sopr, composite })
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
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
            <Microscope className="w-4 h-4" />
            {t("fundamentals.title")}
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

  const hasAnyData = data.mvrv || data.nupl || data.sopr || data.composite

  if (!hasAnyData) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
            <Microscope className="w-4 h-4" />
            {t("fundamentals.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>{t("fundamentals.notAvailable")}</span>
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

  const getSentimentLabel = (s: string) => {
    if (s === "BULLISH") return t("fundamentals.sentimentBullish")
    if (s === "BEARISH") return t("fundamentals.sentimentBearish")
    return t("fundamentals.sentimentNeutral")
  }

  const comps = data.composite?.components || {}

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
          <Microscope className="w-4 h-4" />
          {t("fundamentals.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <div className={cn("text-base font-bold", getSentimentColor(sentiment))}>{getSentimentLabel(sentiment)}</div>
              <div className="text-xs text-slate-500">{t("fundamentals.compositeScore")}</div>
            </div>
          </div>
          <div className="text-right">
            <span className={cn("text-xl font-mono font-bold", getSentimentColor(sentiment))}>
              {score > 0 ? "+" : ""}
              {score.toFixed(2)}
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
              interpretation={getMVRVInterpretation(data.mvrv.value)}
              infoText={t("fundamentals.mvrv")}
            >
              <ZoneBar
                segments={[
                  { color: "bg-emerald-500" },
                  { color: "bg-blue-400" },
                  { color: "bg-amber-500" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, (data.mvrv.value / 5) * 100)}
                labels={["<1.0", "1.0–2.5", "2.5–3.5", ">3.5"]}
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
              interpretation={getNUPLInterpretation(data.nupl.value)}
              infoText={t("fundamentals.nupl")}
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
                labels={["<-0.25", "-0.25–0", "0–0.25", "0.25–0.5", ">0.5"]}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* SOPR */}
        {data.sopr && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.17 }}
          >
            <ZoneCard
              title="SOPR"
              valueFormatted={data.sopr.value.toFixed(4)}
              interpretation={getSOPRInterpretation(data.sopr.value)}
              infoText={t("fundamentals.sopr")}
            >
              <ZoneBar
                segments={[
                  { color: "bg-blue-400" },
                  { color: "bg-emerald-500" },
                  { color: "bg-yellow-400" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((data.sopr.value - 0.96) / 0.08) * 100))}
                labels={["<0.98", "0.98–1.0", "1.0–1.02", ">1.02"]}
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
              title={t("fundamentals.momentum24h")}
              valueFormatted={`${(comps.market_momentum.value * 100).toFixed(1)}%`}
              interpretation={
                comps.market_momentum.value > 0.10
                  ? t("fundamentals.strongBullishMomentum")
                  : comps.market_momentum.value < -0.10
                  ? t("fundamentals.strongBearishMomentum")
                  : t("fundamentals.moderateMomentum")
              }
              infoText={t("fundamentals.momentumTooltip")}
            >
              <ZoneBar
                segments={[
                  { color: "bg-rose-500" },
                  { color: "bg-orange-400" },
                  { color: "bg-emerald-500" },
                  { color: "bg-emerald-400" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((comps.market_momentum.value + 0.3) / 0.6) * 100))}
                labels={["<-15%", "-15–0%", "0–15%", ">15%"]}
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
              title={t("fundamentals.fundingRate")}
              valueFormatted={`${(comps.funding.value * 100).toFixed(3)}%`}
              interpretation={getFundingInterpretation(comps.funding.value)}
              infoText={t("fundamentals.fundingTooltip")}
            >
              <ZoneBar
                segments={[
                  { color: "bg-emerald-500" },
                  { color: "bg-slate-500" },
                  { color: "bg-rose-500" },
                ]}
                indicatorPosition={Math.min(100, Math.max(0, ((comps.funding.value + 0.002) / 0.004) * 100))}
                labels={["<-0.05%", "±0.05%", ">0.05%"]}
              />
            </ZoneCard>
          </motion.div>
        )}

        {/* Components mini grid */}
        {data.composite && (
          <motion.div
            className={cn(
              "grid gap-2 pt-2 border-t border-slate-800",
              Object.keys(comps).length <= 2
                ? "grid-cols-2"
                : Object.keys(comps).length === 3
                ? "grid-cols-3"
                : Object.keys(comps).length <= 4
                ? "grid-cols-4"
                : "grid-cols-6"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {comps.mvrv && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">{t("fundamentals.mvrvLabel")}</p>
                <p className="text-xs font-mono font-bold text-popover-foreground">
                  {comps.mvrv.normalized > 0 ? "+" : ""}
                  {comps.mvrv.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.nupl && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">{t("fundamentals.nuplLabel")}</p>
                <p className="text-xs font-mono font-bold text-popover-foreground">
                  {comps.nupl.normalized > 0 ? "+" : ""}
                  {comps.nupl.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.sopr && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">{t("fundamentals.soprLabel")}</p>
                <p className="text-xs font-mono font-bold text-popover-foreground">
                  {comps.sopr.normalized > 0 ? "+" : ""}
                  {comps.sopr.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.funding && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">{t("fundamentals.fundingLabel")}</p>
                <p className="text-xs font-mono font-bold text-popover-foreground">
                  {comps.funding.normalized > 0 ? "+" : ""}
                  {comps.funding.normalized.toFixed(2)}
                </p>
              </div>
            )}
            {comps.market_momentum && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">{t("fundamentals.momentumLabel")}</p>
                <p className="text-xs font-mono font-bold text-popover-foreground">
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
