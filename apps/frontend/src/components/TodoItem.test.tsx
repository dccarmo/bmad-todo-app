import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TodoItem } from './TodoItem'
import type { Todo } from '@todo-app/shared'

vi.mock('../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('../hooks/useToast.js', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

const baseTodo: Todo = {
  id: '1',
  text: 'Buy groceries',
  completed: false,
  createdAt: '2026-04-27T10:00:00.000Z',
}

const renderItem = (todo: Todo) =>
  render(
    <ul>
      <TodoItem todo={todo} />
    </ul>
  )

describe('TodoItem', () => {
  it('renders the todo text', () => {
    renderItem(baseTodo)
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('does not apply line-through for an active todo', () => {
    renderItem(baseTodo)
    expect(screen.getByText('Buy groceries')).not.toHaveClass('line-through')
  })

  it('applies line-through and muted color for a completed todo', () => {
    const completedTodo: Todo = { ...baseTodo, completed: true }
    renderItem(completedTodo)
    const text = screen.getByText('Buy groceries')
    expect(text).toHaveClass('line-through')
    expect(text).toHaveClass('text-gray-400')
  })
})
