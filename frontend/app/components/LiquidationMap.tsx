"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Target, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ORDER_BOOK_LEVELS } from "./OrderBook"

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
  total: number
  side: "Long" | "Short"
}

const ROW_HEIGHT = 10 // px
const MID_HEIGHT = 22 // px

export function LiquidationMap({
  liquidations,
  currentPrice,
  symbol,
  loading,
}: LiquidationMapProps) {
  const { visibleLongs, visibleShorts, maxSize, midPrice } = useMemo(() => {
    if (!currentPrice || loading) {
      return { visibleLongs: [] as MapLevel[], visibleShorts: [] as MapLevel[], maxSize: 1, midPrice: 0 }
    }

    const safeLiqs = Array.isArray(liquidations) ? liquidations : []
    const step = currentPrice * 0.01 // 1% price step

    const buildSide = (side: "Long" | "Short"): MapLevel[] => {
      const isLong = side === "Long"
      const levels: MapLevel[] = []

      for (let i = 1; i <= ORDER_BOOK_LEVELS; i++) {
        const price = isLong
          ? currentPrice + step * i
          : currentPrice - step * i

        // Sum liquidations that fall into this bucket
        const bucketSize = safeLiqs
          .filter((l) => l.side === side)
          .reduce((sum, l) => {
            const bucketCenter = Math.round(l.price / step) * step
            const thisBucketCenter = Math.round(price / step) * step
            return bucketCenter === thisBucketCenter ? sum + l.size : sum
          }, 0)

        levels.push({
          price,
          size: bucketSize,
          total: 0, // will compute after
          side,
        })
      }

      // Cumulative from outer edge inward
      let cumulative = 0
      if (isLong) {
        for (let i = levels.length - 1; i >= 0; i--) {
          cumulative += levels[i].size
          levels[i].total = cumulative
        }
      } else {
        for (let i = levels.length - 1; i >= 0; i--) {
          cumulative += levels[i].size
          levels[i].total = cumulative
        }
      }

      return levels
    }

    const longs = buildSide("Long")
    const shorts = buildSide("Short")

    const allSizes = [...longs, ...shorts].map((l) => l.size)
    const ms = Math.max(...allSizes, 1)

    return {
      visibleLongs: [...longs].reverse(), // farthest at top
      visibleShorts: shorts, // closest at top
      maxSize: ms,
      midPrice: currentPrice,
    }
  }, [liquidations, currentPrice, loading])

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }

  const formatTotal = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(0)
  }

  const scaleMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatTotal(maxSize * ratio)
  )

  if (loading) {
    return (
      <div className="w-full border-2 border-primary/30 rounded-xl bg-[#0b0f19] p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">LIQUIDATION MAP</span>
        </div>
        <div className="space-y-0.5">
          {[...Array(ORDER_BOOK_LEVELS)].map((_, i) => (
            <div key={i} className="h-2 bg-primary/10 rounded animate-pulse" />
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
        </div>
        <span className="text-[10px] text-muted-foreground">{symbol}/USDT</span>
      </div>

      {/* Top scale */}
      <div className="grid grid-cols-[72px_1fr] mb-1">
        <div />
        <div className="flex justify-between text-[10px] text-slate-500 px-0">
          {scaleMarkers.map((m, i) => (
            <span key={i} className={cn(i === 0 && "text-left", i === 4 && "text-right")}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Longs */}
      <div className="flex flex-col">
        {visibleLongs.map((level, i) => {
          const barWidth = (level.size / maxSize) * 100
          const isEmpty = level.size === 0
          return (
            <motion.div
              key={`long-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className={cn(
                "text-right pr-3 text-[10px] font-mono leading-none",
                isEmpty ? "text-white/30" : "text-white"
              )}>
                {formatPrice(level.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-slate-800/40" style={{ marginLeft: `${k * 25}%` }} />
                  ))}
                </div>
                {!isEmpty && (
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-600/90 to-rose-500/30"
                    style={{ width: `${barWidth}%` }}
                  />
                )}
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

      {/* Shorts */}
      <div className="flex flex-col">
        {visibleShorts.map((level, i) => {
          const barWidth = (level.size / maxSize) * 100
          const isEmpty = level.size === 0
          return (
            <motion.div
              key={`short-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className={cn(
                "text-right pr-3 text-[10px] font-mono leading-none",
                isEmpty ? "text-white/30" : "text-white"
              )}>
                {formatPrice(level.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-slate-800/40" style={{ marginLeft: `${k * 25}%` }} />
                  ))}
                </div>
                {!isEmpty && (
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600/90 to-emerald-500/30"
                    style={{ width: `${barWidth}%` }}
                  />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Longs: <span className="text-rose-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
        <span>Max: <span className="text-amber-400 font-bold">{formatTotal(maxSize)}</span></span>
        <span>Shorts: <span className="text-emerald-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
      </div>
    </motion.div>
  )
}
