"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Check, ChevronUp, ChevronDown } from "lucide-react"
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
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full justify-between gap-2 h-9 px-3 text-xs font-semibold tracking-wide",
          "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
          "transition-all duration-200",
          open && "bg-white/10 border-white/20"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{languageFlags[language]}</span>
          <span className="uppercase">{language}</span>
          <span className="text-muted-foreground font-normal hidden sm:inline">·</span>
          <span className="text-muted-foreground font-normal hidden sm:inline truncate max-w-[80px]">
            {languageNames[language]}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 bottom-full mb-1.5 z-50",
            "rounded-lg border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg",
            "p-1.5 animate-in fade-in-0 zoom-in-95 duration-150 origin-bottom-left"
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang)
                setOpen(false)
              }}
              className={cn(
                "flex items-center justify-between w-full gap-2 rounded-md px-2.5 py-2 text-sm",
                "hover:bg-accent transition-colors",
                language === lang && "bg-accent/60 font-medium"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base leading-none">{languageFlags[lang]}</span>
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
