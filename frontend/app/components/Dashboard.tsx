'use client';

import React, { useEffect, useState } from 'react';
import OIPanel from './dashboard/OIPanel';
import CVDChart from './dashboard/CVDChart';
import ClusterMap from './dashboard/ClusterMap';
import LevelsPanel from './dashboard/LevelsPanel';
import TradeLogger from './dashboard/TradeLogger';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface OIData {
  symbol: string;
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
  cvd_value: number;
  net_delta: number;
  buy_volume: number;
  sell_volume: number;
  delta_series: number[];
  interpretation: string;
}

interface ClusterData {
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
  const [oiData, setOiData] = useState<OIData | null>(null);
  const [cvdData, setCvdData] = useState<CVDData | null>(null);
  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [levelsData, setLevelsData] = useState<LevelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Параллельно загружаем все данные
      const [oiRes, cvdRes, clusterRes, levelsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/market/oi/${symbol}`),
        fetch(`${API_BASE}/api/v1/market/cvd/${symbol}`),
        fetch(`${API_BASE}/api/v1/market/clusters/${symbol}`),
        fetch(`${API_BASE}/api/v1/market/levels/${symbol}`)
      ]);

      if (!oiRes.ok) throw new Error('Failed to fetch OI data');
      
      const oi = await oiRes.json();
      const cvd = await cvdRes.json();
      const clusters = await clusterRes.json();
      const levels = await levelsRes.json();

      setOiData(oi);
      setCvdData(cvd);
      setClusterData(clusters);
      setLevelsData(levels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            OI Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Open Interest Analytics & Market Context</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          
          <button 
            onClick={fetchAllData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Refresh</span>
            )}
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={fetchAllData}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* OI Panel */}
        {oiData && <OIPanel data={oiData} />}
        
        {/* CVD Chart */}
        {cvdData && <CVDChart data={cvdData} />}
        
        {/* Cluster Map */}
        {clusterData && <ClusterMap data={clusterData} />}
        
        {/* Levels Panel */}
        {levelsData && <LevelsPanel data={levelsData} />}
        
        {/* Trade Logger */}
        <TradeLogger />
      </div>

      {/* Loading State */}
      {loading && !oiData && (
        <div className="fixed inset-0 bg-gray-950/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading market data...</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>SignalStream OI Dashboard v2.0 • Data from Binance Futures • Updates every 30s</p>
      </footer>
    </div>
  );
}
