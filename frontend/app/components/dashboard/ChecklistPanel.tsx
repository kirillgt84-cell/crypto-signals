'use client';

import React from 'react';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  Lock,
  Unlock,
  Zap
} from 'lucide-react';

export interface CheckItem {
  passed: boolean;
  value: string;
  description: string;
  weight: 'required' | 'preferred' | 'background';
}

export interface ChecklistData {
  score: number;
  max_score: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'CAUTION' | 'WAIT' | string;
  action: string;
  color: string;
  checks: {
    oi_signal: CheckItem;
    cvd_confirmation: CheckItem;
    cluster_clear: CheckItem;
    ema_position: CheckItem;
    funding_normal: CheckItem;
  };
  levels: {
    price: number;
    ema50: number;
    ema200: number;
    poc: number;
    liquidation_long: number;
    liquidation_short: number;
  };
}

export default function ChecklistPanel({ data }: { data: ChecklistData }) {
  if (!data) return null;

  const { score, max_score, recommendation, action, checks, levels } = data;
  const percentage = (score / max_score) * 100;
  
  // Calculate circle progress
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 6) return '#00ff88';
    if (score >= 4) return '#ffcc00';
    return '#ff3366';
  };

  const getRecommendationStyle = () => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return {
          bg: 'from-green-500/20 to-green-600/20',
          border: 'border-green-500/40',
          text: 'text-green-400',
          glow: 'shadow-green-500/30',
          icon: <TrendingUp className="w-6 h-6" />
        };
      case 'BUY':
        return {
          bg: 'from-yellow-500/20 to-yellow-600/20',
          border: 'border-yellow-500/40',
          text: 'text-yellow-400',
          glow: 'shadow-yellow-500/30',
          icon: <Unlock className="w-6 h-6" />
        };
      case 'CAUTION':
        return {
          bg: 'from-orange-500/20 to-orange-600/20',
          border: 'border-orange-500/40',
          text: 'text-orange-400',
          glow: 'shadow-orange-500/30',
          icon: <AlertTriangle className="w-6 h-6" />
        };
      default:
        return {
          bg: 'from-red-500/20 to-red-600/20',
          border: 'border-red-500/40',
          text: 'text-red-400',
          glow: 'shadow-red-500/30',
          icon: <Lock className="w-6 h-6" />
        };
    }
  };

  const style = getRecommendationStyle();

  const checkItems = [
    { key: 'oi_signal', label: 'OI Signal', icon: '🔥', ...checks.oi_signal },
    { key: 'cvd_confirmation', label: 'CVD Confirm', icon: '📊', ...checks.cvd_confirmation },
    { key: 'cluster_clear', label: 'Cluster Clear', icon: '🎯', ...checks.cluster_clear },
    { key: 'ema_position', label: 'EMA Position', icon: '📈', ...checks.ema_position },
    { key: 'funding_normal', label: 'Funding OK', icon: '⚡', ...checks.funding_normal },
  ];

  const getWeightBadge = (weight: string) => {
    switch (weight) {
      case 'required':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">REQ</span>;
      case 'preferred':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">OPT</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30">BG</span>;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header with Circular Progress */}
      <div className="flex items-center gap-4 mb-6">
        {/* Circular Score */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={getScoreColor()}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${getScoreColor()})`
              }}
            />
          </svg>
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono" style={{ color: getScoreColor() }}>
              {score}
            </span>
            <span className="text-xs text-gray-500">/{max_score}</span>
          </div>
        </div>

        {/* Title & Status */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Entry Checklist</h3>
          </div>
          <p className="text-xs text-gray-500 mb-2">7-Point Analysis</p>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold uppercase ${style.text} bg-gradient-to-r ${style.bg} border ${style.border}`}>
            {style.icon}
            {recommendation.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Check Items */}
      <div className="space-y-2 mb-5">
        {checkItems.map((item) => (
          <div 
            key={item.key}
            className={`
              flex items-center gap-3 p-3 rounded-xl border transition-all
              ${item.passed 
                ? 'bg-green-500/5 border-green-500/20' 
                : item.weight === 'required'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-yellow-500/5 border-yellow-500/20'
              }
            `}
          >
            {/* Status Icon */}
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
              ${item.passed 
                ? 'bg-green-500/20 text-green-400' 
                : item.weight === 'required'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }
            `}>
              {item.passed ? (
                <Check className="w-4 h-4" />
              ) : item.weight === 'required' ? (
                <X className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm">{item.icon}</span>
                <span className="text-sm font-medium text-white truncate">{item.label}</span>
                {getWeightBadge(item.weight)}
              </div>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>

            {/* Value */}
            <div className="text-right flex-shrink-0">
              <p className={`text-xs font-mono ${
                item.passed ? 'text-green-400' : 'text-gray-400'
              }`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Key Levels Summary */}
      <div className="p-3 rounded-xl bg-muted/50 border border-border mb-4">
        <p className="text-xs text-gray-500 uppercase mb-2">Key Levels</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Price</span>
            <span className="font-mono text-white">${levels?.price?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">EMA50</span>
            <span className="font-mono text-blue-400">${levels?.ema50?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">POC</span>
            <span className="font-mono text-yellow-400">${levels?.poc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Liq 20x</span>
            <span className="font-mono text-red-400">${levels?.liquidation_long?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className={`
        p-4 rounded-xl border-2 text-center
        bg-gradient-to-r ${style.bg} ${style.border} ${style.glow}
      `}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {style.icon}
          <span className="text-lg font-bold text-white">{action}</span>
        </div>
        <p className="text-xs text-gray-400">
          {recommendation === 'STRONG_BUY' && 'All filters passed - good entry'}
          {recommendation === 'BUY' && 'Main filters OK, minor risks'}
          {recommendation === 'CAUTION' && 'High risk, consider waiting'}
          {recommendation === 'WAIT' && 'Entry blocked - wait for setup'}
        </p>
      </div>
    </div>
  );
}
