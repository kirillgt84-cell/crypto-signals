import { getRSIInterpretation, getMACDInterpretation, getFundingInterpretation } from '../lib/market-utils'

const mockT = (key: string, vars?: Record<string, string | number>) => {
  // Simple identity fallback for tests
  return key
}

describe('API Helper Functions', () => {
  describe('getRSIInterpretation', () => {
    it('returns overbought for RSI > 72 on 1H', () => {
      const result = getRSIInterpretation(75, '60', mockT)
      expect(result.text).toContain('market.rsiOverbought')
      expect(result.color).toBe('text-red-500')
    })

    it('returns oversold for RSI < 28 on 1H', () => {
      const result = getRSIInterpretation(25, '60', mockT)
      expect(result.text).toContain('market.rsiOversold')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns neutral for RSI between thresholds', () => {
      const result = getRSIInterpretation(50, '60', mockT)
      expect(result.text).toContain('market.rsiNeutral')
      expect(result.color).toBe('text-amber-500')
    })

    it('uses different thresholds for different timeframes', () => {
      const m15 = getRSIInterpretation(73, '15', mockT)
      const h1 = getRSIInterpretation(73, '60', mockT)

      expect(m15.text).toContain('market.rsiNeutral') // 73 < 75 for M15
      expect(h1.text).toContain('market.rsiOverbought') // 73 > 72 for 1H
    })
  })

  describe('getMACDInterpretation', () => {
    it('returns bullish when MACD > signal and positive', () => {
      const result = getMACDInterpretation(100, 50, '60', mockT)
      expect(result.text).toContain('market.macdBullish')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns bearish when MACD < signal and negative', () => {
      const result = getMACDInterpretation(-100, -50, '60', mockT)
      expect(result.text).toContain('market.macdBearish')
      expect(result.color).toBe('text-red-500')
    })

    it('returns crossing up when MACD > signal but negative', () => {
      const result = getMACDInterpretation(-50, -100, '60', mockT)
      expect(result.text).toContain('market.macdCrossingUp')
    })

    it('returns crossing down when MACD < signal but positive', () => {
      const result = getMACDInterpretation(50, 100, '60', mockT)
      expect(result.text).toContain('market.macdCrossingDown')
    })
  })

  describe('getFundingInterpretation', () => {
    it('returns extreme long bias for funding > 0.03', () => {
      const result = getFundingInterpretation(0.05, '60', mockT)
      expect(result.text).toContain('market.fundingExtremeLong')
      expect(result.color).toBe('text-red-500')
    })

    it('returns longs pay for funding > 0.01', () => {
      const result = getFundingInterpretation(0.015, '60', mockT)
      expect(result.text).toContain('market.fundingLongsPay')
    })

    it('returns extreme short bias for funding < -0.03', () => {
      const result = getFundingInterpretation(-0.05, '60', mockT)
      expect(result.text).toContain('market.fundingExtremeShort')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns shorts pay for funding < -0.01', () => {
      const result = getFundingInterpretation(-0.015, '60', mockT)
      expect(result.text).toContain('market.fundingShortsPay')
    })

    it('returns balanced for funding near 0', () => {
      const result = getFundingInterpretation(0.005, '60', mockT)
      expect(result.text).toContain('market.fundingBalanced')
    })
  })
})

describe('API Integration', () => {
  const API_BASE_URL = 'https://crypto-signals-production-ff4c.up.railway.app/api/v1'

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('fetches OI data with correct URL', async () => {
    const mockResponse = { price: 70000, open_interest: 15000000000 }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const response = await fetch(`${API_BASE_URL}/market/oi/BTC?timeframe=1h`)
    const data = await response.json()

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/market/oi/BTC?timeframe=1h`
    )
    expect(data.price).toBe(70000)
  })

  it('handles network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(fetch(`${API_BASE_URL}/market/oi/BTC`)).rejects.toThrow('Network error')
  })

  it('handles 404 errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const response = await fetch(`${API_BASE_URL}/market/oi/BTC`)
    expect(response.ok).toBe(false)
    expect(response.status).toBe(404)
  })
})
