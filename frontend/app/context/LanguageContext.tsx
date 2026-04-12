"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type Language = "en" | "ru"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string | Record<string, string>
}

const translations: Record<Language, any> = {
  en: {},
  ru: {}
}

// Load translations
async function loadTranslations(lang: Language) {
  try {
    const module = await import(`@/locales/${lang}.json`)
    translations[lang] = module.default || module
  } catch (e) {
    console.error(`Failed to load translations for ${lang}:`, e)
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")
  const [loaded, setLoaded] = useState(false)

  const setLanguage = useCallback(async (lang: Language) => {
    await loadTranslations(lang)
    setLanguageState(lang)
    setLoaded(true)
  }, [])

  const t = useCallback(
    (key: string): string | Record<string, string> => {
      const keys = key.split(".")
      let value: any = translations[language]

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k]
        } else {
          return key
        }
      }

      return value || key
    },
    [language]
  )

  // Load initial language
  if (!loaded) {
    loadTranslations(language).then(() => setLoaded(true))
  }

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
