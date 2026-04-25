"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, ArrowUpRight, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useLanguage } from "@/app/context/LanguageContext"
import { useAuth } from "@/app/context/AuthContext"
import { Logo } from "@/app/components/Logo"
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher"
import { AuthModal } from "@/app/components/AuthModal"

const navLinks = [
  { href: "#features", key: "landing.nav.features" },
  { href: "#how-it-works", key: "landing.nav.howItWorks" },
  { href: "#pricing", key: "landing.nav.pricing" },
  { href: "#faq", key: "landing.nav.faq" },
]

export function LandingNavbar() {
  const { t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const openLogin = () => {
    setAuthOpen(true)
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-10 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/app"
              className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.app")}
            </Link>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(link.key)}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <User className="h-4 w-4 mr-1" />
                  {t("common.profile")}
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={openLogin}>
                {t("landing.nav.signIn")}
              </Button>
            )}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-6 mt-8">
                  <Link
                    href="/app"
                    onClick={() => setMobileOpen(false)}
                    className="text-xl font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("landing.nav.app")}
                  </Link>
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-xl font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(link.key)}
                    </a>
                  ))}
                  <hr className="border-border" />
                  {isAuthenticated ? (
                    <Button variant="outline" asChild>
                      <Link href="/profile" onClick={() => setMobileOpen(false)}>
                        <User className="h-4 w-4 mr-1" />
                        {t("common.profile")}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => { setMobileOpen(false); openLogin(); }}>
                      {t("landing.nav.signIn")}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
