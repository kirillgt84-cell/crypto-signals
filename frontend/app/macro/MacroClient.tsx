"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, Globe, Gem, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/app/context/LanguageContext";

import { API_BASE_URL } from "@/app/lib/api"

interface MacroPrice {
  time: string;
  close_price: number;
}

interface CorrelationData {
  date: string;
  btc_spx_correlation: number;
  gold_btc_correlation: number;
  vix_level: number;
  btc_price: number;
  spx_price: number;
  gold_price: number;
}

export default function MacroClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [latest, setLatest] = useState<any>(null);
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [spxPrices, setSpxPrices] = useState<MacroPrice[]>([]);
  const [goldPrices, setGoldPrices] = useState<MacroPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : language;

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, corrRes, spxRes, goldRes] = await Promise.all([
        fetch(`${API_BASE_URL}/macro/latest`),
        fetch(`${API_BASE_URL}/macro/correlations?limit=365`),
        fetch(`${API_BASE_URL}/macro/prices/spx500?limit=365`),
        fetch(`${API_BASE_URL}/macro/prices/gold?limit=365`),
      ]);
      if (latestRes.ok) setLatest(await latestRes.json());
      if (corrRes.ok) setCorrelations(await corrRes.json());
      if (spxRes.ok) setSpxPrices(await spxRes.json());
      if (goldRes.ok) setGoldPrices(await goldRes.json());
    } catch (e) {
      console.error("Macro fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const corr = latest?.correlation;
  const prices = latest?.prices || {};

  // Normalize for overlay chart (scale to % change from start)
  const normalize = (data: MacroPrice[]) => {
    if (!data.length) return [];
    const base = data[data.length - 1]?.close_price || 1;
    return data
      .map((d) => ({
        date: d.time,
        value: ((d.close_price / base) * 100) - 100,
      }))
      .reverse();
  };

  const spxNorm = normalize(spxPrices);
  const goldNorm = normalize(goldPrices);

  // Merge for overlay chart
  const mergedChart = spxNorm.map((s, i) => ({
    date: s.date,
    spx: s.value,
    gold: goldNorm[i]?.value ?? null,
  }));

  const corrChart = correlations
    .slice()
    .reverse()
    .map((c) => ({
      date: c.date,
      "BTC ↔ SPX": c.btc_spx_correlation != null ? Number(c.btc_spx_correlation).toFixed(2) : null,
      [t("macro.goldBtcLabel")]: c.gold_btc_correlation != null ? Number(c.gold_btc_correlation).toFixed(2) : null,
      VIX: c.vix_level != null ? Number(c.vix_level).toFixed(1) : null,
    }));

  const corrColor = (val: number | null | undefined) => {
    if (val == null) return "text-slate-500";
    const v = Math.abs(val);
    if (v > 0.7) return "text-red-500";
    if (v > 0.4) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-6 w-6 text-indigo-500" />
              {t("macro.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("macro.subtitle")}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <div className="space-y-8">
              {/* Price Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("macro.sp500")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{prices.spx500?.price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("macro.usEquitiesBenchmark")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      <Gem className="h-3 w-3" /> {t("macro.gold")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{prices.gold?.price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("macro.safeHavenCommodity")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {t("macro.vix")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{prices.vix?.price?.toFixed(1) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("macro.volatilityIndex")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("macro.btc")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{corr?.btc_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("macro.cryptoBenchmark")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Correlation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.btcSpxCorrelation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold", corrColor(corr?.btc_spx_correlation))}>
                      {corr?.btc_spx_correlation != null ? corr.btc_spx_correlation.toFixed(2) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.abs(corr?.btc_spx_correlation || 0) > 0.7
                        ? t("macro.highCorrelation")
                        : Math.abs(corr?.btc_spx_correlation || 0) > 0.4
                        ? t("macro.moderateCorrelation")
                        : t("macro.lowCorrelation")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.goldBtcCorrelation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold", corrColor(corr?.gold_btc_correlation))}>
                      {corr?.gold_btc_correlation != null ? corr.gold_btc_correlation.toFixed(2) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(corr?.gold_btc_correlation || 0) < -0.3
                        ? t("macro.negativeCorrelation")
                        : (corr?.gold_btc_correlation || 0) > 0.4
                        ? t("macro.positiveCorrelation")
                        : t("macro.neutralCorrelation")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.vixLevel")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold", (corr?.vix_level || 0) > 25 ? "text-red-500" : "text-emerald-500")}>
                      {corr?.vix_level != null ? corr.vix_level.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(corr?.vix_level || 0) > 25
                        ? t("macro.elevatedFear")
                        : (corr?.vix_level || 0) > 18
                        ? t("macro.normalVolatility")
                        : t("macro.lowFear")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Price Overlay Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("macro.normalizedPrice")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {mergedChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={mergedChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val: string) => new Date(val).toLocaleDateString(locale, { month: 'short', year: '2-digit' })} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                        <Tooltip formatter={(value: number, name: string) => [`${value?.toFixed(1)}%`, name]} />
                        <Legend />
                        <Line type="monotone" dataKey="spx" name={t("macro.sp500")} stroke="#6366f1" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="gold" name={t("macro.gold")} stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">{t("macro.noPriceData")}</div>
                  )}
                </CardContent>
              </Card>

              {/* Metric Interpretations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.btcSpxMeaning")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("macro.btcSpxDescription")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.goldBtcMeaning")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("macro.goldBtcDescription")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.vixMeaning")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("macro.vixDescription")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Correlation History Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("macro.correlationHistory")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {corrChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={corrChart}>
                        <defs>
                          <linearGradient id="gradBtcSpx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradGoldBtc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} tickFormatter={(val: string) => new Date(val).toLocaleDateString(locale, { month: 'short', year: '2-digit' })} />
                        <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="BTC ↔ SPX" stroke="#6366f1" fill="url(#gradBtcSpx)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey={t("macro.goldBtcLabel")} stroke="#f59e0b" fill="url(#gradGoldBtc)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">{t("macro.noCorrelationData")}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
