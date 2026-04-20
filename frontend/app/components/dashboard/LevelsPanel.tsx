'use client';

import React from 'react';
import { Target, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

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

export default function LevelsPanel({ data }: { data: LevelsData }) {
  const { liquidation_levels, ema_levels } = data;
  const isBullishTrend = ema_levels.trend === 'bullish';
  const isBearishTrend = ema_levels.trend === 'bearish';

  // Calculate price scale
  const allPrices = [
    ema_levels.current_price,
    ema_levels.ema50,
    ema_levels.ema200,
    ...liquidation_levels.long_liquidations.map(l => l.price),
    ...liquidation_levels.short_liquidations.map(l => l.price),
  ];
  const minPrice = Math.min(...allPrices) * 0.98;
  const maxPrice = Math.max(...allPrices) * 1.02;
  const priceRange = maxPrice - minPrice;

  const getPosition = (price: number) => {
    return ((price - minPrice) / priceRange) * 100;
  };

  return (
    <div className="glass-card rounded-2xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20">
            <Target className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Key Levels</h3>
            <p className="text-xs text-gray-500">EMA & Liquidations</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
          isBullishTrend 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : isBearishTrend
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          {ema_levels.trend}
        </div>
      </div>

      {/* Visual Price Ladder */}
      <div className="relative h-64 mb-5">
        {/* Background gradient */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-green-500/5 via-transparent to-red-500/5" />
        
        {/* Price scale */}
        <div className="absolute inset-y-0 left-0 w-16 flex flex-col justify-between text-xs text-gray-500 py-2">
          <span>${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>${((maxPrice + minPrice) / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span>${minPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>

        {/* Levels */}
        <div className="absolute inset-y-0 left-16 right-0">
          {/* Short Liquidation Levels (above) */}
          {liquidation_levels.short_liquidations.map((level, idx) => (
            <div
              key={`short-${idx}`}
              className="absolute flex items-center gap-2"
              style={{ top: `${100 - getPosition(level.price)}%`, transform: 'translateY(-50%)' }}
            >
              <div className={`h-px flex-1 ${idx === 0 ? 'w-16 bg-green-500' : 'w-12 bg-green-500/50'}`} />
              <div className={`px-2 py-1 rounded text-xs font-mono ${
                idx === 0 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-green-500/10 text-green-500/70'
              }`}>
                ${level.price.toLocaleString()}
                <span className="ml-1 text-[10px] opacity-70">{level.leverage}</span>
              </div>
            </div>
          ))}

          {/* EMA 200 */}
          <div
            className="absolute flex items-center gap-2"
            style={{ top: `${100 - getPosition(ema_levels.ema200)}%`, transform: 'translateY(-50%)' }}
          >
            <div className="w-20 h-0.5 bg-purple-500" />
            <div className="px-2 py-1 rounded text-xs font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">
              EMA200 ${ema_levels.ema200.toLocaleString()}
            </div>
          </div>

          {/* EMA 50 */}
          <div
            className="absolute flex items-center gap-2"
            style={{ top: `${100 - getPosition(ema_levels.ema50)}%`, transform: 'translateY(-50%)' }}
          >
            <div className="w-20 h-0.5 bg-blue-500" />
            <div className="px-2 py-1 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              EMA50 ${ema_levels.ema50.toLocaleString()}
            </div>
          </div>

          {/* Current Price */}
          <div
            className="absolute flex items-center gap-2 z-10"
            style={{ top: `${100 - getPosition(ema_levels.current_price)}%`, transform: 'translateY(-50%)' }}
          >
            <div className="w-24 h-1 bg-yellow-400 shadow-lg shadow-yellow-400/50" />
            <div className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20">
              ${ema_levels.current_price.toLocaleString()} ←
            </div>
          </div>

          {/* Long Liquidation Levels (below) */}
          {liquidation_levels.long_liquidations.map((level, idx) => (
            <div
              key={`long-${idx}`}
              className="absolute flex items-center gap-2"
              style={{ top: `${100 - getPosition(level.price)}%`, transform: 'translateY(-50%)' }}
            >
              <div className={`h-px flex-1 ${idx === 0 ? 'w-16 bg-red-500' : 'w-12 bg-red-500/50'}`} />
              <div className={`px-2 py-1 rounded text-xs font-mono ${
                idx === 0 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-red-500/10 text-red-500/70'
              }`}>
                ${level.price.toLocaleString()}
                <span className="ml-1 text-[10px] opacity-70">{level.leverage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EMA Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-blue-400 uppercase">To EMA50</span>
          </div>
          <p className={`text-lg font-bold font-mono ${
            ema_levels.distance_to_ema50_pct > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {ema_levels.distance_to_ema50_pct > 0 ? '+' : ''}{ema_levels.distance_to_ema50_pct}%
          </p>
        </div>
        
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs text-purple-400 uppercase">To EMA200</span>
          </div>
          <p className={`text-lg font-bold font-mono ${
            ema_levels.distance_to_ema200_pct > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {ema_levels.distance_to_ema200_pct > 0 ? '+' : ''}{ema_levels.distance_to_ema200_pct}%
          </p>
        </div>
      </div>

      {/* Funding Rate */}
      <div className="p-3 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 uppercase">Funding Rate</span>
          <span className={`font-mono font-bold ${
            liquidation_levels.funding_rate > 0.0001 ? 'text-red-400' : 
            liquidation_levels.funding_rate < -0.0001 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {(liquidation_levels.funding_rate * 100).toFixed(4)}%
          </span>
        </div>
        {liquidation_levels.funding_rate > 0.0001 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            <span>High funding - caution for longs</span>
          </div>
        )}
      </div>

      {/* Strategy */}
      <div className={`
        mt-4 p-3 rounded-xl border
        ${ema_levels.recommendation === 'buy_dip' 
          ? 'bg-green-500/10 border-green-500/20' 
          : ema_levels.recommendation === 'caution'
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-yellow-500/10 border-yellow-500/20'
        }
      `}>
        <p className="text-xs uppercase mb-1 text-gray-400">Strategy</p>
        <p className={`text-sm font-medium ${
          ema_levels.recommendation === 'buy_dip' ? 'text-green-400' :
          ema_levels.recommendation === 'caution' ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {ema_levels.recommendation === 'buy_dip' && 'Buy the dip - price at EMA50 support'}
          {ema_levels.recommendation === 'wait' && 'Wait for EMA alignment'}
          {ema_levels.recommendation === 'caution' && 'Caution - below key EMAs'}
        </p>
      </div>
    </div>
  );
}
