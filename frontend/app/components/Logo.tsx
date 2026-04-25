"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  collapsed?: boolean
  className?: string
  textClassName?: string
}

export function Logo({ collapsed = false, className, textClassName = "text-lg" }: LogoProps) {
  if (collapsed) {
    // Only icon when sidebar is collapsed
    return (
      <div className={cn("flex items-center justify-center", className)} data-testid="logo-icon">
        <div className="relative h-8 w-8">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* 3 ascending dark blue chart bars */}
            <rect x="6" y="26" width="8" height="10" fill="#2563eb" rx="1"/>
            <rect x="16" y="18" width="8" height="18" fill="#2563eb" rx="1"/>
            <rect x="26" y="10" width="8" height="26" fill="#2563eb" rx="1"/>
          </svg>
        </div>
      </div>
    )
  }

  // Full logo with text
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-8 w-8" data-testid="logo-icon">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          {/* 3 ascending dark blue chart bars */}
          <rect x="6" y="26" width="8" height="10" fill="#2563eb" rx="1"/>
          <rect x="16" y="18" width="8" height="18" fill="#2563eb" rx="1"/>
          <rect x="26" y="10" width="8" height="26" fill="#2563eb" rx="1"/>
        </svg>
      </div>
      <span className={cn("font-bold tracking-tight uppercase leading-none text-[#1e3a5f] dark:text-foreground", textClassName)}>
        MIRKASO
      </span>
    </div>
  )
}

// Simple icon version for favicon/loading
export function LogoIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full" {...props}>
        {/* 3 ascending dark blue chart bars */}
        <rect x="6" y="26" width="8" height="10" fill="#2563eb" rx="1"/>
        <rect x="16" y="18" width="8" height="18" fill="#2563eb" rx="1"/>
        <rect x="26" y="10" width="8" height="26" fill="#2563eb" rx="1"/>
      </svg>
    </div>
  )
}
