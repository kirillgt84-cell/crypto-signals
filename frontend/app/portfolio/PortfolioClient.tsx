"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1";

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
  category: string;
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
  allocations: { category_name: string; target_weight: number }[];
}

export default function PortfolioClient() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
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
  const [activeTab, setActiveTab] = useState<"assets" | "allocation" | "models">("assets");

  const headers = {
    Authorization: `Bearer ${token || ""}`,
    "Content-Type": "application/json",
  };

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/summary`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Failed to fetch summary", e);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/history`, { headers });
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }, [token]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models`);
      if (res.ok) setModels(await res.json());
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  }, []);

  const fetchDeviation = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/models/deviation`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDeviation(data.deviations);
        setSelectedModelId(data.model_id);
      }
    } catch (e) {
      // No model selected yet
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
    fetchHistory();
    fetchModels();
    fetchDeviation();
  }, [fetchSummary, fetchHistory, fetchModels, fetchDeviation]);

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/sync`, {
        method: "POST",
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
    if (!token || !apiKey.trim() || !apiSecret.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/connect/binance`, {
        method: "POST",
        headers,
        body: JSON.stringify({ api_key: apiKey.trim(), api_secret: apiSecret.trim() }),
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
    if (!token) return;
    if (!confirm("Disconnect Binance?")) return;
    await fetch(`${API_BASE_URL}/portfolio/disconnect/binance`, { method: "DELETE", headers });
    await fetchSummary();
  };

  const handleAddManual = async () => {
    if (!token || !manualSymbol.trim() || !manualAmount || !manualPrice) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/manual/assets`, {
        method: "POST",
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
    if (!token) return;
    if (!confirm(`Remove ${symbol}?`)) return;
    await fetch(`${API_BASE_URL}/portfolio/manual/assets/${symbol}`, {
      method: "DELETE",
      headers,
    });
    await fetchSummary();
  };

  const handleSelectModel = async (modelId: number) => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/portfolio/models/select`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model_id: modelId }),
    });
    setSelectedModelId(modelId);
    await fetchDeviation();
  };

  const fetchAiInsight = async () => {
    if (!token || !summary) return;
    setAiInsight("Analyzing your portfolio...");
    try {
      const res = await fetch(`${API_BASE_URL}/portfolio/ai-insight`, { headers });
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
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
                Portfolio
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Track positions across exchanges and wallets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
              <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Connect Binance
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect Binance Futures (Read-Only)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="text-xs text-muted-foreground bg-amber-500/10 text-amber-600 p-3 rounded">
                      Your API keys are encrypted with AES-256 and never exposed to the frontend after saving.
                      Create a read-only API key on Binance with <b>Futures</b> permissions only.
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your Binance API key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Paste your Binance API secret"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleConnect} disabled={loading || !apiKey.trim() || !apiSecret.trim()}>
                      {loading ? "Connecting..." : "Connect & Sync"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-bold mt-1">
                ${(summary?.total_notional || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Unrealized PnL</p>
              <p className={cn("text-2xl font-bold mt-1 flex items-center gap-1", pnlPositive ? "text-green-500" : "text-red-500")}>
                {pnlPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {totalPnl >= 0 ? "+" : ""}
                ${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Assets</p>
              <p className="text-2xl font-bold mt-1">{summary?.total_assets || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b">
            {(["assets", "allocation", "models"] as const).map((tab) => (
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
                {tab === "assets" && "Assets"}
                {tab === "allocation" && "Allocation"}
                {tab === "models" && "Model Portfolios"}
              </button>
            ))}
          </div>

          {/* Assets Tab */}
          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Manual Add */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Positions</h2>
                <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Manual Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Manual Asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Input
                          value={manualSymbol}
                          onChange={(e) => setManualSymbol(e.target.value)}
                          placeholder="BTC, ETH, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          placeholder="0.5"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Avg Entry Price ($)</Label>
                        <Input
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder="50000"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Side</Label>
                        <Select value={manualSide} onValueChange={setManualSide}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LONG">Long</SelectItem>
                            <SelectItem value="SHORT">Short</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddManual} disabled={loading}>
                        {loading ? "Adding..." : "Add Asset"}
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
                        <TableHead>Asset</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Entry</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">PnL</TableHead>
                        <TableHead className="text-right">Notional</TableHead>
                        <TableHead>Side</TableHead>
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
                                {asset.system_category || asset.user_category_name || "Other"}
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
                  <p className="text-muted-foreground">No assets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect Binance or add manual assets to get started
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
                  Allocation by Category
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
                  <div className="text-center py-12 text-muted-foreground">No data</div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
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
          {activeTab === "models" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((model) => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model.id)}
                      className={cn(
                        "rounded-xl border p-5 cursor-pointer transition-all",
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                          : "border-border hover:border-indigo-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{model.description}</p>
                      <div className="space-y-1">
                        {model.allocations.map((a) => (
                          <div key={a.category_name} className="flex items-center justify-between text-xs">
                            <span>{a.category_name}</span>
                            <span className="font-medium">{a.target_weight}%</span>
                          </div>
                        ))}
                      </div>
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
                      <div key={d.category} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium">{d.category}</div>
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

              {/* AI Insight */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-indigo-500" />
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
      </main>
    </div>
  );
}
