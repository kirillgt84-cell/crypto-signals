'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart2, Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();
  const { analysis } = data;
  const isBullish = analysis.signal.includes('bullish');
  const isBearish = analysis.signal.includes('bearish');

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const getSignalColor = () => {
    if (isBullish) return 'from-green-500 to-emerald-600';
    if (isBearish) return 'from-red-500 to-rose-600';
    return 'from-gray-500 to-gray-600';
  };

  const getSignalGlow = () => {
    if (isBullish) return 'shadow-green-500/30';
    if (isBearish) return 'shadow-red-500/30';
    return 'shadow-gray-500/30';
  };

  return (
    <div className="glass-card rounded-2xl p-5 animated-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('oiPanel.title')}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{data.timeframe || '1h'}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${getSignalColor()} text-foreground shadow-lg ${getSignalGlow()}`}>
          {t(`oi.status.${analysis.status}`)}
        </div>
      </div>

      {/* Price & OI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Price Card */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <DollarSign className="w-3 h-3" />
            PRICE
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${
            data.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {data.price_change_24h >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {data.price_change_24h >= 0 ? '+' : ''}{data.price_change_24h.toFixed(2)}%
          </div>
        </div>

        {/* OI Card */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <BarChart2 className="w-3 h-3" />
            OPEN INTEREST
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatNumber(data.open_interest)}
          </div>
          <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${
            data.oi_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {data.oi_change_24h >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {data.oi_change_24h >= 0 ? '+' : ''}{data.oi_change_24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Signal Strength Meter */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>SIGNAL STRENGTH</span>
          <span className="font-mono">{analysis.strength}/5</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getSignalColor()} transition-all duration-1000`}
            style={{ width: `${(analysis.strength / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Analysis Description */}
      <div className={`p-4 rounded-xl border bg-gradient-to-r ${
        isBullish
          ? 'from-green-500/10 to-transparent border-green-500/20'
          : isBearish
            ? 'from-red-500/10 to-transparent border-red-500/20'
            : 'from-gray-500/10 to-transparent border-gray-500/20'
      }`}>
        <p className="text-sm text-gray-300 leading-relaxed">
          {t(analysis.description)}
        </p>
      </div>

      {/* Action Badge */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 uppercase mb-1">Recommendation</p>
          <p className="text-sm font-medium text-foreground">{t(analysis.action)}</p>
        </div>
      </div>
    </div>
  );
}
