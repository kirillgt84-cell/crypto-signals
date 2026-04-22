import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Terms of Service — Mirkaso",
  description: "Mirkaso Terms of Service. Read the conditions for using our crypto analytics platform.",
  alternates: {
    canonical: "https://mirkaso.com/terms",
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Terms of Service</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <p className="text-muted-foreground">Last updated: April 2025</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          By accessing or using Mirkaso, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Not Financial Advice</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          All content provided on Mirkaso is for informational purposes only and does not constitute financial advice, investment recommendations or solicitation to buy or sell any financial instrument. Trading cryptocurrencies involves substantial risk of loss.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You are responsible for safeguarding the password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Subscriptions and Payments</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Some features require a paid subscription. Payments are processed through third-party providers. Subscription fees are non-refundable except where required by law.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The service and its original content, features and functionality are owned by Mirkaso and are protected by international copyright, trademark and other intellectual property laws.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          In no event shall Mirkaso be liable for any indirect, incidental, special or consequential damages arising out of or in connection with your use of the service.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Changes to Terms</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We reserve the right to modify these terms at any time. We will provide notice of significant changes by updating the date at the top of this page.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">8. Contact</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Questions about the Terms of Service should be sent to <a href="mailto:support@mirkaso.com" className="text-indigo-500 hover:underline">support@mirkaso.com</a>.
        </p>
      </main>
    </div>
  )
}
