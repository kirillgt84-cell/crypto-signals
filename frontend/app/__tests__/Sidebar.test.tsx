import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../components/admin/Sidebar'

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      username: 'johndoe',
      email: 'john@example.com',
      avatar_url: null,
      subscription_tier: 'free',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

describe('Sidebar', () => {
  const mockToggle = jest.fn()

  beforeEach(() => {
    mockToggle.mockClear()
  })

  it('renders sidebar with logo', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('MIRKASO')).toBeInTheDocument()
  })

  it('renders Dashboard link', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('sidebar.dashboard')).toBeInTheDocument()
  })

  it('does not show Admin link for non-admin', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.queryByText('sidebar.admin')).not.toBeInTheDocument()
  })

  it('calls onToggle when collapse button clicked', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    const toggleButton = screen.getByTestId('sidebar-toggle')
    fireEvent.click(toggleButton)
    expect(mockToggle).toHaveBeenCalled()
  })

  it('shows only icon when collapsed', () => {
    render(<Sidebar collapsed={true} onToggle={mockToggle} />)
    
    expect(screen.queryByText('MIRKASO')).not.toBeInTheDocument()
  })

  it('shows user info in bottom section', () => {
    render(<Sidebar collapsed={false} onToggle={mockToggle} />)
    
    expect(screen.getByText('johndoe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
