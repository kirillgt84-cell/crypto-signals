"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  isWall: boolean
}

interface OrderBookData {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

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

  const data: OrderBookData | null = useMemo(() => {
    if (!rawData) return null

    const aggregate = (
      raw: { price: number; quantity: number }[],
      isBid: boolean,
      aggStep: number
    ): OrderBookLevel[] => {
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

      const avgQty = sorted.slice(0, 20).reduce((sum, r) => sum + r.quantity, 0) / 20
      const wallThreshold = avgQty * 2.0

      let cumulative = 0
      return sorted.map((r) => {
        cumulative += r.quantity
        return {
          price: r.price,
          quantity: r.quantity,
          total: cumulative,
          isWall: r.quantity >= wallThreshold,
        }
      })
    }

    return {
      bids: aggregate(rawData.bids, true, step),
      asks: aggregate(rawData.asks, false, step),
    }
  }, [rawData, step])

  const { bestBid, bestAsk, spread, midPrice, maxQty } = useMemo(() => {
    if (!data) {
      return { bestBid: 0, bestAsk: 0, spread: 0, midPrice: 0, maxQty: 1 }
    }
    const bb = data.bids[0]?.price || 0
    const ba = data.asks[0]?.price || 0
    const sp = ba - bb
    const mp = (ba + bb) / 2
    const visibleBids = data.bids.slice(0, 10)
    const visibleAsks = data.asks.slice(0, 10)
    const mq = Math.max(
      ...visibleBids.map((b) => b.quantity),
      ...visibleAsks.map((a) => a.quantity),
      1
    )
    return { bestBid: bb, bestAsk: ba, spread: sp, midPrice: mp, maxQty: mq }
  }, [data])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <div className="w-full h-[540px] border-2 border-primary/30 rounded-xl bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <BookOpen className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ORDER BOOK</span>
        </div>
        <div className="space-y-1 h-[440px]">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-6 bg-primary/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full h-[540px] border-2 border-muted rounded-xl bg-card p-4 font-mono flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error || "No order book data"}</p>
      </div>
    )
  }

  const visibleAsks = data.asks.slice(0, 10).reverse() // дорогие сверху
  const visibleBids = data.bids.slice(0, 10) // дорогие сверху (под mid)

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  }

  const formatQty = (q: number) => {
    if (q >= 1_000_000) return `${(q / 1_000_000).toFixed(2)}M`
    if (q >= 1_000) return `${(q / 1_000).toFixed(2)}K`
    return q.toFixed(3)
  }

  return (
    <motion.div
      className="w-full h-full border-2 border-blue-500/40 rounded-xl bg-card p-4 font-mono flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold tracking-widest text-blue-500">ORDER BOOK</span>
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
                  : "bg-card text-muted-foreground border-muted hover:border-blue-500/50 hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-[1fr_90px_1fr] gap-1 text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-1">
        <div className="text-right pr-2 text-emerald-500">Bid Size</div>
        <div className="text-center">Price</div>
        <div className="text-left pl-2 text-rose-500">Ask Size</div>
      </div>

      {/* Order book rows */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks */}
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {visibleAsks.map((ask, i) => {
              const barWidth = (ask.quantity / maxQty) * 100
              return (
                <motion.div
                  key={`ask-${ask.price}`}
                  layout
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, delay: i * 0.015 }}
                  className={cn(
                    "grid grid-cols-[1fr_90px_1fr] gap-1 items-center h-[22px] relative rounded-sm",
                    ask.isWall && "bg-rose-500/10"
                  )}
                >
                  {/* Empty bid side */}
                  <div className="relative h-full" />

                  {/* Price center */}
                  <div className="text-center text-[11px] font-mono font-bold text-rose-500 z-10">
                    {formatPrice(ask.price)}
                  </div>

                  {/* Ask bar + qty */}
                  <div className="relative h-full flex items-center pl-1">
                    <div
                      className="absolute left-0 top-0 h-full bg-rose-500/25 transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                    {ask.isWall && (
                      <motion.div
                        className="absolute inset-y-0 left-0 border-l-2 border-rose-500"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    <span className="relative z-10 text-[10px] text-rose-400 font-mono pl-1">
                      {formatQty(ask.quantity)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Mid price row */}
        <div className="h-7 flex items-center justify-center border-y border-blue-500/40 bg-blue-500/10 my-0.5 rounded-sm shrink-0">
          <div className="text-center">
            <span className="text-xs font-bold text-blue-400 font-mono">
              {formatPrice(midPrice)}
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">
              Spread {spread.toFixed(spread >= 1 ? 2 : 4)}
            </span>
          </div>
        </div>

        {/* Bids */}
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {visibleBids.map((bid, i) => {
              const barWidth = (bid.quantity / maxQty) * 100
              return (
                <motion.div
                  key={`bid-${bid.price}`}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, delay: i * 0.015 }}
                  className={cn(
                    "grid grid-cols-[1fr_90px_1fr] gap-1 items-center h-[22px] relative rounded-sm",
                    bid.isWall && "bg-emerald-500/10"
                  )}
                >
                  {/* Bid bar + qty */}
                  <div className="relative h-full flex items-center justify-end pr-1">
                    <div
                      className="absolute right-0 top-0 h-full bg-emerald-500/25 transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                    {bid.isWall && (
                      <motion.div
                        className="absolute inset-y-0 right-0 border-r-2 border-emerald-500"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                    <span className="relative z-10 text-[10px] text-emerald-400 font-mono pr-1">
                      {formatQty(bid.quantity)}
                    </span>
                  </div>

                  {/* Price center */}
                  <div className="text-center text-[11px] font-mono font-bold text-emerald-500 z-10">
                    {formatPrice(bid.price)}
                  </div>

                  {/* Empty ask side */}
                  <div className="relative h-full" />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer: Stats */}
      <div className="mt-2 pt-2 border-t border-muted-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bid Walls</span>
            <span className="text-xs font-bold text-emerald-500">
              {visibleBids.filter((b) => b.isWall).length}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Range</span>
            <span className="text-xs font-bold text-foreground">
              {(bestAsk - bestBid).toFixed(bestAsk >= 1 ? 2 : 4)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ask Walls</span>
            <span className="text-xs font-bold text-rose-500">
              {visibleAsks.filter((a) => a.isWall).length}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
