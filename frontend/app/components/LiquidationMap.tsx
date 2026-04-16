"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Target, AlertTriangle } from "lucide-react"
import { ORDER_BOOK_LEVELS } from "./OrderBook"
import { cn } from "@/lib/utils"

interface LiquidationLevel {
  price: number
  size: number
  side: "Long" | "Short"
}

interface LiquidationMapProps {
  liquidations: LiquidationLevel[]
  currentPrice: number
  symbol: string
  loading?: boolean
}

type MapLevel = {
  price: number
  size: number
}

type StepOption = { label: string; value: number }

const MID_HEIGHT = 22 // px
const CHART_HEIGHT = 622 // px — fixed total height for shorts + mid + longs


export function LiquidationMap({
  liquidations,
  currentPrice,
  symbol,
  loading,
}: LiquidationMapProps) {
  const levelCount = ORDER_BOOK_LEVELS

  // Compute step options synchronously every render to guarantee correctness
  const price = currentPrice || (symbol === "BTC" ? 70000 : symbol === "ETH" ? 3500 : 100)
  let stepOptions: StepOption[]
  if (price >= 20000) stepOptions = [{ label: "$10", value: 10 }, { label: "$50", value: 50 }, { label: "$100", value: 100 }]
  else if (price >= 1000) stepOptions = [{ label: "$1", value: 1 }, { label: "$5", value: 5 }, { label: "$10", value: 10 }]
  else if (price >= 100) stepOptions = [{ label: "$0.1", value: 0.1 }, { label: "$0.5", value: 0.5 }, { label: "$1", value: 1 }]
  else if (price >= 1) stepOptions = [{ label: "$0.01", value: 0.01 }, { label: "$0.05", value: 0.05 }, { label: "$0.1", value: 0.1 }]
  else if (price >= 0.01) stepOptions = [{ label: "$0.001", value: 0.001 }, { label: "$0.005", value: 0.005 }, { label: "$0.01", value: 0.01 }]
  else stepOptions = [{ label: "$0.0001", value: 0.0001 }, { label: "$0.0005", value: 0.0005 }, { label: "$0.001", value: 0.001 }]

  const positiveSteps = stepOptions.map((o) => o.value).filter((v) => v > 0)
  const targetStep = price * 0.005
  const defaultStep = positiveSteps.length
    ? positiveSteps.reduce((best, s) => (Math.abs(s - targetStep) < Math.abs(best - targetStep) ? s : best))
    : 1

  const userStepRef = useRef<number | null>(null)
  const [tick, setTick] = useState(0)
  const selectedStep = userStepRef.current ?? defaultStep

  useEffect(() => {
    userStepRef.current = null
    setTick((t) => t + 1)
  }, [symbol])

  const rowHeight = Math.max(2, Math.floor((CHART_HEIGHT - MID_HEIGHT) / (levelCount * 2)))

  const { shortsAbove, longsBelow, maxSize, midPrice } = useMemo(() => {
    if (!currentPrice || loading) {
      return { shortsAbove: [] as MapLevel[], longsBelow: [] as MapLevel[], maxSize: 1, midPrice: 0 }
    }

    const safeLiqs = Array.isArray(liquidations) ? liquidations : []
    const step = selectedStep > 0 ? selectedStep : 1

    // Shorts are ABOVE current price (liquidated when price goes up)
    const shorts: MapLevel[] = []
    for (let i = levelCount; i >= 1; i--) {
      const price = currentPrice + step * i // farther first
      const bucketCenter = Math.round(price / step) * step
      const size = safeLiqs
        .filter((l) => l.side === "Short")
        .reduce((sum, l) => {
          const lCenter = Math.round(l.price / step) * step
          return lCenter === bucketCenter ? sum + l.size : sum
        }, 0)
      shorts.push({ price, size })
    }

    // Longs are BELOW current price (liquidated when price goes down)
    const longs: MapLevel[] = []
    for (let i = 1; i <= levelCount; i++) {
      const price = currentPrice - step * i // closest first
      const bucketCenter = Math.round(price / step) * step
      const size = safeLiqs
        .filter((l) => l.side === "Long")
        .reduce((sum, l) => {
          const lCenter = Math.round(l.price / step) * step
          return lCenter === bucketCenter ? sum + l.size : sum
        }, 0)
      longs.push({ price, size })
    }

    const ms = Math.max(
      ...shorts.map((s) => s.size),
      ...longs.map((l) => l.size),
      1
    )

    return {
      shortsAbove: shorts, // already ordered: farthest at top, closest at bottom
      longsBelow: longs,   // already ordered: closest at top, farthest at bottom
      maxSize: ms,
      midPrice: currentPrice,
    }
  }, [liquidations, currentPrice, loading, selectedStep, levelCount])

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }

  const formatSize = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(0)
  }

  const scaleMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatSize(maxSize * ratio)
  )

  if (loading) {
    return (
      <div className="w-full border-2 border-primary/30 rounded-xl bg-[#0b0f19] p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">LIQUIDATION MAP</span>
        </div>
        <div className="space-y-0">
          {[...Array(levelCount)].map((_, i) => (
            <div key={i} className="bg-primary/10 rounded animate-pulse" style={{ height: rowHeight }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="w-full border-2 border-amber-500/30 rounded-xl bg-[#0b0f19] p-3 font-mono flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold tracking-widest text-amber-500">LIQUIDATION MAP</span>
          <span className="text-[10px] text-muted-foreground">{symbol}/USDT</span>
        </div>
        <div className="flex items-center gap-1">
          {stepOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { userStepRef.current = opt.value === defaultStep ? null : opt.value; setTick((t) => t + 1) }}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded transition-colors border",
                selectedStep === opt.value
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-[#0b0f19] text-muted-foreground border-slate-700 hover:border-amber-500/50 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top scale */}
      <div className="grid grid-cols-[72px_1fr] mb-1">
        <div />
        <div className="flex justify-between text-[10px] text-slate-500 px-0">
          {scaleMarkers.map((m, i) => (
            <span key={i} className={(i === 0 ? "text-left" : i === 4 ? "text-right" : "")}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Shorts - above price (red/rose) */}
      <div className="flex flex-col">
        {shortsAbove.map((level, i) => {
          const barWidth = (level.size / maxSize) * 100
          return (
            <motion.div
              key={`short-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: rowHeight }}
            >
              <div className="text-right pr-3 text-[10px] font-mono text-white leading-none">
                {formatPrice(level.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-slate-800/40" style={{ marginLeft: `${k * 25}%` }} />
                  ))}
                </div>
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-600/80 to-rose-500/20"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Mid price */}
      <div
        className="grid grid-cols-[72px_1fr] items-center shrink-0 border-y border-amber-500/40 bg-amber-500/10 my-0.5"
        style={{ height: MID_HEIGHT }}
      >
        <div className="text-right pr-3 text-[11px] font-bold font-mono text-amber-400 leading-none">
          {formatPrice(midPrice)}
        </div>
        <div className="flex items-center justify-center gap-1">
          <Target className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-slate-400 leading-none">Current Price</span>
        </div>
      </div>

      {/* Longs - below price (green/emerald) */}
      <div className="flex flex-col">
        {longsBelow.map((level, i) => {
          const barWidth = (level.size / maxSize) * 100
          return (
            <motion.div
              key={`long-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: rowHeight }}
            >
              <div className="text-right pr-3 text-[10px] font-mono text-white leading-none">
                {formatPrice(level.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-slate-800/40" style={{ marginLeft: `${k * 25}%` }} />
                  ))}
                </div>
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600/80 to-emerald-500/20"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Shorts: <span className="text-rose-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
        <span>Max: <span className="text-amber-400 font-bold">{formatSize(maxSize)}</span></span>
        <span>Longs: <span className="text-emerald-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
      </div>
    </motion.div>
  )
}
