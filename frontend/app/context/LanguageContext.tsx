"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"

type Language = "en" | "ru" | "es" | "zh"

const LANGUAGE_KEY = "mirkaso-language"

const ALL_LANGUAGES: Language[] = ["en", "ru", "es", "zh"]

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
  zh: "中文",
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isLoaded: boolean
  languages: Language[]
  languageNames: Record<Language, string>
}

const translations: Record<Language, Record<string, string> | null> = {
  en: null,
  ru: null,
  es: null,
  zh: null,
}

async function loadTranslations(lang: Language): Promise<boolean> {
  if (translations[lang]) return true
  try {
    const response = await fetch(`/locales/${lang}.json`, { cache: "no-store" })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    translations[lang] = await response.json()
    return true
  } catch (e) {
    console.error(`Failed to load translations for ${lang}:`, e)
    return false
  }
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en"
  const browserLang = navigator.language?.toLowerCase() || "en"
  if (browserLang.startsWith("ru")) return "ru"
  if (browserLang.startsWith("es")) return "es"
  if (browserLang.startsWith("zh")) return "zh"
  return "en"
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en"
  const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null
  if (saved && ALL_LANGUAGES.includes(saved)) return saved
  return detectBrowserLanguage()
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  isLoaded: false,
  languages: ALL_LANGUAGES,
  languageNames: LANGUAGE_NAMES,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const init = async () => {
      const lang = getInitialLanguage()
      await loadTranslations(lang)
      setLanguageState(lang)
      setIsLoaded(true)
    }
    init()
  }, [])

  const setLanguage = useCallback(async (lang: Language) => {
    await loadTranslations(lang)
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_KEY, lang)
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      const dict = translations[language]
      if (!dict) return key
      return dict[key] ?? key
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, isLoaded, languages: ALL_LANGUAGES, languageNames: LANGUAGE_NAMES }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
