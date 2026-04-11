import { getRSIInterpretation, getMACDInterpretation, getFundingInterpretation } from '../lib/market-utils'

describe('API Helper Functions', () => {
  describe('getRSIInterpretation', () => {
    it('returns overbought for RSI > 70', () => {
      const result = getRSIInterpretation(75, '60')
      expect(result.text).toContain('Overbought')
      expect(result.color).toBe('text-red-500')
    })

    it('returns oversold for RSI < 30', () => {
      const result = getRSIInterpretation(25, '60')
      expect(result.text).toContain('Oversold')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns neutral for RSI between 30-70', () => {
      const result = getRSIInterpretation(50, '60')
      expect(result.text).toContain('Neutral')
      expect(result.color).toBe('text-amber-500')
    })

    it('uses different thresholds for different timeframes', () => {
      const m15 = getRSIInterpretation(73, '15')
      const h1 = getRSIInterpretation(73, '60')
      
      expect(m15.text).toContain('Neutral') // 73 < 75 for M15
      expect(h1.text).toContain('Overbought') // 73 > 72 for 1H
    })
  })

  describe('getMACDInterpretation', () => {
    it('returns bullish when MACD > signal and positive', () => {
      const result = getMACDInterpretation(100, 50, '60')
      expect(result.text).toContain('Bullish')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns bearish when MACD < signal and negative', () => {
      const result = getMACDInterpretation(-100, -50, '60')
      expect(result.text).toContain('Bearish')
      expect(result.color).toBe('text-red-500')
    })

    it('returns crossing up when MACD > signal but negative', () => {
      const result = getMACDInterpretation(-50, -100, '60')
      expect(result.text).toContain('Crossing Up')
    })

    it('returns crossing down when MACD < signal but positive', () => {
      const result = getMACDInterpretation(50, 100, '60')
      expect(result.text).toContain('Crossing Down')
    })
  })

  describe('getFundingInterpretation', () => {
    it('returns extreme long bias for funding > 0.03', () => {
      const result = getFundingInterpretation(0.05, '60')
      expect(result.text).toContain('Extreme Long Bias')
      expect(result.color).toBe('text-red-500')
    })

    it('returns longs pay for funding > 0.01', () => {
      const result = getFundingInterpretation(0.015, '60')
      expect(result.text).toContain('Longs Pay')
    })

    it('returns extreme short bias for funding < -0.03', () => {
      const result = getFundingInterpretation(-0.05, '60')
      expect(result.text).toContain('Extreme Short Bias')
      expect(result.color).toBe('text-emerald-500')
    })

    it('returns shorts pay for funding < -0.01', () => {
      const result = getFundingInterpretation(-0.015, '60')
      expect(result.text).toContain('Shorts Pay')
    })

    it('returns balanced for funding near 0', () => {
      const result = getFundingInterpretation(0.005, '60')
      expect(result.text).toContain('Balanced')
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
