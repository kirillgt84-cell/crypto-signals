"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"
import AdminLayout from "../components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface AdminUser {
  id: number
  email: string | null
  username: string
  subscription_tier: string
  is_active: boolean
  created_at: string
}

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && user?.subscription_tier !== "admin") {
      router.replace("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.subscription_tier !== "admin") return
    
    const fetchUsers = async () => {
      const token = localStorage.getItem("access_token")
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || "Failed to load users")
        }
        const data = await res.json()
        setUsers(data.users || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [user])

  const handleTierChange = async (userId: number, newTier: string) => {
    const token = localStorage.getItem("access_token")
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subscription_tier: newTier })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Update failed")
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u))
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
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage users and subscription tiers.</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.subscription_tier}
                        onValueChange={(v) => handleTierChange(u.id, v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
