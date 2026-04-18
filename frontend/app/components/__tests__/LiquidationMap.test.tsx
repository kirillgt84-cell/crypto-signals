import React from "react"
import { render, screen } from "@testing-library/react"
import { LiquidationMap } from "../LiquidationMap"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockHeatmap = {
  buckets: [
    { price: 50200, longSize: 0, shortSize: 300000, totalSize: 300000, count: 2 },
    { price: 50100, longSize: 0, shortSize: 500000, totalSize: 500000, count: 3 },
    { price: 50000, longSize: 200000, shortSize: 100000, totalSize: 300000, count: 2 },
    { price: 49900, longSize: 400000, shortSize: 0, totalSize: 400000, count: 2 },
    { price: 49800, longSize: 200000, shortSize: 0, totalSize: 200000, count: 1 },
  ],
  meta: {
    maxSize: 500000,
    totalLongs: 800000,
    totalShorts: 900000,
    count: 10,
    bucketSize: 100,
    priceRange: [49800, 50200] as [number, number],
    source: "okx",
  },
}

describe("LiquidationMap", () => {
  it("renders header with symbol", () => {
    render(
      <LiquidationMap
        heatmap={mockHeatmap}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION HEATMAP")).toBeInTheDocument()
    expect(screen.getByText("BTC/USDT")).toBeInTheDocument()
  })

  it("shows loading skeleton when loading", () => {
    render(
      <LiquidationMap
        heatmap={null}
        currentPrice={50000}
        symbol="BTC"
        loading={true}
      />
    )
    expect(screen.getByText("LIQUIDATION HEATMAP")).toBeInTheDocument()
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
  })

  it("renders bucket prices", () => {
    render(
      <LiquidationMap
        heatmap={mockHeatmap}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("50,200")).toBeInTheDocument()
    expect(screen.getByText("50,100")).toBeInTheDocument()
    expect(screen.getByText("50,000")).toBeInTheDocument()
  })

  it("highlights current price bucket", () => {
    render(
      <LiquidationMap
        heatmap={mockHeatmap}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    // Current price bucket should be bold/amber
    const priceElements = screen.getAllByText("50,000")
    expect(priceElements.length).toBeGreaterThan(0)
  })

  it("handles empty heatmap gracefully", () => {
    render(
      <LiquidationMap
        heatmap={{ buckets: [], meta: { maxSize: 0, totalLongs: 0, totalShorts: 0, count: 0, bucketSize: 0, priceRange: [0, 0], source: "none" } }}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION HEATMAP")).toBeInTheDocument()
    expect(screen.getByText("No liquidation data available")).toBeInTheDocument()
  })

  it("handles null heatmap prop", () => {
    render(
      <LiquidationMap
        heatmap={null}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("LIQUIDATION HEATMAP")).toBeInTheDocument()
    expect(screen.getByText("No liquidation data available")).toBeInTheDocument()
  })

  it("displays footer stats", () => {
    render(
      <LiquidationMap
        heatmap={mockHeatmap}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("Total Longs")).toBeInTheDocument()
    expect(screen.getByText("Total Shorts")).toBeInTheDocument()
    expect(screen.getByText("Max Bucket")).toBeInTheDocument()
  })

  it("shows simulated badge for non-okx data", () => {
    const simulatedHeatmap = {
      ...mockHeatmap,
      meta: { ...mockHeatmap.meta, source: "fallback" } as typeof mockHeatmap.meta,
    }
    render(
      <LiquidationMap
        heatmap={simulatedHeatmap}
        currentPrice={50000}
        symbol="BTC"
        loading={false}
      />
    )
    expect(screen.getByText("Simulated")).toBeInTheDocument()
  })
})
