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
}

interface User {
  id: number
  email: string | null
  username: string
  avatar_url: string | null
  is_email_verified: boolean
  subscription_tier: "free" | "pro"
  preferences?: UserPreferences | null
  connected_oauth?: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isPro: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<void>
  logout: () => void
  loginWithOAuth: (provider: string) => void
  loginWithTelegram: (user: any) => Promise<void>
  refreshToken: () => Promise<boolean>
  updateProfile: (updates: Partial<Pick<User, "username" | "avatar_url">>) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const authUrl = (path: string) => `${API_BASE_URL}/auth${path}?_cb=${Date.now()}`

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const isPro = user?.subscription_tier === "pro"

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("access_token")
      const storedRefresh = localStorage.getItem("refresh_token")
      if (storedToken) {
        setAccessToken(storedToken)
        try {
          const res = await fetch(authUrl('/me'), {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          if (res.ok) {
            const userData = await res.json()
            setUser(userData)
          } else if (storedRefresh) {
            const refreshed = await refreshToken()
            if (!refreshed) logout()
          } else {
            logout()
          }
        } catch {
          logout()
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const interval = setInterval(() => { refreshToken() }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [accessToken])

  const login = async (email: string, password: string) => {
    const res = await fetch(authUrl('/login'), {
      method: "POST", cache: 'no-store',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Login failed")
    }
    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    setAccessToken(data.access_token)
    setUser(data.user)
  }

  const register = async (email: string, password: string, username?: string) => {
    const res = await fetch(authUrl('/register'), {
      method: "POST", cache: 'no-store',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Registration failed")
    }
    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    setAccessToken(data.access_token)
    setUser(data.user)
  }

  const logout = async () => {
    if (accessToken) {
      try {
        await fetch(authUrl('/logout'), {
          method: "POST", cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } catch {}
    }
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setAccessToken(null)
    setUser(null)
  }

  const loginWithOAuth = (provider: string) => {
    fetch(authUrl(`/oauth/${provider}`), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.auth_url) {
          const state = new URL(data.auth_url).searchParams.get("state")
          if (state) localStorage.setItem("oauth_state", state)
          const width = 500, height = 600
          const left = window.screenX + (window.outerWidth - width) / 2
          const top = window.screenY + (window.outerHeight - height) / 2
          window.open(data.auth_url, `${provider}Auth`, `width=${width},height=${height},left=${left},top=${top}`)
        }
      })
  }

  const loginWithTelegram = async (telegramUser: any) => {
    const res = await fetch(authUrl('/telegram'), {
      method: "POST", cache: 'no-store',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telegramUser)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Telegram auth failed")
    }
    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    setAccessToken(data.access_token)
    setUser(data.user)
  }

  const refreshToken = async (): Promise<boolean> => {
    const refresh = localStorage.getItem("refresh_token")
    if (!refresh) return false
    try {
      const res = await fetch(authUrl('/refresh'), {
        method: "POST", cache: 'no-store',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh })
      })
      if (!res.ok) { logout(); return false }
      const data = await res.json()
      localStorage.setItem("access_token", data.access_token)
      setAccessToken(data.access_token)
      return true
    } catch { logout(); return false }
  }

  const refreshUser = async () => {
    const token = accessToken || localStorage.getItem("access_token")
    if (!token) return
    try {
      const res = await fetch(authUrl('/me'), {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) { const userData = await res.json(); setUser(userData) }
    } catch {}
  }

  const updateProfile = async (updates: Partial<Pick<User, "username" | "avatar_url">>) => {
    const token = accessToken || localStorage.getItem("access_token")
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me'), {
      method: "PATCH", cache: 'no-store',
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Update failed")
    }
    await refreshUser()
  }

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const token = accessToken || localStorage.getItem("access_token")
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me'), {
      method: "PATCH", cache: 'no-store',
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates)
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Update failed")
    }
    await refreshUser()
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    const token = accessToken || localStorage.getItem("access_token")
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(authUrl('/me/password'), {
      method: "PATCH", cache: 'no-store',
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.detail || "Password change failed")
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === "OAUTH_SUCCESS") {
        const { access_token, refresh_token, user } = event.data
        localStorage.setItem("access_token", access_token)
        localStorage.setItem("refresh_token", refresh_token)
        setAccessToken(access_token)
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
        updateProfile, updatePreferences, changePassword, refreshUser
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
