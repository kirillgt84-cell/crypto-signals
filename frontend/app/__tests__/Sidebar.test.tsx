import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../components/admin/Sidebar'

describe('Sidebar', () => {
  const mockToggle = jest.fn()

  beforeEach(() => {
    mockToggle.mockClear()
  })

  it('renders sidebar with logo', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('FAST LANE')).toBeInTheDocument()
  })

  it('renders Dashboard link', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('calls onToggle when collapse button clicked', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    const toggleButton = screen.getByTestId('sidebar-toggle')
    fireEvent.click(toggleButton)
    expect(mockToggle).toHaveBeenCalled()
  })

  it('shows only icon when collapsed', () => {
    render(<Sidebar collapsed={true} onToggle={mockToggle} />)
    
    expect(screen.queryByText('FAST LANE')).not.toBeInTheDocument()
  })

  it('shows user info in bottom section', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
