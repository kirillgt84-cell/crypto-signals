'use client';

import React, { useEffect, useState } from 'react';
import OIPanel from './dashboard/OIPanel';
import CVDChart from './dashboard/CVDChart';
import ClusterMap from './dashboard/ClusterMap';
import LevelsPanel from './dashboard/LevelsPanel';
import ChecklistPanel, { ChecklistData } from './dashboard/ChecklistPanel';
import { 
  Activity, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  BarChart3, 
  Target,
  Shield,
  Zap
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TIMEFRAMES = [
  { value: '1h', label: '1H', description: 'Hourly view' },
  { value: '4h', label: '4H', description: '4-Hour view' },
  { value: '1d', label: '1D', description: 'Daily view' },
];

const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC', name: 'Bitcoin', color: '#f7931a' },
  { value: 'ETHUSDT', label: 'ETH', name: 'Ethereum', color: '#627eea' },
  { value: 'SOLUSDT', label: 'SOL', name: 'Solana', color: '#00ffa3' },
];

interface OIData {
  symbol: string;
  timeframe?: string;
  open_interest: number;
  oi_change_24h: number;
  price: number;
  price_change_24h: number;
  analysis: {
    status: string;
    signal: string;
    description: string;
    action: string;
    color: string;
    strength: number;
  };
}

interface CVDData {
  timeframe?: string;
  cvd_value: number;
  net_delta: number;
  buy_volume: number;
  sell_volume: number;
  delta_series: number[];
  interpretation: string;
}

interface ClusterData {
  timeframe?: string;
  poc: number;
  clusters: Array<{
    price: number;
    buy: number;
    sell: number;
    total: number;
    delta: number;
  }>;
}

interface LevelsData {
  timeframe?: string;
  liquidation_levels: {
    current_price: number;
    funding_rate: number;
    long_liquidations: Array<{price: number; leverage: string; distance: string}>;
    short_liquidations: Array<{price: number; leverage: string; distance: string}>;
    closest_long: number;
    closest_short: number;
    funding_signal: string;
  };
  ema_levels: {
    current_price: number;
    ema50: number;
    ema200: number;
    trend: string;
    distance_to_ema50_pct: number;
    distance_to_ema200_pct: number;
    support_levels: number[];
    recommendation: string;
  };
}

export default function Dashboard() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [oiData, setOiData] = useState<OIData | null>(null);
  const [cvdData, setCvdData] = useState<CVDData | null>(null);
  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [levelsData, setLevelsData] = useState<LevelsData | null>(null);
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [oiRes, cvdRes, clusterRes, levelsRes, checklistRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/market/oi/${symbol}?timeframe=${timeframe}`),
        fetch(`${API_BASE}/api/v1/market/cvd/${symbol}?timeframe=${timeframe}`),
        fetch(`${API_BASE}/api/v1/market/profile/${symbol}`),
        fetch(`${API_BASE}/api/v1/market/levels/${symbol}?timeframe=${timeframe}`),
        fetch(`${API_BASE}/api/v1/market/checklist/${symbol}?timeframe=${timeframe}`)
      ]);

      if (!oiRes.ok) throw new Error('Failed to fetch OI data');
      
      const [oi, cvd, clusters, levels, checklist] = await Promise.all([
        oiRes.json(), cvdRes.json(), clusterRes.json(), levelsRes.json(), checklistRes.json()
      ]);

      setOiData(oi);
      setCvdData(cvd);
      setClusterData(clusters);
      setLevelsData(levels);
      setChecklistData(checklist);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const currentSymbol = SYMBOLS.find(s => s.value === symbol);

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        {/* Top Bar */}
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0f] animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  OI Dashboard
                </h1>
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  Real-time Market Analytics
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Symbol Selector */}
              <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                {SYMBOLS.map((sym) => (
                  <button
                    key={sym.value}
                    onClick={() => setSymbol(sym.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      symbol === sym.value
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: sym.color }}
                    />
                    {sym.label}
                  </button>
                ))}
              </div>

              {/* Timeframe Selector */}
              <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      timeframe === tf.value
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchAllData}
                disabled={loading}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Market Status Bar */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
              {oiData && (
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">
                    OI: <span className="text-white font-mono">{(oiData.open_interest / 1000).toFixed(1)}K</span>
                  </span>
                  <span className={`font-mono ${oiData.oi_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {oiData.oi_change_24h >= 0 ? '+' : ''}{oiData.oi_change_24h.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="glass-card rounded-xl p-4 mb-6 border-red-500/30 bg-red-500/10">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column - OI & Checklist */}
        <div className="xl:col-span-4 space-y-4">
          {oiData && <OIPanel data={oiData} />}
          {checklistData && <ChecklistPanel data={checklistData} />}
        </div>
        
        {/* Center Column - Charts */}
        <div className="xl:col-span-5 space-y-4">
          {cvdData && <CVDChart data={cvdData} />}
          {clusterData && <ClusterMap data={clusterData} />}
        </div>
        
        {/* Right Column - Levels */}
        <div className="xl:col-span-3">
          {levelsData && <LevelsPanel data={levelsData} />}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && !oiData && (
        <div className="fixed inset-0 bg-[#0a0a0f]/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <Activity className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
            </div>
            <p className="text-gray-400 animate-pulse">Loading market data...</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 py-6 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>SignalStream OI Dashboard v2.0</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Binance Futures
            </span>
            <span>|</span>
            <span>Updates every 30s</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
