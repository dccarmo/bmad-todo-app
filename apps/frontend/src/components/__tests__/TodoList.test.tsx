import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TodoList } from '../TodoList'
import type { Todo } from '@todo-app/shared'

vi.mock('../../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../../hooks/useToast.js', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

const todos: Todo[] = [
  { id: '1', text: 'First task', completed: false, createdAt: new Date().toISOString() },
  { id: '2', text: 'Second task', completed: true, createdAt: new Date().toISOString() },
]

describe('TodoList', () => {
  it('renders a list with the correct aria-label', () => {
    render(<TodoList todos={todos} />)
    expect(screen.getByRole('list', { name: /todo list/i })).toBeInTheDocument()
  })

  it('renders all todo items', () => {
    render(<TodoList todos={todos} />)
    expect(screen.getByText('First task')).toBeInTheDocument()
    expect(screen.getByText('Second task')).toBeInTheDocument()
  })
})
