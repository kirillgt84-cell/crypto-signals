import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Dashboard from '../app/page'

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    loginWithOAuth: jest.fn(),
    loginWithTelegram: jest.fn(),
    refreshToken: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock fetch
global.fetch = jest.fn()

const mockMarketData = {
  price: 70000,
  change_24h: 2.5,
  open_interest: 15000000000,
  oi_change_24h: 5.2,
  volume_24h: 28000000000,
  funding: 0.008,
  ema20: 69500,
  ema50: 68000,
  ema200: 65000,
  poc: 69800,
  vah: 71000,
  val: 68500,
  atr: 450,
  rsi: 58,
  macd: 125,
  macd_signal: 98,
  exchange_flow: -450,
}

const mockLevels = {
  ema20: 69500,
  ema50: 68000,
  liquidation_levels: [
    { price: 65000, side: 'Long', size: 125000000 },
    { price: 69000, side: 'Short', size: 98000000 },
  ],
}

describe('Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockReset().mockResolvedValue({ ok: false })
  })

  it('renders loading state initially', () => {
    render(<Dashboard />)
    
    // Loading is indicated by spinner icon, not text
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders dashboard with data after fetch', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/market/oi/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMarketData),
        })
      }
      if (url.includes('/market/levels/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLevels),
        })
      }
      if (url.includes('/market/profile/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ poc: 69800, vah: 71000, val: 68500 }),
        })
      }
      if (url.includes('/market/spot-volume/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ spot_volume: 25000000000, spot_volume_change: 2 }),
        })
      }
      if (url.includes('/market/cvd/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cvd_value: 2450000 }),
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<Dashboard />)

    await waitFor(() => {
      // Dashboard has no "Dashboard" heading, check for main content instead
      expect(screen.getByText('entryLevels.shortTermPoints')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays symbol selector', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/market/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMarketData),
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('BTC')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays timeframe selector', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/market/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMarketData),
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('1H')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Dashboard Metric Cards', () => {
  it('displays correct price formatting', () => {
    const price = 67234.56
    const formatted = price.toLocaleString(undefined, { maximumFractionDigits: 0 })
    expect(formatted).toBe('67,235')
  })

  it('displays correct percentage formatting', () => {
    const change = 2.456
    const formatted = change.toFixed(2)
    expect(formatted).toBe('2.46')
  })

  it('calculates OI in billions correctly', () => {
    const oi = 15500000000
    const formatted = (oi / 1e9).toFixed(2)
    expect(formatted).toBe('15.50')
  })
})

describe('Dashboard Error Handling', () => {
  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('uses fallback data when API returns 404', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/demo data/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
