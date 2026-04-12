"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"

type Language = "en" | "ru"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

// Hardcoded translations for testing
const translations = {
  en: {
    "test": "Test",
    "metrics.price": "Price",
    "metrics.openInterest": "Open Interest"
  },
  ru: {
    "test": "Тест",
    "metrics.price": "Цена",
    "metrics.openInterest": "Открытый интерес"
  }
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: () => {},
  t: (key) => key
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language
    if (saved === 'en' || saved === 'ru') {
      setLanguageState(saved)
    }
    setMounted(true)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    console.log('Switching language to:', lang)
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  const t = useCallback(
    (key: string): string => {
      const value = translations[language][key as keyof typeof translations.en]
      return value || key
    },
    [language]
  )

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "ru", setLanguage: () => {}, t: (k) => k }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
