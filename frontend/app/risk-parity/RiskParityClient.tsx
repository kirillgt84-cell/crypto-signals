"use client";

import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/app/context/LanguageContext";
import { API_BASE_URL } from "@/app/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  Scale,
  Calculator,
  TrendingUp,
  Settings,
  Loader2,
  Bot,
} from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  tickers: string[];
}

interface WeightsResult {
  tickers: string[];
  risk_parity: {
    weights: Record<string, number>;
    leverage: number;
    expected_volatility: number;
    risk_contribution: Record<string, number>;
  };
  inverse_volatility: {
    weights: Record<string, number>;
  };
  data_points: number;
  date_from: string;
  date_to: string;
}

interface BacktestResult {
  tickers: string[];
  period_days: number;
  date_from: string;
  date_to: string;
  strategies: {
    risk_parity: StrategyBacktest;
    inverse_volatility: StrategyBacktest;
    benchmark_60_40: StrategyBacktest;
    benchmark_100_equity: StrategyBacktest;
  };
}

interface StrategyBacktest {
  cagr: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  calmar_ratio: number;
  total_return: number;
  num_days: number;
  equity_curve: { date: string; value: number }[];
}

const STRATEGY_COLORS: Record<string, string> = {
  risk_parity: "#6366f1",
  inverse_volatility: "#f59e0b",
  benchmark_60_40: "#64748b",
  benchmark_100_equity: "#f43f5e",
};

const STRATEGY_LABELS: Record<string, string> = {
  risk_parity: "Risk Parity",
  inverse_volatility: "Inverse Vol",
  benchmark_60_40: "60/40",
  benchmark_100_equity: "100% Equity",
};

function getInterpretation(data: BacktestResult | null, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!data) return "";
  const rp = data.strategies.risk_parity;
  const b6040 = data.strategies.benchmark_60_40;
  const b100 = data.strategies.benchmark_100_equity;

  const parts: string[] = [];
  if (rp.max_drawdown > b6040.max_drawdown) {
    parts.push(
      t("riskParity.interpretDrawdownWorse", {
        rp: (Math.abs(rp.max_drawdown) * 100).toFixed(1),
        b6040: (Math.abs(b6040.max_drawdown) * 100).toFixed(1),
      })
    );
  } else {
    parts.push(
      t("riskParity.interpretDrawdownBetter", {
        rp: (Math.abs(rp.max_drawdown) * 100).toFixed(1),
        b6040: (Math.abs(b6040.max_drawdown) * 100).toFixed(1),
      })
    );
  }

  if (rp.sharpe_ratio > b6040.sharpe_ratio) {
    parts.push(
      t("riskParity.interpretSharpe", {
        b6040: b6040.sharpe_ratio.toFixed(2),
        rp: rp.sharpe_ratio.toFixed(2),
      })
    );
  }

  if (rp.cagr > b100.cagr * 0.5) {
    parts.push(
      t("riskParity.interpretCagr", {
        cagr: (rp.cagr * 100).toFixed(1),
      })
    );
  }

  return parts.join(" ");
}

export default function RiskParityClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const { t, language } = useLanguage();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [customTickers, setCustomTickers] = useState("");
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [weightsData, setWeightsData] = useState<WeightsResult | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestResult | null>(null);
  const [backtestPeriod, setBacktestPeriod] = useState("10y");
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/risk-parity/strategies`)
      .then((r) => r.json())
      .then((data) => setStrategies(data.strategies || []))
      .catch(() => {});
  }, []);

  const getTickers = useCallback(() => {
    if (selectedStrategy === "custom")
      return customTickers
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    const s = strategies.find((s) => s.id === selectedStrategy);
    return s?.tickers || [];
  }, [selectedStrategy, customTickers, strategies]);

  const handleCalculate = async () => {
    const tickers = getTickers();
    if (tickers.length === 0) return;
    setCalculateLoading(true);
    setCalculateError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/risk-parity/calculate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers,
          lookback: 90,
          max_weight: 0.5,
          min_weight: 0.05,
          target_vol: 0.1,
          period: "5y",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        setWeightsData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setCalculateError(err.detail || `Error ${res.status}`);
      }
    } catch (e: any) {
      console.error("Calculate failed", e);
      setCalculateError(e.name === "AbortError" ? "Request timed out. Try again." : "Network error. Check connection.");
    } finally {
      setCalculateLoading(false);
    }
  };

  const handleBacktest = async () => {
    const tickers = getTickers();
    if (tickers.length === 0) return;
    setBacktestLoading(true);
    setBacktestError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${API_BASE_URL}/risk-parity/backtest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers,
          period: backtestPeriod,
          lookback: 90,
          rebalance_freq: 30,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        setBacktestData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setBacktestError(err.detail || `Error ${res.status}`);
      }
    } catch (e: any) {
      console.error("Backtest failed", e);
      setBacktestError(e.name === "AbortError" ? "Request timed out. Yahoo Finance may be unavailable. Try a shorter period." : "Network error. Check connection.");
    } finally {
      setBacktestLoading(false);
    }
  };

  const fetchAiInsight = async () => {
    const tickers = getTickers();
    if (tickers.length === 0) return;
    setAiInsightLoading(true);
    setAiInsight("");
    try {
      const res = await fetch(`${API_BASE_URL}/risk-parity/ai-insight?lang=${language}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers,
          backtest: backtestData,
          weights: weightsData,
          period: backtestPeriod,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight || "No insight available.");
      } else {
        setAiInsight("AI insight unavailable at the moment.");
      }
    } catch {
      setAiInsight("AI insight unavailable at the moment.");
    } finally {
      setAiInsightLoading(false);
    }
  };

  const weightsChartData = weightsData
    ? Object.keys(weightsData.risk_parity.weights).map((ticker) => ({
        ticker,
        rp: (weightsData.risk_parity.weights[ticker] || 0) * 100,
        iv: (weightsData.inverse_volatility.weights[ticker] || 0) * 100,
      }))
    : [];

  const rcChartData = weightsData
    ? Object.keys(weightsData.risk_parity.risk_contribution).map((ticker) => ({
        ticker,
        rc: (weightsData.risk_parity.risk_contribution[ticker] || 0) * 100,
      }))
    : [];

  const equityChartData =
    backtestData && backtestData.strategies.risk_parity.equity_curve
      ? backtestData.strategies.risk_parity.equity_curve.map(
          (d: any, i: number) => ({
            date: d.date,
            rp: d.value,
            iv: backtestData.strategies.inverse_volatility.equity_curve[i]?.value,
            b6040:
              backtestData.strategies.benchmark_60_40.equity_curve[i]?.value,
            b100:
              backtestData.strategies.benchmark_100_equity.equity_curve[i]
                ?.value,
          })
        )
      : [];

  const metricsRows = [
    { key: "cagr", label: "CAGR", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "sharpe_ratio", label: "Sharpe", fmt: (v: number) => v.toFixed(2) },
    { key: "sortino_ratio", label: "Sortino", fmt: (v: number) => v.toFixed(2) },
    { key: "max_drawdown", label: "Max Drawdown", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "calmar_ratio", label: "Calmar", fmt: (v: number) => v.toFixed(2) },
    { key: "annualized_volatility", label: "Volatility", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
    { key: "total_return", label: "Total Return", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
  ];

  const metricColor = (key: string, val: number) => {
    if (key === "max_drawdown") return Math.abs(val) <= 0.15 ? "text-emerald-500" : Math.abs(val) <= 0.3 ? "text-amber-500" : "text-rose-500";
    if (key === "sharpe_ratio") return val >= 1.5 ? "text-emerald-500" : val >= 0.5 ? "text-amber-500" : "text-rose-500";
    if (key === "sortino_ratio") return val >= 2 ? "text-emerald-500" : val >= 1 ? "text-amber-500" : "text-rose-500";
    if (key === "calmar_ratio") return val >= 2 ? "text-emerald-500" : val >= 0.5 ? "text-amber-500" : "text-rose-500";
    return "text-foreground";
  };

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
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Scale className="h-6 w-6 text-indigo-500" />
              {t("riskParity.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("riskParity.subtitle")}
            </p>
          </div>

          {/* Strategy Selector */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              {t("riskParity.selectStrategy")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategy(s.id)}
                  className={cn(
                    "rounded-xl border p-7 text-left transition-all",
                    selectedStrategy === s.id
                      ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                      : "border-border hover:border-indigo-300"
                  )}
                >
                  <h3 className="text-lg font-semibold mb-2">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {s.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {s.tickers.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2.5 py-1 rounded-md bg-muted font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              <button
                onClick={() => setSelectedStrategy("custom")}
                className={cn(
                  "rounded-xl border p-7 text-left transition-all",
                  selectedStrategy === "custom"
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                    : "border-border hover:border-indigo-300"
                )}
              >
                <h3 className="text-lg font-semibold mb-2">{t("riskParity.custom")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("riskParity.customTickers")}
                </p>
                {selectedStrategy === "custom" && (
                  <Input
                    value={customTickers}
                    onChange={(e) => setCustomTickers(e.target.value)}
                    placeholder="SPY, TLT, GLD, BTC-USD"
                    className="text-sm"
                  />
                )}
              </button>
            </div>

            {/* Strategy Guide */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("riskParity.strategyInterpretationTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold text-foreground mb-1">{t("riskParity.allWeather")}</p>
                    <p>{t("riskParity.strategyAllWeatherDesc")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold text-foreground mb-1">{t("riskParity.allWeatherCrypto")}</p>
                    <p>{t("riskParity.strategyAllWeatherCryptoDesc")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-semibold text-foreground mb-1">{t("riskParity.inverseVol")}</p>
                    <p>{t("riskParity.strategyInverseVolDesc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calculate Section */}
          <div className="mb-8">
            <Button
              onClick={handleCalculate}
              disabled={calculateLoading || getTickers().length === 0}
              className="mb-6"
            >
              {calculateLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              {t("riskParity.calculate")}
            </Button>

            {calculateError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500">
                {calculateError}
              </div>
            )}

            {weightsData && (
              <div className="space-y-6">
                {/* Weights Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("riskParity.weightsTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                          data={weightsChartData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <YAxis dataKey="ticker" type="category" tick={{ fontSize: 11 }} width={70} />
                          <Tooltip
                            formatter={(value: number) => `${value.toFixed(1)}%`}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              fontSize: "12px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Bar dataKey="rp" name={t("riskParity.rpWeights")} fill="#6366f1" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="iv" name={t("riskParity.invVolWeights")} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Weights Interpretation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("riskParity.weightsInterpretationTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("riskParity.weightsInterpretation")}
                    </p>
                  </CardContent>
                </Card>

                {/* Metrics & Risk Contribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-base">{t("riskParity.expectedVol")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {(weightsData.risk_parity.expected_volatility * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("riskParity.leverage")}: {weightsData.risk_parity.leverage.toFixed(2)}x
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("riskParity.riskContribution")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart data={rcChartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="ticker" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              formatter={(value: number) => `${value.toFixed(2)}%`}
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                border: "1px solid #334155",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="rc" fill="#6366f1" radius={[4, 4, 0, 0]}>
                              {rcChartData.map((_, i) => (
                                <Cell key={`cell-${i}`} fill={["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4"][i % 6]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Backtest Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                {t("riskParity.backtestTitle")}
              </h2>
              <div className="flex items-center gap-2">
                {["1y", "2y", "5y", "10y"].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={backtestPeriod === p ? "default" : "outline"}
                    onClick={() => setBacktestPeriod(p)}
                  >
                    {t(`riskParity.period${p}` as any)}
                  </Button>
                ))}
                <Button
                  onClick={handleBacktest}
                  disabled={backtestLoading || getTickers().length === 0}
                >
                  {backtestLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t("riskParity.runBacktest")}
                </Button>
              </div>
            </div>

            {backtestError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500">
                {backtestError}
              </div>
            )}

            {backtestData && (
              <div className="space-y-6">
                {/* Equity Curve */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("riskParity.equityCurve")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart data={equityChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(val: string) => {
                              const d = new Date(val);
                              return `${d.getFullYear() % 100}/${d.getMonth() + 1}`;
                            }}
                            minTickGap={30}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              fontSize: "12px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px" }} />
                          <Line type="monotone" dataKey="rp" name={STRATEGY_LABELS.risk_parity} stroke={STRATEGY_COLORS.risk_parity} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="iv" name={STRATEGY_LABELS.inverse_volatility} stroke={STRATEGY_COLORS.inverse_volatility} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="b6040" name={STRATEGY_LABELS.benchmark_60_40} stroke={STRATEGY_COLORS.benchmark_60_40} strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="b100" name={STRATEGY_LABELS.benchmark_100_equity} stroke={STRATEGY_COLORS.benchmark_100_equity} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("riskParity.metricsComparison")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                              {t("riskParity.strategy")}
                            </th>
                            {metricsRows.map((m) => (
                              <th key={m.key} className="text-right py-2 px-3 font-medium text-muted-foreground">
                                {m.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(STRATEGY_LABELS).map((key) => {
                            const s = backtestData.strategies[key as keyof BacktestResult["strategies"]];
                            return (
                              <tr key={key} className="border-b border-border/50">
                                <td className="py-2 px-3 font-medium flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full inline-block"
                                    style={{ backgroundColor: STRATEGY_COLORS[key] }}
                                  />
                                  {STRATEGY_LABELS[key]}
                                </td>
                                {metricsRows.map((m) => (
                                  <td
                                    key={m.key}
                                    className={cn("text-right py-2 px-3 font-mono", metricColor(m.key, (s as any)[m.key]))}
                                  >
                                    {m.fmt((s as any)[m.key])}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Guide */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("riskParity.metricsInterpretationTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-muted-foreground leading-relaxed">
                      {[
                        { label: "CAGR", desc: t("riskParity.metricCagrDesc") },
                        { label: "Sharpe", desc: t("riskParity.metricSharpeDesc") },
                        { label: "Sortino", desc: t("riskParity.metricSortinoDesc") },
                        { label: t("riskParity.maxDrawdown"), desc: t("riskParity.metricMaxDrawdownDesc") },
                        { label: "Calmar", desc: t("riskParity.metricCalmarDesc") },
                        { label: t("riskParity.volatility"), desc: t("riskParity.metricVolatilityDesc") },
                      ].map((item) => (
                        <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                          <p className="font-semibold text-foreground mb-1">{item.label}</p>
                          <p>{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Interpretation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("riskParity.interpretation")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {getInterpretation(backtestData, t)}
                    </p>
                  </CardContent>
                </Card>

                {/* AI Insight */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Bot className="h-5 w-5 text-indigo-500" />
                      {t("riskParity.aiInsight")}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAiInsight}
                      disabled={aiInsightLoading}
                    >
                      {aiInsightLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {t("common.analyze")}
                    </Button>
                  </div>
                  {aiInsight ? (
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {aiInsight}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("riskParity.aiInsightDescription")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
