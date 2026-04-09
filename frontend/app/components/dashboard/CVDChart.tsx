'use client';

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

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
  const buyPercent = (data.buy_volume / (data.buy_volume + data.sell_volume)) * 100;
  const sellPercent = 100 - buyPercent;

  // Создаем простую визуализацию графика
  const chartHeight = 100;
  const maxVal = Math.max(...data.delta_series.map(Math.abs), 1);
  const points = data.delta_series.map((val, i) => {
    const x = (i / (data.delta_series.length - 1)) * 100;
    const y = 50 - (val / maxVal) * 50; // Нормализуем к -50..50, потом инвертируем
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          CVD (Cumulative Volume Delta)
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400 uppercase">
            {data.timeframe || '1h'}
          </span>
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
          isBullish ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          {data.interpretation}
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">CVD Value</p>
          <p className={`text-xl font-bold font-mono ${
            data.cvd_value > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {data.cvd_value > 0 ? '+' : ''}{data.cvd_value.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Net Delta</p>
          <p className={`text-xl font-bold font-mono ${
            data.net_delta > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {data.net_delta > 0 ? '+' : ''}{data.net_delta.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Buy/Sell Ratio</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500 font-bold">{buyPercent.toFixed(0)}%</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-500 font-bold">{sellPercent.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* График CVD */}
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-xs uppercase mb-3">CVD Trend (Last 100 ticks)</p>
        <div className="relative h-32 w-full">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Сетка */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" />
            
            {/* Линия CVD */}
            <polyline
              points={points}
              fill="none"
              stroke={isBullish ? '#22c55e' : '#ef4444'}
              strokeWidth="2"
            />
            
            {/* Градиент под линией */}
            <polygon
              points={`0,50 ${points} 100,50`}
              fill={isBullish ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
            />
          </svg>
        </div>
      </div>

      {/* Volume Bars */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-sm font-medium">Buy Volume</span>
          </div>
          <p className="text-xl font-bold text-white font-mono">
            ${(data.buy_volume / 1e6).toFixed(2)}M
          </p>
        </div>
        
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm font-medium">Sell Volume</span>
          </div>
          <p className="text-xl font-bold text-white font-mono">
            ${(data.sell_volume / 1e6).toFixed(2)}M
          </p>
        </div>
      </div>
    </div>
  );
}
