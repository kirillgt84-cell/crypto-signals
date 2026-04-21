'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  Zap,
  Crown,
  Wallet,
  Globe,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageDropdown } from '../LanguageDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.subscription_tier === 'admin';

  const baseNavItems = [
    { href: '/', label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { href: '/portfolio', label: t('sidebar.portfolio'), icon: Wallet },
    { href: '/signals', label: t('sidebar.signals'), icon: Zap },
    { href: '/macro', label: t('sidebar.macro'), icon: Globe },
    { href: '/yield-curve', label: t('sidebar.yieldCurve'), icon: TrendingUp },
    { href: '/pricing', label: t('sidebar.pricing'), icon: Crown },
  ];

  const bottomNavItems = [
    { href: '/profile', label: t('sidebar.profile'), icon: User },
  ];

  const adminNavItem = { href: '/admin', label: t('sidebar.admin'), icon: Shield };
  
  const topNavItems = [
    ...baseNavItems,
    ...(isAdmin ? [adminNavItem] : []),
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <Link href="/" className="flex items-center">
              <Logo collapsed={collapsed} />
            </Link>
            {!collapsed && (
              <div className="flex items-center gap-1">
                <LanguageDropdown />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="hidden h-8 w-8 lg:flex"
                  data-testid="sidebar-toggle"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-card shadow-sm"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {topNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-indigo-600 dark:text-indigo-300")} />
                  {!collapsed && (
                    <span className="flex items-center gap-2">
                      {item.label}
                      {item.href === '/signals' && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          PRO
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-border p-3 space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <Link href="/profile" onClick={() => setMobileOpen(false)}>
                <div className={cn(
                  "mt-2 flex items-center gap-3 rounded-lg bg-muted/50 p-3",
                  collapsed && "justify-center"
                )}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || ""} alt={user?.username || ""} />
                    <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {user?.username?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user?.username || "Guest"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email || "No email"}</p>
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  window.dispatchEvent(new CustomEvent("open-auth-modal"));
                }}
                className={cn(
                  "mt-2 w-full flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-left hover:bg-muted transition-colors",
                  collapsed && "justify-center"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    U
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Guest</p>
                    <p className="truncate text-xs text-muted-foreground">Click to sign in</p>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
