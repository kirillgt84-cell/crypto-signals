"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"
import AdminLayout from "../components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Users, Crown, UserCheck, TrendingUp, Search, Ban, CheckCircle2, Mail, Send, Zap, Activity, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "../context/LanguageContext"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

interface AdminUser {
  id: number
  email: string | null
  username: string
  subscription_tier: string
  is_active: boolean
  created_at: string
}

interface Stats {
  total_users: number
  pro_users: number
  free_users: number
  new_users_7d: number
  registrations_by_day: { date: string; count: number }[]
}

interface ReportStatus {
  daily_subscribers: number
  weekly_subscribers: number
  last_daily_send: { sent_at: string; status: string } | null
  daily_sent_24h: number
  daily_failed_24h: number
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [scannerStatus, setScannerStatus] = useState<any>(null)
  const [scannerLogs, setScannerLogs] = useState<any[]>([])
  const [scannerLoading, setScannerLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && user?.subscription_tier !== "admin") {
      router.replace("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.subscription_tier !== "admin") return
    const token = localStorage.getItem("access_token")

    const fetchData = async () => {
      try {
        const [usersRes, statsRes, reportsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/users`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/stats`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/reports/status`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (!usersRes.ok || !statsRes.ok) {
          const err = await (usersRes.ok ? statsRes : usersRes).json()
          throw new Error(err.detail || "Failed to load admin data")
        }
        const usersData = await usersRes.json()
        const statsData = await statsRes.json()
        setUsers(usersData.users || [])
        setStats(statsData)
        if (reportsRes.ok) {
          setReportStatus(await reportsRes.json())
        }
        const [payRes, subRes, scanStatusRes, scanLogsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/payments/admin/payments`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/payments/admin/subscriptions`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/scanner/status`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/scanner/logs`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (payRes.ok) setPayments(await payRes.json())
        if (subRes.ok) setSubscriptions(await subRes.json())
        if (scanStatusRes.ok) setScannerStatus(await scanStatusRes.json())
        if (scanLogsRes.ok) setScannerLogs(await scanLogsRes.json())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase())
      const matchesTier = tierFilter === "all" || u.subscription_tier === tierFilter
      return matchesSearch && matchesTier
    })
  }, [users, search, tierFilter])

  const chartData = useMemo(() => {
    return (stats?.registrations_by_day || []).map((d) => ({
      date: formatDateLabel(d.date),
      count: d.count,
    }))
  }, [stats])

  const handleTierChange = async (userId: number, newTier: string) => {
    const token = localStorage.getItem("access_token")
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_tier: newTier }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Update failed")
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscription_tier: newTier } : u)))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleSendTest = async (type: "daily" | "weekly") => {
    const token = localStorage.getItem("access_token")
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/send-test`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed")
      setTestResult(`Test ${type} report sent to ${data.email}`)
    } catch (e: any) {
      setTestResult(`{t("common.error")}: ${e.message}`)
    } finally {
      setSendingTest(false)
    }
  }

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    const token = localStorage.getItem("access_token")
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Update failed")
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (isLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (user?.subscription_tier !== "admin") {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t("admin.totalUsers")}
            value={stats?.total_users ?? 0}
            icon={Users}
            tone="indigo"
          />
          <MetricCard
            title={t("admin.proUsers")}
            value={stats?.pro_users ?? 0}
            icon={Crown}
            tone="violet"
          />
          <MetricCard
            title={t("admin.freeUsers")}
            value={stats?.free_users ?? 0}
            icon={UserCheck}
            tone="slate"
          />
          <MetricCard
            title={t("admin.new7d")}
            value={stats?.new_users_7d ?? 0}
            icon={TrendingUp}
            tone="emerald"
          />
        </div>

        {/* Daily Reports */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("admin.dailyReports")}</CardTitle>
                <CardDescription>{t("admin.marketOverview")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendingTest}
                  onClick={() => handleSendTest("daily")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("admin.testDaily")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendingTest}
                  onClick={() => handleSendTest("weekly")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("admin.testWeekly")}
                </Button>
              </div>
            </div>
            {testResult && (
              <p className={cn("mt-2 text-xs", testResult.startsWith("Error") ? "text-red-500" : "text-emerald-600")}>
                {testResult}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                title={t("admin.dailySubscribers")}
                value={reportStatus?.daily_subscribers ?? 0}
                icon={Mail}
                tone="indigo"
              />
              <MetricCard
                title={t("admin.sent24h")}
                value={reportStatus?.daily_sent_24h ?? 0}
                icon={CheckCircle2}
                tone="emerald"
              />
              <MetricCard
                title={t("admin.failed24h")}
                value={reportStatus?.daily_failed_24h ?? 0}
                icon={Ban}
                tone="slate"
              />
            </div>
            {reportStatus?.last_daily_send && (
              <p className="mt-3 text-xs text-muted-foreground">
                Last send: {new Date(reportStatus.last_daily_send.sent_at).toLocaleString()} · Status: {" "}
                <span className={reportStatus.last_daily_send.status === "sent" ? "text-emerald-600" : "text-red-600"}>
                  {reportStatus.last_daily_send.status}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scanner Management */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("admin.scannerManagement")}</CardTitle>
                <CardDescription>{t("admin.scannerStatus")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={scannerLoading}
                  onClick={async () => {
                    setScannerLoading(true)
                    try {
                      const token = localStorage.getItem("access_token")
                      const res = await fetch(`${API_BASE_URL}/admin/scanner/run`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (res.ok) alert("Scanner job triggered")
                    } finally {
                      setScannerLoading(false)
                    }
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t("admin.runNow")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <MetricCard
                title={t("signals.minScore")}
                value={scannerStatus?.min_score ?? 5}
                icon={Zap}
                tone="amber"
              />
              <MetricCard
                title={t("admin.activeSignals")}
                value={scannerStatus?.active_signals ?? 0}
                icon={Activity}
                tone="emerald"
              />
              <MetricCard
                title={t("admin.scans24h")}
                value={scannerStatus?.runs_24h ?? 0}
                icon={CheckCircle2}
                tone="indigo"
              />
              <MetricCard
                title={t("admin.signals24h")}
                value={scannerStatus?.anomalies_24h ?? 0}
                icon={Zap}
                tone="slate"
              />
            </div>
            {scannerStatus?.last_run && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("admin.lastScan")}: {new Date(scannerStatus.last_run.run_at).toLocaleString()} · 
                {t("admin.checked")} {scannerStatus.last_run.symbols_checked} symbols · 
                {t("admin.found")} {scannerStatus.last_run.anomalies_found} anomalies · 
                {t("admin.duration")} {scannerStatus.last_run.duration_ms}ms
                {scannerStatus.last_run.error && <span className="text-red-500 ml-2">Error: {scannerStatus.last_run.error}</span>}
              </p>
            )}
            {scannerLogs.length > 0 && (
              <div className="mt-4 overflow-auto max-h-[200px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1">{t("admin.time")}</th>
                      <th className="py-1">{t("admin.checked")}</th>
                      <th className="py-1">{t("admin.found")}</th>
                      <th className="py-1">{t("admin.min")}</th>
                      <th className="py-1">{t("admin.duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannerLogs.slice(0, 10).map((log: any) => (
                      <tr key={log.id} className="border-b border-muted">
                        <td className="py-1">{new Date(log.run_at).toLocaleTimeString()}</td>
                        <td className="py-1">{log.symbols_checked}</td>
                        <td className="py-1">{log.anomalies_found}</td>
                        <td className="py-1">{log.min_score}</td>
                        <td className="py-1">{log.duration_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("admin.registrations30d")}</CardTitle>
            <CardDescription>{t("admin.newUsers")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" name="New users" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("common.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("admin.users")}</CardTitle>
                <CardDescription>{t("admin.manageTiers")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("admin.searchUsers")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 pl-9"
                  />
                </div>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t("admin.tier")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allTiers")}</SelectItem>
                    <SelectItem value="free">{t("common.free")}</SelectItem>
                    <SelectItem value="pro">{t("common.pro")}</SelectItem>
                    <SelectItem value="admin">{t("common.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.user")}</TableHead>
                    <TableHead>{t("admin.tier")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                    <TableHead>{t("admin.created")}</TableHead>
                    <TableHead className="text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {u.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{u.username}</div>
                            <div className="text-xs text-muted-foreground">{u.email || "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            u.subscription_tier === "admin" && "border-violet-200 text-violet-600",
                            u.subscription_tier === "pro" && "border-amber-200 text-amber-600",
                            u.subscription_tier === "free" && "border-slate-200 text-slate-600"
                          )}
                        >
                          {u.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {t("common.active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            {t("common.inactive")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select value={u.subscription_tier} onValueChange={(v) => handleTierChange(u.id, v)}>
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">{t("common.free")}</SelectItem>
                              <SelectItem value="pro">{t("common.pro")}</SelectItem>
                              <SelectItem value="admin">{t("common.admin")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            title={u.is_active ? t("admin.deactivate") : t("admin.activate")}
                          >
                            {u.is_active ? (
                              <Ban className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        {t("admin.noUsersFound")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("admin.payments")}</CardTitle>
            <CardDescription>{t("admin.transactions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.user")}</TableHead>
                    <TableHead>{t("admin.plan")}</TableHead>
                    <TableHead>{t("admin.amount")}</TableHead>
                    <TableHead>{t("admin.status")}</TableHead>
                    <TableHead>{t("admin.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="text-sm">{p.username}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.plan_name}</TableCell>
                      <TableCell className="text-sm">${p.amount} {p.currency}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          p.status === "captured" ? "border-emerald-200 text-emerald-600" :
                          p.status === "failed" ? "border-red-200 text-red-600" :
                          "border-slate-200 text-slate-600"
                        }>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No payments yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: number
  icon: React.ElementType
  tone: "indigo" | "violet" | "slate" | "emerald" | "amber"
}) {
  const toneClasses: Record<string, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-600",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-600",
    slate: "border-slate-500/20 bg-slate-500/5 text-slate-600",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-600",
  }
  return (
    <Card className={cn("border", toneClasses[tone])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", toneClasses[tone].split(" ").pop())} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}
