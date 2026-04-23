"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";

import { API_BASE_URL } from "@/app/lib/api"

const freeFeatures = [
  "Real-time Dashboard (Price, OI, Volume, CVD)",
  "Technical Indicators (RSI, MACD, Funding, Flows)",
  "Interactive TradingView Chart",
  "OI Analysis & Market Signals",
  "Macro Dashboard (SPX500, Gold, VIX)",
  "Portfolio Tracking (Manual + Binance)",
  "ETF Flows",
  "Paper Trading",
];

const proFeatures = [
  "Everything in FREE",
  "Volume Spike & OI Anomaly Scanner",
  "Advanced Heatmap",
  "Daily Market Reports",
  "Telegram & Email Alerts",
  "Short Term Entry Levels",
  "Pro Fundamentals (MVRV, NUPL)",
  "AI Portfolio Insights",
  "Liquidation & PnL Alerts",
];

export default function PricingClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useLanguage();

  const payment = searchParams.get("payment");

  useEffect(() => {
    if (payment === "success") {
      setMessage(t("pricing.success"));
    } else if (payment === "cancelled") {
      setMessage(t("pricing.cancel"));
    }
  }, [payment]);

  const isPro = user?.subscription_tier === "pro" || user?.subscription_tier === "admin";

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    if (isPro) return;
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/create-trial`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billing_cycle: billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create subscription");
      }
      if (data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        setMessage("No approval URL received from PayPal");
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFreeStart = () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="mx-auto max-w-5xl px-4 py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-wider text-foreground flex items-center justify-center gap-3">
              <Crown className="h-8 w-8 text-amber-400" />
              {t("pricing.title")}
            </h1>
            <p className="mt-2 text-slate-400">
              Unlock the full potential of your trading analytics
            </p>
            {isPro && (
              <Badge className="mt-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Check className="mr-1 h-3 w-3" /> {t("pricing.currentPlan")}
              </Badge>
            )}
          </div>

          {message && (
            <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${message.includes("successful") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
              {message}
            </div>
          )}

          {/* Plans */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {/* FREE */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{t("pricing.freePlan")}</CardTitle>
                  <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-[10px]">FOREVER FREE</Badge>
                </div>
                <p className="text-sm text-slate-400">{t("pricing.freeDescription")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-sm text-slate-500">{t("pricing.perMonth")}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {freeFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  onClick={handleFreeStart}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* PRO */}
            <Card className="border-amber-500/30 ring-1 ring-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{t("pricing.proPlan")}</CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                    <Zap className="mr-1 h-3 w-3" /> PRO
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{t("pricing.proDescription")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                      billingCycle === "monthly" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("pricing.monthly")}
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                      billingCycle === "yearly" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("pricing.yearly")}
                  </button>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${billingCycle === "monthly" ? "25" : "19"}</span>
                  <span className="text-sm text-slate-500">/mo</span>
                  {billingCycle === "yearly" && (
                    <span className="ml-2 text-xs text-slate-400">billed as $228/yr</span>
                  )}
                </div>

                <ul className="space-y-2 text-sm text-slate-300">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className={cn("h-4 w-4 shrink-0", f.startsWith("Everything") ? "text-emerald-400" : "text-amber-400")} /> {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-amber-500 text-black hover:bg-amber-600 font-semibold"
                  onClick={handleSubscribe}
                  disabled={processing || isPro}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPro ? (
                    t("pricing.currentPlan")
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {t("pricing.upgradeToPro")}
                    </>
                  )}
                </Button>
                <p className="text-center text-[10px] text-slate-500">
                  No charge for 7 days. Cancel anytime. PayPal required.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
