"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { BookOpen, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderBookProps {
  symbol: string
  loading?: boolean
}

type StepOption = { label: string; value: number }

type Level = {
  price: number
  quantity: number
  total: number
  side: "bid" | "ask"
}

export const ORDER_BOOK_LEVELS = 30
const ROW_HEIGHT = 10 // px
const MID_HEIGHT = 22 // px

function padLevels(
  levels: Level[],
  side: "bid" | "ask",
  step: number,
  count: number
): Level[] {
  const padded = [...levels]
  if (step <= 0) return padded.slice(0, count)
  while (padded.length < count) {
    const last = padded[padded.length - 1]
    const nextPrice = side === "bid"
      ? (last ? last.price - step : 0)
      : (last ? last.price + step : 0)
    padded.push({
      price: nextPrice,
      quantity: 0,
      total: last ? last.total : 0,
      side,
    })
  }
  return padded.slice(0, count)
}

function interpolateLevels(levels: Level[]): Level[] {
  const result = [...levels]
  let lastFilled = -1

  for (let i = 0; i < result.length; i++) {
    if (result[i].quantity > 0) {
      if (lastFilled !== -1 && i - lastFilled > 1) {
        const startQty = result[lastFilled].quantity
        const endQty = result[i].quantity
        const steps = i - lastFilled
        for (let j = 1; j < steps; j++) {
          const ratio = j / steps
          result[lastFilled + j].quantity = startQty * (1 - ratio) + endQty * ratio
        }
      }
      lastFilled = i
    }
  }

  // Interpolate trailing empty levels from last known
  if (lastFilled !== -1 && lastFilled < result.length - 1) {
    const startQty = result[lastFilled].quantity
    for (let i = lastFilled + 1; i < result.length; i++) {
      const ratio = (i - lastFilled) / (result.length - lastFilled)
      result[i].quantity = startQty * (1 - ratio)
    }
  }

  // Interpolate leading empty levels to first known
  const firstFilled = result.findIndex((l) => l.quantity > 0)
  if (firstFilled > 0) {
    const endQty = result[firstFilled].quantity
    for (let i = 0; i < firstFilled; i++) {
      const ratio = i / firstFilled
      result[i].quantity = endQty * ratio
    }
  }

  return result
}

export function OrderBook({ symbol, loading: parentLoading }: OrderBookProps) {
  const [rawData, setRawData] = useState<{ bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<number>(50)

  const stepOptions: StepOption[] = useMemo(() => {
    const price = symbol === "BTC" ? 70000 : symbol === "ETH" ? 3500 : 100
    if (price >= 20000) return [{ label: "Raw", value: 0 }, { label: "$10", value: 10 }, { label: "$50", value: 50 }, { label: "$100", value: 100 }]
    if (price >= 1000) return [{ label: "Raw", value: 0 }, { label: "$1", value: 1 }, { label: "$5", value: 5 }, { label: "$10", value: 10 }]
    if (price >= 100) return [{ label: "Raw", value: 0 }, { label: "$0.1", value: 0.1 }, { label: "$0.5", value: 0.5 }, { label: "$1", value: 1 }]
    return [{ label: "Raw", value: 0 }, { label: "$0.01", value: 0.01 }, { label: "$0.05", value: 0.05 }, { label: "$0.1", value: 0.1 }]
  }, [symbol])

  useEffect(() => {
    if (!symbol) return

    const fetchOrderBook = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${symbol}USDT&limit=5000`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error("Failed to fetch order book")

        const json = await res.json()

        const rawBids = json.bids.map(([p, q]: [string, string]) => ({
          price: parseFloat(p),
          quantity: parseFloat(q),
        }))
        const rawAsks = json.asks.map(([p, q]: [string, string]) => ({
          price: parseFloat(p),
          quantity: parseFloat(q),
        }))

        setRawData({ bids: rawBids, asks: rawAsks })
        setError(null)
      } catch (err) {
        setError("Order book unavailable")
      } finally {
        setLoading(false)
      }
    }

    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 3000)
    return () => clearInterval(interval)
  }, [symbol])

  const { visibleAsks, visibleBids, bestBid, bestAsk, maxTotal, midPrice } = useMemo(() => {
    if (!rawData) {
      return { visibleAsks: [] as Level[], visibleBids: [] as Level[], bestBid: 0, bestAsk: 0, maxTotal: 1, midPrice: 0 }
    }

    const aggregate = (
      raw: { price: number; quantity: number }[],
      isBid: boolean,
      aggStep: number
    ): Level[] => {
      let processed: { price: number; quantity: number }[]

      if (aggStep <= 0) {
        processed = raw.map((r) => ({ price: r.price, quantity: r.quantity }))
      } else {
        const buckets = new Map<number, number>()
        raw.forEach((r) => {
          const bucketPrice = isBid
            ? Math.floor(r.price / aggStep) * aggStep
            : Math.ceil(r.price / aggStep) * aggStep
          buckets.set(bucketPrice, (buckets.get(bucketPrice) || 0) + r.quantity)
        })
        processed = Array.from(buckets.entries()).map(([price, quantity]) => ({ price, quantity }))
      }

      const sorted = isBid
        ? processed.sort((a, b) => b.price - a.price)
        : processed.sort((a, b) => a.price - b.price)

      let cumulative = 0
      return sorted.map((r) => {
        cumulative += r.quantity
        return { price: r.price, quantity: r.quantity, total: cumulative, side: isBid ? "bid" : "ask" }
      })
    }

    const bidRows = aggregate(rawData.bids, true, selectedStep)
    const askRows = aggregate(rawData.asks, false, selectedStep)

    const bb = bidRows[0]?.price || 0
    const ba = askRows[0]?.price || 0
    const mp = (ba + bb) / 2

    const asksPadded = interpolateLevels(padLevels(askRows, "ask", selectedStep, ORDER_BOOK_LEVELS))
    const bidsPadded = interpolateLevels(padLevels(bidRows, "bid", selectedStep, ORDER_BOOK_LEVELS))

    const visibleAsks = [...asksPadded].reverse()
    const visibleBids = bidsPadded

    const mt = Math.max(
      ...visibleAsks.map((a) => a.quantity),
      ...visibleBids.map((b) => b.quantity),
      1
    )

    return {
      visibleAsks,
      visibleBids,
      bestBid: bb,
      bestAsk: ba,
      maxTotal: mt,
      midPrice: mp,
    }
  }, [rawData, selectedStep])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <div className="w-full border-2 border-primary/30 rounded-xl bg-[#0b0f19] p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <BookOpen className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ORDER DEPTH</span>
        </div>
        <div className="space-y-0.5">
          {[...Array(ORDER_BOOK_LEVELS)].map((_, i) => (
            <div key={i} className="h-2 bg-primary/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !rawData) {
    return (
      <div className="w-full min-h-[500px] border-2 border-muted rounded-xl bg-[#0b0f19] p-4 font-mono flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error || "No order book data"}</p>
      </div>
    )
  }

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }

  const formatQty = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(1)
  }

  const scaleMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatQty(maxTotal * ratio)
  )

  return (
    <motion.div
      className="w-full border-2 border-blue-500/30 rounded-xl bg-[#0b0f19] p-3 font-mono flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-widest text-blue-400">ORDER DEPTH</span>
        </div>
        <div className="flex items-center gap-1">
          {stepOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedStep(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded transition-colors border",
                selectedStep === opt.value
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-[#0b0f19] text-muted-foreground border-slate-700 hover:border-blue-500/50 hover:text-foreground"
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
            <span key={i} className={cn(i === 0 && "text-left", i === 4 && "text-right")}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Asks */}
      <div className="flex flex-col">
        {visibleAsks.map((ask, i) => {
          const barWidth = (ask.quantity / maxTotal) * 100
          return (
            <motion.div
              key={`ask-${ask.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="text-right pr-3 text-[10px] font-mono leading-none text-white">
                {formatPrice(ask.price)}
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
      <div className="grid grid-cols-[72px_1fr] items-center shrink-0 border-y border-blue-500/40 bg-blue-500/10 my-0.5" style={{ height: MID_HEIGHT }}>
        <div className="text-right pr-3 text-[11px] font-bold font-mono text-blue-400 leading-none">
          {formatPrice(midPrice)}
        </div>
        <div className="text-center text-[10px] text-slate-400 leading-none">
          Spread {(bestAsk - bestBid).toFixed(bestAsk >= 1 ? 2 : 4)}
        </div>
      </div>

      {/* Bids */}
      <div className="flex flex-col">
        {visibleBids.map((bid, i) => {
          const barWidth = (bid.quantity / maxTotal) * 100
          return (
            <motion.div
              key={`bid-${bid.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="text-right pr-3 text-[10px] font-mono leading-none text-white">
                {formatPrice(bid.price)}
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
        <span>Asks: <span className="text-rose-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
        <span>Max: <span className="text-blue-400 font-bold">{formatQty(maxTotal)}</span></span>
        <span>Bids: <span className="text-emerald-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
      </div>
    </motion.div>
  )
}
