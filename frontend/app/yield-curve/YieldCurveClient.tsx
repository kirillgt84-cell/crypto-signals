"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/app/context/LanguageContext";
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

import { API_BASE_URL } from "@/app/lib/api"

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
  narrative_key: string;
  narrative_params: Record<string, string>;
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
  key: string;
  params: Record<string, string>;
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
    narrative_key: string;
    narrative_params: Record<string, string>;
    impacts: CrossMarketImpact[];
  };
  historical_analogs: {
    matches: AnalogMatch[];
    forecast: {
      recession_probability: number | null;
      confidence: string;
      sp500_avg: number | null;
      sp500_range: number[] | null;
      narrative_key: string;
      narrative_params: Record<string, string>;
    };
  };
  signals: {
    active: { level: string; title_key: string; message_key: string; params: Record<string, string> }[];
    count: number;
  };
  interpretation?: {
    overall: {
      key: string;
      params: Record<string, string>;
      risk_level: string;
      color: string;
    };
    disclaimer_key: string;
    signals: { level: string; key: string; params: Record<string, string> }[];
    metrics: InterpretationMetric[];
  };
}

export default function YieldCurveClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const { t } = useLanguage();

  const translate = (key: string, params: Record<string, string> = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    });
    return text;
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/yield`, { cache: "no-store" });
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
      case "inverted": return t("yieldCurve.inverted");
      case "flat": return t("yieldCurve.flat");
      case "normal": return t("yieldCurve.normal");
      case "humped": return t("yieldCurve.humped");
      default: return shape;
    }
  };

  const regimeLabel = (regime: string) => {
    switch (regime) {
      case "risk_on": return t("yieldCurve.riskOn");
      case "risk_off_early": return t("yieldCurve.riskOffEarly");
      case "risk_off_late": return t("yieldCurve.riskOffLate");
      case "recovery": return t("yieldCurve.recovery");
      case "transition": return t("yieldCurve.transition");
      default: return regime.replace(/_/g, " ").toUpperCase();
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
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-500" />
              {t("yieldCurve.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("yieldCurve.subtitle")}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("common.loading")}
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
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("yieldCurve.curveShape")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className={cn("text-sm font-bold", shapeColor(data.yield_curve.shape))}>
                      {shapeLabel(data.yield_curve.shape)}
                    </Badge>
                    {data.yield_curve.inversion_active && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {t("yieldCurve.inversionActive")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("yieldCurve.spread10Y2Y")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-2xl font-bold", data.yield_curve.spreads["10Y_2Y"] < 0 ? "text-red-500" : "text-foreground")}>
                      {data.yield_curve.spreads["10Y_2Y"]?.toFixed(2) ?? "—"}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("yieldCurve.spread10Y3M")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-2xl font-bold", data.yield_curve.spreads["10Y_3M"] < 0 ? "text-red-500" : "text-foreground")}>
                      {data.yield_curve.spreads["10Y_3M"]?.toFixed(2) ?? "—"}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("yieldCurve.recessionProbability")}</CardTitle>
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
                          <p className="text-sm font-medium leading-relaxed">{translate(data.interpretation.overall.key, data.interpretation.overall.params)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Disclaimer */}
                  {data.interpretation.disclaimer_key && (
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-300/80 leading-relaxed">{translate(data.interpretation.disclaimer_key)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Interpretation Metrics — Card Index */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: list of headlines */}
                    <div className="space-y-1">
                      {data.interpretation.metrics.map((metric, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveMetricIndex(i)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5",
                            i === activeMetricIndex
                              ? "bg-white/10 text-white border border-white/20 shadow-sm"
                              : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                          )}
                        >
                          <span className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            metric.color === "green" && "bg-emerald-500",
                            metric.color === "red" && "bg-red-500",
                            metric.color === "yellow" && "bg-amber-500",
                            metric.color === "orange" && "bg-orange-500",
                            metric.color === "blue" && "bg-blue-500",
                            metric.color === "gray" && "bg-gray-500",
                          )} />
                          <span className="truncate">{translate(metric.key + ".headline", metric.params)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Right: full active metric */}
                    <div className="lg:col-span-2">
                      {(() => {
                        const metric = data.interpretation.metrics[activeMetricIndex];
                        if (!metric) return null;
                        const metricIconMap: Record<string, React.ReactNode> = {
                          "trending-up": <TrendingUp className="w-5 h-5" />,
                          "trending-down": <TrendingDown className="w-5 h-5" />,
                          "alert-triangle": <AlertTriangle className="w-5 h-5" />,
                          "activity": <Activity className="w-5 h-5" />,
                          "arrow-up-right": <ArrowUpRight className="w-5 h-5" />,
                          "minus": <Minus className="w-5 h-5" />,
                          "shield-check": <ShieldCheck className="w-5 h-5" />,
                          "alert-octagon": <AlertOctagon className="w-5 h-5" />,
                          "skull": <Skull className="w-5 h-5" />,
                          "help-circle": <HelpCircle className="w-5 h-5" />,
                          "rocket": <Rocket className="w-5 h-5" />,
                          "git-branch": <GitBranch className="w-5 h-5" />,
                          "shield": <Shield className="w-5 h-5" />,
                          "history": <History className="w-5 h-5" />,
                          "lightbulb": <Lightbulb className="w-5 h-5" />,
                        };
                        return (
                          <Card className={cn(
                            "border-l-4 h-full",
                            metric.color === "red" && "border-l-red-500",
                            metric.color === "orange" && "border-l-orange-500",
                            metric.color === "yellow" && "border-l-amber-500",
                            metric.color === "green" && "border-l-emerald-500",
                            metric.color === "blue" && "border-l-blue-500",
                            metric.color === "gray" && "border-l-gray-500",
                          )}>
                            <CardContent className="pt-6 pb-6">
                              <div className="flex items-center gap-2 mb-4">
                                <span className={cn(
                                  "p-2 rounded-lg",
                                  metric.color === "green" && "bg-emerald-500/10 text-emerald-500",
                                  metric.color === "red" && "bg-red-500/10 text-red-500",
                                  metric.color === "yellow" && "bg-amber-500/10 text-amber-500",
                                  metric.color === "orange" && "bg-orange-500/10 text-orange-500",
                                  metric.color === "blue" && "bg-blue-500/10 text-blue-500",
                                  metric.color === "gray" && "bg-muted text-muted-foreground",
                                )}>
                                  {metricIconMap[metric.icon] || <Activity className="w-5 h-5" />}
                                </span>
                                <p className="font-bold text-base">{translate(metric.key + ".headline", metric.params)}</p>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{translate(metric.key + ".explanation", metric.params)}</p>
                              <div className="bg-muted/50 rounded-lg p-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("yieldCurve.historicalContext")}</p>
                                <p className="text-sm text-muted-foreground italic leading-relaxed">{translate(metric.key + ".historicalContext", metric.params)}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              {/* Yield Curve Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("yieldCurve.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {yieldChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                      <LineChart data={yieldChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, t("yieldCurve.yield")]} />
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
                    <div className="text-center py-12 text-muted-foreground">{t("yieldCurve.noData")}</div>
                  )}
                </CardContent>
              </Card>

              {/* New Cross-Market Visualizations */}
              {crossMarketAssets.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2">
                      <TacticalWheel assets={crossMarketAssets} regime={data?.market_regime.regime?.replace("_", "-") || "transition"} />
                    </div>
                    <div className="lg:col-span-3">
                      <AssetCardTabs assets={crossMarketAssets} />
                    </div>
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
                      {t("yieldCurve.marketRegime")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn(regimeColor(data.market_regime.regime))}>
                        {regimeLabel(data.market_regime.regime)}
                      </Badge>
                      <span className="text-sm font-medium">{data.market_regime.bias}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{translate(data.market_regime.narrative_key, data.market_regime.narrative_params)}</p>
                    <div className="text-xs text-muted-foreground">
                      {t("yieldCurve.assessment")}: <span className="font-bold text-foreground">{data.market_regime.risk_level}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      {t("yieldCurve.historicalAnalogs")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.historical_analogs.matches.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{data.historical_analogs.matches[0].period}</span>
                          <Badge variant="secondary">{data.historical_analogs.matches[0].similarity.toFixed(0)}% {t("yieldCurve.match")}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{translate(data.historical_analogs.matches[0].narrative_key, data.historical_analogs.matches[0].narrative_params)}</p>
                        {data.historical_analogs.forecast.narrative_key && (
                          <p className="text-xs text-muted-foreground border-t border-dashed border-border pt-2">
                            {translate(data.historical_analogs.forecast.narrative_key, data.historical_analogs.forecast.narrative_params)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("yieldCurve.noAnalogs")}</p>
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
                      {t("yieldCurve.activeSignals")} ({data.signals.count})
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
                        <p className="text-sm font-bold">{translate(sig.title_key, sig.params)}</p>
                        <p className="text-xs text-muted-foreground">{translate(sig.message_key, sig.params)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Historical Analogs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("yieldCurve.historicalAnalogs")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.historical_analogs.matches.map((match, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="text-2xl font-bold text-muted-foreground w-12">#{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{match.period}</span>
                            <Badge variant="secondary">{match.similarity.toFixed(0)}% {t("yieldCurve.match")}</Badge>
                            {match.recession_followed ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                                {t("yieldCurve.recession")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                {t("yieldCurve.noRecession")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{translate(match.narrative_key, match.narrative_params)}</p>
                          {match.lead_time_months && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("yieldCurve.leadTime").replace("{{months}}", String(match.lead_time_months))}
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
