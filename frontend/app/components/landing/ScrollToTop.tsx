"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp } from "lucide-react"

export function ScrollToTop() {
  const [showTopBtn, setShowTopBtn] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!showTopBtn) return null

  return (
    <Button
      onClick={goToTop}
      className="fixed bottom-6 right-6 opacity-90 shadow-md z-50"
      size="icon"
      variant="secondary"
    >
      <ArrowUp className="h-4 w-4" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
