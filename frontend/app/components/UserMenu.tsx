"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  LogOut,
  Settings,
  Wallet,
  LayoutDashboard,
  ChevronDown,
  HelpCircle,
  Crown,
  ShieldCheck,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface UserMenuProps {
  onOpenAuth: () => void
}

const tierBadge: Record<string, { label: string; variant: any; icon: React.ReactNode }> = {
  free: { label: "Free", variant: "secondary", icon: <User className="size-3" /> },
  pro: { label: "Pro", variant: "default", icon: <Crown className="size-3" /> },
  admin: { label: "Admin", variant: "destructive", icon: <ShieldCheck className="size-3" /> },
}

export function UserMenu({ onOpenAuth }: UserMenuProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [open, setOpen] = useState(false)

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
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    )
  }

  const tier = tierBadge[user?.subscription_tier || "free"]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 pl-2 pr-3 gap-2 rounded-full hover:bg-accent"
        >
          <Avatar className="h-7 w-7 border border-border/50">
            <AvatarImage src={user?.avatar_url || ""} alt={user?.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {user?.username?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">{user?.username}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
        </Button>
      </DropdownMenuTrigger>

      <AnimatePresence>
        {open && (
          <DropdownMenuContent
            forceMount
            className="w-72 rounded-xl p-2 shadow-xl ring-1 ring-border/50"
            align="end"
            sideOffset={8}
            asChild
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <DropdownMenuLabel className="font-normal px-2 py-2">
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
                      {user?.email || "No email"}
                    </p>
                    <div className="mt-1">
                      <Badge variant={tier.variant} className="text-[10px] h-4 px-1.5 gap-1">
                        {tier.icon}
                        {tier.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
                  Platform
                </DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
                    <span>Dashboard</span>
                    <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/trades" onClick={() => setOpen(false)}>
                    <Wallet className="mr-2 size-4 text-muted-foreground" />
                    <span>My Trades</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/profile" onClick={() => setOpen(false)}>
                    <Settings className="mr-2 size-4 text-muted-foreground" />
                    <span>Settings</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/help" onClick={() => setOpen(false)}>
                    <HelpCircle className="mr-2 size-4 text-muted-foreground" />
                    <span>Help & Support</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 size-4" />
                <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  )
}
