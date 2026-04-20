'use client';

import React, { useState } from 'react';

interface AssetData {
  asset: string;
  name: string;
  impact_3m: number;
  impact_6m: number;
  risk_level: string;
  status: string;
}

interface HeatmapMatrixProps {
  assets: AssetData[];
}

const getHeatColor = (value: number): string => {
  if (value >= 8) return 'bg-green-500';
  if (value >= 5) return 'bg-green-400';
  if (value >= 2) return 'bg-green-300';
  if (value > 0) return 'bg-green-200';
  if (value === 0) return 'bg-gray-500';
  if (value > -2) return 'bg-red-200';
  if (value > -5) return 'bg-red-300';
  if (value > -8) return 'bg-red-400';
  return 'bg-red-500';
};

const getTextColor = (value: number): string => {
  if (Math.abs(value) > 3) return 'text-white';
  return 'text-gray-900';
};

const timeframes = [
  { key: 'impact_3m', label: '3M' },
  { key: 'impact_6m', label: '6M' },
];

export default function HeatmapMatrix({ assets }: HeatmapMatrixProps) {
  const [selectedTf, setSelectedTf] = useState('impact_3m');

  // Sort by value desc
  const sorted = [...assets].sort((a, b) => {
    const av = selectedTf === 'impact_3m' ? a.impact_3m : a.impact_6m;
    const bv = selectedTf === 'impact_3m' ? b.impact_3m : b.impact_6m;
    return bv - av;
  });

  const maxVal = Math.max(...assets.map((a) => Math.abs(selectedTf === 'impact_3m' ? a.impact_3m : a.impact_6m)));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          IMPACT HEATMAP
        </span>
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setSelectedTf(tf.key)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                selectedTf === tf.key
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1">
        {sorted.map((asset) => {
          const val = selectedTf === 'impact_3m' ? asset.impact_3m : asset.impact_6m;
          const widthPct = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0;
          const isPos = val >= 0;

          return (
            <div key={asset.asset} className="flex items-center gap-2 group">
              <div className="w-16 text-[10px] text-gray-400 text-right shrink-0">{asset.asset}</div>
              <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all duration-500 ${getHeatColor(val)}`}
                  style={{
                    width: `${Math.max(widthPct, 5)}%`,
                    marginLeft: isPos ? '50%' : `${50 - Math.max(widthPct, 5)}%`,
                  }}
                />
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                {/* Value label */}
                <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-bold ${getTextColor(val)}`}
                  style={{ left: isPos ? `${50 + widthPct / 2}%` : `${50 - widthPct / 2}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {val > 0 ? '+' : ''}{val}%
                </div>
              </div>
              <div className="w-14 text-[10px] text-gray-500 shrink-0">{asset.risk_level}</div>
            </div>
          );
        })}
      </div>

      {/* Scale legend */}
      <div className="flex items-center justify-center gap-1 mt-3">
        <span className="text-[10px] text-red-400">-10%</span>
        <div className="flex gap-px">
          {[-8, -5, -2, 0, 2, 5, 8].map((v) => (
            <div key={v} className={`w-4 h-2 ${getHeatColor(v)}`} />
          ))}
        </div>
        <span className="text-[10px] text-green-400">+10%</span>
      </div>
    </div>
  );
}
