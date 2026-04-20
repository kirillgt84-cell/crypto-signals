"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Activity, History, BarChart3, Lightbulb, ShieldCheck, ArrowUpRight, Minus, AlertOctagon, Skull, HelpCircle, Rocket, GitBranch, Shield, Info } from "lucide-react";
import AssetCardTabs from "../components/AssetCardTabs";
import TacticalWheel from "../components/TacticalWheel";
import RiskReturnBubbles from "../components/RiskReturnBubbles";
import HeatmapMatrix from "../components/HeatmapMatrix";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const API_BASE = "https://crypto-signals-production-ff4c.up.railway.app/api/v1";

interface YieldData {
  timestamp: string;
  yields: Record<string, number>;
  source: string;
}

interface SpreadsData {
  timestamp: string;
  spreads: Record<string, number>;
  curve_shape: string;
  is_inverted_10y2y: boolean;
  is_inverted_10y3m: boolean;
}

interface RecessionData {
  probability_12m: number;
  spread: number;
  logit: number;
  confidence: string;
  model: string;
  timestamp: string;
}

interface AnalogMatch {
  period: string;
  similarity: number;
  recession_followed: boolean;
  lead_time_months: number | null;
  sp500_outcome: number | null;
  narrative: string;
}

interface CrossMarketImpact {
  asset: string;
  direction: string;
  magnitude: string;
  returns: {
    "3m": number | null;
    "6m": number | null;
    "12m": number | null;
  };
}

interface InterpretationMetric {
  metric: string;
  status: string;
  headline: string;
  explanation: string;
  historical_context: string;
  color: string;
  icon: string;
}

interface DashboardData {
  timestamp: string;
  yield_curve: {
    yields: Record<string, number>;
    spreads: Record<string, number>;
    shape: string;
    inversion_active: boolean;
  };
  recession: RecessionData;
  market_regime: {
    regime: string;
    bias: string;
    risk_level: string;
    narrative: string;
    impacts: CrossMarketImpact[];
  };
  historical_analogs: {
    matches: AnalogMatch[];
    forecast: {
      recession_probability: number | null;
      confidence: string;
      sp500_avg: number | null;
      sp500_range: number[] | null;
      narrative: string;
    };
  };
  signals: {
    active: { level: string; title: string; message: string }[];
    count: number;
  };
  interpretation?: {
    overall: {
      assessment: string;
      risk_level: string;
      color: string;
    };
    disclaimer: string;
    signals: string[];
    metrics: InterpretationMetric[];
  };
}

export default function YieldCurveClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/yield`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shapeLabel = (shape: string) => {
    switch (shape?.toLowerCase()) {
      case "inverted": return "Инвертированная";
      case "flat": return "Плоская";
      case "normal": return "Нормальная";
      case "humped": return "Горбатая";
      default: return shape;
    }
  };

  const shapeColor = (shape: string) => {
    switch (shape?.toLowerCase()) {
      case "inverted": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "flat": return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "normal": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const regimeColor = (regime: string) => {
    switch (regime) {
      case "risk_on": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      case "risk_off_early": return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "risk_off_late": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "recovery": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const probColor = (p: number) => {
    if (p < 10) return "text-emerald-500";
    if (p < 25) return "text-amber-500";
    if (p < 50) return "text-orange-500";
    return "text-red-500";
  };

  const yieldChartData = data
    ? [
        { tenor: "3M", yield: data.yield_curve.yields["3M"] },
        { tenor: "2Y", yield: data.yield_curve.yields["2Y"] },
        { tenor: "5Y", yield: data.yield_curve.yields["5Y"] },
        { tenor: "7Y", yield: data.yield_curve.yields["7Y"] },
        { tenor: "10Y", yield: data.yield_curve.yields["10Y"] },
        { tenor: "30Y", yield: data.yield_curve.yields["30Y"] },
      ].filter((d) => d.yield !== undefined)
    : [];

  const assetNameMap: Record<string, string> = {
    SP500: "S&P 500",
    NASDAQ: "NASDAQ",
    BTC: "Bitcoin",
    ETH: "Ethereum",
    GOLD: "Gold",
    OIL: "Oil",
    DXY: "US Dollar Index",
  };

  const crossMarketAssets = data?.market_regime.impacts.map((impact) => {
    const impact3m = impact.returns["3m"] ?? 0;
    const impact6m = impact.returns["6m"] ?? 0;
    const avg = (impact3m + impact6m) / 2;
    let status = "neutral";
    let color = "gray";
    if (avg > 5) { status = "positive"; color = "green"; }
    else if (avg > 0) { status = "neutral-positive"; color = "blue"; }
    else if (avg > -5) { status = "neutral-negative"; color = "yellow"; }
    else { status = "negative"; color = "red"; }
    return {
      asset: impact.asset,
      name: assetNameMap[impact.asset] || impact.asset,
      impact_3m: impact3m,
      impact_6m: impact6m,
      risk_level: data.market_regime.risk_level,
      status,
      color,
    };
  }) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-500" />
              Yield Curve Intelligence
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              US Treasury yields, recession models, historical analogs & cross-market regime
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading yield curve data...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              Error: {error}
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">Curve Shape</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className={cn("text-sm font-bold", shapeColor(data.yield_curve.shape))}>
                      {shapeLabel(data.yield_curve.shape)}
                    </Badge>
                    {data.yield_curve.inversion_active && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Inversion active
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">10Y − 2Y Spread</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-2xl font-bold", data.yield_curve.spreads["10Y_2Y"] < 0 ? "text-red-500" : "text-foreground")}>
                      {data.yield_curve.spreads["10Y_2Y"]?.toFixed(2) ?? "—"}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">10Y − 3M Spread</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-2xl font-bold", data.yield_curve.spreads["10Y_3M"] < 0 ? "text-red-500" : "text-foreground")}>
                      {data.yield_curve.spreads["10Y_3M"]?.toFixed(2) ?? "—"}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">Recession Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-2xl font-bold", probColor(data.recession.probability_12m))}>
                      {data.recession.probability_12m?.toFixed(1) ?? "—"}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{data.recession.model}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Overall Interpretation */}
              {data.interpretation && (
                <>
                  <Card className={cn(
                    "border-l-4",
                    data.interpretation.overall.color === "red" && "border-l-red-500",
                    data.interpretation.overall.color === "yellow" && "border-l-amber-500",
                    data.interpretation.overall.color === "green" && "border-l-emerald-500",
                    data.interpretation.overall.color === "blue" && "border-l-blue-500",
                    data.interpretation.overall.color === "gray" && "border-l-gray-500",
                  )}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-full shrink-0",
                          data.interpretation.overall.color === "red" && "bg-red-500/10 text-red-500",
                          data.interpretation.overall.color === "yellow" && "bg-amber-500/10 text-amber-500",
                          data.interpretation.overall.color === "green" && "bg-emerald-500/10 text-emerald-500",
                          data.interpretation.overall.color === "blue" && "bg-blue-500/10 text-blue-500",
                          data.interpretation.overall.color === "gray" && "bg-muted text-muted-foreground",
                        )}>
                          <Lightbulb className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn(
                              data.interpretation.overall.color === "red" && "bg-red-500/10 text-red-500 border-red-500/30",
                              data.interpretation.overall.color === "yellow" && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                              data.interpretation.overall.color === "green" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                              data.interpretation.overall.color === "blue" && "bg-blue-500/10 text-blue-500 border-blue-500/30",
                            )}>
                              {data.interpretation.overall.risk_level}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{data.interpretation.overall.assessment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Disclaimer */}
                  {data.interpretation.disclaimer && (
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-300/80 leading-relaxed">{data.interpretation.disclaimer}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Interpretation Metrics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.interpretation.metrics.map((metric, i) => (
                      <Card key={i} className={cn(
                        "border-l-4",
                        metric.color === "red" && "border-l-red-500",
                        metric.color === "orange" && "border-l-orange-500",
                        metric.color === "yellow" && "border-l-amber-500",
                        metric.color === "green" && "border-l-emerald-500",
                        metric.color === "blue" && "border-l-blue-500",
                        metric.color === "gray" && "border-l-gray-500",
                      )}>
                        <CardContent className="pt-4 pb-4">
                          <p className="font-bold text-sm mb-1">{metric.headline}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{metric.explanation}</p>
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs text-muted-foreground italic">{metric.historical_context}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Yield Curve Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">US Treasury Yield Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  {yieldChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={yieldChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Yield"]} />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="yield"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "#6366f1" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">No yield data available</div>
                  )}
                </CardContent>
              </Card>

              {/* New Cross-Market Visualizations */}
              {crossMarketAssets.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TacticalWheel assets={crossMarketAssets} regime={data?.market_regime.regime?.replace("_", "-") || "transition"} />
                    <AssetCardTabs assets={crossMarketAssets} />
                  </div>
                  <Card>
                    <CardContent className="pt-6 pb-6">
                      <RiskReturnBubbles assets={crossMarketAssets} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 pb-6">
                      <HeatmapMatrix assets={crossMarketAssets} />
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Regime + Cross-Market */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Market Regime
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn(regimeColor(data.market_regime.regime))}>
                        {data.market_regime.regime.replace("_", " ").toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{data.market_regime.bias}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{data.market_regime.narrative}</p>
                    <div className="text-xs text-muted-foreground">
                      Risk Level: <span className="font-bold text-foreground">{data.market_regime.risk_level}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Top Historical Analog
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.historical_analogs.matches.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{data.historical_analogs.matches[0].period}</span>
                          <Badge variant="secondary">{data.historical_analogs.matches[0].similarity.toFixed(0)}% match</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{data.historical_analogs.matches[0].narrative}</p>
                        {data.historical_analogs.forecast.narrative && (
                          <p className="text-xs text-muted-foreground border-t border-dashed border-border pt-2">
                            {data.historical_analogs.forecast.narrative}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No historical analogs found</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Active Signals */}
              {data.signals.active.length > 0 && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Active Signals ({data.signals.count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.signals.active.map((sig, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg border",
                          sig.level === "CRITICAL"
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-amber-500/10 border-amber-500/30"
                        )}
                      >
                        <p className="text-sm font-bold">{sig.title}</p>
                        <p className="text-xs text-muted-foreground">{sig.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Historical Analogs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All Historical Analogs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.historical_analogs.matches.map((match, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="text-2xl font-bold text-muted-foreground w-12">#{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{match.period}</span>
                            <Badge variant="secondary">{match.similarity.toFixed(0)}%</Badge>
                            {match.recession_followed ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                                Recession
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                No Recession
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{match.narrative}</p>
                          {match.lead_time_months && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Lead time: {match.lead_time_months} months
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
