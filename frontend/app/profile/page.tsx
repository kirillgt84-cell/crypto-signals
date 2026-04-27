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
  LogOut,
  Wallet,
  Users,
} from "lucide-react"

type ProfileTab = "overview" | "security" | "preferences" | "subscription" | "partner"

const navIcons: Record<ProfileTab, React.ElementType> = {
  overview: User,
  security: Lock,
  preferences: Settings,
  subscription: CreditCard,
  partner: Users,
}

import { API_BASE_URL } from "@/app/lib/api"

export default function ProfilePage() {
  const { user, isLoading, isPaid, normalizedTier, canAccess, updateProfile, updatePreferences, changePassword, refreshUser, logout, sendVerificationEmail, verifyEmail } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const [username, setUsername] = useState(user?.username || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const [verifLoading, setVerifLoading] = useState(false)

  const showMessage = (msg: string, type: "success" | "error") => {
    if (type === "success") { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  const handleProfileUpdate = async () => {
    setLoadingAction("profile")
    try {
      await updateProfile({ username, avatar_url: avatarUrl || null })
      showMessage(t("profile.profileUpdated"), "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to update profile", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      showMessage(t("profile.passwordTooShort"), "error")
      return
    }
    if (newPassword !== confirmPassword) {
      showMessage(t("profile.passwordsMismatch"), "error")
      return
    }
    setLoadingAction("password")
    try {
      await changePassword(oldPassword, newPassword)
      showMessage(t("profile.passwordChanged"), "success")
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
      showMessage(t("profile.preferencesSaved"), "success")
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
      showMessage(t("profile.upgradeSuccess"), "success")
    } catch (e: any) {
      showMessage(e.message || "Upgrade failed", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTestEmail = async () => {
    setLoadingAction("test-email")
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/test-email`, {
        method: "POST", cache: "no-store", credentials: 'include'
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      showMessage(t("profile.testEmailSent"), "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to send test email", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTestTelegram = async () => {
    setLoadingAction("test-telegram")
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/test-telegram`, {
        method: "POST", cache: "no-store", credentials: 'include'
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      showMessage(t("profile.testTelegramSent"), "success")
    } catch (e: any) {
      showMessage(e.message || "Failed to send test Telegram", "error")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTelegramConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/telegram-link`, { cache: "no-store", credentials: 'include' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed") }
      const data = await res.json()
      window.open(data.deep_link, "_blank")
    } catch (e: any) {
      showMessage(e.message || "Failed to open Telegram link", "error")
    }
  }

  const handleSendVerification = async () => {
    setVerifLoading(true)
    try {
      await sendVerificationEmail()
      setVerificationSent(true)
      showMessage(t("profile.verificationSent"), "success")
    } catch (e: any) {
      showMessage(e.message || t("profile.verificationSendFailed"), "error")
    } finally {
      setVerifLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showMessage(t("profile.enter6DigitCode"), "error")
      return
    }
    setVerifLoading(true)
    try {
      await verifyEmail(verificationCode)
      setVerificationCode("")
      setVerificationSent(false)
      showMessage(t("profile.emailVerified"), "success")
    } catch (e: any) {
      showMessage(e.message || t("profile.verificationFailed"), "error")
    } finally {
      setVerifLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = "/"
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
            <CardTitle>{t("profile.authRequired")}</CardTitle>
            <CardDescription>{t("profile.signInToView")}</CardDescription>
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
            <h1 className="text-xl font-bold tracking-tight">{t("profile.accountSettings")}</h1>
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
                  {(Object.keys(navIcons) as ProfileTab[]).map((id) => {
                    const Icon = navIcons[id]
                    const active = activeTab === id
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {t(`profile.${id}`)}
                      </button>
                    )
                  })}
                </nav>
                <div className="mt-4 px-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.signOut")}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-9 space-y-6">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("profile.publicProfile")}</CardTitle>
                    <CardDescription>{t("profile.userVisible")}</CardDescription>
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
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200"><CheckCircle className="mr-1 h-3 w-3" /> {t("profile.verified")}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200"><AlertCircle className="mr-1 h-3 w-3" /> {t("profile.unverified")}</Badge>
                          )}
                          <Badge className={isPaid ? "bg-violet-500" : "bg-slate-500"}>{normalizedTier ? t(`common.${normalizedTier}`) : t("common.starter")}</Badge>
                          {!user.is_email_verified && user.email && (
                            <div className="mt-2 space-y-2">
                              {!verificationSent ? (
                                <Button variant="outline" size="sm" onClick={handleSendVerification} disabled={verifLoading}>
                                  {verifLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                  {t("profile.sendVerificationCode")}
                                </Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="text"
                                    maxLength={6}
                                    placeholder={t("profile.enterCode")}
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                    className="w-32 text-center"
                                  />
                                  <Button size="sm" onClick={handleVerifyCode} disabled={verifLoading}>
                                    {verifLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    {t("profile.verifyEmail")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="username">{t("profile.username")}</Label>
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avatar">{t("profile.avatarUrl")}</Label>
                        <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={loadingAction === "profile"}>
                      {loadingAction === "profile" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("common.save")}
                    </Button>

                    {user.connected_oauth && user.connected_oauth.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> {t("dashboard.connectedAccounts")}</p>
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
                    <CardTitle className="text-base font-semibold">{t("profile.subscription")}</CardTitle>
                    <CardDescription>{t("profile.planBenefits")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">{t("profile.currentPlan")}</p>
                        <p className="text-2xl font-bold tracking-tight">{normalizedTier ? t(`common.${normalizedTier}`) : t("common.starter")}</p>
                      </div>
                      {isPaid ? (
                        <Badge className="bg-emerald-500">{t("common.active")}</Badge>
                      ) : (
                        <Button onClick={handleUpgrade} disabled={loadingAction === "upgrade"}>
                          {loadingAction === "upgrade" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t("pricing.upgradeToTrader") || "Upgrade to Trader"}
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> {t("profile.realtimeData")}</li>
                      <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> {t("profile.etfFlows")}</li>
                      <li className="flex items-center gap-2"><CheckCircle className={cn("h-4 w-4", canAccess("anomaly_scanner") ? "text-emerald-500" : "text-slate-400")} /> {t("profile.oiSignals")} {canAccess("anomaly_scanner") ? "" : `( ${t("common.trader")} )`}</li>
                      <li className="flex items-center gap-2"><CheckCircle className={cn("h-4 w-4", canAccess("alerts_realtime") ? "text-emerald-500" : "text-slate-400")} /> {t("profile.emailTelegram")} {canAccess("alerts_realtime") ? "" : `( ${t("common.trader")} )`}</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("dashboard.connectWallet")}</CardTitle>
                    <CardDescription>{t("dashboard.connectWalletDesc") || "Connect your crypto wallet for portfolio sync"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">{t("dashboard.walletStatus") || "Status"}</p>
                        <p className="text-sm text-muted-foreground">{t("dashboard.notConnected") || "Not connected"}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {t("dashboard.connect")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "security" && (
              <Card className="border max-w-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{t("profile.security")}</CardTitle>
                  <CardDescription>{t("profile.passwordSecurity")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">{t("profile.currentPassword")}</Label>
                    <Input id="old-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("profile.newPassword")}</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("profile.confirmPassword")}</Label>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  <Button onClick={handlePasswordChange} disabled={loadingAction === "password"}>
                    {loadingAction === "password" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("profile.updatePassword")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === "preferences" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> {t("profile.theme")}</CardTitle>
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
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> {t("profile.language")}</CardTitle>
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
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> {t("common.notifications")}</CardTitle>
                    <CardDescription>{t("profile.browserAlerts")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notif">{t("profile.pushNotifications")}</Label>
                        <p className="text-xs text-muted-foreground">{t("profile.browserAlertsDesc")}</p>
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

            {activeTab === "partner" && (
              <div className="space-y-4">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Partner Program</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Invite friends and earn 20% from their Pro subscriptions.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/partner"}>
                      Open Partner Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="space-y-4">
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("profile.reportSubscriptions")}</CardTitle>
                    <CardDescription>{t("profile.reportPreferences")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("profile.dailyMarketReport")}</Label>
                        <p className="text-xs text-muted-foreground">{t("profile.dailyReportDesc")}</p>
                      </div>
                      <Switch checked={user.preferences?.daily_report ?? false} onCheckedChange={(v) => handlePrefToggle("daily_report", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("profile.weeklyMarketReport")}</Label>
                        <p className="text-xs text-muted-foreground">{t("profile.weeklyReportDesc")}</p>
                      </div>
                      <Switch checked={user.preferences?.weekly_report ?? false} onCheckedChange={(v) => handlePrefToggle("weekly_report", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("profile.telegramAlertsLabel")}</Label>
                        <p className="text-xs text-muted-foreground">{t("profile.telegramAlertsDesc")}</p>
                      </div>
                      <Switch checked={user.preferences?.telegram_alerts ?? false} onCheckedChange={(v) => handlePrefToggle("telegram_alerts", v)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> {t("profile.telegramConnection")}</CardTitle>
                    <CardDescription>{t("profile.linkTelegram")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="text-sm font-medium">{t("common.status")}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.preferences?.telegram_chat_id ? t("profile.connected") : t("profile.notConnected")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleTelegramConnect}>
                        {user.preferences?.telegram_chat_id ? t("profile.reconnect") : t("profile.connectTelegram")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {isPaid && (
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> {t("profile.testNotifications")}</CardTitle>
                      <CardDescription>{t("profile.testMessage")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={loadingAction === "test-email"}>
                          {loadingAction === "test-email" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t("profile.sendTestEmail")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleTestTelegram} disabled={loadingAction === "test-telegram" || !user.preferences?.telegram_chat_id}>
                          {loadingAction === "test-telegram" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t("profile.sendTestTelegram")}
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
