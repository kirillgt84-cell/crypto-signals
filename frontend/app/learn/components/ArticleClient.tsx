"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/app/context/LanguageContext"

interface ArticleSection {
  heading: string
  content: string
}

interface ArticleData {
  title: string
  subtitle: string
  sections: ArticleSection[]
  cta: string
  ctaLink: string
}

interface ArticlesDict {
  [slug: string]: ArticleData
}

export function ArticleClient({ slug }: { slug: string }) {
  const { language } = useLanguage()
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/locales/articles-${language}.json`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: ArticlesDict) => {
        setArticle(data[slug] || null)
        setLoading(false)
      })
      .catch(() => {
        setArticle(null)
        setLoading(false)
      })
  }, [slug, language])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Article not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">{article.title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <h2 className="text-2xl font-bold mb-6">{article.subtitle}</h2>

        <div className="space-y-8">
          {article.sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-xl font-semibold mb-3">{section.heading}</h3>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Link href={article.ctaLink} className="text-indigo-500 hover:underline font-medium">
            {article.cta}
          </Link>
        </div>
      </main>
    </div>
  )
}
