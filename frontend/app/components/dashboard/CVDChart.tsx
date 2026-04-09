'use client';

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface CVDData {
  timeframe?: string;
  cvd_value: number;
  net_delta: number;
  buy_volume: number;
  sell_volume: number;
  delta_series: number[];
  interpretation: string;
}

export default function CVDChart({ data }: { data: CVDData }) {
  const isBullish = data.interpretation === 'bullish';
  const totalVolume = data.buy_volume + data.sell_volume;
  const buyPercent = totalVolume > 0 ? (data.buy_volume / totalVolume) * 100 : 50;
  const sellPercent = 100 - buyPercent;

  // Sparkline data
  const chartHeight = 60;
  const width = 200;
  const maxVal = Math.max(...data.delta_series.map(Math.abs), 1);
  const minVal = Math.min(...data.delta_series);
  const range = maxVal * 2;
  
  const points = data.delta_series.map((val, i) => {
    const x = (i / (data.delta_series.length - 1)) * width;
    const y = chartHeight - ((val + maxVal) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${width},${chartHeight}`;

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isBullish 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <BarChart3 className={`w-5 h-5 ${isBullish ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">CVD Analysis</h3>
            <p className="text-xs text-gray-500">Cumulative Volume Delta</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
          isBullish 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {data.interpretation}
        </div>
      </div>

      {/* CVD Value & Sparkline */}
      <div className="flex items-end gap-4 mb-5">
        <div>
          <p className="text-xs text-gray-500 uppercase mb-1">CVD Value</p>
          <p className={`text-3xl font-bold font-mono ${
            data.cvd_value > 0 ? 'text-green-400 text-glow-green' : 'text-red-400 text-glow-red'
          }`}>
            {data.cvd_value > 0 ? '+' : ''}{data.cvd_value.toLocaleString()}
          </p>
        </div>
        
        {/* Mini Sparkline */}
        <div className="flex-1 h-16">
          <svg viewBox={`0 0 ${width} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cvdGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isBullish ? '#00ff88' : '#ff3366'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isBullish ? '#00ff88' : '#ff3366'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#cvdGradient)" />
            <polyline
              points={points}
              fill="none"
              stroke={isBullish ? '#00ff88' : '#ff3366'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Volume Ratio Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            Buy {buyPercent.toFixed(1)}%
          </span>
          <span className="flex items-center gap-1">
            Sell {sellPercent.toFixed(1)}%
            <TrendingDown className="w-3 h-3 text-red-400" />
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000"
            style={{ width: `${buyPercent}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-1000"
            style={{ width: `${sellPercent}%` }}
          />
        </div>
      </div>

      {/* Volume Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400 uppercase">Buy Volume</span>
          </div>
          <p className="text-lg font-bold font-mono text-white">
            ${(data.buy_volume / 1e6).toFixed(2)}M
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-400 uppercase">Sell Volume</span>
          </div>
          <p className="text-lg font-bold font-mono text-white">
            ${(data.sell_volume / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>

      {/* Net Delta */}
      <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 uppercase">Net Delta</span>
          <span className={`font-mono font-bold ${
            data.net_delta > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {data.net_delta > 0 ? '+' : ''}{data.net_delta.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
