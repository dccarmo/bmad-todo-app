import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTodos, createTodo, toggleTodo, deleteTodo } from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const makeTodo = (overrides = {}) => ({
  id: '1',
  text: 'Test',
  completed: false,
  createdAt: new Date().toISOString(),
  ...overrides,
})

function mockOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function mockFail(status = 500, body: unknown = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => mockFetch.mockReset())

describe('getTodos', () => {
  it('returns todos on success', async () => {
    const todos = [makeTodo()]
    mockOk(todos)
    await expect(getTodos()).resolves.toEqual(todos)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/todos')
  })

  it('throws on non-ok response', async () => {
    mockFail(503)
    await expect(getTodos()).rejects.toThrow('Failed to fetch todos')
  })
})

describe('createTodo', () => {
  it('posts and returns new todo', async () => {
    const todo = makeTodo({ text: 'New' })
    mockOk(todo)
    await expect(createTodo('New')).resolves.toEqual(todo)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/todos',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws with server error message on failure', async () => {
    mockFail(400, { error: { message: 'Text too long' } })
    await expect(createTodo('x')).rejects.toThrow('Text too long')
  })

  it('falls back to generic message when error body is not parseable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })
    await expect(createTodo('x')).rejects.toThrow('Failed to create todo')
  })
})

describe('toggleTodo', () => {
  it('patches and returns updated todo', async () => {
    const todo = makeTodo({ completed: true })
    mockOk(todo)
    await expect(toggleTodo('1', true)).resolves.toEqual(todo)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/todos/1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('throws on failure', async () => {
    mockFail(404)
    await expect(toggleTodo('1', true)).rejects.toThrow('Failed to toggle todo')
  })
})

describe('deleteTodo', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    await expect(deleteTodo('1')).resolves.toBeUndefined()
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/todos/1', { method: 'DELETE' })
  })

  it('throws on failure', async () => {
    mockFail(500)
    await expect(deleteTodo('1')).rejects.toThrow('Failed to delete todo')
  })
})
