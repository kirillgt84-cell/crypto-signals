"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className }: LogoProps) {
  if (collapsed) {
    // Only icon when sidebar is collapsed
    return (
      <div className={cn("flex items-center justify-center", className)} data-testid="logo-icon">
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Dark blue chart bars */}
            <rect x="4" y="28" width="6" height="8" fill="#1e3a5f" rx="1"/>
            <rect x="12" y="24" width="6" height="12" fill="#1e3a5f" rx="1"/>
            <rect x="20" y="20" width="6" height="16" fill="#1e3a5f" rx="1"/>
            <rect x="28" y="16" width="6" height="20" fill="#1e3a5f" rx="1"/>
            {/* Green arrow */}
            <path d="M 6 30 L 20 18 L 34 8" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="34,8 30,10 30,14" fill="#22c55e"/>
          </svg>
        </div>
      </div>
    )
  }

  // Full logo with text
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-8 h-8" data-testid="logo-icon">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          {/* Dark blue chart bars */}
          <rect x="4" y="28" width="6" height="8" fill="#1e3a5f" rx="1"/>
          <rect x="12" y="24" width="6" height="12" fill="#1e3a5f" rx="1"/>
          <rect x="20" y="20" width="6" height="16" fill="#1e3a5f" rx="1"/>
          <rect x="28" y="16" width="6" height="20" fill="#1e3a5f" rx="1"/>
          {/* Green arrow */}
          <path d="M 6 30 L 20 18 L 34 8" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <polygon points="34,8 30,10 30,14" fill="#22c55e"/>
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-[#1e3a5f] dark:text-foreground">
        FAST LANE
      </span>
    </div>
  )
}

// Simple icon version for favicon/loading
export function LogoIcon({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full" {...props}>
        {/* Dark blue chart bars */}
        <rect x="4" y="28" width="6" height="8" fill="#1e3a5f" rx="1"/>
        <rect x="12" y="24" width="6" height="12" fill="#1e3a5f" rx="1"/>
        <rect x="20" y="20" width="6" height="16" fill="#1e3a5f" rx="1"/>
        <rect x="28" y="16" width="6" height="20" fill="#1e3a5f" rx="1"/>
        {/* Green arrow */}
        <path d="M 6 30 L 20 18 L 34 8" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <polygon points="34,8 30,10 30,14" fill="#22c55e"/>
      </svg>
    </div>
  )
}
