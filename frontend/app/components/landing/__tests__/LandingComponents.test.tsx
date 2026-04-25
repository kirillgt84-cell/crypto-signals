import { render, screen, fireEvent } from "@testing-library/react"
import { LandingNavbar } from "../LandingNavbar"
import { LandingFeatures } from "../LandingFeatures"
import { LandingBenefits } from "../LandingBenefits"
import { LandingHowItWorks } from "../LandingHowItWorks"
import { LandingPricing } from "../LandingPricing"
import { LandingFAQ } from "../LandingFAQ"
import { LandingStats } from "../LandingStats"
import { LandingHero } from "../LandingHero"

describe("LandingNavbar", () => {
  it("renders logo, nav links and auth buttons for guests", () => {
    render(<LandingNavbar />)
    expect(screen.getByText("MIRKASO")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.features")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.howItWorks")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.pricing")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.faq")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.signIn")).toBeInTheDocument()
    expect(screen.getByText("landing.nav.getStarted")).toBeInTheDocument()
  })
})

describe("LandingHero", () => {
  it("renders empty section", () => {
    const { container } = render(<LandingHero />)
    expect(container.querySelector("section")).toBeInTheDocument()
  })
})

describe("LandingFeatures", () => {
  it("renders trader and investor sections with all 16 cards", () => {
    render(<LandingFeatures />)
    expect(screen.getByText("landing.features.traderTitle")).toBeInTheDocument()
    expect(screen.getByText("landing.features.investorTitle")).toBeInTheDocument()
    for (let i = 1; i <= 9; i++) {
      expect(screen.getByText(`landing.features.trader${i}.title`)).toBeInTheDocument()
      expect(screen.getByText(`landing.features.trader${i}.description`)).toBeInTheDocument()
    }
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(`landing.features.investor${i}.title`)).toBeInTheDocument()
      expect(screen.getByText(`landing.features.investor${i}.description`)).toBeInTheDocument()
    }
  })
})

describe("LandingBenefits", () => {
  it("renders highlight card and 10 benefit cards", () => {
    render(<LandingBenefits />)
    expect(screen.getByText("landing.hero.benefit0.title")).toBeInTheDocument()
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(`landing.hero.benefit${i}.title`)).toBeInTheDocument()
      expect(screen.getByText(`landing.hero.benefit${i}.description`)).toBeInTheDocument()
    }
  })
})

describe("LandingStats", () => {
  it("renders 4 stat items", () => {
    render(<LandingStats />)
    expect(screen.getByText("100+")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("24/7")).toBeInTheDocument()
  })
})

describe("LandingHowItWorks", () => {
  it("renders 4 steps", () => {
    render(<LandingHowItWorks />)
    expect(screen.getByText("landing.howItWorks.step1.title")).toBeInTheDocument()
    expect(screen.getByText("landing.howItWorks.step2.title")).toBeInTheDocument()
    expect(screen.getByText("landing.howItWorks.step3.title")).toBeInTheDocument()
    expect(screen.getByText("landing.howItWorks.step4.title")).toBeInTheDocument()
  })
})

describe("LandingPricing", () => {
  it("renders free and pro plans", () => {
    render(<LandingPricing />)
    expect(screen.getByText("landing.pricing.free.name")).toBeInTheDocument()
    expect(screen.getByText("landing.pricing.pro.name")).toBeInTheDocument()
  })

  it("shows yearly price by default", () => {
    render(<LandingPricing />)
    expect(screen.getByText("$19")).toBeInTheDocument()
  })

  it("toggles to monthly price on click", () => {
    render(<LandingPricing />)
    const monthlyBtn = screen.getByText("landing.pricing.monthly")
    fireEvent.click(monthlyBtn)
    expect(screen.getByText("$17")).toBeInTheDocument()
    expect(screen.getByText("$25")).toBeInTheDocument()
    expect(screen.getByText(/landing.pricing.firstMonth/i)).toBeInTheDocument()
    expect(screen.getByText(/landing.pricing.thenMonthly/i)).toBeInTheDocument()
  })

  it("lists all free and pro features", () => {
    render(<LandingPricing />)
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`landing.pricing.free.feature${i}`)).toBeInTheDocument()
      expect(screen.getByText(`landing.pricing.pro.feature${i}`)).toBeInTheDocument()
    }
    expect(screen.getByText("landing.pricing.includesFree")).toBeInTheDocument()
  })
})

describe("LandingFAQ", () => {
  it("renders all 5 FAQ questions", () => {
    render(<LandingFAQ />)
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`landing.faq.q${i}.question`)).toBeInTheDocument()
    }
  })
})
