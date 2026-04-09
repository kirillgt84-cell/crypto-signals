'use client';

import React from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search markets, assets..."
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] flex items-center justify-center p-0">
            3
          </Badge>
        </Button>

        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
          <Sun className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">BTC/USDT</p>
            <p className="text-xs text-emerald-400">+2.34%</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            Live
          </Badge>
        </div>
      </div>
    </header>
  );
}
