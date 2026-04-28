import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { TodoItem } from '../TodoItem.js'
import type { Todo } from '@todo-app/shared'

vi.mock('../../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('../../hooks/useDeleteTodo.js', () => ({
  useDeleteTodo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('../../hooks/useToast.js', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

const todo: Todo = {
  id: '1',
  text: 'Buy groceries',
  completed: false,
  createdAt: '2026-04-27T10:00:00.000Z',
}

describe('TodoItem accessibility', () => {
  it('renders the todo text inside a list item', () => {
    render(
      <ul>
        <TodoItem todo={todo} />
      </ul>
    )
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('renders a label element for future checkbox association', () => {
    const { container } = render(
      <ul>
        <TodoItem todo={todo} />
      </ul>
    )
    expect(container.querySelector('label')).toBeInTheDocument()
  })
})
