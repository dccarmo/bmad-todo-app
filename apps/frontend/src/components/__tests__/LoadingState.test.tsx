import { render, screen } from '@testing-library/react'
import { LoadingState } from '../LoadingState'

describe('LoadingState', () => {
  it('has role status', () => {
    render(<LoadingState />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible sr-only label', () => {
    render(<LoadingState />)
    expect(screen.getByText(/loading your todos/i)).toBeInTheDocument()
  })

  it('renders skeleton placeholders', () => {
    const { container } = render(<LoadingState />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
  })
})
