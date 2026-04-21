"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Lock, User, Chrome, Send, Twitter, MessageCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const { login, register, loginWithOAuth, loginWithTelegram } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      if (activeTab === "login") {
        await login(email, password)
        onClose()
      } else {
        await register(email, password, username || undefined)
        onClose()
        router.push("/profile")
      }
    } catch (err: any) {
      setError(err.message || t("authModal.unknownError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = (provider: string) => loginWithOAuth(provider)

  const handleTelegramAuth = (user: any) => {
    loginWithTelegram(user).then(() => {
      onClose()
      router.push("/profile")
    }).catch((err: any) => setError(err.message))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === "login" ? t("authModal.welcomeBack") : t("authModal.createAccount")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("login")}
          >
            {t("common.signIn")}
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("register")}
          >
            {t("auth.createAccount")}
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={8} />
          </div>
          {activeTab === "register" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder={t("profile.username") + " (" + t("common.optional") + ")"} value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <span className="animate-pulse">{t("common.loading")}</span> : activeTab === "login" ? t("common.signIn") : t("authModal.createAccount")}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-muted" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => handleOAuth("google")} className="flex items-center gap-2">
            <Chrome className="w-4 h-4" />{t("auth.google")}
          </Button>
          <Button variant="outline" onClick={() => handleOAuth("twitter")} className="flex items-center gap-2">
            <Twitter className="w-4 h-4" />Twitter
          </Button>
          <Button variant="outline" onClick={() => handleOAuth("discord")} className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />Discord
          </Button>
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TelegramLoginButton({ onAuth }: { onAuth: (user: any) => void }) {
  const { t } = useLanguage()
  return (
    <Button
      variant="outline"
      onClick={() => window.open("https://t.me/your_bot_username?start=auth", "_blank", "width=400,height=600")}
      className="w-full flex items-center gap-2"
      style={{ backgroundColor: "#0088cc", color: "white", borderColor: "#0088cc" }}
    >
      <Send className="w-4 h-4" />{t("auth.telegram")}
    </Button>
  )
}
