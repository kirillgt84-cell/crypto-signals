'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MarketDepthProps {
  data: {
    clusters?: Array<{
      price: number;
      buy: number;
      sell: number;
      total: number;
    }>;
    poc?: number;
  };
}

export default function MarketDepth({ data }: MarketDepthProps) {
  if (!data?.clusters?.length) return null;

  const chartData = data.clusters
    .slice(-20)
    .map((cluster) => ({
      price: `$${cluster.price.toLocaleString()}`,
      bid: cluster.buy,
      ask: cluster.sell,
      isPOC: cluster.price === data.poc,
    }))
    .reverse();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-muted border border-border rounded p-2 shadow-lg">
          <p className="text-slate-200 text-xs font-mono mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {(entry.value / 1000).toFixed(1)}K
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          barGap={0}
        >
          <XAxis 
            type="number" 
            hide
            domain={[0, 'auto']}
          />
          <YAxis 
            dataKey="price" 
            type="category" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="bid" 
            name="Bid" 
            stackId="a" 
            fill="#10b981"
            radius={[0, 2, 2, 0]}
            barSize={16}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`bid-${index}`} 
                fill={entry.isPOC ? '#fbbf24' : '#10b981'}
                fillOpacity={entry.isPOC ? 0.8 : 0.6}
              />
            ))}
          </Bar>
          
          <Bar 
            dataKey="ask" 
            name="Ask" 
            stackId="a" 
            fill="#ef4444"
            radius={[2, 0, 0, 2]}
            barSize={16}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`ask-${index}`} 
                fill={entry.isPOC ? '#fbbf24' : '#ef4444'}
                fillOpacity={entry.isPOC ? 0.8 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/60" />
          <span className="text-slate-400">Bid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/60" />
          <span className="text-slate-400">Ask</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-400/80" />
          <span className="text-slate-400">POC</span>
        </div>
      </div>
    </div>
  );
}
