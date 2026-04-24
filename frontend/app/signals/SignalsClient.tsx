"use client";

import { useEffect, useState, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ProBlurOverlay } from "../components/ProBlurOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanEye, RefreshCw, ArrowUpRight, ArrowDownRight, Filter, Play, Activity, Settings2, Mail, MessageCircle } from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AnomalySignal {
  id: number;
  symbol: string;
  base_asset: string;
  category: string;
  direction: string;
  score: number;
  volume_ratio: number;
  oi_change_pct: number;
  price_change_24h_pct: number;
  price: number;
  quote_volume_24h: number;
  confidence: string;
  triggered_at: string;
  expires_at: string;
}

import { API_BASE_URL } from "@/app/lib/api"

export default function SignalsClient() {
  const { isPro } = useAuth();
  const { t } = useLanguage();
  const [signals, setSignals] = useState<AnomalySignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [minScore, setMinScore] = useState(8);
  const [direction, setDirection] = useState<string>("all");
  const [confidence, setConfidence] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [scannerStatus, setScannerStatus] = useState<any>(null);
  const [scanningNow, setScanningNow] = useState(false);
  const [scannerSettings, setScannerSettings] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSignals = useCallback(async () => {
    if (!isPro) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("min_score", String(minScore));
      params.set("limit", "50");
      if (direction !== "all") params.set("direction", direction);
      if (confidence !== "all") params.set("confidence", confidence);
      if (category !== "all") params.set("category", category);

      const res = await fetch(`${API_BASE_URL}/scanner/anomalies?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSignals(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || t("signals.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [isPro, minScore, direction, confidence, category]);

  const fetchScannerStatus = useCallback(async () => {
    if (!isPro) return;
    try {
      const res = await fetch(`${API_BASE_URL}/scanner/status`, {
        credentials: 'include',
      });
      if (res.ok) setScannerStatus(await res.json());
    } catch (e) {
      console.error("Failed to fetch scanner status", e);
    }
  }, [isPro]);

  const fetchScannerSettings = useCallback(async () => {
    if (!isPro) return;
    try {
      const res = await fetch(`${API_BASE_URL}/scanner/settings`, {
        credentials: 'include',
      });
      if (res.ok) setScannerSettings(await res.json());
    } catch (e) {
      console.error("Failed to fetch scanner settings", e);
    }
  }, [isPro]);

  const saveScannerSettings = async (updates: any) => {
    if (!isPro) return;
    try {
      const res = await fetch(`${API_BASE_URL}/scanner/settings`, {
        method: "PATCH",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchScannerSettings();
      }
    } catch (e) {
      console.error("Failed to save scanner settings", e);
    }
  };

  const handleScanNow = async () => {
    if (!isPro) return;
    setScanningNow(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scanner/scan-now`, {
        method: "POST",
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Scan complete: ${data.count} anomalies found`);
        await fetchSignals();
        await fetchScannerStatus();
      }
    } catch (e: any) {
      alert(e.message || "Scan failed");
    } finally {
      setScanningNow(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchScannerStatus();
    fetchScannerSettings();
    const interval = setInterval(() => {
      fetchSignals();
      fetchScannerStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals, fetchScannerStatus, fetchScannerSettings]);

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  };

  const directionIcon = (dir: string) =>
    dir === "LONG" ? (
      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-rose-400" />
    );

  const confidenceBadge = (c: string) => {
    if (c === "high")
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          🔥 HIGH
        </Badge>
      );
    if (c === "medium")
      return (
        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
          MEDIUM
        </Badge>
      );
    return (
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
        LOW
      </Badge>
    );
  };

  const categories = Array.from(new Set(signals.map((s) => s.category)));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-foreground flex items-center gap-2">
              <ScanEye className="h-6 w-6 text-amber-400" />
              SIGNALS
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Volume Spike / OI Anomaly Scanner — Pro only
            </p>
            {isPro && scannerStatus && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Activity className="h-3 w-3" />
                  Scanner Active
                </span>
                {scannerStatus.last_run && (
                  <span className="text-slate-500">
                    Last scan: {formatTimeAgo(scannerStatus.last_run.run_at)}
                  </span>
                )}
                <span className="text-slate-500">
                  {scannerStatus.runs_24h} scans / {scannerStatus.anomalies_24h} signals (24h)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPro && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanNow}
                disabled={scanningNow}
                className=""
              >
                <Play className={`mr-2 h-4 w-4 ${scanningNow ? "animate-pulse" : ""}`} />
                {scanningNow ? t("signals.scanning") : t("signals.scanNow")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSignals}
              disabled={loading}
              className=""
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isPro ? (
          <Card>
            <CardContent className="p-8">
              <ProBlurOverlay title={t("proOverlay.title")} description={t("proOverlay.description")}>
                <div className="h-64 w-full" />
              </ProBlurOverlay>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold tracking-widest flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  FILTERS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      {t("signals.minScore")}: <span className="text-foreground">{minScore}</span>
                    </label>
                    <Input
                      type="range"
                      min={5}
                      max={13}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="h-2 cursor-pointer border-0 bg-muted p-0 accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">{t("signals.direction")}</label>
                    <Select value={direction} onValueChange={setDirection}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        <SelectItem value="LONG">{t("signals.long")}</SelectItem>
                        <SelectItem value="SHORT">{t("signals.short")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">{t("signals.confidence")}</label>
                    <Select value={confidence} onValueChange={setConfidence}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        <SelectItem value="high">{t("signals.high")}</SelectItem>
                        <SelectItem value="medium">{t("signals.medium")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">{t("signals.category")}</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("common.all")}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scanner Settings */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold tracking-widest flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-400" />
                  {t("signals.scannerSettings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      {t("signals.defaultMinScore")} <span className="text-foreground">{scannerSettings?.min_score ?? 8}</span>
                    </label>
                    <Input
                      type="range"
                      min={3}
                      max={13}
                      value={scannerSettings?.min_score ?? 8}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setScannerSettings((prev: any) => ({ ...prev, min_score: val }));
                        saveScannerSettings({ min_score: val });
                      }}
                      className="h-2 cursor-pointer border-0 bg-muted p-0 accent-amber-500"
                    />
                    <p className="text-[10px] text-slate-600">{t("signals.minScoreDesc")}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <label className="text-xs text-slate-300">{t("signals.emailAlerts")}</label>
                    <input
                      type="checkbox"
                      checked={scannerSettings?.email_alerts ?? false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setScannerSettings((prev: any) => ({ ...prev, email_alerts: val }));
                        saveScannerSettings({ email_alerts: val });
                      }}
                      className="ml-auto h-4 w-4 accent-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-slate-400" />
                    <label className="text-xs text-slate-300">{t("signals.telegramAlerts")}</label>
                    <input
                      type="checkbox"
                      checked={scannerSettings?.telegram_alerts ?? false}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setScannerSettings((prev: any) => ({ ...prev, telegram_alerts: val }));
                        saveScannerSettings({ telegram_alerts: val });
                      }}
                      className="ml-auto h-4 w-4 accent-amber-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {error && (
                  <div className="p-4 text-sm text-rose-400">{error}</div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3 font-medium">{t("portfolio.symbol")}</th>
                        <th className="px-4 py-3 font-medium">{t("signals.direction")}</th>
                        <th className="px-4 py-3 font-medium">{t("signals.score")}</th>
                        <th className="px-4 py-3 font-medium">{t("signals.volRatio")}</th>
                        <th className="px-4 py-3 font-medium">OI Δ 1h</th>
                        <th className="px-4 py-3 font-medium">{t("signals.price24h")}</th>
                        <th className="px-4 py-3 font-medium">{t("signals.confidence")}</th>
                        <th className="px-4 py-3 font-medium">{t("signals.timestamp")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && signals.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-slate-800/50">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : signals.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-12 text-center"
                          >
                            <div className="space-y-2">
                              <p className="text-slate-400">{t("signals.noSignals")}</p>
                              {scannerStatus?.last_run && (
                                <p className="text-xs text-slate-600">
                                  {t("signals.scannerChecked")} {scannerStatus.last_run.symbols_checked} {t("signals.symbols")} {formatTimeAgo(scannerStatus.last_run.run_at)}.
                                  {t("signals.marketCalm")}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {signals.map((s) => (
                            <motion.tr
                              key={s.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="border-b hover:bg-muted/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}.P`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-foreground hover:text-amber-400 transition-colors"
                                  >
                                    {s.base_asset}
                                  </a>
                                  <span className="text-xs text-slate-500">
                                    {s.category}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  {directionIcon(s.direction)}
                                  <span
                                    className={
                                      s.direction === "LONG"
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }
                                  >
                                    {s.direction}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-foreground">{s.score}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                x{s.volume_ratio}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={
                                    s.oi_change_pct > 0
                                      ? "text-emerald-400"
                                      : s.oi_change_pct < 0
                                      ? "text-rose-400"
                                      : "text-slate-400"
                                  }
                                >
                                  {s.oi_change_pct > 0 ? "+" : ""}
                                  {s.oi_change_pct.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={
                                    s.price_change_24h_pct > 0
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                  }
                                >
                                  {s.price_change_24h_pct > 0 ? "+" : ""}
                                  {s.price_change_24h_pct.toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {confidenceBadge(s.confidence)}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {formatTimeAgo(s.triggered_at)}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      </main>
    </div>
  );
}
