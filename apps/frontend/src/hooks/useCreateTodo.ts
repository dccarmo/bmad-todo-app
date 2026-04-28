import { useRef, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { createTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

type Options = {
  onError?: (message: string, retry: () => void) => void
}

export function useCreateTodo(options?: Options) {
  const queryClient = useQueryClient()
  const mutateRef = useRef<((text: string) => void) | null>(null)

  const mutation = useMutation({
    mutationFn: createTodo,
    onMutate: async (text: string) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const snapshot = queryClient.getQueryData<Todo[]>(['todos'])

      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [...old, optimisticTodo])

      return { snapshot }
    },
    onError: (_err, variables, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(['todos'], context.snapshot)
      }
      options?.onError?.('Failed to create todo', () => mutateRef.current?.(variables))
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
