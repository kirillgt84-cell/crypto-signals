"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown, Loader2 } from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";

import { API_BASE_URL } from "@/app/lib/api";

export default function PricingClient() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [isYearly, setIsYearly] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [referralEligible, setReferralEligible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated) {
      fetch(`${API_BASE_URL}/partner/check-eligibility`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setReferralEligible(data.eligible));
    }
  }, [isAuthenticated]);

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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billing_cycle: isYearly ? "yearly" : "monthly" }),
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
    window.location.href = "/app";
  };

  const freeFeatures = [
    "landing.pricing.free.feature1",
    "landing.pricing.free.feature2",
    "landing.pricing.free.feature3",
    "landing.pricing.free.feature4",
    "landing.pricing.free.feature5",
    "landing.pricing.free.feature6",
    "landing.pricing.free.feature7",
    "landing.pricing.free.feature8",
  ];

  const proFeatures = [
    "landing.pricing.pro.feature1",
    "landing.pricing.pro.feature2",
    "landing.pricing.pro.feature3",
    "landing.pricing.pro.feature4",
    "landing.pricing.pro.feature5",
    "landing.pricing.pro.feature6",
    "landing.pricing.pro.feature7",
    "landing.pricing.pro.feature8",
  ];

  const proPrice = isYearly ? "$19" : "$17";
  const proPeriod = isYearly
    ? t("landing.pricing.billedYearly") || "/mo billed annually"
    : `/${t("landing.pricing.period")}`;

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
            <p className="mt-2 text-muted-foreground">
              {t("landing.pricing.subtitle")}
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

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 pt-4 mb-10">
            <button
              onClick={() => setIsYearly(true)}
              className={`text-lg font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("landing.pricing.yearly") || "Yearly"}
            </button>
            <div
              className="relative w-14 h-8 rounded-full bg-muted cursor-pointer border border-border"
              onClick={() => setIsYearly(!isYearly)}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-primary transition-transform ${isYearly ? "translate-x-0" : "translate-x-6"}`}
              />
            </div>
            <button
              onClick={() => setIsYearly(false)}
              className={`text-lg font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("landing.pricing.monthly") || "Monthly"}
            </button>
            {isYearly && (
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                {t("landing.pricing.save") || "Save 24%"}
              </Badge>
            )}
          </div>

          {/* Plans */}
          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            {/* Free Plan */}
            <Card className="flex flex-col border-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted to-muted/50" />
              <CardHeader className="pb-4 pt-8">
                <CardTitle className="flex items-center justify-between text-2xl">
                  <span className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    {t("landing.pricing.free.name")}
                  </span>
                </CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold tracking-tight">{t("landing.pricing.free.price")}</span>
                  <span className="text-muted-foreground text-lg"> /{t("landing.pricing.period")}</span>
                </div>
                <CardDescription className="text-base mt-3 leading-relaxed">
                  {t("landing.pricing.free.description")}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4">
                <Button className="w-full text-base py-6" variant="outline" onClick={handleFreeStart}>
                  {t("landing.pricing.free.cta")}
                </Button>
              </CardContent>

              <hr className="border-dashed mx-6" />

              <CardFooter className="flex-1 pt-6 pb-8">
                <ul className="space-y-4 w-full">
                  {freeFeatures.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-base text-muted-foreground leading-snug">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="flex flex-col border-2 border-primary/40 relative overflow-hidden shadow-2xl shadow-primary/10">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />
              <CardHeader className="pb-4 pt-8">
                <CardTitle className="flex items-center justify-between text-2xl">
                  <span className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-primary fill-primary" />
                    {t("landing.pricing.pro.name")}
                  </span>
                  <Badge variant="secondary" className="text-sm text-primary font-semibold px-3 py-1">
                    {t("landing.pricing.popular")}
                  </Badge>
                </CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold tracking-tight">{proPrice}</span>
                  {!isYearly && (
                    <span className="text-muted-foreground text-lg line-through ml-2">$25</span>
                  )}
                  <span className="text-muted-foreground text-lg"> {proPeriod}</span>
                </div>
                {!isYearly && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("landing.pricing.firstMonth")}, {t("landing.pricing.thenMonthly")}
                  </p>
                )}
                <CardDescription className="text-base mt-3 leading-relaxed">
                  {t("landing.pricing.pro.description")}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4">
                <Button
                  className="w-full text-base py-6"
                  onClick={handleSubscribe}
                  disabled={processing || isPro}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isPro ? (
                    t("pricing.currentPlan")
                  ) : (
                    <>
                      <Star className="mr-2 h-4 w-4" />
                      {t("landing.pricing.pro.cta")}
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  No charge for 7 days. Cancel anytime. PayPal required.
                </p>
              </CardContent>

              <hr className="border-dashed mx-6" />

              <CardFooter className="flex-1 pt-6 pb-8">
                <ul className="space-y-4 w-full">
                  <li className="flex items-start gap-3 pb-3 border-b border-dashed">
                    <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-base font-semibold text-foreground leading-snug">
                      {t("landing.pricing.includesFree")}
                    </span>
                  </li>
                  {proFeatures.map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-base text-muted-foreground leading-snug">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
