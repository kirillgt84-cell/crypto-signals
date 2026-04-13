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

export function OrderBook({ symbol, loading: parentLoading }: OrderBookProps) {
  const [rawData, setRawData] = useState<{ bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<number>(100)

  const stepOptions: StepOption[] = useMemo(() => {
    const price = symbol === "BTC" ? 70000 : symbol === "ETH" ? 3500 : 100
    if (price >= 20000) return [{ label: "Raw", value: 0 }, { label: "$50", value: 50 }, { label: "$100", value: 100 }]
    if (price >= 1000) return [{ label: "Raw", value: 0 }, { label: "$1", value: 1 }, { label: "$5", value: 5 }, { label: "$10", value: 10 }]
    if (price >= 100) return [{ label: "Raw", value: 0 }, { label: "$0.1", value: 0.1 }, { label: "$0.5", value: 0.5 }, { label: "$1", value: 1 }]
    return [{ label: "Raw", value: 0 }, { label: "$0.01", value: 0.01 }, { label: "$0.05", value: 0.05 }, { label: "$0.1", value: 0.1 }]
  }, [symbol])

  useEffect(() => {
    if (!symbol) return

    const fetchOrderBook = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${symbol}USDT&limit=500`,
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

  const { rows, bestBid, bestAsk, maxTotal, midPrice } = useMemo(() => {
    if (!rawData) {
      return { rows: [], bestBid: 0, bestAsk: 0, maxTotal: 1, midPrice: 0 }
    }

    const aggregate = (
      raw: { price: number; quantity: number }[],
      isBid: boolean,
      aggStep: number
    ) => {
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
        processed = Array.from(buckets.entries()).map(([price, quantity]) => ({
          price,
          quantity,
        }))
      }

      const sorted = isBid
        ? processed.sort((a, b) => b.price - a.price)
        : processed.sort((a, b) => a.price - b.price)

      // Take enough rows to show at least 10 on each side
      return isBid ? sorted.slice(0, 16) : sorted.slice(0, 16)
    }

    const bidRows = aggregate(rawData.bids, true, step)
    const askRows = aggregate(rawData.asks, false, step)

    const bb = bidRows[0]?.price || 0
    const ba = askRows[0]?.price || 0
    const mp = (ba + bb) / 2

    // Compute cumulative totals from outer edge inward
    let bidCumulative = 0
    const bidsWithTotal = bidRows.map((r) => {
      bidCumulative += r.quantity
      return { ...r, total: bidCumulative, side: "bid" as const }
    })

    let askCumulative = 0
    const asksWithTotal = askRows.map((r) => {
      askCumulative += r.quantity
      return { ...r, total: askCumulative, side: "ask" as const }
    })

    // Find max total for bar scaling
    const mt = Math.max(
      ...bidsWithTotal.map((b) => b.total),
      ...asksWithTotal.map((a) => a.total),
      1
    )

    return {
      rows: { bids: bidsWithTotal, asks: asksWithTotal },
      bestBid: bb,
      bestAsk: ba,
      maxTotal: mt,
      midPrice: mp,
    }
  }, [rawData, step])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <div className="w-full h-[580px] border-2 border-primary/30 rounded-xl bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <BookOpen className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ORDER DEPTH</span>
        </div>
        <div className="space-y-1 h-[480px]">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-5 bg-primary/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !rawData) {
    return (
      <div className="w-full h-[580px] border-2 border-muted rounded-xl bg-card p-4 font-mono flex flex-col items-center justify-center text-muted-foreground">
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

  const formatTotal = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(1)
  }

  const visibleAsks = [...rows.asks].reverse() // highest ask at top
  const visibleBids = rows.bids // highest bid just below mid

  const rowHeight = 20 // px
  const chartHeight = 520

  // Scale markers
  const scaleMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    left: `${ratio * 100}%`,
    value: formatTotal(maxTotal * ratio),
  }))

  return (
    <motion.div
      className="w-full h-full border-2 border-blue-500/30 rounded-xl bg-[#0b0f19] p-3 font-mono flex flex-col"
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
              onClick={() => setStep(opt.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded transition-colors border",
                step === opt.value
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
      <div className="relative h-4 mb-1">
        <div className="absolute inset-x-0 top-0 flex justify-between text-[10px] text-slate-500 px-14">
          {scaleMarkers.map((m, i) => (
            <span key={i} className="absolute -translate-x-1/2" style={{ left: m.left }}>
              {m.value}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-14 top-3 h-px bg-slate-800" />
      </div>

      {/* Depth rows container */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: chartHeight }}>
        {/* Grid lines */}
        <div className="absolute inset-y-0 left-14 right-0">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div
              key={ratio}
              className="absolute top-0 bottom-0 w-px bg-slate-800/60"
              style={{ left: `${ratio * 100}%` }}
            />
          ))}
        </div>

        {/* Asks */}
        <div className="absolute inset-x-0 top-0 flex flex-col">
          {visibleAsks.map((ask, i) => {
            const barWidth = (ask.total / maxTotal) * 100
            return (
              <motion.div
                key={`ask-${ask.price}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center h-[22px] relative"
              >
                {/* Price label */}
                <div className="w-14 shrink-0 text-right pr-2 text-[11px] font-mono text-rose-400/90">
                  {formatPrice(ask.price)}
                </div>

                {/* Bar area */}
                <div className="flex-1 h-full relative">
                  {/* Cumulative bar */}
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-600/80 to-rose-500/30"
                    style={{ width: `${barWidth}%` }}
                  />
                  {/* Quantity tick */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-px bg-rose-400"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Mid price line */}
        <div
          className="absolute inset-x-0 h-px bg-blue-400 z-20"
          style={{ top: visibleAsks.length * 22 }}
        >
          <div className="absolute left-0 -top-2.5 w-14 text-right pr-2 text-[10px] font-bold text-blue-400">
            {formatPrice(midPrice)}
          </div>
        </div>

        {/* Bids */}
        <div
          className="absolute inset-x-0 flex flex-col"
          style={{ top: visibleAsks.length * 22 + 2 }}
        >
          {visibleBids.map((bid, i) => {
            const barWidth = (bid.total / maxTotal) * 100
            return (
              <motion.div
                key={`bid-${bid.price}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center h-[22px] relative"
              >
                {/* Price label */}
                <div className="w-14 shrink-0 text-right pr-2 text-[11px] font-mono text-emerald-400/90">
                  {formatPrice(bid.price)}
                </div>

                {/* Bar area */}
                <div className="flex-1 h-full relative">
                  {/* Cumulative bar */}
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600/80 to-emerald-500/30"
                    style={{ width: `${barWidth}%` }}
                  />
                  {/* Quantity tick */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-px bg-emerald-400"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Asks: <span className="text-rose-400 font-bold">{rows.asks.length}</span></span>
        <span>Spread: <span className="text-amber-400 font-bold">{(bestAsk - bestBid).toFixed(bestAsk >= 1 ? 2 : 4)}</span></span>
        <span>Bids: <span className="text-emerald-400 font-bold">{rows.bids.length}</span></span>
      </div>
    </motion.div>
  )
}
