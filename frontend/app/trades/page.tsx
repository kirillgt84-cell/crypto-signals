"use client"

import { ArrowLeft, Construction } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TradesPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">My Trades</h1>
      <p className="text-muted-foreground text-center max-w-md">
        This feature is coming soon. Track your paper trades and portfolio performance here.
      </p>
      <Link href="/">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  )
}
