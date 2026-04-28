import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TodoItem } from '../TodoItem.js'

const mockToggleMutate = vi.fn()
const mockDeleteMutate = vi.fn()
const mockAddToast = vi.fn()

const toggleState = { mutate: mockToggleMutate, isPending: false, isError: false }
const deleteState = { mutate: mockDeleteMutate, isPending: false, isError: false }

vi.mock('../../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => toggleState,
}))

vi.mock('../../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => deleteState,
}))

vi.mock('../../hooks/useToast.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

const incompleteTodo = {
  id: '1',
  text: 'Buy milk',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const completeTodo = {
  id: '2',
  text: 'Walk dog',
  completed: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('TodoItem — toggle', () => {
  beforeEach(() => {
    mockToggleMutate.mockReset()
    toggleState.isPending = false
    toggleState.isError = false
  })

  it('renders an unchecked checkbox for an incomplete todo', () => {
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('renders a checked checkbox for a completed todo', () => {
    render(<TodoItem todo={completeTodo} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls toggle mutate with toggled completed value on checkbox click', async () => {
    const user = userEvent.setup()
    render(<TodoItem todo={incompleteTodo} />)
    await user.click(screen.getByRole('checkbox'))
    expect(mockToggleMutate).toHaveBeenCalledOnce()
    expect(mockToggleMutate).toHaveBeenCalledWith({ id: '1', completed: true })
  })

  it('disables the checkbox when toggle isPending', () => {
    toggleState.isPending = true
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('applies line-through class when todo is completed', () => {
    render(<TodoItem todo={completeTodo} />)
    expect(screen.getByText('Walk dog')).toHaveClass('line-through')
  })

  it('does not apply line-through when todo is incomplete', () => {
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByText('Buy milk')).not.toHaveClass('line-through')
  })
})

describe('TodoItem — delete', () => {
  beforeEach(() => {
    mockDeleteMutate.mockReset()
    deleteState.isPending = false
    deleteState.isError = false
  })

  it('renders a delete button with correct aria-label', () => {
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('button', { name: 'Delete "Buy milk"' })).toBeInTheDocument()
  })

  it('calls delete mutate with todo id on click', async () => {
    const user = userEvent.setup()
    render(<TodoItem todo={incompleteTodo} />)
    await user.click(screen.getByRole('button', { name: 'Delete "Buy milk"' }))
    expect(mockDeleteMutate).toHaveBeenCalledOnce()
    expect(mockDeleteMutate).toHaveBeenCalledWith('1')
  })

  it('disables the delete button when delete isPending', () => {
    deleteState.isPending = true
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('button', { name: 'Delete "Buy milk"' })).toBeDisabled()
  })
})
