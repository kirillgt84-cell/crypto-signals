'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceLine,
  Cell,
} from 'recharts';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
}

interface CryptoChartProps {
  symbol: string;
  timeframe: string;
}

export default function CryptoChart({ symbol, timeframe }: CryptoChartProps) {
  const [data, setData] = useState<CandleData[]>([]);
  const [hoverData, setHoverData] = useState<CandleData | null>(null);

  useEffect(() => {
    // Generate mock candle data
    const generateData = () => {
      const candles: CandleData[] = [];
      let price = 67000;
      let oi = 15000;
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        
        const volatility = 0.002;
        const change = (Math.random() - 0.5) * 2 * volatility * price;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5;
        const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5;
        const volume = Math.random() * 1000 + 500;
        
        oi = oi + (Math.random() - 0.5) * 100;
        
        candles.push({
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
          open,
          high,
          low,
          close,
          volume,
          oi,
        });
        
        price = close;
      }
      
      return candles;
    };
    
    setData(generateData());
  }, [symbol, timeframe]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-muted border border-border rounded-lg p-3 shadow-xl">
          <p className="text-slate-400 text-xs mb-2">{d.time}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Open:</span>
              <span className="font-mono text-slate-200">${d.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">High:</span>
              <span className="font-mono text-slate-200">${d.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Low:</span>
              <span className="font-mono text-slate-200">${d.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Close:</span>
              <span className={d.close >= d.open ? "font-mono text-emerald-400" : "font-mono text-red-400"}>
                ${d.close.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
              <span className="text-slate-500">OI:</span>
              <span className="font-mono text-blue-400">{(d.oi / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate wick coordinates for custom candle rendering
  const renderCandle = (props: any) => {
    const { x, y, width, height, payload } = props;
    const isGreen = payload.close >= payload.open;
    const color = isGreen ? '#10b981' : '#ef4444';
    
    // Scale calculations
    const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low));
    const chartHeight = 300;
    
    const getY = (price: number) => {
      const maxPrice = Math.max(...data.map(d => d.high));
      return chartHeight - ((maxPrice - price) / priceRange) * chartHeight;
    };
    
    const yHigh = getY(payload.high);
    const yLow = getY(payload.low);
    const yOpen = getY(payload.open);
    const yClose = getY(payload.close);
    
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.abs(yClose - yOpen) || 1;
    
    return (
      <g>
        {/* Wick */}
        <line
          x1={x + width / 2}
          y1={yHigh}
          x2={x + width / 2}
          y2={yLow}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x + width * 0.2}
          y={bodyTop}
          width={width * 0.6}
          height={Math.max(bodyHeight, 2)}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  if (!data.length) return null;

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            minTickGap={30}
          />
          
          <YAxis 
            yAxisId="price"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `$${val.toLocaleString()}`}
          />
          
          <YAxis 
            yAxisId="oi"
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#3b82f6', fontSize: 10 }}
            domain={['auto', 'auto']}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* OI Line */}
          <Line
            yAxisId="oi"
            type="monotone"
            dataKey="oi"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            strokeOpacity={0.6}
          />
          
          {/* Volume bars */}
          <Bar
            dataKey="volume"
            yAxisId="price"
            fill="url(#volumeGradient)"
            opacity={0.3}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.close >= entry.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 
              />
            ))}
          </Bar>
          
          {/* Current price line */}
          <ReferenceLine 
            y={data[data.length - 1]?.close} 
            yAxisId="price"
            stroke="#fbbf24" 
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Custom Candle Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <YAxis 
              yAxisId="price"
              orientation="right"
              domain={['auto', 'auto']}
              hide
            />
            <Bar 
              dataKey="high" 
              yAxisId="price" 
              shape={renderCandle}
              barSize={12}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
