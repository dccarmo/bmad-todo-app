import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { TodoInput } from './TodoInput'

const mockMutate = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../hooks/useCreateTodo.js', () => ({
  useCreateTodo: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

vi.mock('../hooks/useToast.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

describe('TodoInput', () => {
  beforeEach(() => {
    mockMutate.mockReset()
    mockAddToast.mockReset()
  })

  it('renders an input field and an Add button', () => {
    render(<TodoInput />)
    expect(screen.getByRole('textbox', { name: /add new todo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('calls mutate with trimmed text when the form is submitted', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /add new todo/i }), '  Buy milk  ')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(mockMutate).toHaveBeenCalledOnce()
    expect(mockMutate).toHaveBeenCalledWith('Buy milk', expect.any(Object))
  })

  it('does not call mutate when the input is empty or whitespace only', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /add new todo/i }), '   ')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('calls mutate when Enter is pressed inside the input', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /add new todo/i }), 'Walk the dog{Enter}')
    expect(mockMutate).toHaveBeenCalledOnce()
    expect(mockMutate).toHaveBeenCalledWith('Walk the dog', expect.any(Object))
  })

  it('clears the input on successful submission', async () => {
    mockMutate.mockImplementation((_text: string, { onSuccess }: { onSuccess: () => void }) =>
      onSuccess()
    )
    const user = userEvent.setup()
    render(<TodoInput />)
    const input = screen.getByRole('textbox', { name: /add new todo/i })
    await user.type(input, 'Test task')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(input).toHaveValue('')
  })

  it('does not clear the input when the mutation does not succeed', async () => {
    // mutate is called but onSuccess is never invoked (simulates pending/error)
    mockMutate.mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<TodoInput />)
    const input = screen.getByRole('textbox', { name: /add new todo/i })
    await user.type(input, 'Persistent text')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(input).toHaveValue('Persistent text')
  })
})
