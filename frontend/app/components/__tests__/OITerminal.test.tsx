import React from "react"
import { render, screen } from "@testing-library/react"
import { OITerminal } from "../OITerminal"

jest.mock("framer-motion", () => ({
  __esModule: true,
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <span ref={ref} {...props}>{children}</span>
    )),
  },
}))

describe("OITerminal", () => {
  it("renders loading skeleton", () => {
    render(<OITerminal analysis={null} loading={true} />)
    expect(screen.getByText("oiPanel.title")).toBeInTheDocument()
  })

  it("shows initialize message when no analysis", () => {
    render(<OITerminal analysis={null} loading={false} />)
    expect(screen.getByText("oiPanel.selectSymbol")).toBeInTheDocument()
  })

  it("renders bullish analysis correctly", () => {
    const analysis = {
      status: "long_buildup",
      signal: "strong_bullish",
      description: "oi.description.longBuildup",
      action: "oi.action.longBuildup",
      tactic: "oi.tactic.longBuildup",
      color: "#22c55e",
      strength: 5,
      oi_change_pct: 5.2,
      price_change_pct: 2.1,
      volume_change_pct: 15.0,
    }

    render(<OITerminal analysis={analysis} loading={false} />)

    expect(screen.getByText(/oiPanel.status/)).toBeInTheDocument()
    expect(screen.getByText(/oi.status.long_buildup/)).toBeInTheDocument()
    expect(screen.getByText(analysis.description)).toBeInTheDocument()
    expect(screen.getByText(analysis.tactic)).toBeInTheDocument()
    expect(screen.getByText(/OI.ACTION.LONGBUILDUP/)).toBeInTheDocument()
  })

  it("renders bearish analysis correctly", () => {
    const analysis = {
      status: "short_buildup",
      signal: "strong_bearish",
      description: "oi.description.shortBuildup",
      action: "oi.action.shortBuildup",
      tactic: "oi.tactic.shortBuildup",
      color: "#ef4444",
      strength: 5,
      oi_change_pct: 4.5,
      price_change_pct: -1.8,
      volume_change_pct: 12.0,
    }

    render(<OITerminal analysis={analysis} loading={false} />)

    expect(screen.getByText(/oi.status.short_buildup/)).toBeInTheDocument()
    expect(screen.getByText(/OI.ACTION.SHORTBUILDUP/)).toBeInTheDocument()
  })

  it("renders neutral analysis correctly", () => {
    const analysis = {
      status: "neutral",
      signal: "neutral",
      description: "oi.description.neutral",
      action: "oi.action.neutral",
      tactic: "oi.tactic.neutral",
      color: "#9ca3af",
      strength: 1,
      oi_change_pct: 0.5,
      price_change_pct: 0.2,
      volume_change_pct: 2.0,
    }

    render(<OITerminal analysis={analysis} loading={false} />)

    expect(screen.getByText(/oi.status.neutral/)).toBeInTheDocument()
    expect(screen.getByText("▓▓ OI.ACTION.NEUTRAL ▓▓")).toBeInTheDocument()
  })

  it("displays formatted change percentages", () => {
    const analysis = {
      status: "long_buildup",
      signal: "strong_bullish",
      description: "oi.description.longBuildup",
      action: "oi.action.longBuildup",
      color: "#22c55e",
      strength: 5,
      oi_change_pct: -3.5,
      price_change_pct: 1.25,
      volume_change_pct: 0,
    }

    render(<OITerminal analysis={analysis} loading={false} />)

    expect(screen.getByText("-3.50%")).toBeInTheDocument()
    expect(screen.getByText("+1.25%")).toBeInTheDocument()
    expect(screen.getByText("0.00%")).toBeInTheDocument()
  })

  it("falls back to percentages when description lacks arrows", () => {
    const analysis = {
      status: "long_buildup",
      signal: "strong_bullish",
      description: "oi.description.longBuildup",
      action: "oi.action.longBuildup",
      color: "#22c55e",
      strength: 5,
      oi_change_pct: 5.0,
      price_change_pct: -2.0,
      volume_change_pct: -15.0,
    }

    render(<OITerminal analysis={analysis} loading={false} />)

    // Should still show arrows based on pct values
    expect(screen.getByText("+5.00%")).toBeInTheDocument()
    expect(screen.getByText("-2.00%")).toBeInTheDocument()
    expect(screen.getByText("-15.00%")).toBeInTheDocument()
  })
})
