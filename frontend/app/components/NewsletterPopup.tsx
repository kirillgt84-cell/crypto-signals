"use client"

import { useState, useEffect } from "react"
import { X, Mail, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "../context/AuthContext"

const POPUP_KEY = "mirkaso-newsletter-shown"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crypto-signals-production-ff4c.up.railway.app"

export function NewsletterPopup() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Show only for unauthenticated users, once per session
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
      setError("Please enter your email.")
      return
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service.")
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
        throw new Error(data.detail || "Subscription failed.")
      }

      setSuccess(true)
      setTimeout(() => setIsOpen(false), 2500)
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col items-center justify-end sm:justify-center pointer-events-none">
        <div className="w-full sm:max-w-lg sm:mb-8 bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom duration-300">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 sm:p-8">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <h3 className="text-xl font-bold">You&apos;re subscribed!</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you for joining our newsletter. Stay tuned for updates.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="text-center sm:text-left">
                  <div className="mx-auto sm:mx-0 mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                    <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Get market insights delivered to your inbox
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Weekly crypto & macro analysis. No spam, unsubscribe anytime.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-6 gap-2"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Consent checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    By subscribing, I agree to the{" "}
                    <a href="/terms" className="underline hover:text-foreground transition-colors">
                      Terms of Service
                    </a>{" "}
                    and consent to receiving marketing emails. I can unsubscribe at any time.
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
