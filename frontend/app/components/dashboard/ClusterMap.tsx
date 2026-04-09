'use client';

import React from 'react';
import { Layers, Flame } from 'lucide-react';

interface Cluster {
  price: number;
  buy: number;
  sell: number;
  total: number;
  delta: number;
}

interface ClusterData {
  timeframe?: string;
  poc: number;
  clusters: Cluster[];
}

export default function ClusterMap({ data }: { data: ClusterData }) {
  const maxVolume = Math.max(...data.clusters.map(c => c.total), 1);
  const currentPrice = data.clusters[Math.floor(data.clusters.length / 2)]?.price || data.poc;
  
  // Get visible clusters around current price
  const visibleClusters = data.clusters
    .sort((a, b) => b.price - a.price)
    .slice(0, 15);

  const getIntensityColor = (volume: number, delta: number) => {
    const intensity = volume / maxVolume;
    const isBuyDominant = delta > 0;
    
    if (intensity > 0.7) {
      return isBuyDominant 
        ? 'bg-gradient-to-r from-green-600 to-green-400 shadow-lg shadow-green-500/30'
        : 'bg-gradient-to-r from-red-600 to-red-400 shadow-lg shadow-red-500/30';
    } else if (intensity > 0.4) {
      return isBuyDominant 
        ? 'bg-gradient-to-r from-green-700 to-green-500'
        : 'bg-gradient-to-r from-red-700 to-red-500';
    } else {
      return isBuyDominant 
        ? 'bg-green-800/50'
        : 'bg-red-800/50';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20">
            <Layers className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Volume Profile</h3>
            <p className="text-xs text-gray-500">Cluster Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Flame className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">POC: ${data.poc.toLocaleString()}</span>
        </div>
      </div>

      {/* Price Scale Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-2">
        <span>Price Level</span>
        <span>Volume</span>
      </div>

      {/* Cluster Bars */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {visibleClusters.map((cluster, idx) => {
          const isPOC = cluster.price === data.poc;
          const isCurrentPrice = Math.abs(cluster.price - currentPrice) < 100;
          const buyPct = (cluster.buy / cluster.total) * 100;
          const sellPct = (cluster.sell / cluster.total) * 100;
          const volumePct = (cluster.total / maxVolume) * 100;
          
          return (
            <div 
              key={cluster.price}
              className={`relative group ${isPOC ? 'scale-105' : ''} transition-transform`}
            >
              <div className={`
                flex items-center gap-3 p-2 rounded-lg
                ${isPOC ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-white/5'}
                ${isCurrentPrice ? 'border-l-2 border-l-blue-400' : ''}
              `}>
                {/* Price */}
                <div className="w-20 text-right">
                  <span className={`
                    font-mono text-sm font-medium
                    ${isPOC ? 'text-yellow-400' : isCurrentPrice ? 'text-blue-400' : 'text-gray-400'}
                  `}>
                    ${cluster.price.toLocaleString()}
                  </span>
                  {isPOC && (
                    <span className="ml-1 text-xs text-yellow-500">★</span>
                  )}
                </div>

                {/* Volume Bar */}
                <div className="flex-1 h-8 bg-gray-800/50 rounded-lg overflow-hidden relative">
                  {/* Background intensity */}
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-lg opacity-80 transition-all ${
                      getIntensityColor(cluster.total, cluster.delta)
                    }`}
                    style={{ width: `${volumePct}%` }}
                  />
                  
                  {/* Buy/Sell split */}
                  <div className="absolute inset-0 flex">
                    <div 
                      className="h-full bg-green-500/60"
                      style={{ width: `${buyPct}%` }}
                    />
                    <div 
                      className="h-full bg-red-500/60"
                      style={{ width: `${sellPct}%` }}
                    />
                  </div>

                  {/* Volume text */}
                  <div className="absolute inset-0 flex items-center justify-end px-2">
                    <span className="text-xs font-mono text-white drop-shadow-lg">
                      {(cluster.total / 1000).toFixed(1)}K
                    </span>
                  </div>
                </div>

                {/* Delta */}
                <div className={`
                  w-16 text-right font-mono text-xs
                  ${cluster.delta > 0 ? 'text-green-400' : 'text-red-400'}
                `}>
                  {cluster.delta > 0 ? '+' : ''}{(cluster.delta / 1000).toFixed(1)}K
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-green-600 to-green-400" />
            <span className="text-gray-400">Buy Dominant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-red-600 to-red-400" />
            <span className="text-gray-400">Sell Dominant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500/50" />
            <span className="text-gray-400">POC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
