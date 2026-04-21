"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "../context/LanguageContext"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { language, setLanguage, languages, languageNames } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-between gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide",
          "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
          "transition-colors duration-150",
          open && "bg-white/10 border-white/20"
        )}
      >
        {language}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn("text-muted-foreground transition-transform duration-150", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 3.5 5 6.5 8 3.5" />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1.5",
            "rounded-lg border border-border bg-popover shadow-xl",
            "p-1 min-w-[140px]"
          )}
          style={{ zIndex: 9999 }}
        >
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
              className={cn(
                "flex items-center justify-between w-full gap-2 rounded-md px-2.5 py-2 text-sm",
                "hover:bg-accent transition-colors text-left",
                language === lang && "bg-accent/60 font-medium"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase w-5">{lang}</span>
                <span>{languageNames[lang]}</span>
              </div>
              {language === lang && (
                <span className="text-emerald-500 text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
