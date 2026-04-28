import { useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

type Options = {
  onError?: (message: string, retry: () => void) => void
}

export function useToggleTodo(options?: Options) {
  const queryClient = useQueryClient()
  const mutateRef = useRef<((vars: { id: string; completed: boolean }) => void) | null>(null)

  const mutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleTodo(id, completed),

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(
        ['todos'],
        (old) => old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
      )
      return { previous }
    },

    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      options?.onError?.('Failed to update todo', () => mutateRef.current?.(variables))
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  useEffect(() => {
    mutateRef.current = mutation.mutate
  })

  return mutation
}
