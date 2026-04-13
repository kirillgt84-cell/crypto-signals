"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
  id: number
  email: string | null
  username: string
  avatar_url: string | null
  is_email_verified: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<void>
  logout: () => void
  loginWithOAuth: (provider: string) => void
  loginWithTelegram: (user: any) => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Init - check for stored tokens
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("access_token")
      const storedRefresh = localStorage.getItem("refresh_token")
      
      if (storedToken) {
        setAccessToken(storedToken)
        // Validate token and get user info
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          
          if (res.ok) {
            const userData = await res.json()
            setUser(userData)
          } else if (storedRefresh) {
            // Try refresh
            const refreshed = await refreshToken()
            if (!refreshed) {
              logout()
            }
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

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!accessToken) return
    
    // Refresh every 10 minutes
    const interval = setInterval(() => {
      refreshToken()
    }, 10 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [accessToken])

  const login = async (email: string, password: string) => {
    console.log(`[Auth] Login attempt for ${email}`)
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    
    if (!res.ok) {
      const error = await res.json()
      console.error(`[Auth] Login failed:`, error)
      throw new Error(error.detail || "Login failed")
    }
    
    const data = await res.json()
    
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    
    setAccessToken(data.access_token)
    setUser(data.user)
  }

  const register = async (email: string, password: string, username?: string) => {
    console.log(`[Auth] Register attempt for ${email}`)
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username })
    })
    
    if (!res.ok) {
      const error = await res.json()
      console.error(`[Auth] Register failed:`, error)
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
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } catch {
        // Ignore errors
      }
    }
    
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    
    setAccessToken(null)
    setUser(null)
  }

  const loginWithOAuth = (provider: string) => {
    // Get OAuth URL from backend
    fetch(`${API_BASE_URL}/auth/oauth/${provider}`)
      .then(res => res.json())
      .then(data => {
        if (data.auth_url) {
          // Store state in localStorage to verify callback
          const state = new URL(data.auth_url).searchParams.get("state")
          if (state) {
            localStorage.setItem("oauth_state", state)
          }
          
          // Open popup or redirect
          const width = 500
          const height = 600
          const left = window.screenX + (window.outerWidth - width) / 2
          const top = window.screenY + (window.outerHeight - height) / 2
          
          window.open(
            data.auth_url,
            `${provider}Auth`,
            `width=${width},height=${height},left=${left},top=${top}`
          )
        }
      })
  }

  const loginWithTelegram = async (telegramUser: any) => {
    const res = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: "POST",
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
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh })
      })
      
      if (!res.ok) {
        logout()
        return false
      }
      
      const data = await res.json()
      
      localStorage.setItem("access_token", data.access_token)
      setAccessToken(data.access_token)
      
      return true
    } catch {
      logout()
      return false
    }
  }

  // Listen for OAuth callback messages
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
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loginWithOAuth,
        loginWithTelegram,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
