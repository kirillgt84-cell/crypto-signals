import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Privacy Policy — Mirkaso",
  description: "Mirkaso privacy policy. Learn how we collect, use and protect your personal data.",
  alternates: {
    canonical: "https://mirkaso.com/privacy",
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <p className="text-muted-foreground">Last updated: April 2025</p>

        <h2 className="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Mirkaso (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose and safeguard your information when you use our website and services.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Information We Collect</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We may collect personal information that you voluntarily provide when registering, including your email address, username and payment information. We also collect usage data and analytics to improve our services.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
          <li>To provide and maintain our services</li>
          <li>To notify you about changes to our services</li>
          <li>To provide customer support</li>
          <li>To gather analysis and improve our platform</li>
          <li>To monitor usage and prevent fraud</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We implement appropriate technical and organizational measures to protect your personal data. However, no method of transmission over the Internet is 100% secure.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Third-Party Services</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We may use third-party services (payment processors, analytics providers) that collect, monitor and analyze information. These third parties have their own privacy policies.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">6. Your Rights</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You have the right to access, update or delete your personal information. Contact us at support@mirkaso.com to exercise these rights.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">7. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@mirkaso.com" className="text-indigo-500 hover:underline">support@mirkaso.com</a>.
        </p>
      </main>
    </div>
  )
}
