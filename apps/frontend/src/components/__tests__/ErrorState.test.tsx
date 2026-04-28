import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState } from '../ErrorState'

describe('ErrorState', () => {
  it('renders the error message with role="alert"', () => {
    render(<ErrorState message="Network error" onRetry={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Network error')
  })

  it('calls onRetry when Retry button is clicked', async () => {
    const user = userEvent.setup()
    const mockRetry = vi.fn()
    render(<ErrorState message="Network error" onRetry={mockRetry} />)
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })
})
