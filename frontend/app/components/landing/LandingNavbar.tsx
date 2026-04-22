"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useLanguage } from "@/app/context/LanguageContext"
import { Logo } from "@/app/components/Logo"
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher"

const navLinks = [
  { href: "#features", key: "landing.nav.features" },
  { href: "#how-it-works", key: "landing.nav.howItWorks" },
  { href: "#pricing", key: "landing.nav.pricing" },
  { href: "#faq", key: "landing.nav.faq" },
]

export function LandingNavbar() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app">{t("landing.nav.signIn")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/app">{t("landing.nav.getStarted")}</Link>
          </Button>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t(link.key)}
                  </a>
                ))}
                <hr className="border-border" />
                <Button variant="outline" asChild>
                  <Link href="/app" onClick={() => setIsOpen(false)}>
                    {t("landing.nav.signIn")}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/app" onClick={() => setIsOpen(false)}>
                    {t("landing.nav.getStarted")}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
