'use client';

import React from 'react';
import { Check, X, AlertTriangle, Circle, TrendingUp, TrendingDown, Shield } from 'lucide-react';

interface CheckItem {
  passed: boolean;
  value: string;
  description: string;
  weight: 'required' | 'preferred' | 'background';
}

interface ChecklistData {
  score: number;
  max_score: number;
  recommendation: string;
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

  const { score, max_score, recommendation, action, color, checks, levels } = data;
  
  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-600 border-green-500 text-white';
      case 'yellow': return 'bg-yellow-600 border-yellow-500 text-white';
      case 'orange': return 'bg-orange-600 border-orange-500 text-white';
      case 'red': return 'bg-red-600 border-red-500 text-white';
      default: return 'bg-gray-600 border-gray-500 text-white';
    }
  };

  const getCheckIcon = (passed: boolean, weight: string) => {
    if (passed) {
      return <Check className="w-5 h-5 text-green-500" />;
    }
    if (weight === 'required') {
      return <X className="w-5 h-5 text-red-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const getWeightLabel = (weight: string) => {
    switch (weight) {
      case 'required': return 'Обязательно';
      case 'preferred': return 'Желательно';
      case 'background': return 'Фон';
      default: return '';
    }
  };

  const checkItems = [
    { key: 'oi_signal', label: 'OI Сигнал', ...checks.oi_signal },
    { key: 'cvd_confirmation', label: 'CVD Подтверждение', ...checks.cvd_confirmation },
    { key: 'cluster_clear', label: 'Cluster Путь', ...checks.cluster_clear },
    { key: 'ema_position', label: 'EMA Позиция', ...checks.ema_position },
    { key: 'funding_normal', label: 'Funding Норма', ...checks.funding_normal },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-500" />
          Checklist Входа
        </h3>
        <div className="text-2xl font-bold font-mono">
          <span className={score >= 6 ? 'text-green-500' : score >= 4 ? 'text-yellow-500' : 'text-red-500'}>
            {score}
          </span>
          <span className="text-gray-600">/{max_score}</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mb-6">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              score >= 6 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${(score / max_score) * 100}%` }}
          />
        </div>
      </div>

      {/* Check Items */}
      <div className="space-y-3 mb-6">
        {checkItems.map((item) => (
          <div 
            key={item.key}
            className={`p-3 rounded-lg border ${
              item.passed 
                ? 'bg-green-900/20 border-green-800' 
                : item.weight === 'required'
                  ? 'bg-red-900/20 border-red-800'
                  : 'bg-yellow-900/20 border-yellow-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getCheckIcon(item.passed, item.weight)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.weight === 'required' 
                      ? 'bg-red-900/50 text-red-400' 
                      : item.weight === 'preferred'
                        ? 'bg-yellow-900/50 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                  }`}>
                    {getWeightLabel(item.weight)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{item.description}</p>
                <p className="text-xs font-mono mt-1 text-gray-300">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Levels Summary */}
      <div className="bg-gray-800 rounded-lg p-3 mb-6">
        <p className="text-xs text-gray-400 uppercase mb-2">Ключевые Уровни</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Цена:</span>
            <span className="font-mono text-white">${levels?.price?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">EMA50:</span>
            <span className="font-mono text-blue-400">${levels?.ema50?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">POC:</span>
            <span className="font-mono text-yellow-400">${levels?.poc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Liq 20x:</span>
            <span className="font-mono text-red-400">${levels?.liquidation_long?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className={`p-4 rounded-xl border-2 text-center ${getColorClass(color)}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {recommendation === 'STRONG_BUY' || recommendation === 'BUY' ? (
            <TrendingUp className="w-6 h-6" />
          ) : recommendation === 'WAIT' ? (
            <X className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
          <span className="text-lg font-bold">{action}</span>
        </div>
        <p className="text-xs opacity-80">
          {recommendation === 'STRONG_BUY' && 'Все фильтры пройдены - можно входить'}
          {recommendation === 'BUY' && 'Основные фильтры ОК, но есть риски'}
          {recommendation === 'CAUTION' && 'Высокий риск, лучше подождать'}
          {recommendation === 'WAIT' && 'Вход запрещен - ждите лучшего сетапа'}
        </p>
      </div>
    </div>
  );
}
