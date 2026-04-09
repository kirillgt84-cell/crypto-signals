'use client';

import React from 'react';
import { Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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

export default function LevelsPanel({ data }: { data: LevelsData }) {
  const { liquidation_levels, ema_levels } = data;
  const isBullishTrend = ema_levels.trend === 'bullish';
  const isBearishFunding = liquidation_levels.funding_signal === 'bearish';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-red-500" />
          Key Levels
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
          isBullishTrend ? 'bg-green-500/20 text-green-500' : 
          ema_levels.trend === 'bearish' ? 'bg-red-500/20 text-red-500' :
          'bg-yellow-500/20 text-yellow-500'
        }`}>
          {ema_levels.trend} trend
        </div>
      </div>

      {/* EMA Levels */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <p className="text-gray-400 text-xs uppercase mb-3">EMA Levels</p>
        
        <div className="space-y-3">
          {/* EMA 50 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm font-medium">EMA 50</span>
              <span className={`text-xs ${
                ema_levels.distance_to_ema50_pct > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ({ema_levels.distance_to_ema50_pct > 0 ? '+' : ''}{ema_levels.distance_to_ema50_pct}%)
              </span>
            </div>
            <span className="font-mono text-white">${ema_levels.ema50.toLocaleString()}</span>
          </div>
          
          {/* Progress bar to EMA50 */}
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${ema_levels.distance_to_ema50_pct > 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.abs(ema_levels.distance_to_ema50_pct) * 5, 100)}%` }}
            />
          </div>

          {/* EMA 200 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 text-sm font-medium">EMA 200</span>
              <span className={`text-xs ${
                ema_levels.distance_to_ema200_pct > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                ({ema_levels.distance_to_ema200_pct > 0 ? '+' : ''}{ema_levels.distance_to_ema200_pct}%)
              </span>
            </div>
            <span className="font-mono text-white">${ema_levels.ema200.toLocaleString()}</span>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 uppercase mb-1">Strategy</p>
          <p className={`text-sm font-medium ${
            ema_levels.recommendation === 'buy_dip' ? 'text-green-400' :
            ema_levels.recommendation === 'caution' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {ema_levels.recommendation === 'buy_dip' && 'Buy the dip (EMA50 support)'}
            {ema_levels.recommendation === 'wait' && 'Wait for confirmation'}
            {ema_levels.recommendation === 'caution' && 'Caution - below EMAs'}
          </p>
        </div>
      </div>

      {/* Liquidation Levels */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs uppercase">Liquidation Levels</p>
          <div className={`text-xs px-2 py-0.5 rounded ${
            isBearishFunding ? 'bg-red-500/20 text-red-400' : 
            liquidation_levels.funding_signal === 'bullish' ? 'bg-green-500/20 text-green-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            Funding: {(liquidation_levels.funding_rate * 100).toFixed(4)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Long Liquidations (below current) */}
          <div className="space-y-2">
            <p className="text-xs text-red-400 uppercase flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Long Stops
            </p>
            {liquidation_levels.long_liquidations.map((level, idx) => (
              <div 
                key={idx}
                className={`p-2 rounded text-xs ${
                  idx === 0 ? 'bg-red-900/30 border border-red-800' : 'bg-gray-700/50'
                }`}
              >
                <div className="font-mono text-white">${level.price.toLocaleString()}</div>
                <div className="text-gray-400">{level.leverage} • {level.distance}</div>
              </div>
            ))}
          </div>

          {/* Short Liquidations (above current) */}
          <div className="space-y-2">
            <p className="text-xs text-green-400 uppercase flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Short Stops
            </p>
            {liquidation_levels.short_liquidations.map((level, idx) => (
              <div 
                key={idx}
                className={`p-2 rounded text-xs ${
                  idx === 0 ? 'bg-green-900/30 border border-green-800' : 'bg-gray-700/50'
                }`}
              >
                <div className="font-mono text-white">${level.price.toLocaleString()}</div>
                <div className="text-gray-400">{level.leverage} • {level.distance}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        {isBearishFunding && (
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-800 rounded flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-400">
              Positive funding = shorts pay longs. Caution for new longs.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
