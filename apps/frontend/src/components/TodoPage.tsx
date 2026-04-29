import { useTodos } from '../hooks/useTodos'
import { TodoList } from './TodoList'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'
import { ErrorBoundary } from './ErrorBoundary'
import { TodoInput } from './TodoInput'

export function TodoPage() {
  return (
    <ErrorBoundary>
      <TodoPageInner />
    </ErrorBoundary>
  )
}

function TodoPageInner() {
  const { todos, isLoading, isError, error, refetch } = useTodos()

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="mb-8 text-3xl font-semibold text-gray-900 dark:text-white">My Todos</h1>
        <TodoInput />
        <section aria-label="Todo items" className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : isError && todos.length === 0 ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load todos'}
              onRetry={() => { void refetch() }}
            />
          ) : (
            <>
              {isError && todos.length > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                >
                  Showing cached data — refresh failed.{' '}
                  <button
                    onClick={() => { void refetch() }}
                    className="underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
              {todos.length > 0 ? <TodoList todos={todos} /> : <EmptyState />}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
