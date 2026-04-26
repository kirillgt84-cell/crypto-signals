"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "../components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { API_BASE_URL } from "@/app/lib/api";
import { Users, Copy, Loader2, Gift, TrendingUp } from "lucide-react";

interface PartnerStats {
  code: string | null;
  referral_link: string | null;
  total_referrals: number;
  active_referrals: number;
  total_earned: number;
  available_balance: number;
  referrals: any[];
  transactions: any[];
}

export default function PartnerPage() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/stats`, {
        credentials: "include",
      });
      if (res.ok) {
        setStats(await res.json());
      } else {
        const text = await res.text();
        setError(text || t("partner.statsError"));
      }
    } catch (e) {
      console.error("Partner stats fetch failed", e);
      setError(t("partner.statsError"));
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/generate-code`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStats((prev) =>
          prev
            ? { ...prev, code: data.code, referral_link: data.referral_link }
            : null
        );
      } else {
        const text = await res.text();
        setError(text || t("partner.generateError"));
      }
    } catch (e) {
      console.error("Generate code failed", e);
      setError(t("partner.generateError"));
    }
  };

  const copyLink = () => {
    if (stats?.referral_link) {
      navigator.clipboard.writeText(stats.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("partner.signInRequired")}</p>
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Gift className="h-6 w-6 text-indigo-500" />
              {t("partner.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("partner.subtitle")}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              {t("common.loading")}
            </div>
          ) : stats?.code ? (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("partner.totalReferrals")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.total_referrals}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("partner.active")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.active_referrals}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("partner.totalEarned")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${stats.total_earned.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground uppercase">{t("partner.available")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${stats.available_balance.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{t("partner.yourReferralLink")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono break-all">
                      {stats.referral_link}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyLink}>
                      {copied ? t("partner.copied") : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("partner.shareText")}
                  </p>
                </CardContent>
              </Card>

              {/* Referrals Table */}
              {stats.referrals && stats.referrals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("partner.yourReferrals")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("partner.user")}</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("partner.status")}</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("partner.joined")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("partner.revenue")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.referrals.map((ref: any) => (
                            <tr key={ref.id} className="border-b border-border/50">
                              <td className="py-2 px-3">{ref.username || ref.email}</td>
                              <td className="py-2 px-3">
                                <Badge variant={ref.status === "subscribed" ? "default" : "secondary"}>
                                  {ref.status === "subscribed" ? t("partner.subscribed") : t("partner.pending")}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {new Date(ref.joined_at).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                ${parseFloat(ref.revenue_generated || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transactions */}
              {stats.transactions && stats.transactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("partner.earningsHistory")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("partner.date")}</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t("partner.type")}</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">{t("partner.amount")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.transactions.map((tx: any) => (
                            <tr key={tx.id} className="border-b border-border/50">
                              <td className="py-2 px-3 text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3">{
                                tx.type === "reward" ? t("partner.reward") :
                                tx.type === "payout" ? t("partner.payout") :
                                tx.type
                              }</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-500">
                                +${parseFloat(tx.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent className="space-y-4">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">{t("partner.becomePartner")}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t("partner.becomeDescription")}
                </p>
                <Button onClick={generateCode}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t("partner.generateCode")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
