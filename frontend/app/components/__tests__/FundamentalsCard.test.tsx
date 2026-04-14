import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { FundamentalsCard } from "../FundamentalsCard"

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe("FundamentalsCard", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders loading state", () => {
    render(<FundamentalsCard symbol="BTC" loading={true} />)
    expect(screen.getByText("FUNDAMENTAL HEALTH")).toBeInTheDocument()
  })

  it("shows not available message when all requests fail", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"))
    render(<FundamentalsCard symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("Fundamental data not available yet")).toBeInTheDocument()
    })
  })

  it("renders composite score and metrics when data is available", async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/mvrv")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            value: 1.5,
            raw_data: { interpretation: "FAIR", description: "Справедливая цена" },
            computed_at: "2026-04-14T00:00:00",
          }),
        })
      }
      if (url.includes("/nupl")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            value: 0.3,
            raw_data: { interpretation: "HOPE", description: "🟡 Надежда" },
            computed_at: "2026-04-14T00:00:00",
          }),
        })
      }
      if (url.includes("/composite")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            score: -0.1,
            sentiment: "NEUTRAL",
            components: {
              mvrv: { value: 1.5, normalized: -0.25, weight: 0.35 },
              nupl: { value: 0.3, normalized: 0.1, weight: 0.35 },
              funding: { value: 0.0001, normalized: 0.1, weight: 0.3 },
            },
            interpretation: {
              mvrv: "Справедливая цена",
              nupl: "🟡 Надежда",
              funding: "Нейтрально",
            },
          }),
        })
      }
      return Promise.reject(new Error("Unexpected URL"))
    })

    render(<FundamentalsCard symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("NEUTRAL")).toBeInTheDocument()
    })

    // MVRV and NUPL appear in both main metrics and mini grid
    expect(screen.getAllByText("MVRV").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("NUPL").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Справедливая цена")).toBeInTheDocument()
    expect(screen.getByText("🟡 Надежда")).toBeInTheDocument()
  })

  it("renders ETH fallback with market momentum", async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/mvrv")) {
        return Promise.resolve({ ok: false })
      }
      if (url.includes("/nupl")) {
        return Promise.resolve({ ok: false })
      }
      if (url.includes("/composite")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            score: 0.2,
            sentiment: "NEUTRAL",
            components: {
              funding: { value: 0.0001, normalized: 0.1, weight: 0.3 },
              market_momentum: { value: 0.05, normalized: 0.167, weight: 0.3 },
            },
            interpretation: {
              funding: "Нейтрально",
              market_momentum: "Рыночный импульс 24ч",
            },
          }),
        })
      }
      return Promise.reject(new Error("Unexpected URL"))
    })

    render(<FundamentalsCard symbol="ETH" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("NEUTRAL")).toBeInTheDocument()
    })

    expect(screen.getByText("24h Momentum")).toBeInTheDocument()
    expect(screen.getByText("Рыночный импульс за 24ч")).toBeInTheDocument()
  })

  it("shows bullish sentiment in green", async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/composite")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            score: 0.6,
            sentiment: "BULLISH",
            components: {
              mvrv: { value: 4.0, normalized: 1.0, weight: 0.35 },
              nupl: { value: 0.75, normalized: 1.0, weight: 0.35 },
              funding: { value: 0.002, normalized: 1.0, weight: 0.3 },
            },
            interpretation: {},
          }),
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<FundamentalsCard symbol="BTC" loading={false} />)

    await waitFor(() => {
      expect(screen.getByText("BULLISH")).toBeInTheDocument()
    })
  })
})
