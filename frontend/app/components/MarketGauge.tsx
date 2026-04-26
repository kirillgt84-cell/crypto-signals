"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/app/context/LanguageContext"
import { API_BASE_URL } from "@/app/lib/api"
import { RSIGauge } from "./RSIGauge"
import { MACDGauge } from "./MACDGauge"
import { Loader2 } from "lucide-react"

interface GaugeData {
  symbol: string
  timeframe: string
  timestamp: string
  rsi: {
    value: number
    zone: string
  }
  macd: {
    trend: "bull" | "bear"
    histogram: number[]
    momentum: string
  }
  signal: {
    type: string
    strength: number
  }
  divergence: null | object
}

const TIMEFRAMES = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
]

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

function getSignalColor(type: string) {
  if (type.startsWith("consider_longs")) return "bg-emerald-500/10 border-emerald-500/30"
  if (type.startsWith("consider_shorts")) return "bg-rose-500/10 border-rose-500/30"
  if (type.startsWith("await_")) return "bg-amber-500/10 border-amber-500/30"
  return "bg-slate-500/10 border-slate-500/30"
}

function getSignalTextColor(type: string) {
  if (type.startsWith("consider_longs")) return "text-emerald-400"
  if (type.startsWith("consider_shorts")) return "text-rose-400"
  if (type.startsWith("await_")) return "text-amber-400"
  return "text-slate-400"
}

export function MarketGauge({ className }: { className?: string }) {
  const { t } = useLanguage()
  const [symbol, setSymbol] = useState("BTCUSDT")
  const [timeframe, setTimeframe] = useState("1h")
  const [data, setData] = useState<GaugeData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGauge = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE_URL}/market/gauge?symbol=${symbol}&timeframe=${timeframe}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error("MarketGauge fetch failed:", e)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    fetchGauge()
    const interval = setInterval(fetchGauge, 60000)
    return () => clearInterval(interval)
  }, [fetchGauge])

  const rsiLabel =
    data?.rsi.zone === "oversold"
      ? t("marketGauge.oversold")
      : data?.rsi.zone === "overbought"
      ? t("marketGauge.overbought")
      : t("marketGauge.neutral")

  const rsiLabelColor =
    data?.rsi.zone === "oversold"
      ? "text-emerald-400"
      : data?.rsi.zone === "overbought"
      ? "text-rose-400"
      : "text-slate-400"

  const signalType = data?.signal.type || "neutral"
  const signalStrength = data?.signal.strength || 1

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 w-full max-w-[380px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-transparent text-sm font-medium text-foreground border-none outline-none cursor-pointer"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="bg-transparent text-sm text-muted-foreground border-none outline-none cursor-pointer"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Gauges row */}
          <div className="flex items-start justify-around">
            <RSIGauge
              value={data.rsi.value}
              label={rsiLabel}
              labelColorClass={rsiLabelColor}
            />
            <MACDGauge
              trend={data.macd.trend}
              histogram={data.macd.histogram}
              momentum={data.macd.momentum}
            />
          </div>

          {/* Signal block */}
          <motion.div
            className={cn(
              "rounded-lg border p-3 space-y-1.5",
              getSignalColor(signalType)
            )}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-semibold", getSignalTextColor(signalType))}>
                {t(`marketGauge.signal.${signalType}`)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{t("marketGauge.strength")}:</span>
              <span className="tracking-widest">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-block w-2 h-2 rounded-full mx-px",
                      i < signalStrength ? getSignalTextColor(signalType) : "bg-slate-700"
                    )}
                  />
                ))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 leading-snug">
              {t(`marketGauge.desc.${signalType}`)}
            </p>
          </motion.div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground/60 text-center">
            {t("marketGauge.disclaimer")}
          </p>
        </div>
      ) : null}
    </div>
  )
}
