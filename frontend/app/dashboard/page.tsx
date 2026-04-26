"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Mail, Shield, LogOut, Settings, Bell, Moon, Globe } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { ProtectedRoute } from "../components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    router.replace("/app")
  }, [router])
  const [preferences, setPreferences] = useState({
    theme: "dark",
    language: "en",
    notifications: true
  })

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("dashboard.personalDashboard")}</h1>
          <Button variant="outline" onClick={() => router.push("/")}>
            {t("dashboard.backToTrading")}
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("dashboard.profileInformation")}
            </CardTitle>
            <CardDescription>{t("dashboard.accountDetails")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">
                {user?.username?.slice(0, 2).toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email || t("userMenu.noEmail")}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{t("dashboard.email")}: {user?.email || t("dashboard.notSet")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>{t("dashboard.status")}: {user?.is_email_verified ? t("dashboard.verified") : t("dashboard.unverified")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t("profile.preferences")}
            </CardTitle>
            <CardDescription>{t("dashboard.customizeExperience")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <Label htmlFor="theme">{t("dashboard.darkMode")}</Label>
              </div>
              <Select value={preferences.theme} onValueChange={(v) => setPreferences(p => ({ ...p, theme: v }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{t("dashboard.themeDark")}</SelectItem>
                  <SelectItem value="light">{t("dashboard.themeLight")}</SelectItem>
                  <SelectItem value="system">{t("dashboard.themeSystem")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <Label htmlFor="language">{t("dashboard.language")}</Label>
              </div>
              <Select value={preferences.language} onValueChange={(v) => setPreferences(p => ({ ...p, language: v }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Label htmlFor="notifications">{t("dashboard.notifications")}</Label>
              </div>
              <Switch
                id="notifications"
                checked={preferences.notifications}
                onCheckedChange={(v) => setPreferences(p => ({ ...p, notifications: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.connectedAccounts")}</CardTitle>
            <CardDescription>{t("dashboard.manageOAuth")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(user as any)?.connected_oauth?.map((provider: string) => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="capitalize font-medium">{provider}</span>
                  <span className="text-sm text-green-500">{t("dashboard.connected")}</span>
                </div>
              )) || (
                <p className="text-muted-foreground text-sm">{t("dashboard.noOAuthConnected")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t("dashboard.dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              {t("common.signOut")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
