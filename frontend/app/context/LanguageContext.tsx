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

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  es: "🇪🇸",
  zh: "🇨🇳",
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  isLoaded: boolean
  languages: Language[]
  languageNames: Record<Language, string>
  languageFlags: Record<Language, string>
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

function getCookieLanguage(): Language | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|; )language=([^;]*)/)
  const lang = match ? decodeURIComponent(match[1]) : null
  return lang && ALL_LANGUAGES.includes(lang as Language) ? (lang as Language) : null
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en"
  const cookieLang = getCookieLanguage()
  if (cookieLang) return cookieLang
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
  languageFlags: LANGUAGE_FLAGS,
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
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
      }
    }
    init()
  }, [])

  const setLanguage = useCallback(async (lang: Language) => {
    await loadTranslations(lang)
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_KEY, lang)
      document.cookie = `language=${lang};path=/;max-age=31536000`
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = translations[language]
      if (!dict) return key
      let text = dict[key] ?? key
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v))
        })
      }
      return text
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, isLoaded, languages: ALL_LANGUAGES, languageNames: LANGUAGE_NAMES, languageFlags: LANGUAGE_FLAGS }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
