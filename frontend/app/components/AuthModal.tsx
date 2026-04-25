"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, Lock, User } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const { login, register } = useAuth()
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] sm:w-[60vw] max-w-4xl bg-card border-2">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === "login" ? t("authModal.welcomeBack") : t("authModal.createAccount")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {activeTab === "login"
              ? "Sign in to your Mirkaso account to access trading analytics and portfolio tools."
              : "Create a new Mirkaso account to start using trading analytics and portfolio tools."}
          </DialogDescription>
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

      </DialogContent>
    </Dialog>
  )
}

