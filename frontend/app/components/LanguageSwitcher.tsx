"use client"

import { useLanguage } from "../context/LanguageContext"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as "en" | "ru")}
      className="h-8 px-2 rounded border bg-background text-sm font-bold uppercase cursor-pointer"
    >
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  )
}
