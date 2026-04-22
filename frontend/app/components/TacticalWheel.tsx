'use client';

import React from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

interface AssetData {
  asset: string;
  impact_3m: number;
  impact_6m: number;
  status: string;
}

interface TacticalWheelProps {
  assets: AssetData[];
  regime: string; // risk-on, risk-off, transition
}

export default function TacticalWheel({ assets, regime }: TacticalWheelProps) {
  const { t } = useLanguage();
  const avgImpacts: Record<string, number> = {};
  assets.forEach((a) => {
    avgImpacts[a.asset] = (a.impact_3m + a.impact_6m) / 2;
  });

  // Split into risk-on (SP500, NASDAQ, BTC, ETH) and risk-off (GOLD, DXY) + OIL neutral
  const riskOnAssets = ['SP500', 'NASDAQ', 'BTC', 'ETH'];
  const riskOffAssets = ['GOLD', 'DXY'];

  const riskOnScore = riskOnAssets.reduce((sum, a) => sum + (avgImpacts[a] || 0), 0) / riskOnAssets.length;
  const riskOffScore = riskOffAssets.reduce((sum, a) => sum + (avgImpacts[a] || 0), 0) / riskOffAssets.length;

  // Normalize to -10 to +10 range for visualization
  const normalize = (val: number) => Math.max(-10, Math.min(10, val));
  const rOn = normalize(riskOnScore);
  const rOff = normalize(riskOffScore);

  // Arrow angle: -90 (full risk-off) to +90 (full risk-on)
  const angle = (rOn - Math.abs(rOff)) * 9; // scale to degrees
  const clampedAngle = Math.max(-80, Math.min(80, angle));

  const regimeColors: Record<string, { bg: string; text: string; border: string }> = {
    'risk-on': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    'risk-off': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    transition: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  };

  const rc = regimeColors[regime] || regimeColors.transition;

  return (
    <div className="w-full">
      <div className={`rounded-xl border ${rc.border} ${rc.bg} p-4`}>
        <div className="text-center mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${rc.text}`}>
            {t("tacticalWheel.title").replace("{{regime}}", regime.toUpperCase().replace(/-/g, ' '))}
          </span>
        </div>

        {/* Wheel */}
        <div className="relative w-40 h-40 mx-auto mb-3">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />

          {/* Risk-Off top half (red tint) */}
          <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 180deg, rgba(239,68,68,0.15) 0deg, rgba(239,68,68,0.05) 180deg, transparent 180deg)' }} />
          {/* Risk-On bottom half (green tint) */}
          <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(34,197,94,0.15) 0deg, rgba(34,197,94,0.05) 180deg, transparent 180deg)' }} />

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-white/50" />

          {/* Arrow */}
          <div
            className="absolute top-1/2 left-1/2 w-20 h-0.5 -mt-[1px] origin-left transition-transform duration-700"
            style={{
              transform: `rotate(${clampedAngle}deg)`,
              background: clampedAngle > 0 ? 'linear-gradient(to right, #22c55e, transparent)' : 'linear-gradient(to right, #ef4444, transparent)',
            }}
          >
            <div
              className="absolute right-0 -top-1 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: clampedAngle > 0 ? '8px solid #22c55e' : '8px solid #ef4444',
                transform: 'rotate(90deg)',
              }}
            />
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-red-400 font-medium">
            {t("yieldCurve.riskOffShort")}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-green-400 font-medium">
            {t("yieldCurve.riskOnShort")}
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {t("yieldCurve.neutralShort")}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {t("yieldCurve.neutralShort")}
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400 uppercase">{t("yieldCurve.riskOn")} Avg</div>
            <div className={`text-sm font-bold ${rOn > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rOn > 0 ? '+' : ''}{rOn.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-400 uppercase">{t("yieldCurve.riskOff")} Avg</div>
            <div className={`text-sm font-bold ${rOff > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {rOff > 0 ? '+' : ''}{rOff.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
