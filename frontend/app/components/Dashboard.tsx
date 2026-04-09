'use client';

import React, { useEffect, useState } from 'react';
import OIPanel from './dashboard/OIPanel';

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

export default function Dashboard() {
  const [oiData, setOiData] = useState<OIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');

  useEffect(() => {
    fetchOIData();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchOIData, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchOIData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/market/oi/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setOiData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
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
            onClick={fetchOIData}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OI Panel */}
        {loading ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading market data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={fetchOIData}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Retry
            </button>
          </div>
        ) : oiData ? (
          <OIPanel data={oiData} />
        ) : null}

        {/* Placeholder for additional widgets */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Coming Soon</h3>
          <ul className="space-y-3 text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              CVD Chart (Cumulative Volume Delta)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Cluster Volume Analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Liquidation Levels
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Trade Logger
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>SignalStream OI Dashboard v2.0 • Data from Binance Futures</p>
      </footer>
    </div>
  );
}
