import React from "react"
import { render, screen, waitFor, act, cleanup } from "@testing-library/react"
import { OrderBook, padLevels, ORDER_BOOK_LEVELS } from "../OrderBook"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockSnapshot = {
  lastUpdateId: 100,
  bids: [["70000", "1"], ["69990", "2"]],
  asks: [["70100", "1"], ["70110", "2"]],
}

class MockWebSocket {
  url: string = ""
  static instances: MockWebSocket[] = []
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.({})
    }, 10)
  }

  send(data: string) {}
  close() {
    this.readyState = 3
    this.onclose?.({})
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

global.WebSocket = MockWebSocket as any

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

describe("OrderBook", () => {
  afterEach(() => {
    cleanup()
    MockWebSocket.instances = []
    jest.clearAllMocks()
  })

  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSnapshot),
    })
  })

  it("renders loading state initially", () => {
    render(<OrderBook symbol="BTC" loading={true} />)
    expect(screen.getByText("ORDER DEPTH")).toBeInTheDocument()
  })

  it("connects WebSocket and renders after snapshot", async () => {
    render(<OrderBook symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    expect(MockWebSocket.instances[0].url).toContain("fstream.binance.com")
    expect(MockWebSocket.instances[0].url).toContain("btcusdt@depth")

    // Wait for snapshot to load and UI to update
    await waitFor(() => {
      expect(screen.getByText("$10")).toBeInTheDocument()
    })
  })

  it("applies buffered diff after snapshot", async () => {
    render(<OrderBook symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]

    // Send diff BEFORE snapshot loads (goes to buffer)
    act(() => {
      ws.simulateMessage({
        U: 101,
        u: 102,
        b: [["70000", "1.5"]],
        a: [],
      })
    })

    // Wait for snapshot + diff processing
    await waitFor(() => {
      expect(screen.getByText("$10")).toBeInTheDocument()
    })
  })

  it("shows error when snapshot fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))
    render(<OrderBook symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("Order book unavailable")).toBeInTheDocument()
    })
  })

  it("renders step options for BTC", async () => {
    render(<OrderBook symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("$10")).toBeInTheDocument()
      expect(screen.getByText("$50")).toBeInTheDocument()
      expect(screen.getByText("$100")).toBeInTheDocument()
    })
  })

  it("renders step options for ETH", async () => {
    render(<OrderBook symbol="ETH" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("$1")).toBeInTheDocument()
      expect(screen.getByText("$5")).toBeInTheDocument()
      expect(screen.getByText("$10")).toBeInTheDocument()
    })
  })
})
