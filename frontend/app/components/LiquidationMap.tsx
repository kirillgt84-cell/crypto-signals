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

const ROW_HEIGHT = 8 // px
const MID_HEIGHT = 20 // px

function generateLiquidationLevels(
  price: number,
  inputLevels: LiquidationLevel[]
): { longs: MapLevel[]; shorts: MapLevel[] } {
  if (!price) return { longs: [], shorts: [] }

  // Use input levels as seeds, then interpolate/generate to fill 40 each
  const rawLongs = inputLevels.filter((l) => l.side === "Long").sort((a, b) => a.price - b.price)
  const rawShorts = inputLevels.filter((l) => l.side === "Short").sort((a, b) => b.price - a.price)

  const buildSide = (side: "Long" | "Short", seeds: LiquidationLevel[]): MapLevel[] => {
    const isLong = side === "Long"
    const result: MapLevel[] = []

    // If we have real seeds, place them and fill gaps; otherwise generate synthetic
    const seedMap = new Map<number, number>()
    seeds.forEach((s) => {
      const bucket = Math.round(s.price / (price * 0.005)) * (price * 0.005)
      seedMap.set(bucket, (seedMap.get(bucket) || 0) + s.size)
    })

    const step = price * (isLong ? 0.005 : -0.005) // ~0.5% steps
    const startPrice = price + (isLong ? Math.abs(step) : -Math.abs(step))

    let cumulative = 0
    for (let i = 0; i < ORDER_BOOK_LEVELS; i++) {
      const levelPrice = startPrice + step * i
      const seedSize = seedMap.get(Math.round(levelPrice / Math.abs(step)) * Math.abs(step)) || 0
      // Synthetic decay curve: closer to price = larger
      const distance = Math.abs(levelPrice - price) / price
      const syntheticSize = Math.max(0, (1 - distance / (isLong ? 0.25 : 0.25)) * 100000000)
      const size = seedSize > 0 ? seedSize * 1.5 : syntheticSize * 0.3
      const finalSize = Math.max(size, syntheticSize * 0.1)

      cumulative += finalSize
      result.push({
        price: levelPrice,
        size: finalSize,
        total: cumulative,
        side,
      })
    }

    return isLong ? result : result
  }

  const longs = buildSide("Long", rawLongs)
  const shorts = buildSide("Short", rawShorts)

  return { longs, shorts }
}

export function LiquidationMap({
  liquidations,
  currentPrice,
  symbol,
  loading,
}: LiquidationMapProps) {
  const { visibleLongs, visibleShorts, maxTotal, midPrice } = useMemo(() => {
    if (!currentPrice || loading) {
      return { visibleLongs: [] as MapLevel[], visibleShorts: [] as MapLevel[], maxTotal: 1, midPrice: 0 }
    }

    const { longs, shorts } = generateLiquidationLevels(currentPrice, Array.isArray(liquidations) ? liquidations : [])

    const mt = Math.max(
      ...longs.map((l) => l.total),
      ...shorts.map((s) => s.total),
      1
    )

    return {
      visibleLongs: [...longs].reverse(), // expensive at top
      visibleShorts: shorts,
      maxTotal: mt,
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
    formatTotal(maxTotal * ratio)
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
          const barWidth = (level.total / maxTotal) * 100
          return (
            <motion.div
              key={`long-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="text-right pr-3 text-[10px] font-mono text-rose-400/90 leading-none">
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

      {/* Shorts */}
      <div className="flex flex-col">
        {visibleShorts.map((level, i) => {
          const barWidth = (level.total / maxTotal) * 100
          return (
            <motion.div
              key={`short-${level.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="text-right pr-3 text-[10px] font-mono text-emerald-400/90 leading-none">
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
        <span>Longs: <span className="text-rose-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
        <span>Max: <span className="text-amber-400 font-bold">{formatTotal(maxTotal)}</span></span>
        <span>Shorts: <span className="text-emerald-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
      </div>
    </motion.div>
  )
}
