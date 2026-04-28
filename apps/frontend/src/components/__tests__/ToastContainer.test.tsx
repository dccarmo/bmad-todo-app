import { render, screen, fireEvent } from '@testing-library/react'
import { vi, test, expect } from 'vitest'
import { ToastContext } from '../../context/ToastContext.js'
import { ToastContainer } from '../ToastContainer.js'

const mockToast = { id: 't1', message: 'Failed to delete todo', onRetry: vi.fn() }

function renderWithToasts(toasts = [mockToast]) {
  const removeToast = vi.fn()
  render(
    <ToastContext.Provider value={{ toasts, addToast: vi.fn(), removeToast }}>
      <ToastContainer />
    </ToastContext.Provider>
  )
  return { removeToast }
}

test('renders toast message', () => {
  renderWithToasts()
  expect(screen.getByText('Failed to delete todo')).toBeInTheDocument()
})

test('close button removes toast', () => {
  const { removeToast } = renderWithToasts()
  fireEvent.click(screen.getByLabelText('Close notification'))
  expect(removeToast).toHaveBeenCalledWith('t1')
})

test('retry button calls onRetry and removes toast', () => {
  const { removeToast } = renderWithToasts()
  fireEvent.click(screen.getByText('Retry'))
  expect(mockToast.onRetry).toHaveBeenCalled()
  expect(removeToast).toHaveBeenCalledWith('t1')
})

test('each toast has role="alert"', () => {
  renderWithToasts()
  expect(screen.getByRole('alert')).toBeInTheDocument()
})
