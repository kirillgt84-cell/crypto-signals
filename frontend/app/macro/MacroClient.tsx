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
import { TrendingUp, TrendingDown, Activity, Network, Gem, AlertTriangle } from "lucide-react";
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
  vix_btc_correlation: number;
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
  const [m2Data, setM2Data] = useState<any>(null);
  const [m2Assets, setM2Assets] = useState<Set<string>>(new Set(["btc"]));
  const { t, language } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : language;

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, corrRes, spxRes, goldRes, m2Res] = await Promise.all([
        fetch(`${API_BASE_URL}/macro/latest`),
        fetch(`${API_BASE_URL}/macro/correlations?limit=60&interval=monthly`),
        fetch(`${API_BASE_URL}/macro/prices/spx500?limit=60&interval=monthly`),
        fetch(`${API_BASE_URL}/macro/prices/gold?limit=60&interval=monthly`),
        fetch(`${API_BASE_URL}/macro/m2-comparison?assets=btc&days=1825`),
      ]);
      if (latestRes.ok) setLatest(await latestRes.json());
      if (corrRes.ok) setCorrelations(await corrRes.json());
      if (spxRes.ok) setSpxPrices(await spxRes.json());
      if (goldRes.ok) setGoldPrices(await goldRes.json());
      if (m2Res.ok) setM2Data(await m2Res.json());
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
    const sorted = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const base = sorted[0]?.close_price || 1;
    return sorted.map((d) => ({
      date: d.time,
      value: ((d.close_price / base) * 100) - 100,
    }));
  };

  const spxNorm = normalize(spxPrices);
  const goldNorm = normalize(goldPrices);

  // Merge for overlay chart by date (SPX and Gold may have different trading days)
  const goldMap = new Map(goldNorm.map((d) => [d.date, d.value]));
  const mergedChart = spxNorm.map((s) => ({
    date: s.date,
    spx: s.value,
    gold: goldMap.get(s.date) ?? null,
  }));

  const sortedCorrelations = [...correlations].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const corrChart = sortedCorrelations.map((c) => ({
    date: c.date,
    "BTC ↔ SPX": c.btc_spx_correlation != null ? Number(c.btc_spx_correlation) : null,
    [t("macro.goldBtcLabel")]: c.gold_btc_correlation != null ? Number(c.gold_btc_correlation) : null,
    "VIX ↔ BTC": c.vix_btc_correlation != null ? Number(c.vix_btc_correlation) : null,
    VIX: c.vix_level != null ? Number(c.vix_level) : null,
  }));

  const corrColor = (val: number | null | undefined) => {
    if (val == null) return "text-slate-500";
    const v = Math.abs(val);
    if (v > 0.7) return "text-red-500";
    if (v > 0.4) return "text-amber-500";
    return "text-emerald-500";
  };

  const vixBtcCorrColor = (val: number | null | undefined) => {
    if (val == null) return "text-slate-500";
    if (val < -0.5) return "text-emerald-500";
    if (val < -0.2) return "text-blue-500";
    if (val <= 0.2) return "text-amber-500";
    return "text-rose-500";
  };

  const vixBtcCorrText = (val: number | null | undefined) => {
    if (val == null) return t("macro.vixBtcNeutral");
    if (val < -0.5) return t("macro.vixBtcStrongNegative");
    if (val < -0.2) return t("macro.vixBtcModerateNegative");
    if (val <= 0.2) return t("macro.vixBtcNeutral");
    return t("macro.vixBtcPositive");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Network className="h-6 w-6 text-indigo-500" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.vixBtcCorrelation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold", vixBtcCorrColor(corr?.vix_btc_correlation))}>
                      {corr?.vix_btc_correlation != null ? corr.vix_btc_correlation.toFixed(2) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vixBtcCorrText(corr?.vix_btc_correlation)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* M2 Global Liquidity Comparison — Normalized Index (base = 100) */}
              {m2Data && m2Data.dates.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{t("macro.m2ComparisonTitle")}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("macro.m2ComparisonSubtitle")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t("macro.m2NormalizedHint") || "Index = 100 at start of period. Tooltip shows real values."}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "btc", label: t("macro.assetBTC"), color: "#f59e0b" },
                        ].map((asset) => {
                          const active = m2Assets.has(asset.key);
                          return (
                            <button
                              key={asset.key}
                              onClick={() => {
                                const next = new Set(m2Assets);
                                if (next.has(asset.key)) next.delete(asset.key);
                                else next.add(asset.key);
                                setM2Assets(next);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                active
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted border-transparent text-muted-foreground opacity-60 hover:opacity-100"
                              )}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: asset.color }}
                              />
                              {asset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[450px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart
                          data={(() => {
                            const normalize = (arr: (number | null)[] | undefined) => {
                              if (!Array.isArray(arr)) return [];
                              const first = arr.find((v) => v != null);
                              if (first == null) return arr;
                              return arr.map((v) => (v != null ? (v / first) * 100 : null));
                            };
                            const m2Norm = normalize(m2Data.series.m2);
                            const btcNorm = m2Assets.has("btc") ? normalize(m2Data.series.btc) : null;
                            const spxNormM2 = m2Assets.has("spx") ? normalize(m2Data.series.spx) : null;
                            const goldNormM2 = m2Assets.has("gold") ? normalize(m2Data.series.gold) : null;
                            const vixNormM2 = m2Assets.has("vix") ? normalize(m2Data.series.vix) : null;
                            return m2Data.dates.map((d: string, i: number) => ({
                              date: d,
                              m2: m2Norm[i],
                              btc: btcNorm?.[i] ?? null,
                              spx: spxNormM2?.[i] ?? null,
                              gold: goldNormM2?.[i] ?? null,
                              vix: vixNormM2?.[i] ?? null,
                              m2_orig: m2Data.series.m2[i],
                              btc_orig: m2Data.series.btc?.[i] ?? null,
                              spx_orig: m2Data.series.spx?.[i] ?? null,
                              gold_orig: m2Data.series.gold?.[i] ?? null,
                              vix_orig: m2Data.series.vix?.[i] ?? null,
                            }));
                          })()}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: "#64748b" }}
                            tickFormatter={(val: string) => {
                              const d = new Date(val);
                              return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
                            }}
                            interval="preserveStartEnd"
                            minTickGap={30}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#64748b" }}
                            tickFormatter={(v: number) => `${v.toFixed(0)}`}
                            width={45}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(value: any, name: string, props: any) => {
                              if (value == null) return ["—", name];
                              const origMap: Record<string, string> = {
                                M2: "m2_orig",
                                [t("macro.assetBTC")]: "btc_orig",
                                [t("macro.assetSPX")]: "spx_orig",
                                [t("macro.assetGold")]: "gold_orig",
                                [t("macro.assetVIX")]: "vix_orig",
                              };
                              const origKey = origMap[name];
                              const orig = origKey ? props?.payload?.[origKey] : null;
                              if (orig == null) return ["—", name];
                              if (name === "M2") return [`$${(orig / 1000).toFixed(2)}T`, name];
                              if (name === t("macro.assetVIX")) return [orig.toFixed(1), name];
                              return [`$${orig.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name];
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                            iconType="circle"
                            iconSize={6}
                          />
                          <Line
                            type="monotone"
                            dataKey="m2"
                            name="M2"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                          {m2Assets.has("btc") && (
                            <Line
                              type="monotone"
                              dataKey="btc"
                              name={t("macro.assetBTC")}
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                              connectNulls
                            />
                          )}

                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price Overlay Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("macro.normalizedPrice")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {mergedChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
                      <LineChart data={mergedChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val: string) => new Date(val).toLocaleDateString(locale, { month: 'short', year: 'numeric' })} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("macro.vixBtcMeaning")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("macro.vixBtcDescription")}
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
                    <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
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
                          <linearGradient id="gradVixBtc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} tickFormatter={(val: string) => new Date(val).toLocaleDateString(locale, { month: 'short', year: 'numeric' })} />
                        <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="BTC ↔ SPX" stroke="#6366f1" fill="url(#gradBtcSpx)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey={t("macro.goldBtcLabel")} stroke="#f59e0b" fill="url(#gradGoldBtc)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="VIX ↔ BTC" stroke="#f43f5e" fill="url(#gradVixBtc)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">{t("macro.noCorrelationData")}</div>
                  )}
                </CardContent>
              </Card>

              {/* Correlation History Interpretation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t("macro.correlationHistoryInterpretationTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("macro.correlationHistoryInterpretation")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
