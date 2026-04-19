"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
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
import { Zap, RefreshCw, ArrowUpRight, ArrowDownRight, Filter, Play, Activity } from "lucide-react";
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

const API_BASE = "https://crypto-signals-production-ff4c.up.railway.app/api/v1";

export default function SignalsClient() {
  const { isPro } = useAuth();
  const [signals, setSignals] = useState<AnomalySignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [minScore, setMinScore] = useState(8);
  const [direction, setDirection] = useState<string>("all");
  const [confidence, setConfidence] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [scannerStatus, setScannerStatus] = useState<any>(null);
  const [scanningNow, setScanningNow] = useState(false);

  const fetchSignals = useCallback(async () => {
    if (!isPro) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams();
      params.set("min_score", String(minScore));
      params.set("limit", "50");
      if (direction !== "all") params.set("direction", direction);
      if (confidence !== "all") params.set("confidence", confidence);
      if (category !== "all") params.set("category", category);

      const res = await fetch(`${API_BASE}/scanner/anomalies?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSignals(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [isPro, minScore, direction, confidence, category]);

  const fetchScannerStatus = useCallback(async () => {
    if (!isPro) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/scanner/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setScannerStatus(await res.json());
    } catch (e) {
      console.error("Failed to fetch scanner status", e);
    }
  }, [isPro]);

  const handleScanNow = async () => {
    if (!isPro) return;
    setScanningNow(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/scanner/scan-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
    const interval = setInterval(() => {
      fetchSignals();
      fetchScannerStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals, fetchScannerStatus]);

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
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-200">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-400" />
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
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              >
                <Play className={`mr-2 h-4 w-4 ${scanningNow ? "animate-pulse" : ""}`} />
                {scanningNow ? "Scanning..." : "Scan Now"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSignals}
              disabled={loading}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isPro ? (
          <Card className="border-slate-800 bg-[#0f1420]">
            <CardContent className="p-8">
              <ProBlurOverlay title="Pro Feature" description="Volume Spike / OI Anomaly Scanner is available for Pro subscribers only.">
                <div className="h-64 w-full" />
              </ProBlurOverlay>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className="mb-6 border-slate-800 bg-[#0f1420]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold tracking-widest text-white flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  FILTERS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Min Score: <span className="text-white">{minScore}</span>
                    </label>
                    <Input
                      type="range"
                      min={5}
                      max={13}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="h-2 cursor-pointer border-0 bg-slate-800 p-0 accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Direction</label>
                    <Select value={direction} onValueChange={setDirection}>
                      <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="LONG">Long</SelectItem>
                        <SelectItem value="SHORT">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Confidence</label>
                    <Select value={confidence} onValueChange={setConfidence}>
                      <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-200">
                        <SelectItem value="all">All</SelectItem>
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

            {/* Table */}
            <Card className="border-slate-800 bg-[#0f1420]">
              <CardContent className="p-0">
                {error && (
                  <div className="p-4 text-sm text-rose-400">{error}</div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3 font-medium">Symbol</th>
                        <th className="px-4 py-3 font-medium">Direction</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">Vol Ratio</th>
                        <th className="px-4 py-3 font-medium">OI Δ 1h</th>
                        <th className="px-4 py-3 font-medium">Price 24h</th>
                        <th className="px-4 py-3 font-medium">Confidence</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && signals.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-slate-800/50">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <Skeleton className="h-4 w-20 bg-slate-800" />
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
                              <p className="text-slate-400">No active anomaly signals.</p>
                              {scannerStatus?.last_run && (
                                <p className="text-xs text-slate-600">
                                  Scanner checked {scannerStatus.last_run.symbols_checked} symbols {formatTimeAgo(scannerStatus.last_run.run_at)}.
                                  Market is calm — signals appear when volume or OI spikes.
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
                              className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    {s.base_asset}
                                  </span>
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
                                <span className="font-bold text-white">{s.score}</span>
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
