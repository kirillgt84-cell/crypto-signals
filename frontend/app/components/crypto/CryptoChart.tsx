"use client";

import { cn } from "@/lib/utils";
import { atom, useAtom, useAtomValue } from "jotai";
import { Triangle } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "../../context/LanguageContext";

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
  data: CandleData[];
  showOI?: boolean;
}

type TooltipDataAtomData = {
  tooltipVisible: boolean;
  value: number | null;
  type: string;
};

const tooltipDataAtom = atom<TooltipDataAtomData>({
  tooltipVisible: false,
  value: null,
  type: "undefined",
});

function calculateYAxisDomain(minValue: number, maxValue: number): [number, number] {
  if (minValue > maxValue) {
    [minValue, maxValue] = [maxValue, minValue];
  }
  const range = maxValue - minValue;
  const scale = Math.pow(10, Math.floor(Math.log10(range)));
  const niceMin = Math.floor(minValue / scale) * scale;
  const niceMax = Math.ceil(maxValue / scale) * scale;
  return [niceMin, niceMax];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useLanguage()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-muted border border-border rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">{t("chart.open")}:</span>
            <span className="font-mono text-slate-200">${data.open.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">{t("chart.high")}:</span>
            <span className="font-mono text-slate-200">${data.high.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">{t("chart.low")}:</span>
            <span className="font-mono text-slate-200">${data.low.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">{t("chart.close")}:</span>
            <span className={data.close >= data.open ? "font-mono text-emerald-400" : "font-mono text-red-400"}>
              ${data.close.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
            <span className="text-slate-500">{t("chart.oi")}:</span>
            <span className="font-mono text-blue-400">{(data.oi / 1000).toFixed(1)}K</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const CryptoChart = ({ data, showOI = false }: CryptoChartProps) => {
  const minValue = useMemo(() => Math.min(...data.map((item) => Math.min(item.open, item.close))), [data]);
  const maxValue = useMemo(() => Math.max(...data.map((item) => Math.max(item.open, item.close))), [data]);

  const [gradientLine, setGradientLine] = useState(true);
  const [tooltipData, setTooltipData] = useAtom(tooltipDataAtom);

  const handleMouseEnter = () => setTooltipData({ tooltipVisible: true, value: null, type: "mouse enter" });
  const handleMouseLeave = () => setTooltipData({ tooltipVisible: false, value: null, type: "mouse leave" });

  const handleMouseMove = (state: any) => {
    if (state.activePayload && state.isTooltipActive) {
      setTooltipData((before) => {
        return { tooltipVisible: before.tooltipVisible, value: (state.activePayload[0].value ?? 0) as number, type: "mouse move" };
      });
    }
  };

  const gradientOffset = useMemo(() => {
    return 100 - ((data[0].close - minValue) / (maxValue - minValue)) * 100;
  }, [data, minValue, maxValue]);

  const lastPrice = data[data.length - 1]?.close ?? 0;
  const firstPrice = data[0]?.close ?? 0;

  const chartConfig = {
    up: { color: "#10b981" },
    down: { color: "#ef4444" },
    close: { color: "#3b82f6" },
  };

  return (
    <>
      <div 
        className="aspect-auto h-[400px] w-full"
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
          >
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickCount={5}
              interval={Math.floor(data.length / 5)}
            />
            <YAxis
              axisLine={false}
              allowDataOverflow
              mirror
              tickLine={false}
              scale={"linear"}
              domain={calculateYAxisDomain(minValue, maxValue)}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(value) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: value > 10000 ? 0 : 2 })}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="splitColor" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset={`${gradientOffset}%`} stopColor={gradientLine ? chartConfig.up.color : chartConfig.close.color} />
                <stop offset={`${gradientOffset}%`} stopColor={gradientLine ? chartConfig.down.color : chartConfig.close.color} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#1e293b" />
            <Line
              type="monotone"
              dataKey="close"
              stroke={"url(#splitColor)"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: gradientLine ? undefined : chartConfig.close.color }}
            />
            {showOI && (
              <Line
                type="monotone"
                dataKey="oi"
                yAxisId="oi"
                stroke="#3b82f6"
                strokeWidth={1}
                dot={false}
                strokeDasharray="3 3"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute md:right-4 md:top-4 right-0 top-4 flex flex-col gap-3 items-end md:flex-row-reverse md:gap-4 md:items-center">
        <LastPriceAtomWrapper firstValue={firstPrice} value={lastPrice} />
        <Toggle size="sm" pressed={gradientLine} onPressedChange={(value) => setGradientLine(value)}>
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="50%" stopColor={chartConfig.up.color} />
                <stop offset="50%" stopColor={chartConfig.down.color} />
              </linearGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#hardGradient)" />
          </svg>
        </Toggle>
      </div>
    </>
  );
};

interface LastPriceProps {
  firstValue: number;
  value: number;
}

const LastPriceAtomWrapper = (props: LastPriceProps) => {
  const { firstValue, value } = props;
  const { value: tooltipValue, tooltipVisible } = useAtomValue(tooltipDataAtom);
  return <LastPrice firstValue={firstValue} value={tooltipVisible ? tooltipValue ?? value : value} />;
};

const LastPrice = (props: LastPriceProps) => {
  const { firstValue, value } = props;
  const percentageChange = useMemo(() => {
    return ((value - firstValue) / firstValue) * 100;
  }, [firstValue, value]);

  const isTrendingUp = percentageChange > 0;

  return (
    <span className="font-mono text-sm md:text-lg inline-flex flex-row items-center gap-2 bg-muted/80 px-3 py-1.5 rounded-lg">
      <Triangle
        className={cn("size-3", {
          "fill-emerald-500 stroke-emerald-500": isTrendingUp,
          "fill-red-500 stroke-red-500 rotate-180": !isTrendingUp,
        })}
      />
      <span className={cn({ "text-emerald-500": isTrendingUp, "text-red-500": !isTrendingUp })}>
        {percentageChange.toFixed(2)}%
      </span>
      <span className="text-slate-500">|</span>
      <span className="text-foreground">{value.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
    </span>
  );
};
