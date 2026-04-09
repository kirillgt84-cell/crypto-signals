'use client';

import React from 'react';
import { Layers } from 'lucide-react';

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
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-5 h-5 text-yellow-500" />
          Volume Clusters
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400 uppercase">
            {data.timeframe || '1h'}
          </span>
        </h3>
        <div className="bg-gray-800 px-3 py-1 rounded-full text-sm">
          POC: <span className="font-mono font-bold text-yellow-400">${data.poc.toLocaleString()}</span>
        </div>
      </div>

      {/* POC Indicator */}
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
        <p className="text-yellow-400 text-xs uppercase">Point of Control</p>
        <p className="text-lg font-bold">${data.poc.toLocaleString()}</p>
        <p className="text-gray-400 text-xs mt-1">Highest volume concentration</p>
      </div>

      {/* Cluster Bars */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {data.clusters.slice().reverse().map((cluster, idx) => {
          const buyPct = (cluster.buy / cluster.total) * 100;
          const sellPct = (cluster.sell / cluster.total) * 100;
          const volumePct = (cluster.total / maxVolume) * 100;
          const isCurrentPrice = idx === Math.floor(data.clusters.length / 2);
          
          return (
            <div 
              key={cluster.price} 
              className={`relative ${isCurrentPrice ? 'bg-blue-900/30 rounded' : ''}`}
            >
              {/* Цена */}
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-mono ${isCurrentPrice ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                  ${cluster.price.toLocaleString()}
                  {isCurrentPrice && ' ←'}
                </span>
                <span className="text-gray-500">
                  {(cluster.total / 1000).toFixed(1)}K
                </span>
              </div>
              
              {/* Бар объема */}
              <div className="h-6 bg-gray-800 rounded-full overflow-hidden flex relative">
                {/* Фоновая интенсивность */}
                <div 
                  className="absolute inset-0 bg-gray-700/30"
                  style={{ width: `${volumePct}%` }}
                />
                
                {/* Buy часть */}
                <div 
                  className="h-full bg-green-500/80 transition-all"
                  style={{ width: `${buyPct}%` }}
                />
                
                {/* Sell часть */}
                <div 
                  className="h-full bg-red-500/80 transition-all"
                  style={{ width: `${sellPct}%` }}
                />
              </div>
              
              {/* Delta индикатор */}
              <div className="flex justify-end mt-1">
                <span className={`text-xs font-mono ${
                  cluster.delta > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {cluster.delta > 0 ? '+' : ''}{(cluster.delta / 1000).toFixed(1)}K
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-400">Buy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-gray-400">Sell</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-gray-400">POC</span>
        </div>
      </div>
    </div>
  );
}
