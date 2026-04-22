import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Mail, Send, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Contact Mirkaso — Support & Inquiries",
  description: "Contact the Mirkaso team for support, partnership inquiries or feature requests. Email, Telegram and social channels available.",
  keywords: ['contact mirkaso', 'crypto support', 'trading platform help', 'mirkaso email'],
  openGraph: {
    title: "Contact Mirkaso — Support & Inquiries",
    description: "Reach the Mirkaso team for support and partnerships",
    url: "https://mirkaso.com/contact",
    siteName: "Mirkaso",
    type: "website",
  },
  alternates: {
    canonical: "https://mirkaso.com/contact",
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Contact Us</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <p className="text-muted-foreground text-lg mb-8">
          Have a question, feedback or partnership inquiry? We are here to help.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-500" /> Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">For support and general inquiries:</p>
              <a href="mailto:support@mirkaso.com" className="text-indigo-500 hover:underline font-medium">support@mirkaso.com</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-5 w-5 text-sky-500" /> Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Fastest response time:</p>
              <a href="https://t.me/mirkaso_support" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-medium">@mirkaso_support</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-500" /> Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Join our community channel:</p>
              <a href="https://t.me/mirkaso_com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-medium">t.me/mirkaso_com</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-500" /> Business
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Partnerships and enterprise:</p>
              <a href="mailto:business@mirkaso.com" className="text-indigo-500 hover:underline font-medium">business@mirkaso.com</a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Response Time</h2>
          <p className="text-sm text-muted-foreground">
            We typically respond within 24 hours on business days. For Pro subscribers, priority support is available via Telegram.
          </p>
        </div>
      </main>
    </div>
  )
}
