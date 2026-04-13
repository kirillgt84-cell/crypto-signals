"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, Mail, Lock, User, 
  Chrome, Send, Twitter, 
  MessageCircle 
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  
  const { login, register, loginWithOAuth, loginWithTelegram } = useAuth()
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      if (activeTab === "login") {
        await login(email, password)
      } else {
        await register(email, password, username || undefined)
      }
      console.log(`[AuthModal] Auth success, closing modal`)
      onClose()
    } catch (err: any) {
      console.error(`[AuthModal] Auth error:`, err)
      setError(err.message || "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleOAuth = (provider: string) => {
    loginWithOAuth(provider)
  }
  
  // Telegram widget callback
  const handleTelegramAuth = (user: any) => {
    loginWithTelegram(user).then(() => {
      onClose()
    }).catch((err: any) => {
      setError(err.message)
    })
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
        </DialogHeader>
        
        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "login" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "register" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </div>
          
          {activeTab === "register" && (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Username (optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : activeTab === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        
        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => handleOAuth("google")}
            className="flex items-center gap-2"
          >
            <Chrome className="w-4 h-4" />
            Google
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleOAuth("twitter")}
            className="flex items-center gap-2"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleOAuth("discord")}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Discord
          </Button>
          
          {/* Telegram Login Widget */}
          <div className="col-span-1">
            <TelegramLoginButton onAuth={handleTelegramAuth} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Telegram Login Button Component
function TelegramLoginButton({ onAuth }: { onAuth: (user: any) => void }) {
  const buttonRef = useState<HTMLDivElement | null>(null)
  
  // Load Telegram widget script
  const loadTelegramScript = () => {
    if (document.getElementById("telegram-widget-script")) return
    
    const script = document.createElement("script")
    script.id = "telegram-widget-script"
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.async = true
    script.setAttribute("data-telegram-login", "your_bot_username")
    script.setAttribute("data-size", "medium")
    script.setAttribute("data-radius", "4")
    script.setAttribute("data-auth-url", "")
    script.setAttribute("data-request-access", "write")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    
    // Define global callback
    ;(window as any).onTelegramAuth = onAuth
    
    document.body.appendChild(script)
  }
  
  // For simplicity, using a styled button that opens Telegram
  return (
    <Button
      variant="outline"
      onClick={() => {
        // Open Telegram bot for auth
        window.open(
          "https://t.me/your_bot_username?start=auth",
          "_blank",
          "width=400,height=600"
        )
      }}
      className="w-full flex items-center gap-2"
      style={{ backgroundColor: "#0088cc", color: "white", borderColor: "#0088cc" }}
    >
      <Send className="w-4 h-4" />
      Telegram
    </Button>
  )
}
