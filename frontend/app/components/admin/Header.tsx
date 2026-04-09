'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';

export default function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64 lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search markets, assets..."
            className="pl-10 bg-muted border-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] flex items-center justify-center p-0">
            3
          </Badge>
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          suppressHydrationWarning
        >
          {mounted ? (
            <>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </>
          ) : (
            <div className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">BTC/USDT</p>
            <p className="text-xs text-emerald-500">+2.34%</p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
            Live
          </Badge>
        </div>
      </div>
    </header>
  );
}
