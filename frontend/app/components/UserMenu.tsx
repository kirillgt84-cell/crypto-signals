"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
  User,
  LogOut,
  Settings,
  Receipt,
  LayoutDashboard,
  ChevronDown,
  HelpCircle,
  Crown,
  ShieldCheck,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface UserMenuProps {
  onOpenAuth: () => void
}

const tierBadge: Record<string, { labelKey: string; variant: any; icon: React.ReactNode }> = {
  free: { labelKey: "common.free", variant: "secondary", icon: <User className="size-3" /> },
  starter: { labelKey: "common.free", variant: "secondary", icon: <User className="size-3" /> },
  pro: { labelKey: "common.pro", variant: "default", icon: <Crown className="size-3" /> },
  trader: { labelKey: "common.pro", variant: "default", icon: <Crown className="size-3" /> },
  investor: { labelKey: "common.pro", variant: "default", icon: <Crown className="size-3" /> },
  admin: { labelKey: "common.admin", variant: "destructive", icon: <ShieldCheck className="size-3" /> },
}

export function UserMenu({ onOpenAuth }: UserMenuProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
    setOpen(false)
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={onOpenAuth} variant="outline" size="sm" className="gap-2">
        <User className="size-4" />
        <span className="hidden sm:inline">{t("common.signIn")}</span>
      </Button>
    )
  }

  const tier = tierBadge[user?.subscription_tier || "free"]

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 pl-2 pr-3 gap-2 rounded-full hover:bg-accent"
        aria-expanded={open}
      >
        <Avatar className="h-7 w-7 border border-border/50">
          <AvatarImage src={user?.avatar_url || ""} alt={user?.username} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {user?.username?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <span className="hidden md:inline text-sm font-medium">{user?.username}</span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border/50 bg-popover p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50">
                <AvatarImage src={user?.avatar_url || ""} alt={user?.username} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.username?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-semibold leading-tight">{user?.username}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                  {user?.email || t("userMenu.noEmail")}
                </p>
                <div className="mt-1">
                  <Badge variant={tier.variant} className="text-[10px] h-4 px-1.5 gap-1">
                    {tier.icon}
                    {t(tier.labelKey)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          <div className="px-2 py-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("userMenu.platform")}</p>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors">
              <LayoutDashboard className="size-4 text-muted-foreground" />
              <span>{t("sidebar.dashboard")}</span>
            </Link>
            <Link href="/trades" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors">
              <Receipt className="size-4 text-muted-foreground" />
              <span>{t("userMenu.myTrades")}</span>
            </Link>
          </div>

          <div className="h-px bg-border my-1" />

          <div className="px-2 py-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("userMenu.account")}</p>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors">
              <Settings className="size-4 text-muted-foreground" />
              <span>{t("userMenu.settings")}</span>
            </Link>
            <Link href="/help" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors">
              <HelpCircle className="size-4 text-muted-foreground" />
              <span>{t("userMenu.helpSupport")}</span>
            </Link>
          </div>

          <div className="h-px bg-border my-1" />

          <button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
            <LogOut className="size-4" />
            <span>{isLoggingOut ? t("userMenu.signingOut") : t("common.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  )
}
