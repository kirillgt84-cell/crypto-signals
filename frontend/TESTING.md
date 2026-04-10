# Testing Guide for Fast Lane Dashboard

## Setup

Tests are configured using Jest and React Testing Library.

```bash
npm install
```

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

```
app/
├── __tests__/
│   ├── Logo.test.tsx         # Logo component tests
│   ├── Sidebar.test.tsx      # Sidebar navigation tests
│   ├── Dashboard.test.tsx    # Main dashboard integration tests
│   ├── TradingViewChart.test.tsx  # Chart component tests
│   └── api.test.ts           # API helper function tests
├── components/
│   └── Logo.tsx              # Component being tested
```

## Test Coverage

### Current Test Coverage:

1. **Logo Component**
   - Renders with text when expanded
   - Renders icon only when collapsed
   - Has correct SVG structure
   - Contains chart bars and green arrow

2. **Sidebar Component**
   - Renders navigation links
   - Toggles collapse state
   - Shows user info
   - Displays logo correctly

3. **Dashboard Integration**
   - Loading state rendering
   - Data fetch and display
   - Error handling (404, network errors)
   - Symbol and timeframe selection
   - Fallback to demo data

4. **TradingView Chart**
   - Iframe rendering
   - Correct URL parameters
   - Timeframe mapping

5. **API Functions**
   - RSI interpretation logic
   - MACD interpretation logic
   - Funding rate interpretation
   - Fetch error handling

## Writing New Tests

### Example Test Pattern:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '../components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    const mockFn = jest.fn()
    render(<MyComponent onClick={mockFn} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockFn).toHaveBeenCalled()
  })
})
```

## Mocking

### Fetch API
```typescript
global.fetch = jest.fn()
;(global.fetch as jest.Mock).mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
})
```

### Router
```typescript
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}))
```

## Common Issues

1. **"window is not defined"** - Use jest-environment-jsdom
2. **"fetch is not defined"** - Mock global.fetch
3. **Router errors** - Mock next/navigation

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Before deployment

## Manual Testing Checklist

### Dashboard Functionality:
- [ ] Page loads without errors
- [ ] Logo displays correctly (blue bars + green arrow)
- [ ] Sidebar expands/collapses
- [ ] Symbol selector works (BTC, ETH, etc.)
- [ ] Timeframe selector works (M15, 1H, 4H, 1D)
- [ ] Price displays correctly
- [ ] OI metrics display
- [ ] Checklist shows correct score
- [ ] TradingView chart loads
- [ ] Entry levels calculate distances correctly
- [ ] Liquidation map renders
- [ ] Secondary indicators show (RSI, MACD, Funding)
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive design works

### Error Handling:
- [ ] Shows loading state
- [ ] Handles API 404 gracefully
- [ ] Falls back to demo data
- [ ] Displays error messages
