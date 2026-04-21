"use client"

import { useState, useEffect } from "react"
import { X, Mail, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

const POPUP_KEY = "mirkaso-newsletter-shown"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app"

export function NewsletterPopup() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) return
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(POPUP_KEY)) return

    const timer = setTimeout(() => {
      setIsOpen(true)
      sessionStorage.setItem(POPUP_KEY, "true")
    }, 15000)

    return () => clearTimeout(timer)
  }, [user])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError(t("newsletter.enterEmail"))
      return
    }
    if (!agreed) {
      setError(t("newsletter.agreeTerms"))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || t("newsletter.agreeTerms"))
      }

      setSuccess(true)
      setTimeout(() => setIsOpen(false), 2500)
    } catch (err: any) {
      setError(err.message || t("newsletter.enterEmail"))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col items-center justify-end sm:justify-center pointer-events-none">
        <div className="w-full sm:max-w-lg sm:mb-8 bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom duration-300">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="p-6 sm:p-8">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <h3 className="text-xl font-bold">{t("newsletter.subscribedTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("newsletter.subscribedSubtitle")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                    <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    {t("newsletter.title")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("newsletter.subtitle")}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder={t("newsletter.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 flex-1"
                    required
                  />
                  <Button type="submit" disabled={loading} className="h-11 px-6 gap-2">
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        {t("newsletter.subscribe")}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {t("newsletter.consentPrefix")}{" "}
                    <a href="/terms" className="underline hover:text-foreground transition-colors">
                      {t("newsletter.terms")}
                    </a>{" "}
                    {t("newsletter.consentSuffix")}
                  </span>
                </label>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
