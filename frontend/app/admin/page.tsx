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
import { Loader2, Users, Crown, UserCheck, TrendingUp, Search, Ban, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
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

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")

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
        const [usersRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/users`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/admin/stats`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (!usersRes.ok || !statsRes.ok) {
          const err = await (usersRes.ok ? statsRes : usersRes).json()
          throw new Error(err.detail || "Failed to load admin data")
        }
        const usersData = await usersRes.json()
        const statsData = await statsRes.json()
        setUsers(usersData.users || [])
        setStats(statsData)
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
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview, analytics and user management.</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={stats?.total_users ?? 0}
            icon={Users}
            tone="indigo"
          />
          <MetricCard
            title="Pro Users"
            value={stats?.pro_users ?? 0}
            icon={Crown}
            tone="violet"
          />
          <MetricCard
            title="Free Users"
            value={stats?.free_users ?? 0}
            icon={UserCheck}
            tone="slate"
          />
          <MetricCard
            title="New (7d)"
            value={stats?.new_users_7d ?? 0}
            icon={TrendingUp}
            tone="emerald"
          />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Registrations (30 days)</CardTitle>
            <CardDescription>New user sign-ups by day</CardDescription>
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
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Users</CardTitle>
                <CardDescription>Manage tiers and access</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 pl-9"
                  />
                </div>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tiers</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
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
                    <TableHead>User</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Inactive
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
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            title={u.is_active ? "Deactivate" : "Activate"}
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
                        No users found.
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
  tone: "indigo" | "violet" | "slate" | "emerald"
}) {
  const toneClasses: Record<string, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-600",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-600",
    slate: "border-slate-500/20 bg-slate-500/5 text-slate-600",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
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
