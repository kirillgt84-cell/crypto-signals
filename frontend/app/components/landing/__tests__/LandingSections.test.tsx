import React from "react"
import { render, screen } from "@testing-library/react"
import { LandingHero } from "../LandingHero"
import { LandingFeatures } from "../LandingFeatures"
import { LandingStats } from "../LandingStats"
import { LandingHowItWorks } from "../LandingHowItWorks"
import { LandingPricing } from "../LandingPricing"
import { LandingFAQ } from "../LandingFAQ"
import { LandingCTA } from "../LandingCTA"
import { LandingNavbar } from "../LandingNavbar"
import { LanguageProvider } from "../../../context/LanguageContext"

jest.mock("next/link", () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0, on: () => {} } }),
  useTransform: () => 0,
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("Landing sections render without errors", () => {
  it("LandingHero renders", () => {
    render(<LandingHero />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingFeatures renders", () => {
    render(<LandingFeatures />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingStats renders", () => {
    render(<LandingStats />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingHowItWorks renders", () => {
    render(<LandingHowItWorks />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingPricing renders", () => {
    render(<LandingPricing />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingFAQ renders", () => {
    render(<LandingFAQ />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingCTA renders", () => {
    render(<LandingCTA />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })

  it("LandingNavbar renders", () => {
    render(<LandingNavbar />, { wrapper: Wrapper })
    expect(document.body.textContent).toBeTruthy()
  })
})
