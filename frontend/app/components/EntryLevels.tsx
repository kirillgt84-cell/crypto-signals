"use client"

import { motion } from "framer-motion"
import { Target, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
      <div className="w-full h-full border-2 border-primary/30 rounded-lg bg-card p-6 font-mono">
        <div className="flex items-center gap-3 text-primary mb-6">
          <Target className="w-5 h-5 animate-pulse" />
          <span className="text-lg font-bold tracking-wider">ENTRY LEVELS</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const price = data?.price || 0
  
  if (!price) {
    return (
      <div className="w-full h-full border-2 border-muted rounded-lg bg-card p-6 font-mono flex items-center justify-center">
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
    if (type === 'resistance') return '#ef4444'
    if (type === 'support') return '#22c55e'
    return '#9ca3af'
  }

  // Determine types for EMA levels
  const ema20Type: 'resistance' | 'support' = data.ema20 > price ? 'resistance' : 'support'
  const ema50Type: 'resistance' | 'support' = data.ema50 > price ? 'resistance' : 'support'

  // Find min/max for scale normalization
  const allValues = [data.vah, data.poc, price, data.ema20, data.ema50, data.val]
  const minValue = Math.min(...allValues) * 0.998
  const maxValue = Math.max(...allValues) * 1.002
  const range = maxValue - minValue

  // Normalize value to 0-100 scale
  const normalize = (value: number) => {
    return ((value - minValue) / range) * 100
  }

  const pricePosition = normalize(price)

  // All levels with descriptions (PRICE removed - shown as marker on scales)
  const levels = [
    { 
      name: 'VAH', 
      value: data.vah, 
      type: 'resistance' as const, 
      label: 'Value Area High',
      desc: 'Верхняя граница зоны стоимости. Уровень сопротивления где цена считается "дорогой" (верхние 15% объема)'
    },
    { 
      name: 'POC', 
      value: data.poc, 
      type: 'neutral' as const, 
      label: 'Point of Control',
      desc: 'Точка контроля - уровень с максимальным объемом торгов. Самая "справедливая" цена по мнению рынка'
    },
    { 
      name: 'EMA20', 
      value: data.ema20, 
      type: ema20Type, 
      label: 'EMA 20',
      desc: 'Экспоненциальная скользящая средняя 20 периодов. Динамическая поддержка/сопротивление'
    },
    { 
      name: 'EMA50', 
      value: data.ema50, 
      type: ema50Type, 
      label: 'EMA 50',
      desc: 'Экспоненциальная скользящая средняя 50 периодов. Определяет среднесрочный тренд'
    },
    { 
      name: 'VAL', 
      value: data.val, 
      type: 'support' as const, 
      label: 'Value Area Low',
      desc: 'Нижняя граница зоны стоимости. Уровень поддержки где цена считается "дешевой" (нижние 15% объема)'
    },
  ].sort((a, b) => b.value - a.value)

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div 
        className="w-full border-2 rounded-xl bg-card p-4 font-mono"
        style={{ borderColor: '#3b82f660' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-500/40">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-xl font-bold tracking-widest text-blue-500">
              ENTRY LEVELS
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>VAH/VAL</strong> — зона стоимости (где 70% объема)<br/>
                <strong>POC</strong> — точка максимального объема<br/>
                <strong>EMA</strong> — динамические уровни<br/>
                Текущая цена показывает вашу позицию относительно поддержек/сопротивлений
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Levels */}
        <div className="space-y-2">
          {levels.map((level, index) => {
            const distance = getDistance(level.value)
            const color = getColor(level.type)
            const position = normalize(level.value)
            const isAbove = distance > 0
            
            return (
              <Tooltip key={level.name}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="flex items-center gap-3 p-2 rounded-lg cursor-help transition-colors hover:bg-muted"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    {/* Name */}
                    <span className="text-sm font-bold w-14 shrink-0" style={{ color }}>
                      {level.name}
                    </span>
                    
                    {/* SVG Scale with price marker */}
                    <div className="flex-1 relative h-6">
                      <svg 
                        className="w-full h-full" 
                        viewBox="0 0 100 10" 
                        preserveAspectRatio="none"
                      >
                        {/* Background track */}
                        <rect 
                          x="0" y="3" width="100" height="4" 
                          rx="2"
                          fill="#1f2937" 
                        />
                        
                        {/* Filled portion based on position */}
                        <rect 
                          x="0" y="3" width={position} height="4" 
                          rx="2"
                          fill={color}
                          opacity={level.isCurrent ? 0.3 : 0.6}
                        />
                        
                        {/* Price marker line for all levels */}
                        <line 
                          x1={pricePosition} 
                          y1="0" 
                          x2={pricePosition} 
                          y2="10" 
                          stroke="#fbbf24" 
                          strokeWidth="1.5"
                          strokeDasharray="2,1"
                        />
                        
                        {/* Current level indicator dot */}
                        <circle 
                          cx={position} 
                          cy="5" 
                          r={level.isCurrent ? 3 : 2.5} 
                          fill={color}
                          stroke={level.isCurrent ? '#fbbf24' : 'none'}
                          strokeWidth={level.isCurrent ? 1 : 0}
                        />
                      </svg>
                      
                      {/* Price label positioned on scale */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold px-1 rounded"
                        style={{ 
                          left: `${position}%`,
                          transform: 'translateX(-50%) translateY(-50%)',
                          color: color,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          textShadow: '0 0 4px rgba(0,0,0,0.8)'
                        }}
                      >
                        ${(level.value / 1000).toFixed(1)}k
                      </div>
                    </div>
                    
                    {/* Distance */}
                    <span className="text-xs w-14 text-right font-mono text-muted-foreground">
                      {distance > 0 ? '+' : ''}{distance.toFixed(1)}%
                    </span>
                    
                    {/* Indicator */}
                    <span className="text-lg shrink-0 w-6 text-center">
                      {level.type === 'resistance' ? '🔴' : level.type === 'support' ? '🟢' : '⚪'}
                    </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-sm" style={{ color }}>
                      {level.label}: ${level.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                    <p className="text-xs">
                      {isAbove 
                        ? `На ${distance.toFixed(1)}% выше текущей цены` 
                        : `На ${Math.abs(distance).toFixed(1)}% ниже текущей цены`
                      }
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-muted-foreground/20">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>🔴 Resistance</span>
            <span>🟢 Support</span>
            <span>⚪ Neutral</span>
            <span>🎯 Current</span>
          </div>
          {/* Price scale legend */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <div className="flex-1 h-1 bg-gradient-to-r from-green-900/50 via-gray-800 to-red-900/50 rounded-full relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-yellow-500"
                style={{ left: `${pricePosition}%` }}
              />
            </div>
            <span>▲ — текущая цена на шкале</span>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
