"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeatmapBucket {
  price: number
  longSize: number
  shortSize: number
  totalSize: number
  count: number
}

interface HeatmapMeta {
  maxSize: number
  totalLongs: number
  totalShorts: number
  count: number
  bucketSize: number
  priceRange: [number, number]
  source: string
}

interface LiquidationMapProps {
  heatmap: { buckets: HeatmapBucket[]; meta: HeatmapMeta } | null
  currentPrice: number
  symbol: string
  loading?: boolean
}

export function LiquidationMap({
  heatmap,
  currentPrice,
  symbol,
  loading,
}: LiquidationMapProps) {
  const hasRealData = heatmap?.meta?.source === "okx"
  const buckets = heatmap?.buckets || []
  const meta = heatmap?.meta

  const formatPrice = (p: number) => {
    if (p >= 10000) return p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }

  const formatSize = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return `${v.toFixed(0)}`
  }

  const maxSize = meta?.maxSize || 1

  // Determine which bucket contains current price
  const currentPriceBucket = useMemo(() => {
    if (!currentPrice || !meta?.bucketSize) return null
    return Math.round(currentPrice / meta.bucketSize) * meta.bucketSize
  }, [currentPrice, meta?.bucketSize])

  if (loading) {
    return (
      <div className="w-full border-2 border-primary/30 rounded-xl bg-[#0b0f19] p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">LIQUIDATION HEATMAP</span>
        </div>
        <div className="space-y-1">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-primary/10 rounded animate-pulse h-4" />
          ))}
        </div>
      </div>
    )
  }

  if (!buckets.length) {
    return (
      <motion.div
        className="w-full border-2 border-amber-500/30 rounded-xl bg-[#0b0f19] p-4 font-mono flex flex-col items-center justify-center min-h-[200px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AlertTriangle className="w-8 h-8 text-amber-500/50 mb-2" />
        <span className="text-sm font-bold text-amber-500/70">LIQUIDATION HEATMAP</span>
        <p className="text-xs text-slate-500 mt-1">No liquidation data available</p>
      </motion.div>
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
        <div className="flex items-center gap-2 flex-wrap">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold tracking-widest text-amber-500">LIQUIDATION HEATMAP</span>
          <span className="text-[10px] text-muted-foreground">{symbol}/USDT</span>
          {!hasRealData && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Simulated</span>
          )}
        </div>
        <div className="text-[10px] text-slate-500">
          {meta?.bucketSize ? `$${meta.bucketSize} buckets` : ""}
        </div>
      </div>

      {/* Legend / Scale */}
      <div className="grid grid-cols-[1fr_64px_1fr] mb-1 text-[10px] text-slate-500">
        <div className="text-right pr-2">Longs</div>
        <div className="text-center">Price</div>
        <div className="text-left pl-2">Shorts</div>
      </div>

      {/* Buckets */}
      <div className="flex flex-col gap-0.5 max-h-[500px] overflow-y-auto pr-1">
        {buckets.map((bucket, i) => {
          const isCurrent = Math.round(bucket.price) === Math.round(currentPriceBucket || 0)
          const longWidth = maxSize > 0 ? (bucket.longSize / maxSize) * 100 : 0
          const shortWidth = maxSize > 0 ? (bucket.shortSize / maxSize) * 100 : 0

          // Intensity: normalize within 0-1 for color opacity
          const longIntensity = maxSize > 0 ? Math.min(1, bucket.longSize / maxSize) : 0
          const shortIntensity = maxSize > 0 ? Math.min(1, bucket.shortSize / maxSize) : 0

          return (
            <motion.div
              key={`${bucket.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.01 }}
              className={cn(
                "grid grid-cols-[1fr_64px_1fr] items-center rounded-sm",
                isCurrent ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-slate-800/30"
              )}
              style={{ height: 20 }}
            >
              {/* Long bar (left side, extends right from left edge) */}
              <div className="relative h-full flex items-center justify-end pr-1">
                <div
                  className="h-3 rounded-sm bg-emerald-500"
                  style={{
                    width: `${Math.min(longWidth, 100)}%`,
                    opacity: 0.3 + longIntensity * 0.7,
                  }}
                  title={`Long: ${formatSize(bucket.longSize)}`}
                />
              </div>

              {/* Price label */}
              <div className={cn(
                "text-center text-[10px] font-mono leading-none",
                isCurrent ? "text-amber-400 font-bold" : "text-slate-300"
              )}>
                {formatPrice(bucket.price)}
              </div>

              {/* Short bar (right side, extends left from right edge) */}
              <div className="relative h-full flex items-center justify-start pl-1">
                <div
                  className="h-3 rounded-sm bg-rose-500"
                  style={{
                    width: `${Math.min(shortWidth, 100)}%`,
                    opacity: 0.3 + shortIntensity * 0.7,
                  }}
                  title={`Short: ${formatSize(bucket.shortSize)}`}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
        <div className="text-center">
          <span className="text-emerald-400 font-bold">{formatSize(meta?.totalLongs || 0)}</span>
          <span className="block text-[9px] text-slate-500">Total Longs</span>
        </div>
        <div className="text-center">
          <span className="text-amber-400 font-bold">{formatSize(meta?.maxSize || 0)}</span>
          <span className="block text-[9px] text-slate-500">Max Bucket</span>
        </div>
        <div className="text-center">
          <span className="text-rose-400 font-bold">{formatSize(meta?.totalShorts || 0)}</span>
          <span className="block text-[9px] text-slate-500">Total Shorts</span>
        </div>
      </div>
    </motion.div>
  )
}
