"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "next-themes"
import { useLanguage } from "../context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  CheckCircle,
  Lock,
  User,
  Settings,
  CreditCard,
  Loader2,
  ArrowLeft,
  Send,
  Mail,
  Globe,
  Palette,
  Shield,
  Bell,
} from "lucide-react"

type ProfileTab = "overview" | "security" | "preferences" | "subscription"

const navItems: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "subscription", label: "Subscription", icon: CreditCard },
]

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

export default function ProfilePage() {
  const { user, isLoading, isPro, updateProfile, updatePreferences, changePassword, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const [username, setUsername] = useState(user?.username || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const showMessage = (msg: string, type: "success" | "error") => {
    if (type === "success") { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  const handleProfileUpdate = async () => {
    setLoadingAction("profile")
    try {
      await updateProfile({ username, avatar_url: avatarUrl || null })
      showMessage("Profile updated successfully", "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to update profile", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      showMessage("Password must be at least 8 characters", "error")
      return
    }
    if (newPassword !== confirmPassword) {
      showMessage("Passwords do not match", "error")
      return
    }
    setLoadingAction("password")
    try {
      await changePassword(oldPassword, newPassword)
      showMessage("Password changed successfully", "success")
      setOldPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch (e: any) {
      showMessage(e.message || "Failed to change password", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePrefToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences({ [key]: value } as any)
      showMessage("Preferences saved", "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to save preferences", "error")
    }
  }

  const handleThemeChange = (t: string) => {
    setTheme(t)
    updatePreferences({ theme: t }).catch(() => {})
  }

  const handleLanguageChange = (lang: "en" | "ru") => {
    setLanguage(lang)
    updatePreferences({ language: lang }).catch(() => {})
  }

  const handleUpgrade = async () => {
    setLoadingAction("upgrade")
    try {
      await updateProfile({ subscription_tier: "pro" })
      await refreshUser()
      showMessage("Upgraded to Pro! (Payment integration coming soon)", "success")
    } catch (e: any) {
      showMessage(e.message || "Upgrade failed", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTestEmail = async () => {
    setLoadingAction("test-email")
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${API_BASE_URL}/auth/me/test-email`, {
        method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      showMessage("Test email sent! Check your inbox.", "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to send test email", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTestTelegram = async () => {
    setLoadingAction("test-telegram")
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${API_BASE_URL}/auth/me/test-telegram`, {
        method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      showMessage("Test Telegram message sent!", "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to send test Telegram", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTelegramConnect = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const res = await fetch(`${API_BASE_URL}/auth/me/telegram-link`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      const data = await res.json()
      window.open(data.deep_link, "_blank")
    } catch (e: any) {
      showMessage(e.message || "Failed to open Telegram link", "error")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Account Settings</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 lg:p-6">
        {(error || success) && (
          <div className={cn("mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm", error ? "border-destructive/50 text-destructive" : "border-emerald-500/50 text-emerald-600")}>
            {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <span>{error || success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <Card className="border">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const active = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-9 space-y-6">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Public Profile</CardTitle>
                    <CardDescription>Your username and avatar are visible in the app.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user.avatar_url || ""} alt={user.username} />
                        <AvatarFallback className="text-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {user.username?.slice(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {user.is_email_verified ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200"><CheckCircle className="mr-1 h-3 w-3" /> Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200"><AlertCircle className="mr-1 h-3 w-3" /> Unverified</Badge>
                          )}
                          <Badge className={isPro ? "bg-violet-500" : "bg-slate-500"}>{isPro ? "Pro" : "Free"}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar">Avatar URL</Label>
                        <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={loadingAction === "profile"}>
                      {loadingAction === "profile" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Profile
                    </Button>

                    {user.connected_oauth && user.connected_oauth.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Connected Accounts</p>
                        <div className="flex flex-wrap gap-2">
                          {user.connected_oauth.map((provider) => (
                            <Badge key={provider} variant="secondary" className="capitalize">{provider}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Subscription</CardTitle>
                    <CardDescription>Current plan and benefits.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">Current Plan</p>
                        <p className="text-2xl font-bold tracking-tight">{isPro ? "Pro" : "Free"}</p>
                      </div>
                      {isPro ? (
                        <Badge className="bg-emerald-500">Active</Badge>
                      ) : (
                        <Button onClick={handleUpgrade} disabled={loadingAction === "upgrade"}>
                          {loadingAction === "upgrade" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Upgrade
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Real-time market data</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> ETF flows & sentiment</li>
                      <li className="flex items-center gap-2"><CheckCircle className={cn("h-4 w-4", isPro ? "text-emerald-500" : "text-slate-400")} /> OI interpretation & signals {isPro ? "" : "(Pro)"}</li>
                      <li className="flex items-center gap-2"><CheckCircle className={cn("h-4 w-4", isPro ? "text-emerald-500" : "text-slate-400")} /> Email & Telegram reports {isPro ? "" : "(Pro)"}</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "security" && (
              <Card className="border max-w-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Security</CardTitle>
                  <CardDescription>Change your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">Current Password</Label>
                    <Input id="old-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <Button onClick={handlePasswordChange} disabled={loadingAction === "password"}>
                    {loadingAction === "password" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === "preferences" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> Theme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {["light", "dark", "system"].map((t) => (
                        <Button key={t} variant={theme === t ? "default" : "outline"} size="sm" onClick={() => handleThemeChange(t)} className="capitalize">{t}</Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Language</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant={language === "ru" ? "default" : "outline"} size="sm" onClick={() => handleLanguageChange("ru")}>Русский</Button>
                      <Button variant={language === "en" ? "default" : "outline"} size="sm" onClick={() => handleLanguageChange("en")}>English</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
                    <CardDescription>Browser and push alerts.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notif">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive browser alerts for signals.</p>
                      </div>
                      <Switch
                        id="notif"
                        checked={user.preferences?.notifications_enabled ?? true}
                        onCheckedChange={(v) => handlePrefToggle("notifications_enabled", v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="space-y-4">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Report Subscriptions</CardTitle>
                    <CardDescription>Choose which reports and alerts you want to receive.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Daily Market Report</Label>
                        <p className="text-xs text-muted-foreground">Morning summary for all assets.</p>
                      </div>
                      <Switch checked={user.preferences?.daily_report ?? false} onCheckedChange={(v) => handlePrefToggle("daily_report", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Market Report</Label>
                        <p className="text-xs text-muted-foreground">Deep dive every Monday.</p>
                      </div>
                      <Switch checked={user.preferences?.weekly_report ?? false} onCheckedChange={(v) => handlePrefToggle("weekly_report", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Telegram Alerts</Label>
                        <p className="text-xs text-muted-foreground">Instant signals and anomalies.</p>
                      </div>
                      <Switch checked={user.preferences?.telegram_alerts ?? false} onCheckedChange={(v) => handlePrefToggle("telegram_alerts", v)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Telegram Connection</CardTitle>
                    <CardDescription>Link your Telegram account for instant alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <p className="text-xs text-muted-foreground">
                          {user.preferences?.telegram_chat_id ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleTelegramConnect}>
                        {user.preferences?.telegram_chat_id ? "Reconnect" : "Connect Telegram"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {isPro && (
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Test Notifications</CardTitle>
                      <CardDescription>Send a test message to verify delivery.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={loadingAction === "test-email"}>
                          {loadingAction === "test-email" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Test Email
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleTestTelegram} disabled={loadingAction === "test-telegram" || !user.preferences?.telegram_chat_id}>
                          {loadingAction === "test-telegram" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send Test Telegram
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
