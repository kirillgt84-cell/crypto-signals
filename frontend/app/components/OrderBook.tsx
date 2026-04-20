"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { BookOpen, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderBookProps {
  symbol: string
  currentPrice?: number
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
const MID_HEIGHT = 22
const CHART_HEIGHT = 622
const FLUSH_THROTTLE_MS = 100

export function padLevels(
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

function aggregateLevels(
  rawEntries: [number, number][],
  isBid: boolean,
  aggStep: number
): Level[] {
  let processed: [number, number][]

  if (aggStep <= 0) {
    processed = rawEntries.map(([price, qty]) => [price, qty])
  } else {
    const buckets = new Map<number, number>()
    rawEntries.forEach(([price, qty]) => {
      const bucketPrice = isBid
        ? Math.floor(price / aggStep) * aggStep
        : Math.ceil(price / aggStep) * aggStep
      buckets.set(bucketPrice, (buckets.get(bucketPrice) || 0) + qty)
    })
    processed = Array.from(buckets.entries())
  }

  const sorted = isBid
    ? processed.sort((a, b) => b[0] - a[0])
    : processed.sort((a, b) => a[0] - b[0])

  let cumulative = 0
  return sorted.map(([price, quantity]) => {
    cumulative += quantity
    return { price, quantity, total: cumulative, side: isBid ? "bid" : "ask" }
  })
}

export function OrderBook({ symbol, currentPrice = 0, loading: parentLoading }: OrderBookProps) {
  const [rawBook, setRawBook] = useState<{ bids: [number, number][]; asks: [number, number][] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const levelCount = ORDER_BOOK_LEVELS
  const rowHeight = Math.max(2, Math.floor((CHART_HEIGHT - MID_HEIGHT) / (levelCount * 2)))

  const price = currentPrice > 0 ? currentPrice : (symbol === "BTC" ? 70000 : symbol === "ETH" ? 3500 : 100)
  let stepOptions: StepOption[]
  if (price >= 20000) stepOptions = [{ label: "Raw", value: 0 }, { label: "$10", value: 10 }, { label: "$50", value: 50 }, { label: "$100", value: 100 }]
  else if (price >= 1000) stepOptions = [{ label: "Raw", value: 0 }, { label: "$1", value: 1 }, { label: "$5", value: 5 }, { label: "$10", value: 10 }]
  else if (price >= 100) stepOptions = [{ label: "Raw", value: 0 }, { label: "$0.1", value: 0.1 }, { label: "$0.5", value: 0.5 }, { label: "$1", value: 1 }]
  else if (price >= 1) stepOptions = [{ label: "Raw", value: 0 }, { label: "$0.01", value: 0.01 }, { label: "$0.05", value: 0.05 }, { label: "$0.1", value: 0.1 }]
  else if (price >= 0.01) stepOptions = [{ label: "Raw", value: 0 }, { label: "$0.001", value: 0.001 }, { label: "$0.005", value: 0.005 }, { label: "$0.01", value: 0.01 }]
  else stepOptions = [{ label: "Raw", value: 0 }, { label: "$0.0001", value: 0.0001 }, { label: "$0.0005", value: 0.0005 }, { label: "$0.001", value: 0.001 }]

  const positiveSteps = stepOptions.map((o) => o.value).filter((v) => v > 0)
  const targetStep = price * 0.005
  const defaultStep = positiveSteps.length
    ? positiveSteps.reduce((best, s) => (Math.abs(s - targetStep) < Math.abs(best - targetStep) ? s : best))
    : 0

  const userStepRef = useRef<number | null>(null)
  const [tick, setTick] = useState(0)
  const selectedStep = userStepRef.current ?? defaultStep

  useEffect(() => {
    userStepRef.current = null
    setTick((t) => t + 1)
  }, [symbol])

  // WebSocket connection
  useEffect(() => {
    if (!symbol) return

    setLoading(true)
    setError(null)
    setRawBook(null)

    const symLower = symbol.toLowerCase()
    let localBids = new Map<number, number>()
    let localAsks = new Map<number, number>()
    let lastUpdateId = 0
    let snapshotLoaded = false
    let buffer: any[] = []
    let ws: WebSocket | null = null
    let flushTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let abort = false

    const applyDiff = (data: any) => {
      const processSide = (updates: [string, string][], map: Map<number, number>) => {
        for (const [p, q] of updates) {
          const price = parseFloat(p)
          const qty = parseFloat(q)
          if (qty === 0) {
            map.delete(price)
          } else {
            map.set(price, qty)
          }
        }
      }
      processSide(data.b || [], localBids)
      processSide(data.a || [], localAsks)
    }

    const flushDisplay = () => {
      if (flushTimeout) return
      flushTimeout = setTimeout(() => {
        if (abort) return
        setRawBook({
          bids: Array.from(localBids.entries()),
          asks: Array.from(localAsks.entries()),
        })
        flushTimeout = null
      }, FLUSH_THROTTLE_MS)
    }

    const connect = () => {
      if (abort) return

      // Fetch snapshot via Futures REST
      fetch(`https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}USDT&limit=1000`)
        .then(res => {
          if (!res.ok) throw new Error("Snapshot failed")
          return res.json()
        })
        .then(snapshot => {
          if (abort) return
          localBids = new Map(snapshot.bids.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]))
          localAsks = new Map(snapshot.asks.map(([p, q]: [string, string]) => [parseFloat(p), parseFloat(q)]))
          lastUpdateId = snapshot.lastUpdateId

          // Apply buffered diffs: find first overlapping message, then all sequential
          const overlapIdx = buffer.findIndex(
            (msg: any) => msg.U <= lastUpdateId + 1 && msg.u >= lastUpdateId + 1
          )

          if (buffer.length === 0 || overlapIdx !== -1) {
            if (overlapIdx !== -1) {
              for (let i = overlapIdx; i < buffer.length; i++) {
                const msg = buffer[i]
                if (i === overlapIdx) {
                  applyDiff(msg)
                  lastUpdateId = msg.u
                } else if (msg.U === lastUpdateId + 1) {
                  applyDiff(msg)
                  lastUpdateId = msg.u
                }
                // else: gap in buffer, ignore rest
              }
            }
            buffer = []
            snapshotLoaded = true
            // First render: show immediately without throttle
            setRawBook({
              bids: Array.from(localBids.entries()),
              asks: Array.from(localAsks.entries()),
            })
            setLoading(false)
          } else {
            // Buffer has messages but none overlap — need fresh snapshot
            console.warn(`[OrderBook] No overlap for ${symbol}, reconnecting...`)
            ws?.close()
          }
        })
        .catch(() => {
          if (abort) return
          setError("Order book unavailable")
          setLoading(false)
        })

      // Connect WebSocket
      ws = new WebSocket(`wss://fstream.binance.com/ws/${symLower}usdt@depth`)

      ws.onopen = () => {
        console.log(`[OrderBook WS] Connected: ${symbol}`)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (!snapshotLoaded) {
          buffer.push(data)
          if (buffer.length > 200) buffer.shift()
          return
        }

        if (data.U !== lastUpdateId + 1) {
          console.warn(`[OrderBook WS] Gap on ${symbol}: expected ${lastUpdateId + 1}, got ${data.U}`)
          ws?.close()
          return
        }

        applyDiff(data)
        lastUpdateId = data.u
        flushDisplay()
      }

      ws.onerror = (err) => {
        console.error(`[OrderBook WS] Error on ${symbol}:`, err)
      }

      ws.onclose = () => {
        snapshotLoaded = false
        buffer = []
        if (!abort) {
          reconnectTimeout = setTimeout(() => {
            if (!abort) connect()
          }, 3000)
        }
      }
    }

    connect()

    return () => {
      abort = true
      ws?.close()
      if (flushTimeout) clearTimeout(flushTimeout)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [symbol])

  const { visibleAsks, visibleBids, bestBid, bestAsk, maxQuantity, midPrice } = useMemo(() => {
    if (!rawBook) {
      return { visibleAsks: [] as Level[], visibleBids: [] as Level[], bestBid: 0, bestAsk: 0, maxTotal: 1, midPrice: 0 }
    }

    const bidRows = aggregateLevels(rawBook.bids, true, selectedStep)
    const askRows = aggregateLevels(rawBook.asks, false, selectedStep)

    const bb = bidRows[0]?.price || 0
    const ba = askRows[0]?.price || 0
    const mp = (ba + bb) / 2

    const asksPadded = padLevels(askRows, "ask", selectedStep, levelCount)
    const bidsPadded = padLevels(bidRows, "bid", selectedStep, levelCount)

    const visibleAsks = [...asksPadded].reverse()
    const visibleBids = bidsPadded

    const mq = Math.max(
      ...visibleAsks.map((a) => a.quantity),
      ...visibleBids.map((b) => b.quantity),
      1
    )

    return { visibleAsks, visibleBids, bestBid: bb, bestAsk: ba, maxQuantity: mq, midPrice: mp }
  }, [rawBook, selectedStep, levelCount])

  const isLoading = parentLoading || loading

  if (isLoading) {
    return (
      <div className="w-full border-2 border-primary/30 rounded-xl bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <BookOpen className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">ORDER DEPTH</span>
        </div>
        <div className="space-y-0">
          {[...Array(levelCount)].map((_, i) => (
            <div key={i} className="bg-primary/10 rounded animate-pulse" style={{ height: rowHeight }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !rawBook) {
    return (
      <div className="w-full min-h-[500px] border-2 border-muted rounded-xl bg-card p-4 font-mono flex flex-col items-center justify-center text-muted-foreground">
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
    if (v >= 1) return `${v.toFixed(1)}`
    if (v >= 0.01) return `${v.toFixed(2)}`
    return `${v.toFixed(4)}`
  }

  const scaleMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatQty(maxQuantity * ratio)
  )

  return (
    <motion.div
      className="w-full border-2 border-blue-500/30 rounded-xl bg-card p-3 font-mono flex flex-col"
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
              onClick={() => { userStepRef.current = opt.value === defaultStep ? null : opt.value; setTick((t) => t + 1) }}
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold rounded transition-colors border",
                selectedStep === opt.value
                  ? "bg-blue-500 text-foreground border-blue-500"
                  : "bg-card text-muted-foreground border-border hover:border-blue-500/50 hover:text-foreground"
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
          const barWidth = (ask.quantity / maxQuantity) * 100
          return (
            <motion.div
              key={`ask-${ask.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: rowHeight }}
            >
              <div className="text-right pr-3 text-[10px] font-mono leading-none text-foreground">
                {formatPrice(ask.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-muted/40" style={{ marginLeft: `${k * 25}%` }} />
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
          const barWidth = (bid.quantity / maxQuantity) * 100
          return (
            <motion.div
              key={`bid-${bid.price}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: i * 0.005 }}
              className="grid grid-cols-[72px_1fr] items-center relative"
              style={{ height: rowHeight }}
            >
              <div className="text-right pr-3 text-[10px] font-mono leading-none text-foreground">
                {formatPrice(bid.price)}
              </div>
              <div className="relative h-full">
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-full w-px bg-muted/40" style={{ marginLeft: `${k * 25}%` }} />
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
        <span>Max: <span className="text-blue-400 font-bold">{formatQty(maxQuantity)}</span></span>
        <span>Bids: <span className="text-emerald-400 font-bold">{ORDER_BOOK_LEVELS}</span></span>
      </div>
    </motion.div>
  )
}
