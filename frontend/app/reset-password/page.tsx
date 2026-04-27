"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Lock, ArrowLeft, CheckCircle } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"
import { useLanguage } from "@/app/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/app/components/Logo"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const router = useRouter()
  const { resetPassword } = useAuth()
  const { t } = useLanguage()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t("auth.invalidToken") || "Invalid or expired reset link")
    }
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(t("auth.passwordTooShort") || "Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDoNotMatch") || "Passwords do not match")
      return
    }
    if (!token) return

    setIsLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || t("authModal.unknownError"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="mb-8">
        <Logo className="h-12 w-auto" />
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {t("auth.resetPassword") || "Reset Password"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("auth.resetPasswordDescription") || "Enter your new password below."}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-emerald-500" />
            </div>
            <p className="text-emerald-500 font-medium">
              {t("auth.resetSuccess") || "Password updated successfully!"}
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              {t("common.signIn")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t("auth.newPassword") || "New password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder={t("auth.confirmPassword") || "Confirm password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !token}>
              {isLoading ? (
                <span className="animate-pulse">{t("common.loading")}</span>
              ) : (
                t("auth.resetPassword") || "Reset Password"
              )}
            </Button>
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("auth.backToLogin") || "Back to login"}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
