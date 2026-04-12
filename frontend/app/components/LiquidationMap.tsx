"use client"

import { motion } from "framer-motion"
import { Target, AlertTriangle, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

export function LiquidationMap({ 
  liquidations, 
  currentPrice, 
  symbol, 
  loading 
}: LiquidationMapProps) {
  if (loading) {
    return (
      <div className="w-full h-full border-2 border-primary/30 rounded-xl bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span className="text-base font-bold tracking-wider">LIQUIDATION MAP</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const price = currentPrice || 0
  const safeLiquidations = Array.isArray(liquidations) ? liquidations : []
  
  if (!price || safeLiquidations.length === 0) {
    return (
      <div className="w-full h-full border-2 border-muted rounded-xl bg-card p-4 font-mono flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No liquidation data...</span>
      </div>
    )
  }

  // Separate longs and shorts
  const longLiquidations = safeLiquidations
    .filter(l => l.side === "Long")
    .sort((a, b) => b.price - a.price) // Higher prices first (above current)
  
  const shortLiquidations = safeLiquidations
    .filter(l => l.side === "Short")
    .sort((a, b) => a.price - b.price) // Lower prices first (below current)

  const maxSize = Math.max(...safeLiquidations.map(l => l.size), 1)
  
  const decimals = price < 1 ? 4 : price < 100 ? 2 : 0

  // Calculate price range for visualization
  const allPrices = safeLiquidations.map(l => l.price)
  const minPrice = Math.min(...allPrices, price * 0.95)
  const maxPrice = Math.max(...allPrices, price * 1.05)
  const priceRange = maxPrice - minPrice

  // Normalize price to 0-100% position
  const normalizePrice = (p: number) => {
    return ((p - minPrice) / priceRange) * 100
  }

  const currentPricePos = normalizePrice(price)

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div 
        className="w-full h-full border-2 rounded-xl bg-card p-4 font-mono flex flex-col"
        style={{ borderColor: '#f59e0b40' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-amber-500/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-base font-bold tracking-widest text-amber-500">
              LIQUIDATION MAP
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                Концентрация ликвидаций показывает зоны, где крупные позиции будут закрыты принудительно. 
                🔴 Зоны лонгов выше цены (цель для шортистов), 
                🟢 Зоны шортов ниже цены (цель для лонгистов).
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Main Visualization */}
        <div className="flex-1 relative min-h-[200px]">
          {/* Price Scale Background */}
          <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground/50 py-2">
            <span>${maxPrice.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
            <span>${((maxPrice + minPrice) / 2).toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
            <span>${minPrice.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}</span>
          </div>

          {/* Chart Area */}
          <div className="absolute inset-0 ml-16 mr-2">
            {/* Background grid */}
            <div className="absolute inset-0 flex flex-col justify-evenly">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="border-t border-dashed border-muted-foreground/20" />
              ))}
            </div>

            {/* Long Liquidations (Above price) - Red bars going RIGHT */}
            <div className="absolute inset-0">
              {longLiquidations.map((level, i) => {
                const position = normalizePrice(level.price)
                const height = Math.max(20, (level.size / maxSize) * 80)
                const intensity = Math.min(1, level.size / maxSize)
                const distance = Math.abs((level.price - price) / price * 100)
                
                return (
                  <Tooltip key={`long-${i}`}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="absolute flex items-center cursor-pointer group"
                        style={{
                          top: `${position}%`,
                          left: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {/* Bar */}
                        <div
                          className="h-5 rounded-r-md flex items-center justify-end pr-1 transition-all group-hover:brightness-110"
                          style={{
                            width: `${Math.max(40, (level.size / maxSize) * 120)}px`,
                            backgroundColor: `rgba(239, 68, 68, ${0.4 + intensity * 0.6})`,
                            boxShadow: distance < 2 ? `0 0 10px rgba(239, 68, 68, 0.5)` : 'none'
                          }}
                        >
                          <span className="text-[9px] text-white/90 font-bold whitespace-nowrap">
                            {distance.toFixed(0)}%
                          </span>
                        </div>
                        
                        {/* Price label */}
                        <span className="ml-2 text-xs text-red-400 font-mono">
                          ${level.price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="space-y-1">
                        <p className="font-bold text-red-400">Long Liquidation</p>
                        <p className="text-sm">Price: ${level.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {distance.toFixed(1)}% above current price
                        </p>
                        <p className="text-xs text-amber-500">
                          🎯 Target for shorts
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Short Liquidations (Below price) - Green bars going LEFT */}
            <div className="absolute inset-0">
              {shortLiquidations.map((level, i) => {
                const position = normalizePrice(level.price)
                const intensity = Math.min(1, level.size / maxSize)
                const distance = Math.abs((level.price - price) / price * 100)
                
                return (
                  <Tooltip key={`short-${i}`}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="absolute flex items-center cursor-pointer group"
                        style={{
                          top: `${position}%`,
                          right: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {/* Price label */}
                        <span className="mr-2 text-xs text-emerald-400 font-mono">
                          ${level.price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
                        </span>
                        
                        {/* Bar */}
                        <div
                          className="h-5 rounded-l-md flex items-center pl-1 transition-all group-hover:brightness-110"
                          style={{
                            width: `${Math.max(40, (level.size / maxSize) * 120)}px`,
                            backgroundColor: `rgba(34, 197, 94, ${0.4 + intensity * 0.6})`,
                            boxShadow: distance < 2 ? `0 0 10px rgba(34, 197, 94, 0.5)` : 'none'
                          }}
                        >
                          <span className="text-[9px] text-white/90 font-bold whitespace-nowrap">
                            {distance.toFixed(0)}%
                          </span>
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-400">Short Liquidation</p>
                        <p className="text-sm">Price: ${level.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {distance.toFixed(1)}% below current price
                        </p>
                        <p className="text-xs text-amber-500">
                          🎯 Target for longs
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Current Price Line */}
            <div 
              className="absolute w-full flex items-center"
              style={{ top: `${currentPricePos}%`, transform: 'translateY(-50%)' }}
            >
              <div className="absolute w-full border-t-2 border-dashed border-yellow-500" />
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background px-2 py-0.5 rounded border border-yellow-500">
                <Target className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-500">
                  ${price.toLocaleString(undefined, {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 pt-3 border-t border-muted-foreground/20 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-red-400">🔴 Longs:</span>
            <span className="font-mono">{longLiquidations.length} zones</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400">🟢 Shorts:</span>
            <span className="font-mono">{shortLiquidations.length} zones</span>
          </div>
        </div>

        {/* Tactic */}
        <div className="mt-2 p-2 bg-muted/50 rounded text-[10px] text-muted-foreground">
          <strong>Tactic:</strong> Take profit before large clusters, stop loss beyond nearest zone
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
