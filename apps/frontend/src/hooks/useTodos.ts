import { useQuery } from '@tanstack/react-query'
import { getTodos } from '../lib/api'

export function useTodos() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
    retry: 1,
  })
  return { todos: data ?? [], isLoading: isPending, isError, error, refetch }
}
