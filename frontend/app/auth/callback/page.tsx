"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

// This page handles OAuth callbacks in popup window
export default function OAuthCallbackPage() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const provider = window.location.pathname.split("/").pop()
    
    if (error) {
      // Send error to parent window
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", error },
        window.location.origin
      )
      window.close()
      return
    }
    
    if (!code) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", error: "No code received" },
        window.location.origin
      )
      window.close()
      return
    }
    
    // Exchange code for token via backend
    const exchangeCode = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/${provider}/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state })
          }
        )
        
        if (!res.ok) {
          throw new Error("Token exchange failed")
        }
        
        const data = await res.json()
        
        // Send success to parent window
        window.opener?.postMessage(
          {
            type: "OAUTH_SUCCESS",
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user
          },
          window.location.origin
        )
        
        window.close()
      } catch (err: any) {
        window.opener?.postMessage(
          { type: "OAUTH_ERROR", error: err.message },
          window.location.origin
        )
        window.close()
      }
    }
    
    exchangeCode()
  }, [searchParams])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}
