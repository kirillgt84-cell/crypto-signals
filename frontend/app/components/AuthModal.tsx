"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, User, ArrowLeft } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const { login, register, forgotPassword } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    const match = document.cookie.match(/ref_code=([^;]+)/)
    if (match) {
      setReferralCode(match[1])
    }
  }, [])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultTab)
      setError(null)
      setSuccess(null)
    }
  }, [isOpen, defaultTab])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      if (mode === "login") {
        await login(email, password)
        onClose()
        router.push("/app")
      } else if (mode === "register") {
        await register(email, password, username || undefined, referralCode || undefined)
        onClose()
        router.push("/app")
      }
    } catch (err: any) {
      setError(err.message || t("authModal.unknownError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await forgotPassword(email)
      setSuccess(t("auth.resetLinkSent") || "Reset link sent! Check your email.")
    } catch (err: any) {
      setError(err.message || t("authModal.unknownError"))
    } finally {
      setIsLoading(false)
    }
  }

  const title =
    mode === "login"
      ? t("authModal.welcomeBack")
      : mode === "register"
      ? t("authModal.createAccount")
      : t("auth.forgotPasswordTitle") || "Reset Password"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] sm:w-[60vw] max-w-4xl bg-card border-2">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "login"
              ? "Sign in to your Mirkaso account to access trading analytics and portfolio tools."
              : mode === "register"
              ? "Create a new Mirkaso account to start using trading analytics and portfolio tools."
              : "Enter your email to receive a password reset link."}
          </DialogDescription>
        </DialogHeader>

        {mode !== "forgot" && (
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setMode("login")
                setError(null)
                setSuccess(null)
              }}
            >
              {t("common.signIn")}
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setMode("register")
                setError(null)
                setSuccess(null)
              }}
            >
              {t("auth.createAccount")}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 text-emerald-500 text-sm p-3 rounded-lg mb-4">{success}</div>
        )}

        {mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.forgotPasswordDescription") || "Enter your email and we'll send you a reset link."}
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="animate-pulse">{t("common.loading")}</span>
              ) : (
                t("auth.sendResetLink") || "Send reset link"
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("login")
                setError(null)
                setSuccess(null)
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("auth.backToLogin") || "Back to login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={8} />
            </div>
            {mode === "register" && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder={t("profile.username") + " (" + t("common.optional") + ")"} value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" />
                </div>
                <div className="relative">
                  <Input type="text" placeholder={t("auth.referralCode") || "Referral Code (optional)"} value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="pl-10" />
                </div>
                {referralCode && (
                  <p className="text-xs text-emerald-500">🎉 20% off your first month!</p>
                )}
              </>
            )}
            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot")
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <span className="animate-pulse">{t("common.loading")}</span> : mode === "login" ? t("common.signIn") : t("authModal.createAccount")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
