'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from './components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Shield,
  Wallet,
  BarChart3,
  Flame,
  CircleDollarSign,
  ChevronRight
} from 'lucide-react';
import { cn, formatNumber, formatPrice, formatPercent } from '@/lib/utils';
import CryptoChart from './components/dashboard/CryptoChart';
import MarketDepth from './components/dashboard/MarketDepth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC/USDT', icon: '₿' },
  { value: 'ETHUSDT', label: 'ETH/USDT', icon: 'Ξ' },
  { value: 'SOLUSDT', label: 'SOL/USDT', icon: '◎' },
];

const TIMEFRAMES = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
];

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  const fetchData = async () => {
    try {
      const [oiRes, checklistRes, clusterRes, levelsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/market/oi/${symbol}?timeframe=${timeframe}`),
        fetch(`${API_BASE}/api/v1/market/checklist/${symbol}?timeframe=${timeframe}`),
        fetch(`${API_BASE}/api/v1/market/profile/${symbol}`),
        fetch(`${API_BASE}/api/v1/market/levels/${symbol}?timeframe=${timeframe}`),
      ]);

      const [oi, checklist, cluster, levels] = await Promise.all([
        oiRes.json(),
        checklistRes.json(),
        clusterRes.json(),
        levelsRes.json(),
      ]);

      setData({ oi, checklist, cluster, levels });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  const { oi, checklist, cluster, levels } = data;
  const isBullish = oi.analysis?.signal?.includes('bullish');
  const isBearish = oi.analysis?.signal?.includes('bearish');

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">OI Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Open Interest Analytics & Market Context</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Tabs value={symbol} onValueChange={setSymbol}>
              <TabsList className="bg-slate-900 border border-slate-800">
                {SYMBOLS.map((sym) => (
                  <TabsTrigger key={sym.value} value={sym.value} className="text-xs">
                    <span className="mr-1">{sym.icon}</span>
                    {sym.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="bg-slate-900 border border-slate-800">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger key={tf.value} value={tf.value} className="text-xs px-3">
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <button
              onClick={() => setWalletConnected(!walletConnected)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                walletConnected 
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              <Wallet className="h-4 w-4" />
              {walletConnected ? '0x7a...3f9' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Chart */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Price & Chart Card */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white font-mono">
                    {formatPrice(oi.price)}
                  </span>
                  <Badge 
                    variant={oi.price_change_24h >= 0 ? "default" : "destructive"}
                    className={cn(
                      "text-xs",
                      oi.price_change_24h >= 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""
                    )}
                  >
                    {formatPercent(oi.price_change_24h)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <span className="text-slate-400">OI:</span>
                  <span className={cn(
                    "font-mono font-medium",
                    oi.oi_change_24h >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatNumber(oi.open_interest)} 
                    <span className="ml-1 text-xs">({formatPercent(oi.oi_change_24h)})</span>
                  </span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "ml-2 text-xs",
                      isBullish ? "border-emerald-500/30 text-emerald-400" : 
                      isBearish ? "border-red-500/30 text-red-400" : "border-slate-600 text-slate-400"
                    )}
                  >
                    {oi.analysis?.status?.replace('_', ' ') || 'Neutral'}
                  </Badge>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <CryptoChart symbol={symbol} timeframe={timeframe} />
            </CardContent>
          </Card>

          {/* Market Depth */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-400" />
                Volume Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarketDepth data={cluster} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Checklist Score */}
          <Card className={cn(
            "border",
            checklist.score >= 6 ? "border-emerald-500/30 bg-emerald-950/10" :
            checklist.score >= 4 ? "border-amber-500/30 bg-amber-950/10" :
            "border-red-500/30 bg-red-950/10"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Entry Checklist
                </CardTitle>
                <span className={cn(
                  "text-2xl font-bold",
                  checklist.score >= 6 ? "text-emerald-400" :
                  checklist.score >= 4 ? "text-amber-400" :
                  "text-red-400"
                )}>
                  {checklist.score}/{checklist.max_score}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress 
                value={(checklist.score / checklist.max_score) * 100} 
                className={cn(
                  "h-2",
                  checklist.score >= 6 ? "bg-emerald-950" :
                  checklist.score >= 4 ? "bg-amber-950" :
                  "bg-red-950"
                )}
              />
              
              <div className="space-y-2">
                {Object.entries(checklist.checks).map(([key, check]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {check.passed ? (
                        <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        </div>
                      ) : check.weight === 'required' ? (
                        <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center">
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Activity className="h-3 w-3 text-amber-400" />
                        </div>
                      )}
                      <span className="text-slate-300">{check.description}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{check.value}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={!walletConnected || checklist.score < 4}
                className={cn(
                  "w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2",
                  walletConnected && checklist.score >= 4
                    ? checklist.score >= 6 
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {checklist.action}
                <ChevronRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          {/* Key Levels */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-slate-400" />
                Key Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-sm text-slate-400">EMA 50</span>
                <div className="text-right">
                  <span className="text-sm font-mono text-white">{formatPrice(levels.ema_levels?.ema50)}</span>
                  <span className={cn(
                    "text-xs ml-2",
                    levels.ema_levels?.distance_to_ema50_pct >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatPercent(levels.ema_levels?.distance_to_ema50_pct)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-sm text-slate-400">EMA 200</span>
                <div className="text-right">
                  <span className="text-sm font-mono text-white">{formatPrice(levels.ema_levels?.ema200)}</span>
                  <span className={cn(
                    "text-xs ml-2",
                    levels.ema_levels?.distance_to_ema200_pct >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatPercent(levels.ema_levels?.distance_to_ema200_pct)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30">
                  <span className="text-xs text-red-400">Long Liq 20x</span>
                  <p className="text-sm font-mono text-white">{formatPrice(levels.liquidation_levels?.closest_long)}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                  <span className="text-xs text-emerald-400">Short Liq 20x</span>
                  <p className="text-sm font-mono text-white">{formatPrice(levels.liquidation_levels?.closest_short)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funding Rate */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-slate-400" />
                Funding Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-2xl font-bold",
                  Math.abs(levels.liquidation_levels?.funding_rate) > 0.0001 
                    ? levels.liquidation_levels?.funding_rate > 0 ? "text-red-400" : "text-emerald-400"
                    : "text-slate-400"
                )}>
                  {(levels.liquidation_levels?.funding_rate * 100).toFixed(4)}%
                </span>
                <Badge 
                  variant="outline"
                  className="text-xs border-slate-700 text-slate-400"
                >
                  8h
                </Badge>
              </div>
              {Math.abs(levels.liquidation_levels?.funding_rate) > 0.0001 && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {levels.liquidation_levels?.funding_rate > 0 
                    ? 'High funding - longs are crowded'
                    : 'Negative funding - shorts paying'
                  }
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
