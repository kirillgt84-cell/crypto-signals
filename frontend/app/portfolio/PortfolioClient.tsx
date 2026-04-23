"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { useAuth } from "../context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Wallet,
  RefreshCw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle2,
  X,
  Link as LinkIcon,
  Unlink,
  ChevronDown,
  ChevronUp,
  Bot,
  Bell,
  Settings2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/context/LanguageContext";

import { API_BASE_URL } from "@/app/lib/api";

const COLORS = [
  "#ef4444", "#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#ec4899", "#06b6d4", "#10b981", "#6366f1", "#9ca3af",
];

interface PortfolioAsset {
  asset_symbol: string;
  asset_name: string;
  amount: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  notional: number;
  margin: number;
  leverage: number;
  side: string;
  system_category?: string;
  user_category_name?: string;
}

interface CategoryData {
  notional: number;
  pnl: number;
  weight_pct: number;
  assets: PortfolioAsset[];
}

interface PortfolioSummary {
  assets: PortfolioAsset[];
  total_notional: number;
  total_unrealized_pnl: number;
  total_assets: number;
  categories: Record<string, CategoryData>;
}

interface DeviationItem {
  category?: string;
  asset?: string;
  current_weight: number;
  target_weight: number;
  delta: number;
  status: string;
}

interface PortfolioModel {
  id: number;
  name: string;
  description: string;
  risk_level: string;
  is_custom?: boolean;
  allocations: { category_name: string; target_weight: number }[];
  asset_allocations: { asset_symbol: string; asset_name: string; target_weight: number }[];
}

export default function PortfolioClient() {
  const { user } = useAuth();
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);
  const [history, setHistory] = useState<any[]>([]);
  const [models, setModels] = useState<PortfolioModel[]>([]);
  const [deviation, setDeviation] = useState<DeviationItem[] | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualSide, setManualSide] = useState("LONG");
  const [activeTab, setActiveTab] = useState<"assets" | "allocation" | "models" | "history">("assets");
  const [marketType, setMarketType] = useState("futures");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState<any[]>([]);
  const [equityTimeframe, setEquityTimeframe] = useState<"daily" | "weekly">("daily");

  // Custom model dialog state
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customAssets, setCustomAssets] = useState<{asset_symbol: string; asset_name: string; target_weight: number}[]>([
    { asset_symbol: "BTC", asset_name: "Bitcoin", target_weight: 0 },
    { asset_symbol: "ETH", asset_name: "Ethereum", target_weight: 0 },
    { asset_symbol: "GOLD", asset_name: "Gold & Silver", target_weight: 0 },
    { asset_symbol: "SPX", asset_name: "S&P 500", target_weight: 0 },
    { asset_symbol: "BONDS", asset_name: "US Treasuries", target_weight: 0 },
    { asset_symbol: "USDC", asset_name: "USDC / USDT", target_weight: 0 },
    { asset_symbol: "NDX", asset_name: "Nasdaq", target_weight: 0 },
    { asset_symbol: "COIN", asset_name: "Coinbase", target_weight: 0 },
    { asset_symbol: "MSTR", asset_name: "MicroStrategy", target_weight: 0 },
    { asset_symbol: "SOL", asset_name: "Solana", target_weight: 0 },
    { asset_symbol: "XRP", asset_name: "XRP", target_weight: 0 },
    { asset_symbol: "BNB", asset_name: "BNB", target_weight: 0 },
    { asset_symbol: "KO", asset_name: "Coca-Cola / Pepsi / P&G / Nestle", target_weight: 0 },
  ]);

  const headers = {
    "Content-Type": "application/json",
  };

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/summary`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Failed to fetch summary", e);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/history`, { credentials: 'include', headers });
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }, [user]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models`, { credentials: 'include', headers });
      if (res.ok) setModels(await res.json());
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  }, [user]);

  const fetchDeviation = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models/deviation`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setDeviation(data.deviations);
        setSelectedModelId(data.model_id);
      }
    } catch (e) {
      // No model selected yet
    }
  }, [user]);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/alerts`, { credentials: 'include', headers });
      if (res.ok) setAlerts(await res.json());
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    }
  }, [user]);

  const fetchAlertSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/alerts/settings`, { credentials: 'include', headers });
      if (res.ok) setAlertSettings(await res.json());
    } catch (e) {
      console.error("Failed to fetch alert settings", e);
    }
  }, [user]);

  useEffect(() => {
    fetchSummary();
    fetchHistory();
    fetchModels();
    fetchDeviation();
    fetchAlerts();
    fetchAlertSettings();
  }, [fetchSummary, fetchHistory, fetchModels, fetchDeviation, fetchAlerts, fetchAlertSettings]);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/sync`, {
        method: "POST",
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        await fetchSummary();
        await fetchHistory();
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !apiKey.trim() || !apiSecret.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/connect/binance`, {
        method: "POST",
        credentials: 'include',
        headers,
        body: JSON.stringify({ api_key: apiKey.trim(), api_secret: apiSecret.trim(), market_type: marketType }),
      });
      if (res.ok) {
        setConnectOpen(false);
        setApiKey("");
        setApiSecret("");
        await handleSync();
      } else {
        const err = await res.json();
        alert(err.detail || "Connection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm(`Disconnect Binance ${marketType}?`)) return;
    await fetch(`${API_BASE_URL}/portfolio/disconnect/binance?market_type=${marketType}`, { method: "DELETE", credentials: 'include', headers });
    await fetchSummary();
  };

  const handleAddManual = async () => {
    if (!user || !manualSymbol.trim() || !manualAmount || !manualPrice) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/manual/assets`, {
        method: "POST",
        credentials: 'include',
        headers,
        body: JSON.stringify({
          asset_symbol: manualSymbol.trim().toUpperCase(),
          amount: parseFloat(manualAmount),
          avg_entry_price: parseFloat(manualPrice),
          side: manualSide,
        }),
      });
      if (res.ok) {
        setManualOpen(false);
        setManualSymbol("");
        setManualAmount("");
        setManualPrice("");
        await fetchSummary();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveManual = async (symbol: string) => {
    if (!user) return;
    if (!confirm(`Remove ${symbol}?`)) return;
    await fetch(`${API_BASE_URL}/portfolio/manual/assets/${symbol}`, {
      method: "DELETE",
      credentials: 'include',
      headers,
    });
    await fetchSummary();
  };

  const handleSelectModel = async (modelId: number) => {
    if (!user) return;
    await fetch(`${API_BASE_URL}/portfolio/models/select`, {
      method: "POST",
      credentials: 'include',
      headers,
      body: JSON.stringify({ model_id: modelId }),
    });
    setSelectedModelId(modelId);
    await fetchDeviation();
  };

  const handleCreateCustomModel = async () => {
    if (!user) return;
    const assets = customAssets.filter((a) => a.target_weight > 0);
    const total = assets.reduce((sum, a) => sum + a.target_weight, 0);
    if (total < 99.99 || total > 100.01) {
      alert(`Weights must sum to 100%. Current: ${total.toFixed(2)}%`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models/custom`, {
        method: "POST",
        credentials: 'include',
        headers,
        body: JSON.stringify({ name: customName, description: customDesc, assets }),
      });
      if (res.ok) {
        setCustomOpen(false);
        setCustomName("");
        setCustomDesc("");
        setCustomAssets((prev) => prev.map((a) => ({ ...a, target_weight: 0 })));
        await fetchModels();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to create model");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteCustomModel = async (modelId: number) => {
    if (!user) return;
    if (!confirm("Delete this custom model?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models/custom/${modelId}`, {
        method: "DELETE",
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        await fetchModels();
        if (selectedModelId === modelId) {
          setSelectedModelId(null);
          setDeviation(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete model", e);
    }
  };

  const fetchAiInsight = async () => {
    if (!user || !summary) return;
    setAiInsight(t("common.loading"));
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/ai-insight`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight || "No insight available.");
      } else {
        setAiInsight("AI insight unavailable at the moment.");
      }
    } catch {
      setAiInsight("AI insight unavailable at the moment.");
    }
  };

  const pieData = summary
    ? Object.entries(summary.categories).map(([name, data]) => ({
        name,
        value: data.notional,
      }))
    : [];

  const totalPnl = summary?.total_unrealized_pnl || 0;
  const pnlPositive = totalPnl >= 0;

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Wallet className="h-6 w-6 text-indigo-500" />
                {t("portfolio.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t("portfolio.trackPositions")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {alerts.filter((a: any) => !a.is_read).length > 0 && (
                <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="relative">
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                        {alerts.filter((a: any) => !a.is_read).length}
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogDescription className="sr-only">Dialog content</DialogDescription>
                      <DialogTitle>{t("portfolio.alertsTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-[400px] overflow-auto">
                      {alerts.length === 0 && <p className="text-sm text-muted-foreground">{t("portfolio.noAlerts")}</p>}
                      {alerts.map((alert: any) => (
                        <div key={alert.id} className={cn("p-3 rounded-lg border text-sm", !alert.is_read ? "bg-amber-500/5 border-amber-200" : "bg-muted/30")}>
                          <p className="font-medium">{alert.asset_symbol}</p>
                          <p className="text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch(`${API_BASE_URL}/portfolio/alerts/read`, { method: "POST", headers });
                        fetchAlerts();
                      }}>
                        {t("portfolio.markAllRead")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
                {syncing ? t("common.loading") : t("portfolio.sync")}
              </Button>
              <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    {t("portfolio.connectBinance")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                      <DialogDescription className="sr-only">Dialog content</DialogDescription>
                    <DialogTitle>{t("portfolio.connectBinanceTitle")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="text-xs text-muted-foreground bg-amber-500/10 text-amber-600 p-3 rounded">
                      {t("portfolio.apiKeyWarning")}
                    </div>
                    <div className="space-y-2">
                      <Label>{t("portfolio.marketType")}</Label>
                      <Select value={marketType} onValueChange={setMarketType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="futures">{t("portfolio.futures")}</SelectItem>
                          <SelectItem value="spot">{t("portfolio.spot")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("portfolio.apiKey")}</Label>
                      <Input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t("portfolio.apiKey")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("portfolio.apiSecret")}</Label>
                      <Input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder={t("portfolio.apiSecret")}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleConnect} disabled={loading || !apiKey.trim() || !apiSecret.trim()}>
                      {loading ? t("common.loading") : t("portfolio.connectAndSync")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("portfolio.totalValue")}</p>
              <p className="text-2xl font-bold mt-1">
                ${(summary?.total_notional || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("portfolio.unrealizedPnl")}</p>
              <p className={cn("text-2xl font-bold mt-1 flex items-center gap-1", pnlPositive ? "text-green-500" : "text-red-500")}>
                {pnlPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {totalPnl >= 0 ? "+" : ""}
                ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("portfolio.assets")}</p>
              <p className="text-2xl font-bold mt-1">{summary?.total_assets || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b">
            {(["assets", "allocation", "models", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "assets" && t("portfolio.positions")}
                {tab === "allocation" && t("portfolio.allocation")}
                {tab === "models" && t("portfolio.models")}
                {tab === "history" && t("portfolio.history")}
              </button>
            ))}
          </div>

          {/* Assets Tab */}
          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Manual Add */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("portfolio.positions")}</h2>
                <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("portfolio.addPosition")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogDescription className="sr-only">Dialog content</DialogDescription>
                      <DialogTitle>{t("portfolio.addPosition")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>{t("portfolio.symbol")}</Label>
                        <Input
                          value={manualSymbol}
                          onChange={(e) => setManualSymbol(e.target.value)}
                          placeholder="BTC, ETH, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("portfolio.quantity")}</Label>
                        <Input
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          placeholder="0.5"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("portfolio.entryPrice")}</Label>
                        <Input
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder="50000"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("portfolio.side")}</Label>
                        <Select value={manualSide} onValueChange={setManualSide}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LONG">{t("portfolio.long")}</SelectItem>
                            <SelectItem value="SHORT">{t("portfolio.short")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddManual} disabled={loading}>
                        {loading ? t("common.loading") : t("portfolio.addAsset")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {summary && summary.assets.length > 0 ? (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("portfolio.symbol")}</TableHead>
                        <TableHead className="text-right">{t("portfolio.quantity")}</TableHead>
                        <TableHead className="text-right">{t("portfolio.entryPrice")}</TableHead>
                        <TableHead className="text-right">{t("portfolio.currentPrice")}</TableHead>
                        <TableHead className="text-right">{t("portfolio.pnl")}</TableHead>
                        <TableHead className="text-right">{t("portfolio.value")}</TableHead>
                        <TableHead>{t("portfolio.side")}</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.assets.map((asset) => (
                        <TableRow key={asset.asset_symbol}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {asset.asset_symbol}
                              <span className="text-xs text-muted-foreground">
                                {asset.system_category || asset.user_category_name || t("portfolio.other")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</TableCell>
                          <TableCell className="text-right">${asset.avg_entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">${asset.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(asset.unrealized_pnl >= 0 ? "text-green-500" : "text-red-500")}>
                              {asset.unrealized_pnl >= 0 ? "+" : ""}
                              ${asset.unrealized_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="text-xs ml-1">
                                ({asset.unrealized_pnl_pct >= 0 ? "+" : ""}
                                {asset.unrealized_pnl_pct.toFixed(2)}%)
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right">${asset.notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              asset.side === "LONG" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            )}>
                              {asset.side}
                            </span>
                          </TableCell>
                          <TableCell>
                            {asset.leverage > 1 && (
                              <span className="text-xs text-muted-foreground">{asset.leverage}x</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16 border rounded-xl bg-muted/20">
                  <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">{t("portfolio.noAssets")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("portfolio.connectOrAddAssets")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Allocation Tab */}
          {activeTab === "allocation" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-500" />
                  {t("portfolio.allocation")}
                </h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <RePieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">{t("portfolio.noData")}</div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">{t("portfolio.categoryBreakdown")}</h3>
                <div className="space-y-3">
                  {summary && Object.entries(summary.categories).map(([name, data], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{name}</span>
                          <span className="text-muted-foreground">
                            {data.weight_pct.toFixed(1)}% · ${data.notional.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted mt-1 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(data.weight_pct, 100)}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Models Tab */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("portfolio.equityCurve")}</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={equityTimeframe === "daily" ? "default" : "outline"} onClick={() => setEquityTimeframe("daily")}>{t("portfolio.daily")}</Button>
                  <Button size="sm" variant={equityTimeframe === "weekly" ? "default" : "outline"} onClick={() => setEquityTimeframe("weekly")}>{t("portfolio.weekly")}</Button>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-6">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={history.slice().reverse()}>
                      <defs>
                        <linearGradient id="colorNotional" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} tickFormatter={(v: number) => `$${v?.toLocaleString?.() || v}`} />
                      <ReTooltip formatter={(value: number, name: string) => [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}`, name === "total_notional" ? t("portfolio.totalValue") : name]} />
                      <Legend />
                      <Area type="monotone" dataKey="total_notional" name={t("portfolio.totalValue")} stroke="#6366f1" fillOpacity={1} fill="url(#colorNotional)" strokeWidth={2} />
                      <Line type="monotone" dataKey="total_unrealized_pnl" name={t("portfolio.unrealizedPnl")} stroke="#22c55e" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    {t("portfolio.noHistory")}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t("portfolio.models")}</h2>
                <Button size="sm" onClick={() => setCustomOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> {t("portfolio.createCustomModel")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((model) => {
                  const isSelected = selectedModelId === model.id;
                  const hasAssets = model.asset_allocations && model.asset_allocations.length > 0;
                  return (
                    <div
                      key={model.id}
                      className={cn(
                        "rounded-xl border p-5 transition-all relative",
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                          : "border-border hover:border-indigo-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        <div className="flex items-center gap-2">
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-500" />}
                          {model.is_custom && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-rose-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomModel(model.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                      <div className="space-y-1 mb-4">
                        {(hasAssets ? model.asset_allocations : model.allocations).map((a: any) => (
                          <div key={a.asset_symbol || a.category_name} className="flex items-center justify-between text-xs">
                            <span>{a.asset_name || a.asset_symbol || a.category_name}</span>
                            <span className="font-medium">{a.target_weight}%</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleSelectModel(model.id)}
                      >
                        {isSelected ? t("portfolio.selected") : t("portfolio.selectModel")}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {deviation && deviation.length > 0 && (
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-500" />
                    Deviation from Model
                  </h3>
                  <div className="space-y-3">
                    {deviation.map((d) => (
                      <div key={d.asset || d.category} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium">{d.asset || d.category}</div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="text-xs text-muted-foreground w-12 text-right">{d.current_weight}%</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                            <div
                              className={cn(
                                "absolute top-0 h-full rounded-full transition-all",
                                d.status === "ok" ? "bg-green-500" : d.status === "warning" ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{
                                width: `${Math.min(Math.max(d.current_weight, 0), 100)}%`,
                              }}
                            />
                            <div
                              className="absolute top-0 h-full w-0.5 bg-indigo-500"
                              style={{ left: `${Math.min(Math.max(d.target_weight, 0), 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground w-12">{d.target_weight}%</div>
                        </div>
                        <div className={cn(
                          "text-xs font-medium w-16 text-right",
                          d.status === "ok" ? "text-green-500" : d.status === "warning" ? "text-amber-500" : "text-red-500"
                        )}>
                          {d.delta > 0 ? "+" : ""}{d.delta}%
                        </div>
                        {d.status !== "ok" && (
                          <AlertTriangle className={cn(
                            "h-4 w-4",
                            d.status === "warning" ? "text-amber-500" : "text-red-500"
                          )} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alert Settings */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-indigo-500" />
                  {t("portfolio.alertSettings")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { key: "liquidation", label: t("portfolio.liquidationWarning"), desc: t("portfolio.distanceToLiq") },
                    { key: "pnl_up", label: t("portfolio.pnlUp"), desc: t("portfolio.gainThreshold") },
                    { key: "pnl_down", label: t("portfolio.pnlDown"), desc: t("portfolio.lossThreshold") },
                  ].map((item) => {
                    const setting = alertSettings.find((s: any) => s.alert_type === item.key);
                    return (
                      <div key={item.key} className="space-y-2">
                        <Label className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                        <Input
                          type="number"
                          placeholder="10"
                          defaultValue={setting?.threshold || ""}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              await fetch(`${API_BASE_URL}/portfolio/alerts/settings`, {
                                method: "POST",
                                headers,
                                body: JSON.stringify({ alert_type: item.key, threshold: val, enabled: true }),
                              });
                              fetchAlertSettings();
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insight */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-indigo-500" />
                    {t("portfolio.aiInsight")}
                    AI Insight
                  </h3>
                  <Button variant="outline" size="sm" onClick={fetchAiInsight}>
                    Analyze
                  </Button>
                </div>
                {aiInsight ? (
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {aiInsight}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click Analyze to get an AI-powered interpretation of your portfolio allocation and risk exposure.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Custom Model Dialog */}
        <Dialog open={customOpen} onOpenChange={setCustomOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                      <DialogDescription className="sr-only">Dialog content</DialogDescription>
              <DialogTitle>{t("portfolio.createModelTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("portfolio.modelName")}</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="My Portfolio"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("portfolio.modelDescription")}</Label>
                <Input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Short description"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("portfolio.assetAllocations")}</Label>
                  <span className="text-xs text-muted-foreground">
                    Total: {customAssets.reduce((s, a) => s + a.target_weight, 0).toFixed(1)}%
                  </span>
                </div>
                {customAssets.map((asset, idx) => (
                  <div key={asset.asset_symbol} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-medium truncate">{asset.asset_name}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={asset.target_weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCustomAssets((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], target_weight: val };
                          return next;
                        });
                      }}
                      className="flex-1 h-2 cursor-pointer accent-indigo-500"
                    />
                    <span className="w-12 text-right text-xs font-mono">{asset.target_weight}%</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("common.cancel")}</Button>
              </DialogClose>
              <Button onClick={handleCreateCustomModel}>{t("portfolio.createModelTitle")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
