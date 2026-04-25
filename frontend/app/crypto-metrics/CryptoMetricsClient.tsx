"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import {
  PieChart,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  History,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/app/context/LanguageContext";
import { API_BASE_URL } from "@/app/lib/api";
import { TradingViewChart } from "@/app/components/TradingViewChart";

interface FlowData {
  btc_to_alt: boolean;
  alt_to_btc: boolean;
  crypto_to_stable: boolean;
  stable_to_btc: boolean;
}

interface SignalData {
  type: string;
  strength: string;
}

interface HistoricalMatch {
  period: string;
  similarity: number;
}

interface MarketState {
  btc_dominance: number;
  alt_dominance: number;
  stable_dominance: number;
  total_market_cap_usd: number;
  btc_market_cap_usd: number;
  stable_market_cap_usd: number;
  alt_market_cap_usd: number;
  phase: string;
  phase_description: string;
  flows: FlowData;
  signal: SignalData;
  interpretation: string;
  historical_match?: HistoricalMatch;
  updated_at: string;
}

const phaseColors: Record<string, string> = {
  BTC_ACCUMULATION: "border-l-amber-500",
  BTC_EXPANSION: "border-l-orange-500",
  ALTSEASON: "border-l-emerald-500",
  DISTRIBUTION: "border-l-rose-500",
  RISK_OFF: "border-l-red-600",
  TRANSITION: "border-l-slate-500",
};

const phaseBgColors: Record<string, string> = {
  BTC_ACCUMULATION: "bg-amber-500/10 text-amber-600",
  BTC_EXPANSION: "bg-orange-500/10 text-orange-600",
  ALTSEASON: "bg-emerald-500/10 text-emerald-600",
  DISTRIBUTION: "bg-rose-500/10 text-rose-600",
  RISK_OFF: "bg-red-600/10 text-red-700",
  TRANSITION: "bg-slate-500/10 text-slate-600",
};

const signalColors: Record<string, string> = {
  BUY_BTC: "bg-orange-500 text-white",
  BUY_ALTS: "bg-emerald-500 text-white",
  MOVE_TO_STABLES: "bg-red-500 text-white",
  HOLD: "bg-slate-500 text-white",
};

const strengthLabels: Record<string, string> = {
  weak: "low",
  medium: "medium",
  strong: "high",
};

export default function CryptoMetricsClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [data, setData] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartExpanded, setChartExpanded] = useState(true);
  const { t } = useLanguage();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/crypto-metrics/market-state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      console.error("Crypto metrics fetch failed", e);
      setError(t("common.loadingError") || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const formatCap = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PieChart className="h-6 w-6 text-indigo-500" />
              {t("cryptoMetrics.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("cryptoMetrics.subtitle")}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : !data ? (
            <div className="text-center py-20 text-muted-foreground">{t("common.noData")}</div>
          ) : (
            <div className="space-y-8">
              {/* Dominance Indicators + Total Cap (compact 4-col row) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open("https://www.tradingview.com/chart/?symbol=CRYPTOCAP:BTC.D", "_blank")}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      {t("cryptoMetrics.btcDominance")}
                      <ExternalLink className="h-3 w-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatPct(data.btc_dominance)}</p>
                    <p className="text-xs text-muted-foreground">{formatCap(data.btc_market_cap_usd)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open("https://www.tradingview.com/chart/?symbol=CRYPTOCAP:TOTAL2", "_blank")}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      {t("cryptoMetrics.altDominance")}
                      <ExternalLink className="h-3 w-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatPct(data.alt_dominance)}</p>
                    <p className="text-xs text-muted-foreground">{formatCap(data.alt_market_cap_usd)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open("https://www.tradingview.com/chart/?symbol=CRYPTOCAP:USDT.D", "_blank")}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      {t("cryptoMetrics.stableDominance")}
                      <ExternalLink className="h-3 w-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatPct(data.stable_dominance)}</p>
                    <p className="text-xs text-muted-foreground">{formatCap(data.stable_market_cap_usd)}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open("https://www.tradingview.com/chart/?symbol=CRYPTOCAP:TOTAL", "_blank")}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      {t("cryptoMetrics.totalMarketCap")}
                      <ExternalLink className="h-3 w-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCap(data.total_market_cap_usd)}</p>
                    <p className="text-xs text-muted-foreground">{formatCap(data.total_market_cap_usd)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Phase */}
              <Card className={cn("border-l-4", phaseColors[data.phase] || "border-l-slate-500")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{t("cryptoMetrics.currentPhase")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("px-3 py-1.5 rounded-md text-sm font-semibold", phaseBgColors[data.phase] || "bg-slate-500/10 text-slate-600")}>
                      {t(`cryptoMetrics.phase.${data.phase}`) || data.phase}
                    </span>
                  </div>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(`cryptoMetrics.phaseDesc.${data.phase}`) || data.phase_description}
                  </p>
                </CardContent>
              </Card>

              {/* Capital Flows */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{t("cryptoMetrics.capitalFlows")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FlowItem
                      label={t("cryptoMetrics.flowBtcToAlt")}
                      active={data.flows.btc_to_alt}
                      icon={<ArrowRight className="h-5 w-5" />}
                    />
                    <FlowItem
                      label={t("cryptoMetrics.flowAltToBtc")}
                      active={data.flows.alt_to_btc}
                      icon={<ArrowLeft className="h-5 w-5" />}
                    />
                    <FlowItem
                      label={t("cryptoMetrics.flowCryptoToStable")}
                      active={data.flows.crypto_to_stable}
                      icon={<ArrowDown className="h-5 w-5" />}
                    />
                    <FlowItem
                      label={t("cryptoMetrics.flowStableToBtc")}
                      active={data.flows.stable_to_btc}
                      icon={<ArrowUp className="h-5 w-5" />}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Signal */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{t("cryptoMetrics.signal")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("px-4 py-2 rounded-md text-base font-bold", signalColors[data.signal.type] || "bg-slate-500 text-white")}>
                      {t(`cryptoMetrics.signalType.${data.signal.type}`) || data.signal.type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("cryptoMetrics.signalStrength")}: <span className="font-medium capitalize">{strengthLabels[data.signal.strength] || data.signal.strength}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Interpretation */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{t("cryptoMetrics.interpretation")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {t(`cryptoMetrics.interpretation.${data.phase}`, {
                      btc_d: formatPct(data.btc_dominance),
                      stable_d: formatPct(data.stable_dominance),
                      alt_d: formatPct(data.alt_dominance),
                    }) || data.interpretation}
                  </p>
                </CardContent>
              </Card>

              {/* Historical Match */}
              {data.historical_match && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base font-medium">{t("cryptoMetrics.historicalAnalog")}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-muted-foreground">{data.historical_match.period}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("cryptoMetrics.similarity")}: {(data.historical_match.similarity * 100).toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Collapsible TradingView Chart */}
              <Card>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setChartExpanded((v) => !v)}
                >
                  <span className="text-base font-medium">{t("cryptoMetrics.chartTitle") || "Chart"}</span>
                  {chartExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
                {chartExpanded && (
                  <CardContent className="p-0 overflow-hidden rounded-xl">
                    <TradingViewChart symbol="BTC" timeframe="D" />
                  </CardContent>
                )}
              </Card>

              {/* Updated */}
              <p className="text-xs text-muted-foreground text-right">
                {t("cryptoMetrics.updated")}: {new Date(data.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FlowItem({ label, active, icon }: { label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors",
        active
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
          : "bg-muted/40 border-border/50 text-muted-foreground"
      )}
    >
      {icon}
      <span className="text-sm font-medium text-center">{label}</span>
      {active ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <Minus className="h-4 w-4 opacity-50" />
      )}
    </div>
  );
}
