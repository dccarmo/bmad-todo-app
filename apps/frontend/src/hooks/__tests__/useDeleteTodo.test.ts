import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { useDeleteTodo } from '../useDeleteTodo.js'

vi.mock('../../lib/api.js', () => ({
  deleteTodo: vi.fn(),
}))

import { deleteTodo } from '../../lib/api.js'
const mockDeleteTodo = vi.mocked(deleteTodo)

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

describe('useDeleteTodo', () => {
  beforeEach(() => {
    mockDeleteTodo.mockReset()
  })

  it('optimistically removes the todo from cache', async () => {
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(['todos'], [todo1, todo2])

    let resolveMutation!: () => void
    mockDeleteTodo.mockReturnValue(
      new Promise<void>((res) => {
        resolveMutation = res
      })
    )

    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    await act(async () => {
      result.current.mutate('1')
      await new Promise((r) => setTimeout(r, 0))
    })

    const cached = queryClient.getQueryData<(typeof todo1)[]>(['todos'])!
    expect(cached.find((t) => t.id === '1')).toBeUndefined()
    expect(cached.find((t) => t.id === '2')).toBeDefined()

    resolveMutation()
  })

  it('rolls back cache on error', async () => {
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(['todos'], [todo1, todo2])

    // Subscribe to keep cache alive through invalidation
    const unsub = queryClient.getQueryCache().subscribe(() => {})

    mockDeleteTodo.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    await act(async () => {
      result.current.mutate('1')
      await new Promise((r) => setTimeout(r, 50))
    })

    const cached = queryClient.getQueryData<(typeof todo1)[]>(['todos'])
    expect(cached).toBeDefined()
    expect(cached!.find((t) => t.id === '1')).toBeDefined()
    unsub()
  })
})
