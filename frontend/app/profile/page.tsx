"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "next-themes"
import { useLanguage } from "../context/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Lock, User, Settings, CreditCard, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user, isLoading, isPro, updateProfile, updatePreferences, changePassword, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  const [activeTab, setActiveTab] = useState("profile")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Profile form
  const [username, setUsername] = useState(user?.username || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")

  // Security form
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
      // Placeholder: directly set pro tier for testing
      await updateProfile({ subscription_tier: "pro" } as any)
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
      const res = await fetch(`https://crypto-signals-production-ff4c.up.railway.app/api/v1/auth/me/test-email`, {
        method: "POST",
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to send test email")
      }
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
      const res = await fetch(`https://crypto-signals-production-ff4c.up.railway.app/api/v1/auth/me/test-telegram`, {
        method: "POST",
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to send test Telegram")
      }
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
      const res = await fetch(`https://crypto-signals-production-ff4c.up.railway.app/api/v1/auth/me/telegram-link`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to get Telegram link")
      }
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, security, and subscription preferences.</p>
        </div>

        {(error || success) && (
          <div className={cn("mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm", error ? "border-destructive/50 text-destructive" : "border-emerald-500/50 text-emerald-600")}>
            {error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <span>{error || success}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile"><User className="mr-2 h-4 w-4 hidden sm:inline" />Profile</TabsTrigger>
            <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4 hidden sm:inline" />Security</TabsTrigger>
            <TabsTrigger value="preferences"><Settings className="mr-2 h-4 w-4 hidden sm:inline" />Prefs</TabsTrigger>
            <TabsTrigger value="subscription"><CreditCard className="mr-2 h-4 w-4 hidden sm:inline" />Plan</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
                <CardDescription>Your username and avatar are visible in the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar_url || ""} alt={user.username} />
                    <AvatarFallback className="text-lg">{user.username?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
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
                      <Badge className={isPro ? "bg-amber-500" : "bg-slate-500"}>{isPro ? "Pro" : "Free"}</Badge>
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
                    <p className="text-sm font-medium mb-2">Connected Accounts</p>
                    <div className="flex flex-wrap gap-2">
                      {user.connected_oauth.map((provider) => (
                        <Badge key={provider} variant="secondary" className="capitalize">{provider}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Change your password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
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
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-md">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    {["light", "dark", "system"].map((t) => (
                      <Button key={t} variant={theme === t ? "default" : "outline"} size="sm" onClick={() => handleThemeChange(t)} className="capitalize">{t}</Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Language</Label>
                  <div className="flex gap-2">
                    <Button variant={language === "ru" ? "default" : "outline"} size="sm" onClick={() => handleLanguageChange("ru")}>Русский</Button>
                    <Button variant={language === "en" ? "default" : "outline"} size="sm" onClick={() => handleLanguageChange("en")}>English</Button>
                  </div>
                </div>

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
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>Manage your plan and report preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Current Plan</p>
                    <p className="text-2xl font-bold tracking-tight">{isPro ? "Pro" : "Free"}</p>
                    <p className="text-xs text-muted-foreground">{isPro ? "Full access to all features" : "Basic data and charts"}</p>
                  </div>
                  {!isPro ? (
                    <Button onClick={handleUpgrade} disabled={loadingAction === "upgrade"}>
                      {loadingAction === "upgrade" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upgrade to Pro
                    </Button>
                  ) : (
                    <Badge className="bg-emerald-500">Active</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium">Telegram Connection</p>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-xs text-muted-foreground">
                        {user.preferences?.telegram_chat_id ? "Connected" : "Not connected"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleTelegramConnect}>
                      {user.preferences?.telegram_chat_id ? "Reconnect Telegram" : "Connect Telegram"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium">Report Subscriptions</p>
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
                </div>

                {isPro && (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Test Notifications</p>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
