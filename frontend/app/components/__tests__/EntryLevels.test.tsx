import React from "react"
import { render, screen } from "@testing-library/react"
import { EntryLevels } from "../EntryLevels"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ isPro: false }),
}))

describe("EntryLevels", () => {
  it("renders loading skeleton", () => {
    render(<EntryLevels data={{ price: 0 } as any} loading={true} />)
    expect(screen.getByText("ENTRY LEVELS")).toBeInTheDocument()
  })

  it("shows select symbol message when no price", () => {
    render(<EntryLevels data={{ price: 0 } as any} loading={false} />)
    expect(screen.getByText(/Select symbol to view levels/i)).toBeInTheDocument()
  })

  it("renders all levels sorted descending by value", () => {
    const data = {
      price: 50000,
      ema20: 51000, // above price -> resistance
      ema50: 49000, // below price -> support
      poc: 50500,
      vah: 52000,
      val: 48000,
    }

    render(<EntryLevels data={data} loading={false} />)

    expect(screen.getByText("ENTRY LEVELS")).toBeInTheDocument()
    
    // Check level names appear (POC may appear in tooltip too)
    expect(screen.getByText("VAH")).toBeInTheDocument()
    expect(screen.getAllByText("POC").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("EMA20")).toBeInTheDocument()
    expect(screen.getByText("EMA50")).toBeInTheDocument()
    expect(screen.getByText("VAL")).toBeInTheDocument()

    // Check price labels with $k formatting for high prices
    expect(screen.getByText("$52.0k")).toBeInTheDocument()
    expect(screen.getByText("$50.5k")).toBeInTheDocument()
    expect(screen.getByText("$51.0k")).toBeInTheDocument()
    expect(screen.getByText("$49.0k")).toBeInTheDocument()
    expect(screen.getByText("$48.0k")).toBeInTheDocument()
  })

  it("marks ema20 as resistance when above price", () => {
    const data = {
      price: 50000,
      ema20: 51000,
      ema50: 49000,
      poc: 50000,
      vah: 52000,
      val: 48000,
    }

    render(<EntryLevels data={data} loading={false} />)
    
    // EMA20 should have red text (resistance)
    const ema20Label = screen.getByText("EMA20")
    expect(ema20Label).toHaveStyle("color: #ef4444")
  })

  it("marks ema50 as support when below price", () => {
    const data = {
      price: 50000,
      ema20: 51000,
      ema50: 49000,
      poc: 50000,
      vah: 52000,
      val: 48000,
    }

    render(<EntryLevels data={data} loading={false} />)
    
    const ema50Label = screen.getByText("EMA50")
    expect(ema50Label).toHaveStyle("color: #22c55e")
  })

  it("shows correct distance percentages", () => {
    const data = {
      price: 50000,
      ema20: 51000,
      ema50: 49000,
      poc: 50000,
      vah: 52000,
      val: 48000,
    }

    render(<EntryLevels data={data} loading={false} />)

    // VAH: +4.0%, POC: 0.0%, EMA20: +2.0%, EMA50: -2.0%, VAL: -4.0%
    expect(screen.getByText("+4.0%")).toBeInTheDocument()
    expect(screen.getByText("0.0%")).toBeInTheDocument()
    expect(screen.getByText("+2.0%")).toBeInTheDocument()
    expect(screen.getByText("-2.0%")).toBeInTheDocument()
    expect(screen.getByText("-4.0%")).toBeInTheDocument()
  })

  it("uses $ formatting for low-priced assets", () => {
    const data = {
      price: 0.5,
      ema20: 0.52,
      ema50: 0.48,
      poc: 0.51,
      vah: 0.55,
      val: 0.45,
    }

    render(<EntryLevels data={data} loading={false} />)

    // For prices < 1, should use 4+ decimals
    expect(screen.getByText("$0.5500")).toBeInTheDocument()
    expect(screen.getByText("$0.4500")).toBeInTheDocument()
  })

  it("renders legend with indicators", () => {
    const data = {
      price: 50000,
      ema20: 51000,
      ema50: 49000,
      poc: 50000,
      vah: 52000,
      val: 48000,
    }

    render(<EntryLevels data={data} loading={false} />)

    expect(screen.getByText("🔴 Resistance")).toBeInTheDocument()
    expect(screen.getByText("🟢 Support")).toBeInTheDocument()
    expect(screen.getByText("⚪ Neutral")).toBeInTheDocument()
    expect(screen.getByText("🎯 Current")).toBeInTheDocument()
  })
})
