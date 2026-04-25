"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "./Logo"
import { UserMenu } from "./UserMenu"
import { AuthModal } from "./AuthModal"
import { useState } from "react"

export function GlobalNavbar() {
  const pathname = usePathname()
  const [authOpen, setAuthOpen] = useState(false)

  // Hidden on landing (/), all dashboard pages with Sidebar, and admin (/admin/*)
  const sidebarPaths = ["/app", "/risk-parity", "/portfolio", "/macro", "/crypto-metrics", "/signals", "/trades", "/yield-curve", "/position-calc", "/profile", "/heatmap", "/pricing"]
  const isDashboard = sidebarPaths.some(p => pathname === p || pathname?.startsWith(p + "/"))
  if (pathname === "/" || isDashboard || pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-10 w-auto" textClassName="text-2xl" />
          </Link>

          <div className="flex items-center gap-3">
            <UserMenu onOpenAuth={() => setAuthOpen(true)} />
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
