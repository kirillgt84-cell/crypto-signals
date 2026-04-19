"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { ProBlurOverlay } from "../components/ProBlurOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: string;
  tier: string;
}

const API_BASE = "https://crypto-signals-production-ff4c.up.railway.app/api/v1";

export default function PricingClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const payment = searchParams.get("payment");
  const orderId = searchParams.get("order_id");
  const token = searchParams.get("token"); // PayPal returns token on redirect

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/payments/plans`, { cache: "no-store" });
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      } catch (e) {
        setMessage("Failed to load plans");
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Handle return from PayPal
  const capturePayment = useCallback(async () => {
    if (payment === "success" && (orderId || token)) {
      const idToCapture = orderId || token;
      setMessage("Processing payment...");
      try {
        const accessToken = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/payments/capture-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ order_id: idToCapture }),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage("Payment successful! Your account has been upgraded to Pro.");
        } else {
          setMessage(`Payment failed: ${data.detail || "Unknown error"}`);
        }
      } catch (e: any) {
        setMessage(`Error: ${e.message}`);
      }
    } else if (payment === "cancelled") {
      setMessage("Payment cancelled. You can try again.");
    }
  }, [payment, orderId, token]);

  useEffect(() => {
    capturePayment();
  }, [capturePayment]);

  const handleSubscribe = async (planId: number) => {
    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    setProcessing(planId);
    setMessage(null);
    try {
      const accessToken = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create order");
      }
      if (data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        setMessage("No approval URL received from PayPal");
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const isPro = user?.subscription_tier === "pro" || user?.subscription_tier === "admin";

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-200">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-wider text-white flex items-center justify-center gap-3">
            <Crown className="h-8 w-8 text-amber-400" />
            UPGRADE TO PRO
          </h1>
          <p className="mt-2 text-slate-400">
            Unlock premium signals, scanner, and advanced analytics
          </p>
          {isPro && (
            <Badge className="mt-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Check className="mr-1 h-3 w-3" /> You are already Pro
            </Badge>
          )}
        </div>

        {message && (
          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${message.includes("successful") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
            {message}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-slate-800 bg-[#0f1420]">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-32 bg-slate-800" />
                  <Skeleton className="h-10 w-24 bg-slate-800" />
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-10 w-full bg-slate-800" />
                </CardContent>
              </Card>
            ))
          ) : (
            plans.map((plan) => {
              const isYearly = plan.name.toLowerCase().includes("year");
              const isLifetime = plan.type === "one_time";
              return (
                <Card
                  key={plan.id}
                  className={`border-slate-800 bg-[#0f1420] ${isYearly ? "ring-1 ring-amber-500/40" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-white">{plan.name}</CardTitle>
                      {isYearly && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                          BEST VALUE
                        </Badge>
                      )}
                      {isLifetime && (
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px]">
                          ONE-TIME
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${plan.price}</span>
                      <span className="text-sm text-slate-500">
                        {plan.currency}
                        {plan.type === "subscription" && !isLifetime && "/mo"}
                      </span>
                    </div>

                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" /> Volume Spike Scanner
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" /> OI Anomaly Alerts
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" /> Advanced Heatmap
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" /> Daily Market Reports
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" /> Telegram & Email Alerts
                      </li>
                    </ul>

                    <Button
                      className={`w-full ${isYearly ? "bg-amber-500 text-black hover:bg-amber-600" : "bg-slate-800 text-white hover:bg-slate-700"}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processing === plan.id || isPro}
                    >
                      {processing === plan.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isPro ? (
                        "Already Pro"
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          {isLifetime ? "Buy Lifetime" : "Subscribe"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
