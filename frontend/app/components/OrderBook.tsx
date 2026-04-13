"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, AlertCircle } from "lucide-react"

interface OrderBookLevel {
  price: number
  quantity: number
  total: number
  isWall: boolean
}

interface OrderBookData {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  lastUpdateId: number
}

interface OrderBookProps {
  symbol: string
  loading?: boolean
}

export function OrderBook({ symbol, loading: parentLoading }: OrderBookProps) {
  const [data, setData] = useState<OrderBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return

    const fetchOrderBook = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${symbol}USDT&limit=100`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error("Failed to fetch order book")

        const json = await res.json()

        // Parse raw data
        const rawBids = json.bids.slice(0, 50).map(([p, q]: [string, string]) => ({
          price: parseFloat(p),
          quantity: parseFloat(q),
        }))
        const rawAsks = json.asks.slice(0, 50).map(([p, q]: [string, string]) => ({
          price: parseFloat(p),
          quantity: parseFloat(q),
        }))

        // Calculate cumulative totals and detect walls
        const processSide = (raw: { price: number; quantity: number }[], isBid: boolean) => {
          const avgQty = raw.reduce((sum, r) => sum + r.quantity, 0) / raw.length
          const wallThreshold = avgQty * 2.5

          let cumulative = 0
          const processed = raw.map((r) => {
            cumulative += r.quantity
            return {
              price: r.price,
              quantity: r.quantity,
              total: cumulative,
              isWall: r.quantity >= wallThreshold,
            }
          })

          // Return top 10 levels, bids descending price, asks ascending price
          return isBid ? processed.slice(0, 10) : processed.slice(0, 10)
        }

        const bids = processSide(rawBids, true)
        const asks = processSide(rawAsks, false)

        setData({ bids, asks, lastUpdateId: json.lastUpdateId })
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

  const { bestBid, bestAsk, spread, spreadPct, maxBidQty, maxAskQty } = useMemo(() => {
    if (!data) {
      return { bestBid: 0, bestAsk: 0, spread: 0, spreadPct: 0, maxBidQty: 1, maxAskQty: 1 }
    }
    const bb = data.bids[0]?.price || 0
    const ba = data.asks[0]?.price || 0
    const sp = ba - bb
    const spPct = bb > 0 ? (sp / bb) * 100 : 0
    const mbq = Math.max(...data.bids.map((b) => b.quantity), 1)
    const maq = Math.max(...data.asks.map((a) => a.quantity), 1)
    return { bestBid: bb, bestAsk: ba, spread: sp, spreadPct: spPct, maxBidQty: mbq, maxAskQty: maq }
  }, [data])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <div className="w-full h-[420px] border-2 border-primary/30 rounded-xl bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <BookOpen className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ORDER BOOK</span>
        </div>
        <div className="grid grid-cols-2 gap-4 h-[340px]">
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-primary/10 rounded animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-primary/10 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full h-[420px] border-2 border-muted rounded-xl bg-card p-4 font-mono flex flex-col items-center justify-center text-muted-foreground">
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
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold tracking-widest text-blue-500">ORDER BOOK</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {symbol}/USDT • Live
        </span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-1">
        <div className="flex justify-between">
          <span>Size</span>
          <span className="text-emerald-500">Bid Price</span>
        </div>
        <div className="flex justify-between">
          <span className="text-rose-500">Ask Price</span>
          <span>Size</span>
        </div>
      </div>

      {/* Order book rows */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-1 relative">
        {/* Bids */}
        <div className="flex flex-col justify-start gap-[2px] pr-1">
          <AnimatePresence mode="popLayout">
            {data.bids.map((bid, i) => (
              <motion.div
                key={`bid-${bid.price}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className={`relative flex items-center justify-between h-8 px-1 rounded-sm overflow-hidden cursor-default ${
                  bid.isWall ? "bg-emerald-500/10" : ""
                }`}
              >
                {/* Background bar */}
                <div
                  className="absolute right-0 top-0 h-full bg-emerald-500/20 transition-all duration-300"
                  style={{ width: `${(bid.quantity / maxBidQty) * 100}%` }}
                />
                {bid.isWall && (
                  <motion.div
                    className="absolute inset-0 border border-emerald-500/50 rounded-sm"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <span className="relative z-10 text-[10px] text-muted-foreground w-14 text-left">
                  {formatQty(bid.quantity)}
                </span>
                <span className="relative z-10 text-xs font-bold text-emerald-500 w-20 text-right">
                  {formatPrice(bid.price)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Asks */}
        <div className="flex flex-col justify-start gap-[2px] pl-1">
          <AnimatePresence mode="popLayout">
            {data.asks.map((ask, i) => (
              <motion.div
                key={`ask-${ask.price}`}
                layout
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className={`relative flex items-center justify-between h-8 px-1 rounded-sm overflow-hidden cursor-default ${
                  ask.isWall ? "bg-rose-500/10" : ""
                }`}
              >
                {/* Background bar */}
                <div
                  className="absolute left-0 top-0 h-full bg-rose-500/20 transition-all duration-300"
                  style={{ width: `${(ask.quantity / maxAskQty) * 100}%` }}
                />
                {ask.isWall && (
                  <motion.div
                    className="absolute inset-0 border border-rose-500/50 rounded-sm"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <span className="relative z-10 text-xs font-bold text-rose-500 w-20 text-left">
                  {formatPrice(ask.price)}
                </span>
                <span className="relative z-10 text-[10px] text-muted-foreground w-14 text-right">
                  {formatQty(ask.quantity)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Center spread divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/50 to-transparent" />
      </div>

      {/* Footer: Spread & Mid Price */}
      <div className="mt-3 pt-3 border-t border-muted-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Spread</span>
            <span className="text-xs font-bold text-amber-500">
              {spread.toFixed(spread >= 1 ? 2 : 4)} ({spreadPct.toFixed(3)}%)
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mid Price</span>
            <span className="text-sm font-bold text-foreground">
              {formatPrice((bestBid + bestAsk) / 2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Walls</span>
            <span className="text-xs font-bold">
              <span className="text-emerald-500">{data.bids.filter((b) => b.isWall).length}</span>
              {" / "}
              <span className="text-rose-500">{data.asks.filter((a) => a.isWall).length}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
