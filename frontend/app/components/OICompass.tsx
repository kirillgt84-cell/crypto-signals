"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, BarChart3 } from "lucide-react"

interface OIAnalysis {
  status: string
  signal: string
  description: string
  detailed?: string
  action: string
  tactic?: string
  color: string
  strength: number
  oi_direction?: "up" | "down" | "flat"
  price_direction?: "up" | "down" | "flat"
  volume_status?: "high" | "low" | "neutral"
}

interface OICompassProps {
  analysis: OIAnalysis | null
  loading?: boolean
}

export function OICompass({ analysis, loading }: OICompassProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Analyzing market...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
        <Activity className="w-16 h-16 mb-4 opacity-50" />
        <p>Select a symbol to view analysis</p>
      </div>
    )
  }

  // Parse directions from status or use defaults
  const getDirection = (type: "oi" | "price" | "volume") => {
    const desc = analysis.description?.toLowerCase() || ""
    
    if (type === "oi") {
      if (desc.includes("oi↑") || desc.includes("oi растет") || desc.includes("растет")) return "up"
      if (desc.includes("oi↓") || desc.includes("oi падает") || desc.includes("падает")) return "down"
      return "flat"
    }
    
    if (type === "price") {
      if (desc.includes("цена↑") || desc.includes("цена растет") || desc.includes("растет")) return "up"
      if (desc.includes("цена↓") || desc.includes("цена падает")) return "down"
      return "flat"
    }
    
    if (type === "volume") {
      if (desc.includes("объем↑") || desc.includes("высокий")) return "high"
      if (desc.includes("объем↓") || desc.includes("низкий")) return "low"
      return "neutral"
    }
    
    return "flat"
  }

  const oiDir = analysis.oi_direction || getDirection("oi")
  const priceDir = analysis.price_direction || getDirection("price")
  const volumeStat = analysis.volume_status || getDirection("volume")

  // Arrow configurations
  const arrows = [
    {
      id: "oi",
      label: "OI",
      icon: BarChart3,
      direction: oiDir,
      angle: -60, // Top-left
      color: oiDir === "up" ? "#22c55e" : oiDir === "down" ? "#ef4444" : "#6b7280",
      emoji: oiDir === "up" ? "↗" : oiDir === "down" ? "↘" : "→",
      description: oiDir === "up" ? "Растёт" : oiDir === "down" ? "Падает" : "Без изменений"
    },
    {
      id: "price",
      label: "Price",
      icon: DollarSign,
      direction: priceDir,
      angle: 0, // Top
      color: priceDir === "up" ? "#22c55e" : priceDir === "down" ? "#ef4444" : "#6b7280",
      emoji: priceDir === "up" ? "↑" : priceDir === "down" ? "↓" : "→",
      description: priceDir === "up" ? "Рост" : priceDir === "down" ? "Падение" : "Флэт"
    },
    {
      id: "volume",
      label: "Volume",
      icon: Activity,
      direction: volumeStat,
      angle: 60, // Top-right
      color: volumeStat === "high" ? "#3b82f6" : volumeStat === "low" ? "#9ca3af" : "#6b7280",
      emoji: volumeStat === "high" ? "⚡" : volumeStat === "low" ? "○" : "◐",
      description: volumeStat === "high" ? "Высокий" : volumeStat === "low" ? "Низкий" : "Средний"
    }
  ]

  return (
    <div className="flex flex-col items-center">
      {/* Compass Container */}
      <div className="relative w-72 h-72 mb-6">
        {/* Background circles */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-muted/40" />
        <div className="absolute inset-8 rounded-full border border-muted/30" />
        
        {/* Center Hub with Signal */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full flex flex-col items-center justify-center text-center z-10"
          style={{ 
            backgroundColor: analysis.color + "20",
            border: `3px solid ${analysis.color}`,
            boxShadow: `0 0 30px ${analysis.color}40`
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ 
              boxShadow: [
                `0 0 20px ${analysis.color}30`,
                `0 0 40px ${analysis.color}60`,
                `0 0 20px ${analysis.color}30`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SIGNAL</span>
          <span className="text-sm font-bold leading-tight mt-1 px-2" style={{ color: analysis.color }}>
            {analysis.status?.replace(/_/g, " ").toUpperCase()}
          </span>
          <span className="text-[10px] mt-1 font-medium">
            {analysis.strength}/5
          </span>
        </motion.div>

        {/* Three Arrows */}
        {arrows.map((arrow, index) => {
          const rad = (arrow.angle * Math.PI) / 180
          const x1 = 144 + Math.sin(rad) * 50 // Center X
          const y1 = 144 - Math.cos(rad) * 50 // Center Y
          const x2 = 144 + Math.sin(rad) * 110 // Outer X
          const y2 = 144 - Math.cos(rad) * 110 // Outer Y
          
          return (
            <g key={arrow.id}>
              {/* Animated line */}
              <motion.line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={arrow.color}
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              />
              
              {/* Pulsing dot at end */}
              <motion.circle
                cx={x2}
                cy={y2}
                r="8"
                fill={arrow.color}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  scale: { duration: 1.5, repeat: Infinity, delay: index * 0.3 },
                  opacity: { duration: 1.5, repeat: Infinity, delay: index * 0.3 }
                }}
              />
              
              {/* Label badge */}
              <foreignObject
                x={x2 - 30}
                y={y2 - 20}
                width="60"
                height="40"
              >
                <div 
                  className="flex flex-col items-center justify-center rounded-full px-2 py-1 text-xs font-bold"
                  style={{ 
                    backgroundColor: arrow.color + "20",
                    color: arrow.color,
                    border: `1px solid ${arrow.color}`
                  }}
                >
                  <span>{arrow.emoji} {arrow.label}</span>
                  <span className="text-[9px] opacity-80">{arrow.description}</span>
                </div>
              </foreignObject>
            </g>
          )
        })}

        {/* SVG overlay for arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {arrows.map((arrow, index) => {
            const rad = (arrow.angle * Math.PI) / 180
            const x1 = 144 + Math.sin(rad) * 56
            const y1 = 144 - Math.cos(rad) * 56
            const x2 = 144 + Math.sin(rad) * 100
            const y2 = 144 - Math.cos(rad) * 100
            
            return (
              <motion.g key={`svg-${arrow.id}`}>
                <defs>
                  <marker
                    id={`arrowhead-${arrow.id}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill={arrow.color} />
                  </marker>
                </defs>
                <motion.line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={arrow.color}
                  strokeWidth="3"
                  markerEnd={`url(#arrowhead-${arrow.id})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
                />
              </motion.g>
            )
          })}
        </svg>
      </div>

      {/* Text Interpretation Panel */}
      <motion.div 
        className="w-full space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* Main Description */}
        <div 
          className="p-4 rounded-xl"
          style={{ 
            backgroundColor: analysis.color + "15",
            borderLeft: `4px solid ${analysis.color}`
          }}
        >
          <p className="font-medium text-foreground leading-relaxed">
            {analysis.description}
          </p>
          {analysis.detailed && (
            <p className="text-sm text-muted-foreground mt-2">
              {analysis.detailed}
            </p>
          )}
        </div>

        {/* Action Box */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Действие:</span>
            <span className="text-sm">{analysis.action}</span>
          </div>
          {analysis.tactic && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-foreground shrink-0">Тактика:</span>
              <span className="text-sm text-muted-foreground">{analysis.tactic}</span>
            </div>
          )}
        </div>

        {/* Signal Strength Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Сила сигнала:</span>
          <div className="flex gap-1 flex-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <motion.div
                key={level}
                className="h-2 flex-1 rounded-full"
                style={{
                  backgroundColor: level <= analysis.strength ? analysis.color : "hsl(var(--muted))"
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + level * 0.1 }}
              />
            ))}
          </div>
          <span className="text-xs font-bold" style={{ color: analysis.color }}>
            {analysis.strength}/5
          </span>
        </div>
      </motion.div>
    </div>
  )
}
