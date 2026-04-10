"use client"

import { useEffect, useRef, useState } from "react"

interface TradingViewChartProps {
  symbol: string
  timeframe?: string
  ema20?: number
  ema50?: number
  poc?: number
}

export function TradingViewChart({ symbol, timeframe = "60", ema20, ema50, poc }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  useEffect(() => {
    // Check if script already loaded
    if (document.getElementById("tradingview-widget-script")) {
      setIsScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.id = "tradingview-widget-script"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.onload = () => setIsScriptLoaded(true)
    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount to avoid reloading
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || !isScriptLoaded) return

    const tvSymbol = `BINANCE:${symbol}USDT.P`
    
    // Clear previous widget
    containerRef.current.innerHTML = ""

    // Create widget container
    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container"
    widgetContainer.style.height = "100%"
    widgetContainer.style.width = "100%"

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "calc(100% - 32px)"
    widgetDiv.style.width = "100%"

    const copyrightDiv = document.createElement("div")
    copyrightDiv.className = "tradingview-widget-copyright"
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>`

    widgetContainer.appendChild(widgetDiv)
    widgetContainer.appendChild(copyrightDiv)
    containerRef.current.appendChild(widgetContainer)

    // Initialize TradingView widget with timeframe
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: timeframe,
      timezone: "exchange",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(42, 46, 57, 0.2)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      studies: [
        "MASimple@tv-basicstudies",  // EMA/SMA
        "Volume@tv-basicstudies",
      ],
      show_popup_button: true,
      popup_width: "1000",
      popup_height: "650",
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    })

    widgetContainer.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [symbol, timeframe, isScriptLoaded])

  if (!isScriptLoaded) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-muted/30 rounded-lg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="relative h-[500px] w-full rounded-lg overflow-hidden bg-muted/30">
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Overlay with EMA/POC levels */}
      {(ema20 || ema50 || poc) && (
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur p-2 rounded-lg border border-border text-xs space-y-1">
          {ema20 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-muted-foreground">EMA 20:</span>
              <span className="font-mono">${ema20.toLocaleString()}</span>
            </div>
          )}
          {ema50 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span className="text-muted-foreground">EMA 50:</span>
              <span className="font-mono">${ema50.toLocaleString()}</span>
            </div>
          )}
          {poc && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-500"></div>
              <span className="text-muted-foreground">POC:</span>
              <span className="font-mono">${poc.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
