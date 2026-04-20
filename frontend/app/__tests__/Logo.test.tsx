import { render, screen } from '@testing-library/react'
import { Logo, LogoIcon } from '../components/Logo'

describe('Logo', () => {
  it('renders full logo with text when not collapsed', () => {
    render(<Logo collapsed={false} />)
    
    expect(screen.getByText('MIRKASO')).toBeInTheDocument()
    expect(screen.getByTestId('logo-icon')).toBeInTheDocument()
  })

  it('renders only icon when collapsed', () => {
    render(<Logo collapsed={true} />)
    
    expect(screen.queryByText('MIRKASO')).not.toBeInTheDocument()
    expect(screen.getByTestId('logo-icon')).toBeInTheDocument()
  })

  it('renders LogoIcon correctly', () => {
    render(<LogoIcon data-testid="logo-icon-svg" />)
    
    expect(screen.getByTestId('logo-icon-svg')).toBeInTheDocument()
  })

  it('has correct SVG structure with chart bars', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    
    expect(svg).toBeInTheDocument()
    // Should have 3 rect elements (bars)
    const rects = svg?.querySelectorAll('rect')
    expect(rects?.length).toBe(3)
  })
})
