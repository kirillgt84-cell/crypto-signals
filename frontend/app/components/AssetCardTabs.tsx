'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AssetData {
  asset: string;
  name: string;
  impact_3m: number;
  impact_6m: number;
  risk_level: string;
  status: string;
  color: string;
}

interface AssetCardTabsProps {
  assets: AssetData[];
}

const iconMap: Record<string, React.ReactNode> = {
  SP500: <Activity className="w-5 h-5" />,
  NASDAQ: <TrendingUp className="w-5 h-5" />,
  BTC: <ArrowUpRight className="w-5 h-5" />,
  ETH: <ArrowDownRight className="w-5 h-5" />,
  GOLD: <ShieldCheck className="w-5 h-5" />,
  OIL: <AlertTriangle className="w-5 h-5" />,
  DXY: <Minus className="w-5 h-5" />,
};

const colorClasses: Record<string, string> = {
  green: 'bg-green-500/20 border-green-500/50 text-green-400',
  blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  red: 'bg-red-500/20 border-red-500/50 text-red-400',
  orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
};

export default function AssetCardTabs({ assets }: AssetCardTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = assets[activeIndex];

  if (!active) return null;

  const avg = ((active.impact_3m + active.impact_6m) / 2).toFixed(0);
  const isPositive = parseFloat(avg) > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {assets.map((a, i) => (
          <button
            key={a.asset}
            onClick={() => setActiveIndex(i)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              i === activeIndex
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-gray-300'
            }`}
          >
            {iconMap[a.asset] || <Activity className="w-4 h-4" />}
            {a.asset}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className={`rounded-xl border p-5 transition-all duration-300 ${colorClasses[active.color] || colorClasses.gray}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {iconMap[active.asset] || <Activity className="w-5 h-5" />}
            <span className="font-semibold text-sm">{active.name}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${active.color === 'green' ? 'border-green-500/30 bg-green-500/10' : active.color === 'red' ? 'border-red-500/30 bg-red-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
            {active.risk_level}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">3M</div>
            <div className={`text-lg font-bold ${active.impact_3m > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {active.impact_3m > 0 ? '+' : ''}{active.impact_3m}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">6M</div>
            <div className={`text-lg font-bold ${active.impact_6m > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {active.impact_6m > 0 ? '+' : ''}{active.impact_6m}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">AVG</div>
            <div className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{avg}%
            </div>
          </div>
        </div>

        {/* Mini bar chart */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-6 text-gray-400">3M</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${active.impact_3m > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(active.impact_3m) * 3, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-6 text-gray-400">6M</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${active.impact_6m > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(active.impact_6m) * 3, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
