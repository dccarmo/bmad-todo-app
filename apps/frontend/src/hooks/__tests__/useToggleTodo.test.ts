import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { useToggleTodo } from '../useToggleTodo.js'

vi.mock('../../lib/api.js', () => ({
  toggleTodo: vi.fn(),
}))

import { toggleTodo } from '../../lib/api.js'
const mockToggleTodo = vi.mocked(toggleTodo)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

const todo1 = { id: '1', text: 'Buy milk', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }
const todo2 = { id: '2', text: 'Walk dog', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }

describe('useToggleTodo', () => {
  beforeEach(() => {
    mockToggleTodo.mockReset()
  })

  it('optimistically toggles the matching todo in cache', async () => {
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(['todos'], [todo1, todo2])

    let resolveMutation!: (v: unknown) => void
    mockToggleTodo.mockReturnValue(
      new Promise((res) => {
        resolveMutation = res
      })
    )

    const { result } = renderHook(() => useToggleTodo(), { wrapper })
    await act(async () => {
      result.current.mutate({ id: '1', completed: true })
      await new Promise((r) => setTimeout(r, 0))
    })

    // Optimistic update should be visible before mutation resolves
    const cached = queryClient.getQueryData<(typeof todo1)[]>(['todos'])!
    expect(cached.find((t) => t.id === '1')?.completed).toBe(true)
    expect(cached.find((t) => t.id === '2')?.completed).toBe(false)

    resolveMutation({ ...todo1, completed: true })
  })

  it('rolls back cache on error', async () => {
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(['todos'], [todo1, todo2])

    // Subscribe to keep cache alive through invalidation
    const unsub = queryClient.getQueryCache().subscribe(() => {})

    mockToggleTodo.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useToggleTodo(), { wrapper })
    await act(async () => {
      result.current.mutate({ id: '1', completed: true })
      await new Promise((r) => setTimeout(r, 50))
    })

    const cached = queryClient.getQueryData<(typeof todo1)[]>(['todos'])
    expect(cached).toBeDefined()
    expect(cached!.find((t) => t.id === '1')?.completed).toBe(false)
    unsub()
  })
})
