'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  LineChart, 
  Activity,
  Settings,
  Wallet,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '../Logo';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/market', label: 'Market', icon: Activity },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hidden h-8 w-8 lg:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
            {navItems.map((item) => {
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-border p-3">
            <div className={cn(
              "flex items-center gap-3 rounded-lg bg-muted/50 p-3",
              collapsed && "justify-center"
            )}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-xs font-bold text-white">
                JD
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">John Doe</p>
                  <p className="truncate text-xs text-muted-foreground">john@example.com</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
