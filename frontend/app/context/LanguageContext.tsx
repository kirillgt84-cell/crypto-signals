"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import enTranslations from "@/locales/en.json"
import ruTranslations from "@/locales/ru.json"

type Language = "en" | "ru"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: enTranslations,
  ru: ruTranslations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }, [])

  // Load saved preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language
      if (saved && (saved === 'en' || saved === 'ru')) {
        setLanguageState(saved)
      }
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".")
      let value: any = translations[language]

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k]
        } else {
          return key
        }
      }

      return typeof value === 'string' ? value : key
    },
    [language]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
