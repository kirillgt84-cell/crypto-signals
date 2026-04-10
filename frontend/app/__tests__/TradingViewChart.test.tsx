import { render, screen } from '@testing-library/react'
import { TradingViewChart } from '../components/TradingViewChart'

describe('TradingViewChart', () => {
  it('renders iframe with correct src', () => {
    render(<TradingViewChart symbol="BTC" timeframe="60" />)
    
    const iframe = screen.getByTitle(/TradingView Chart BTC/i)
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src')
    expect(iframe.getAttribute('src')).toContain('tradingview.com')
    expect(iframe.getAttribute('src')).toContain('BINANCE:BTCUSDT.P')
  })

  it('uses correct interval for different timeframes', () => {
    const { rerender } = render(<TradingViewChart symbol="BTC" timeframe="15" />)
    
    let iframe = screen.getByTitle(/TradingView Chart BTC/i)
    expect(iframe.getAttribute('src')).toContain('interval=15')

    rerender(<TradingViewChart symbol="BTC" timeframe="240" />)
    iframe = screen.getByTitle(/TradingView Chart BTC/i)
    expect(iframe.getAttribute('src')).toContain('interval=240')

    rerender(<TradingViewChart symbol="BTC" timeframe="D" />)
    iframe = screen.getByTitle(/TradingView Chart BTC/i)
    expect(iframe.getAttribute('src')).toContain('interval=D')
  })

  it('renders with correct dimensions', () => {
    render(<TradingViewChart symbol="ETH" timeframe="60" />)
    
    const iframe = screen.getByTitle(/TradingView Chart ETH/i)
    expect(iframe).toHaveStyle({ width: '100%', height: '100%' })
  })

  it('has correct security attributes', () => {
    render(<TradingViewChart symbol="BTC" timeframe="60" />)
    
    const iframe = screen.getByTitle(/TradingView Chart BTC/i)
    expect(iframe).toHaveAttribute('loading', 'lazy')
  })
})
