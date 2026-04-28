import { useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

type Options = {
  onError?: (message: string, retry: () => void) => void
}

export function useDeleteTodo(options?: Options) {
  const queryClient = useQueryClient()
  const mutateRef = useRef<((id: string) => void) | null>(null)

  const mutation = useMutation({
    mutationFn: (id: string) => deleteTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old) => old?.filter((t) => t.id !== id) ?? [])
      return { previous }
    },

    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      options?.onError?.('Failed to delete todo', () => mutateRef.current?.(variables))
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
