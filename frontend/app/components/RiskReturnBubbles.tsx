'use client';

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from 'recharts';
import { useLanguage } from '@/app/context/LanguageContext';

interface AssetData {
  asset: string;
  name: string;
  impact_3m: number;
  impact_6m: number;
  risk_level: string;
  status: string;
}

interface RiskReturnBubblesProps {
  assets: AssetData[];
}

// Risk mapping: LOW=2, MODERATE=4, ELEVATED=6, HIGH=8, EXTREME=10
const riskMap: Record<string, number> = {
  LOW: 2,
  MODERATE: 4,
  ELEVATED: 6,
  HIGH: 8,
  EXTREME: 10,
};

const colorMap: Record<string, string> = {
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#6b7280',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <TooltipContent data={data} />
    );
  }
  return null;
};

const TooltipContent = ({ data }: { data: any }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-900/95 border border-white/20 rounded-lg p-3 text-xs">
      <div className="font-semibold text-white mb-1">{data.name}</div>
      <div className="text-gray-400">{t("riskReturnBubbles.riskLevel")}: <span className="text-white">{data.risk}</span></div>
      <div className="text-gray-400">{t("yieldCurve.3m")} {t("riskReturnBubbles.3mImpact")}: <span className={data.impact_3m > 0 ? 'text-green-400' : 'text-red-400'}>{data.impact_3m > 0 ? '+' : ''}{data.impact_3m}%</span></div>
      <div className="text-gray-400">{t("yieldCurve.6m")} {t("riskReturnBubbles.6mImpact")}: <span className={data.impact_6m > 0 ? 'text-green-400' : 'text-red-400'}>{data.impact_6m > 0 ? '+' : ''}{data.impact_6m}%</span></div>
      <div className="text-gray-400">{t("riskReturnBubbles.avgReturn")}: <span className={data.avg > 0 ? 'text-green-400' : 'text-red-400'}>{data.avg > 0 ? '+' : ''}{data.avg.toFixed(1)}%</span></div>
    </div>
  );
};

export default function RiskReturnBubbles({ assets }: RiskReturnBubblesProps) {
  const { t } = useLanguage();
  const data = assets.map((a) => {
    const avg = (a.impact_3m + a.impact_6m) / 2;
    const risk = riskMap[a.risk_level] || 5;
    // Bubble size = magnitude of impact
    const size = Math.abs(avg) * 30 + 50;

    return {
      x: risk,
      y: avg,
      z: size,
      name: a.name,
      asset: a.asset,
      impact_3m: a.impact_3m,
      impact_6m: a.impact_6m,
      risk: a.risk_level,
      avg,
      color: a.status === 'positive' ? colorMap.green : a.status === 'negative' ? colorMap.red : a.status === 'neutral-positive' ? colorMap.blue : a.status === 'neutral-negative' ? colorMap.yellow : colorMap.gray,
    };
  });

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t("riskReturnBubbles.title")}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Risk"
            domain={[0, 12]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            label={{ value: 'Risk Level →', position: 'bottom', fill: '#9ca3af', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Return"
            domain={[-15, 15]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            label={{ value: 'Expected Return % →', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 200]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Assets" data={data}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} stroke={entry.color} strokeWidth={2} />
            ))}
          </Scatter>

          {/* Reference lines */}
          <CartesianGrid horizontal={false} vertical={false} />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {data.map((d) => (
          <div key={d.asset} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-gray-400">{d.asset}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
