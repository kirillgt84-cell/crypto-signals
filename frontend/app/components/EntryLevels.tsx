"use client"

import { motion } from "framer-motion"
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface EntryLevelsProps {
  data: {
    price: number
    ema20: number
    ema50: number
    ema200?: number
    poc: number
    vah: number
    val: number
  }
  loading?: boolean
}

export function EntryLevels({ data, loading }: EntryLevelsProps) {
  if (loading) {
    return (
      <div className="w-full h-full border-2 border-primary/30 rounded-lg bg-black/90 p-6 font-mono">
        <div className="flex items-center gap-3 text-primary mb-6">
          <Target className="w-5 h-5 animate-pulse" />
          <span className="text-lg font-bold tracking-wider">ENTRY LEVELS</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const price = data?.price || 0
  
  if (!price) {
    return (
      <div className="w-full h-full border-2 border-muted rounded-lg bg-black/90 p-6 font-mono flex items-center justify-center">
        <span className="text-muted-foreground">Select symbol to view levels...</span>
      </div>
    )
  }

  // Calculate distance from price (percentage)
  const getDistance = (levelPrice: number) => {
    return ((levelPrice - price) / price) * 100
  }

  // Get color based on level type
  const getColor = (type: 'resistance' | 'support' | 'neutral') => {
    if (type === 'resistance') return '#ef4444' // red
    if (type === 'support') return '#22c55e' // green
    return '#6b7280' // gray
  }

  // Progress bar fill based on distance (closer = more filled)
  const getFill = (distance: number) => {
    const absDist = Math.abs(distance)
    // Max 10% distance = full bar
    const fill = Math.min(10, Math.max(2, 10 - absDist))
    return Math.round(fill)
  }

  // Determine types for EMA levels
  const ema20Type: 'resistance' | 'support' = data.ema20 > price ? 'resistance' : 'support'
  const ema50Type: 'resistance' | 'support' = data.ema50 > price ? 'resistance' : 'support'

  // All levels sorted by price (highest to lowest)
  const levels = [
    { 
      name: 'VAH', 
      value: data.vah, 
      type: 'resistance' as const, 
      label: 'Value Area High',
      desc: 'Resistance zone - upper 15% of volume'
    },
    { 
      name: 'POC', 
      value: data.poc, 
      type: 'neutral' as const, 
      label: 'Point of Control',
      desc: 'Highest volume node'
    },
    { 
      name: 'PRICE', 
      value: price, 
      type: 'neutral' as const, 
      label: 'Current Price',
      desc: 'You are here',
      isCurrent: true
    },
    { 
      name: 'EMA20', 
      value: data.ema20, 
      type: ema20Type, 
      label: 'EMA 20',
      desc: 'Dynamic support/resistance'
    },
    { 
      name: 'EMA50', 
      value: data.ema50, 
      type: ema50Type, 
      label: 'EMA 50',
      desc: 'Trend direction'
    },
    { 
      name: 'VAL', 
      value: data.val, 
      type: 'support' as const, 
      label: 'Value Area Low',
      desc: 'Support zone - lower 15% of volume'
    },
  ].sort((a, b) => b.value - a.value)

  return (
    <motion.div 
      className="w-full h-full border-2 rounded-xl bg-black/95 p-5 font-mono flex flex-col"
      style={{ borderColor: '#3b82f660' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-500/40">
        <Target className="w-5 h-5 text-blue-500" />
        <span className="text-xl font-bold tracking-widest text-blue-500">
          ENTRY LEVELS
        </span>
      </div>

      {/* Levels */}
      <div className="flex-1 space-y-3">
        {levels.map((level, index) => {
          const distance = getDistance(level.value)
          const color = level.isCurrent ? '#3b82f6' : getColor(level.type)
          const fill = level.isCurrent ? 10 : getFill(distance)
          const isAbove = distance > 0
          
          return (
            <motion.div
              key={level.name}
              className={`flex items-center gap-3 p-2 rounded-lg ${level.isCurrent ? 'bg-blue-500/20 border border-blue-500' : ''}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Name */}
              <span className="text-sm font-bold w-16" style={{ color }}>
                {level.name}
              </span>
              
              {/* Progress Bar */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs tracking-tighter font-bold" style={{ color }}>
                  {"█".repeat(fill)}{"░".repeat(10 - fill)}
                </span>
              </div>
              
              {/* Price */}
              <span className="text-sm font-mono font-bold" style={{ color }}>
                ${level.value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
              </span>
              
              {/* Distance */}
              <span className="text-xs w-16 text-right" style={{ color }}>
                {distance > 0 ? '+' : ''}{distance.toFixed(1)}%
              </span>
              
              {/* Indicator */}
              <span className="text-lg">
                {level.isCurrent ? '🎯' : level.type === 'resistance' ? '🔴' : level.type === 'support' ? '🟢' : '⚪'}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-muted-foreground/20 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>🔴 Resistance</span>
          <span>🟢 Support</span>
          <span>⚪ Neutral</span>
          <span>🎯 Current</span>
        </div>
      </div>
    </motion.div>
  )
}
