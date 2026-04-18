import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './components/theme-provider'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fast Lane - Crypto Trading Dashboard',
  description: 'Professional crypto analytics and trading signals',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <nav className="bg-[#0b0f19]/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-12">
                    <Link href="/" className="text-slate-200 hover:text-amber-400 font-semibold text-sm transition-colors">
                      Fast Lane
                    </Link>
                    <div className="flex items-center gap-6">
                      <Link href="/" className="text-slate-400 hover:text-amber-400 text-sm transition-colors">
                        Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              </nav>
              {children}
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
