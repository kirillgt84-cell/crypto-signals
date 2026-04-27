"use client"

import { useState, useEffect } from "react"
import { AuthModal } from "./AuthModal"

export function GlobalAuthModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-auth-modal", handler)
    return () => window.removeEventListener("open-auth-modal", handler)
  }, [])

  return <AuthModal isOpen={open} onClose={() => setOpen(false)} />
}
