"use client"

import { useMemo } from "react"

interface TradingViewChartProps {
  symbol: string
  timeframe?: string
  ema20?: number
  ema50?: number
  poc?: number
  theme?: "light" | "dark"
}

// Map our timeframes to TradingView intervals
const timeframeToInterval: Record<string, string> = {
  "15": "15",
  "60": "60", 
  "240": "240",
  "D": "D"
}

export function TradingViewChart({ 
  symbol, 
  timeframe = "60",
  theme = "dark"
}: TradingViewChartProps) {
  
  const tvSymbol = useMemo(() => {
    if (symbol.includes(":")) return symbol
    return `BINANCE:${symbol}USDT.P`
  }, [symbol])
  
  const interval = useMemo(() => {
    return timeframeToInterval[timeframe] || "60"
  }, [timeframe])

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: interval,
      theme: theme,
      style: "1",
      locale: "en",
      toolbar_bg: theme === "dark" ? "#1a1a2e" : "#f8f9fa",
      enable_publishing: "false",
      hide_legend: "false",
      save_image: "false",
      calendar: "false",
      hide_top_toolbar: "false",
      hide_side_toolbar: "false",
      allow_symbol_change: "false",
      details: "false",
      hotlist: "false",
      news: "false",
      studies: "[]",
      show_popup_button: "true",
      popup_width: "1000",
      popup_height: "650",
      referrer: "fast-lane.vercel.app"
    })
    
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`
  }, [tvSymbol, interval, theme])

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden bg-muted/30">
      <iframe
        src={src}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allowTransparency
        allowFullScreen
        loading="lazy"
        title={`TradingView Chart ${symbol}`}
      />
    </div>
  )
}
