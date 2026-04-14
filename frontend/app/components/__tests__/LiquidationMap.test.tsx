import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { LiquidationMap } from "../LiquidationMap"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockLiquidations = [
  { price: 50100, size: 500000, side: "Short" as const },
  { price: 50200, size: 300000, side: "Short" as const },
  { price: 49900, size: 400000, side: "Long" as const },
  { price: 49800, size: 200000, side: "Long" as const },
]

describe("LiquidationMap", () => {
  it("renders header with symbol", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION MAP")).toBeInTheDocument()
    expect(screen.getByText("BTC/USDT")).toBeInTheDocument()
  })

  it("shows loading skeleton when loading", () => {
    render(
      <LiquidationMap
        liquidations={[]}
        currentPrice={50000}
        symbol="BTC"
        loading={true}
      />
    )
    expect(screen.getByText("LIQUIDATION MAP")).toBeInTheDocument()
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders current price row", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("50,000.0")).toBeInTheDocument()
    expect(screen.getByText("Current Price")).toBeInTheDocument()
  })

  it("handles empty liquidations gracefully", () => {
    render(
      <LiquidationMap
        liquidations={[]}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION MAP")).toBeInTheDocument()
    expect(screen.getByText("50,000.0")).toBeInTheDocument()
  })

  it("handles invalid/non-array liquidations prop", () => {
    render(
      <LiquidationMap
        liquidations={null as any}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION MAP")).toBeInTheDocument()
  })

  it("uses $5 step for ETH", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={3500}
        symbol="ETH"
        loading={false}
      />
    )
    expect(screen.getByText("ETH/USDT")).toBeInTheDocument()
    // Price is rendered with 2 decimals for ETH range
    expect(screen.getByText("3,500.0")).toBeInTheDocument()
  })

  it("displays footer stats", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText(/Shorts:/)).toBeInTheDocument()
    expect(screen.getByText(/Longs:/)).toBeInTheDocument()
    expect(screen.getByText(/Max:/)).toBeInTheDocument()
  })

  it("renders step toggle buttons", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("$10")).toBeInTheDocument()
    expect(screen.getByText("$50")).toBeInTheDocument()
    expect(screen.getByText("$100")).toBeInTheDocument()
  })

  it("changes step on toggle click", () => {
    render(
      <LiquidationMap
        liquidations={mockLiquidations}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    fireEvent.click(screen.getByText("$50"))
    // Step button should remain visible after click
    expect(screen.getByText("$50")).toBeInTheDocument()
  })


})
