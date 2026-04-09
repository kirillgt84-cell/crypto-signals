"use client"

import { useEffect, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  oi: number
}

interface CryptoChartProps {
  symbol: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="mb-2 text-xs text-muted-foreground">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Close:</span>
            <span className="font-mono font-medium">
              ${data?.close?.toFixed(2) || "0.00"}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-border">
            <span className="text-muted-foreground">OI:</span>
            <span className="font-mono font-medium text-primary">
              {((data?.oi || 0) / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function CryptoChart({ symbol }: CryptoChartProps) {
  const [data, setData] = useState<CandleData[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const generateData = (): CandleData[] => {
      const now = new Date()
      const basePrice = symbol === "BTC" ? 67000 : symbol === "ETH" ? 3500 : 150
      const points = 30
      const result: CandleData[] = []
      
      for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000)
        const randomChange = (Math.random() - 0.5) * basePrice * 0.02
        const close = basePrice + randomChange + (points - i) * (Math.random() - 0.5) * 10
        const open = close + (Math.random() - 0.5) * basePrice * 0.01
        
        result.push({
          time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          open: Math.max(0, open),
          high: Math.max(open, close) * 1.005,
          low: Math.min(open, close) * 0.995,
          close: Math.max(0, close),
          volume: Math.random() * 1000000,
          oi: 50000 + Math.random() * 20000,
        })
      }
      return result
    }

    setData(generateData())

    const interval = setInterval(() => {
      setData(generateData())
    }, 30000)

    return () => clearInterval(interval)
  }, [symbol])

  const minValue = data.length > 0 ? Math.min(...data.map((item) => Math.min(item.open, item.close))) : 0
  const maxValue = data.length > 0 ? Math.max(...data.map((item) => Math.max(item.open, item.close))) : 100

  // Prevent hydration issues - don't render chart until mounted
  if (!mounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Loading chart data...
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            domain={[minValue * 0.995 || 0, maxValue * 1.005 || 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickFormatter={(value) => 
              value.toLocaleString("en-US", { 
                style: "currency", 
                currency: "USD",
                minimumFractionDigits: value > 1000 ? 0 : 2 
              })
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="oi"
            stroke="hsl(var(--chart-2))"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 4"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
