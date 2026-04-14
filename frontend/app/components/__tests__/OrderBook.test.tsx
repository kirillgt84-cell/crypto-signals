import React from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { OrderBook, padLevels, interpolateLevels, ORDER_BOOK_LEVELS } from "../OrderBook"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe("padLevels", () => {
  it("pads ask levels when fewer than count", () => {
    const levels = [{ price: 100, quantity: 1, total: 1, side: "ask" as const }]
    const result = padLevels(levels, "ask", 10, 5)
    expect(result).toHaveLength(5)
    expect(result[0].price).toBe(100)
    expect(result[1].price).toBe(110)
    expect(result[1].quantity).toBe(0)
  })

  it("pads bid levels when fewer than count", () => {
    const levels = [{ price: 100, quantity: 1, total: 1, side: "bid" as const }]
    const result = padLevels(levels, "bid", 10, 5)
    expect(result).toHaveLength(5)
    expect(result[0].price).toBe(100)
    expect(result[1].price).toBe(90)
    expect(result[1].quantity).toBe(0)
  })

  it("truncates when more than count", () => {
    const levels = Array.from({ length: 10 }, (_, i) => ({
      price: 100 + i * 10,
      quantity: 1,
      total: i + 1,
      side: "ask" as const,
    }))
    const result = padLevels(levels, "ask", 10, 5)
    expect(result).toHaveLength(5)
  })

  it("returns slice when step is 0", () => {
    const levels = Array.from({ length: 10 }, (_, i) => ({
      price: 100 + i * 10,
      quantity: 1,
      total: i + 1,
      side: "ask" as const,
    }))
    const result = padLevels(levels, "ask", 0, 5)
    expect(result).toHaveLength(5)
  })
})

describe("interpolateLevels", () => {
  it("interpolates gaps between filled levels", () => {
    const levels = [
      { price: 100, quantity: 10, total: 10, side: "ask" as const },
      { price: 101, quantity: 0, total: 10, side: "ask" as const },
      { price: 102, quantity: 0, total: 10, side: "ask" as const },
      { price: 103, quantity: 4, total: 14, side: "ask" as const },
    ]
    const result = interpolateLevels(levels)
    expect(result[0].quantity).toBe(10)
    expect(result[3].quantity).toBe(4)
    // Middle values should be interpolated
    expect(result[1].quantity).toBeGreaterThan(4)
    expect(result[1].quantity).toBeLessThan(10)
    expect(result[2].quantity).toBeGreaterThan(4)
    expect(result[2].quantity).toBeLessThan(10)
  })

  it("extrapolates trailing zeros after last filled", () => {
    const levels = [
      { price: 100, quantity: 10, total: 10, side: "ask" as const },
      { price: 101, quantity: 0, total: 10, side: "ask" as const },
      { price: 102, quantity: 0, total: 10, side: "ask" as const },
    ]
    const result = interpolateLevels(levels)
    expect(result[0].quantity).toBe(10)
    expect(result[1].quantity).toBeLessThan(10)
    expect(result[1].quantity).toBeGreaterThan(0)
    expect(result[2].quantity).toBeLessThan(result[1].quantity)
    expect(result[2].quantity).toBeGreaterThan(0)
  })

  it("extrapolates leading zeros before first filled", () => {
    const levels = [
      { price: 100, quantity: 0, total: 0, side: "ask" as const },
      { price: 101, quantity: 0, total: 0, side: "ask" as const },
      { price: 102, quantity: 10, total: 10, side: "ask" as const },
    ]
    const result = interpolateLevels(levels)
    expect(result[0].quantity).toBe(0)
    expect(result[1].quantity).toBeGreaterThan(0)
    expect(result[1].quantity).toBeLessThan(10)
    expect(result[2].quantity).toBe(10)
  })

  it("returns unchanged when all filled", () => {
    const levels = [
      { price: 100, quantity: 5, total: 5, side: "ask" as const },
      { price: 101, quantity: 6, total: 11, side: "ask" as const },
    ]
    const result = interpolateLevels(levels)
    expect(result[0].quantity).toBe(5)
    expect(result[1].quantity).toBe(6)
  })

  it("returns unchanged when all zeros", () => {
    const levels = [
      { price: 100, quantity: 0, total: 0, side: "ask" as const },
      { price: 101, quantity: 0, total: 0, side: "ask" as const },
    ]
    const result = interpolateLevels(levels)
    expect(result[0].quantity).toBe(0)
    expect(result[1].quantity).toBe(0)
  })
})

describe("OrderBook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders loading state initially", () => {
    render(<OrderBook symbol="BTC" loading={true} />)
    expect(screen.getByText("ORDER DEPTH")).toBeInTheDocument()
  })

  it("renders with symbol and step options for BTC after fetch", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ bids: [["70000", "1"]], asks: [["70100", "1"]] }),
    })
    render(<OrderBook symbol="BTC" loading={false} />)
    
    await waitFor(() => {
      expect(screen.getByText("ORDER DEPTH")).toBeInTheDocument()
    })
    // BTC step options for high price
    expect(screen.getByText("$10")).toBeInTheDocument()
    expect(screen.getByText("$50")).toBeInTheDocument()
    expect(screen.getByText("$100")).toBeInTheDocument()
  })

  it("renders with symbol and step options for ETH after fetch", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ bids: [["3500", "1"]], asks: [["3505", "1"]] }),
    })
    render(<OrderBook symbol="ETH" loading={false} />)
    
    await waitFor(() => {
      expect(screen.getByText("ORDER DEPTH")).toBeInTheDocument()
    })
    // ETH step options for mid price
    expect(screen.getByText("$1")).toBeInTheDocument()
    expect(screen.getByText("$5")).toBeInTheDocument()
    expect(screen.getByText("$10")).toBeInTheDocument()
  })

  it("shows error state when fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))
    render(<OrderBook symbol="BTC" loading={false} />)
    // Wait for effect to run
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByText("Order book unavailable")).toBeInTheDocument()
  })

  it("zooms out on wheel scroll down", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ bids: [["70000", "1"]], asks: [["70100", "1"]] }),
    })
    render(<OrderBook symbol="BTC" loading={false} />)
    await waitFor(() => {
      expect(screen.getByText(/Scroll to zoom/)).toBeInTheDocument()
    })

    const container = screen.getByText(/Scroll to zoom/).closest("div")
    if (!container) throw new Error("Container not found")

    fireEvent.wheel(container, { deltaY: 10 })
    expect(screen.getByText(/35 rows/)).toBeInTheDocument()
  })

  it("zooms in on wheel scroll up", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ bids: [["70000", "1"]], asks: [["70100", "1"]] }),
    })
    render(<OrderBook symbol="BTC" loading={false} />)
    await waitFor(() => {
      expect(screen.getByText(/Scroll to zoom/)).toBeInTheDocument()
    })

    const container = screen.getByText(/Scroll to zoom/).closest("div")
    if (!container) throw new Error("Container not found")

    fireEvent.wheel(container, { deltaY: -10 })
    expect(screen.getByText(/25 rows/)).toBeInTheDocument()
  })
})
