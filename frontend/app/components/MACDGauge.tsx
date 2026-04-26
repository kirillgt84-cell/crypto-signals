"use client"

import { cn } from "@/lib/utils"

interface MACDGaugeProps {
  trend: "bull" | "bear"
  histogram: number[]
  momentum: string
  className?: string
}

export function MACDGauge({ trend, histogram, momentum, className }: MACDGaugeProps) {
  const maxVal = Math.max(...histogram.map(Math.abs), 0.001)
  const isIncreasing = momentum === "increasing"

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Histogram */}
      <div className="flex items-end gap-1 h-[44px]">
        {histogram.map((val, i) => {
          const h = Math.min(40, Math.max(2, (Math.abs(val) / maxVal) * 40))
          const isPositive = val >= 0
          return (
            <div
              key={i}
              className={cn(
                "w-3 rounded-sm transition-all duration-500",
                isPositive ? "bg-emerald-500" : "bg-rose-500"
              )}
              style={{ height: `${h}px` }}
            />
          )
        })}
      </div>

      {/* Trend label + arrow */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            trend === "bull" ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {trend === "bull" ? "BULL" : "BEAR"}
        </span>
        <span
          className={cn(
            "text-xs",
            isIncreasing ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {isIncreasing ? "▲" : "▼"}
        </span>
      </div>
    </div>
  )
}
