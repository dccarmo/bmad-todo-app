import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders the empty message', () => {
    render(<EmptyState />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('has aria-live polite for screen readers', () => {
    render(<EmptyState />)
    expect(screen.getByText(/no tasks yet/i).closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite'
    )
  })
})
