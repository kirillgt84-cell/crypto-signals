"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface UserPreferences {
  theme?: string
  language?: string
  timezone?: string
  notifications_enabled?: boolean
  daily_report?: boolean
  weekly_report?: boolean
  telegram_alerts?: boolean
  telegram_chat_id?: string | null
}

interface User {
  id: number
  email: string | null
  username: string
  avatar_url: string | null
  is_email_verified: boolean
  subscription_tier: "free" | "pro" | "admin" | "starter" | "trader" | "investor"
  preferences?: UserPreferences | null
  connected_oauth?: string[]
  trial_activated_at?: string | null
  trial_expires_at?: string | null
  trial_source?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isPro: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string, referral_code?: string) => Promise<void>
  logout: () => void
  loginWithOAuth: (provider: string) => void
  loginWithTelegram: (user: any) => Promise<void>
  refreshToken: () => Promise<boolean>
  updateProfile: (updates: Partial<Pick<User, "username" | "avatar_url" | "subscription_tier">>) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
  sendVerificationEmail: () => Promise<void>
  verifyEmail: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { API_BASE_URL } from "@/app/lib/api"

const authUrl = (path: string) => `${API_BASE_URL}/auth${path}?_cb=${Date.now()}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isPro = ["pro", "trader", "investor"].includes(user?.subscription_tier || "")

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch(authUrl('/me'), {
          cache: 'no-store',
          credentials: 'include',
        })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        } else if (res.status === 401) {
          const refreshed = await refreshToken()
          if (refreshed) {
            await refreshUser()
          } else {
            setUser(null)
          }
        }
      } catch {
        // Network error on /me: don't force logout
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      const ok = await refreshToken()
      if (ok) await refreshUser()
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const login = async (email: string, password: string) => {
    const res = await fetch(authUrl('/login'), {
      method: "POST", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Login failed")
    }
    const data = await res.json()
    setUser(data.user)
  }

  const register = async (email: string, password: string, username?: string, referral_code?: string) => {
    const res = await fetch(authUrl('/register'), {
      method: "POST", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, referral_code })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Registration failed")
    }
    const data = await res.json()
    setUser(data.user)
  }

  const logout = async () => {
    try {
      await fetch(authUrl('/logout'), {
        method: "POST", cache: 'no-store',
        credentials: 'include',
      })
    } catch {}
    setUser(null)
  }

  const loginWithOAuth = async (provider: string) => {
    const res = await fetch(authUrl(`/oauth/${provider}`), { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || `${provider} OAuth is not configured`)
    }
    if (data.auth_url) {
      const state = new URL(data.auth_url).searchParams.get("state")
      if (state) sessionStorage.setItem("oauth_state", state)
      const width = 500, height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      window.open(data.auth_url, `${provider}Auth`, `width=${width},height=${height},left=${left},top=${top}`)
    }
  }

  const loginWithTelegram = async (telegramUser: any) => {
    const res = await fetch(authUrl('/telegram'), {
      method: "POST", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telegramUser)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Telegram auth failed")
    }
    const data = await res.json()
    setUser(data.user)
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(authUrl('/refresh'), {
        method: "POST", cache: 'no-store',
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) { return false }
      return true
    } catch { return false }
  }

  const refreshUser = async () => {
    try {
      const res = await fetch(authUrl('/me'), {
        cache: 'no-store',
        credentials: 'include',
      })
      if (res.ok) { const userData = await res.json(); setUser(userData) }
    } catch {}
  }

  const updateProfile = async (updates: Partial<Pick<User, "username" | "avatar_url" | "subscription_tier">>) => {
    if (!user) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me'), {
      method: "PATCH", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Update failed")
    }
    await refreshUser()
  }

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me'), {
      method: "PATCH", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Update failed")
    }
    await refreshUser()
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me/password'), {
      method: "PATCH", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Password change failed")
    }
  }

  const sendVerificationEmail = async () => {
    if (!user) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me/send-verification'), {
      method: "POST", cache: 'no-store',
      credentials: 'include',
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Failed to send verification email")
    }
  }

  const verifyEmail = async (code: string) => {
    if (!user) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me/verify-email'), {
      method: "POST", cache: 'no-store',
      credentials: 'include',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Verification failed")
    }
    await refreshUser()
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === "OAUTH_SUCCESS") {
        const { user } = event.data
        setUser(user)
      }
      if (event.data.type === "OAUTH_ERROR") {
        console.error("OAuth error:", event.data.error)
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user, isLoading, isAuthenticated: !!user, isPro,
        login, register, logout, loginWithOAuth, loginWithTelegram, refreshToken,
        updateProfile, updatePreferences, changePassword, refreshUser, sendVerificationEmail, verifyEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
