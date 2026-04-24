"use client"

import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useLanguage } from "@/app/context/LanguageContext"

const faqKeys = [
  "landing.faq.q1",
  "landing.faq.q2",
  "landing.faq.q3",
  "landing.faq.q4",
  "landing.faq.q5",
]

export function LandingFAQ() {
  const { t } = useLanguage()

  return (
    <section id="faq" className="container py-24 sm:py-32 max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
        {t("landing.faq.title1")}{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          {t("landing.faq.titleHighlight")}
        </span>
      </h2>
      <p className="text-center text-lg text-muted-foreground mb-10">
        {t("landing.faq.subtitle")}
      </p>

      <Accordion type="single" collapsible className="w-full">
        {faqKeys.map((key, index) => (
          <AccordionItem key={key} value={`item-${index + 1}`}>
            <AccordionTrigger className="text-left text-lg">
              {t(`${key}.question`)}
            </AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed">
              {t(`${key}.answer`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-center mt-10 text-base text-muted-foreground">
        {t("landing.faq.more")}{" "}
        <Link
          href="/faq"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("landing.faq.link")}
        </Link>
      </p>
    </section>
  )
}
