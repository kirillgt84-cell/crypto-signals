"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "../context/LanguageContext"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { language, setLanguage, languages, languageNames, languageFlags } = useLanguage()
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
          "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
          "transition-colors duration-150",
          open && "bg-white/10 border-white/20"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none select-none">{languageFlags[language]}</span>
          <span className="uppercase font-bold">{language}</span>
          <span className="text-muted-foreground text-xs truncate max-w-[80px]">
            {languageNames[language]}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={cn(
            "text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 4 6 8 10 4" />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 bottom-full mb-1.5",
            "rounded-lg border border-border bg-popover shadow-xl",
            "p-1"
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
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none select-none">{languageFlags[lang]}</span>
                <span>{languageNames[lang]}</span>
              </div>
              {language === lang && (
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
