'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Activity } from 'lucide-react';

interface OIAnalysis {
  open_interest: number;
  oi_change_24h: number;
  price: number;
  price_change_24h: number;
  timeframe?: string;
  analysis: {
    status: string;
    signal: string;
    description: string;
    action: string;
    color: string;
    strength: number;
  };
}

export default function OIPanel({ data }: { data: OIAnalysis }) {
  const { analysis } = data;
  
  const getSignalIcon = () => {
    if (analysis.signal.includes('bullish')) return <TrendingUp className="w-8 h-8" />;
    if (analysis.signal.includes('bearish')) return <TrendingDown className="w-8 h-8" />;
    return <AlertCircle className="w-8 h-8" />;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Open Interest Analysis
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400 uppercase">
            {data.timeframe || '1h'}
          </span>
        </h3>
        <div 
          className="px-3 py-1 rounded-full text-sm font-bold uppercase"
          style={{ backgroundColor: analysis.color + '20', color: analysis.color }}
        >
          {analysis.status.replace('_', ' ')}
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">OI Change</p>
          <p className={`text-2xl font-bold font-mono ${
            data.oi_change_24h > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {data.oi_change_24h > 0 ? '+' : ''}{data.oi_change_24h.toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase mb-1">Price</p>
          <p className={`text-2xl font-bold font-mono ${
            data.price_change_24h > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            ${data.price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            {data.price_change_24h > 0 ? '+' : ''}{data.price_change_24h.toFixed(2)}%
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center">
          <div style={{ color: analysis.color }}>
            {getSignalIcon()}
          </div>
        </div>
      </div>

      {/* Описание */}
      <div className="space-y-3">
        <div className="bg-gray-800/50 rounded-lg p-4 border-l-4" style={{ borderColor: analysis.color }}>
          <p className="text-gray-300 text-sm leading-relaxed">
            {analysis.description}
          </p>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <p className="text-blue-400 text-xs uppercase mb-1">Рекомендация</p>
          <p className="text-white font-medium">{analysis.action}</p>
        </div>
      </div>

      {/* Сила сигнала */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Сила сигнала:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                className={`w-3 h-3 rounded-full ${
                  star <= analysis.strength ? 'bg-yellow-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
