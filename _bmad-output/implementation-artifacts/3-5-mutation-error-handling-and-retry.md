# Story 3.5: Mutation Error Handling and Retry

Status: ready-for-dev

## Story

As a **user**, I want consistent, friendly error feedback when my actions fail, so I know what went wrong and can try again.

## Acceptance Criteria

1. When any mutation (create, toggle, delete) fails, a toast notification appears with the error message.
2. The toast auto-dismisses after 5 seconds.
3. The toast has a manual close button.
4. Multiple failures stack (show up to 3 toasts simultaneously).
5. Each toast includes a retry button that re-runs the failed mutation.
6. Toast is accessible (`role="alert"`, `aria-live="assertive"`).
7. Inline error indicators on individual items (from stories 3-2, 3-3, 3-4) are removed in favor of the toast system.

## Tasks / Subtasks

- [ ] **Task 1 — Create ToastContext**
  - [ ] Create `apps/frontend/src/context/ToastContext.tsx`
  - [ ] Define `Toast` interface with `id`, `message`, `onRetry?`
  - [ ] Implement `ToastProvider` with `addToast` (max 3, auto-dismiss 5s) and `removeToast`
  - [ ] Export `useToastContext` hook with null-guard

- [ ] **Task 2 — Create useToast hook**
  - [ ] Create `apps/frontend/src/hooks/useToast.ts`
  - [ ] Re-export `addToast` from `useToastContext`

- [ ] **Task 3 — Create ToastContainer component**
  - [ ] Create `apps/frontend/src/components/ToastContainer.tsx`
  - [ ] Render toast list from context with `role="alert"` on each toast
  - [ ] Add `aria-live="assertive"` and `aria-atomic="false"` on the container div
  - [ ] Add Retry button that calls `onRetry` and closes the toast
  - [ ] Add close (✕) button with `aria-label="Close notification"`
  - [ ] Position fixed at bottom-right, stacked vertically, z-index 50

- [ ] **Task 4 — Update useCreateTodo to use toast**
  - [ ] Accept optional `onError?: (message: string, retry: () => void) => void` parameter
  - [ ] In `onError` handler: keep existing rollback logic, then call `options.onError?.('Failed to create todo', () => mutate(variables))`
  - [ ] Remove any internal `isError` state if present (toast replaces it)

- [ ] **Task 5 — Update useToggleTodo to use toast**
  - [ ] Accept optional `onError?: (message: string, retry: () => void) => void` parameter
  - [ ] In `onError` handler: keep existing rollback logic, then call `options.onError?.('Failed to update todo', () => mutate(variables))`
  - [ ] Remove any internal `isError` state if present

- [ ] **Task 6 — Update useDeleteTodo to use toast**
  - [ ] Accept optional `onError?: (message: string, retry: () => void) => void` parameter
  - [ ] In `onError` handler: keep existing rollback logic, then call `options.onError?.('Failed to delete todo', () => mutate(variables))`
  - [ ] Remove any internal `isError` state if present

- [ ] **Task 7 — Update TodoItem to wire toast**
  - [ ] Import `useToast` from `../hooks/useToast.js`
  - [ ] Pass `onError` callback to `useToggleTodo` and `useDeleteTodo` that calls `addToast`
  - [ ] Remove inline error `<span>` elements for `Failed to delete` and `Failed to update`

- [ ] **Task 8 — Update TodoInput to wire toast**
  - [ ] Import `useToast`
  - [ ] Pass `onError` callback to `useCreateTodo` that calls `addToast`
  - [ ] Remove any inline error text if present

- [ ] **Task 9 — Update App.tsx**
  - [ ] Import `ToastProvider` and `ToastContainer`
  - [ ] Wrap app tree with `<ToastProvider>`
  - [ ] Render `<ToastContainer />` inside the provider (outside `TodoPage` but inside `ToastProvider`)

- [ ] **Task 10 — Write tests for ToastContainer**
  - [ ] Create `apps/frontend/src/components/__tests__/ToastContainer.test.tsx`
  - [ ] Test: renders toast message
  - [ ] Test: close button removes toast
  - [ ] Test: retry button calls `onRetry` and closes toast
  - [ ] Test: `role="alert"` present on each toast

- [ ] **Task 11 — Write tests for ToastContext**
  - [ ] Create `apps/frontend/src/context/__tests__/ToastContext.test.tsx`
  - [ ] Test: `addToast` adds a toast visible to consumers
  - [ ] Test: `removeToast` removes the correct toast
  - [ ] Test: auto-dismiss fires after 5 seconds (use `vi.useFakeTimers()`)
  - [ ] Test: adding a 4th toast drops the oldest, keeping only 3

## Dev Notes

### Context from Previous Stories

By the start of this story the following is already in place:

- `apps/frontend/src/lib/api.ts` — `getTodos()`, `createTodo()`, `toggleTodo()`, `deleteTodo()`
- `apps/frontend/src/hooks/useCreateTodo.ts` — optimistic create, inline `isError` state
- `apps/frontend/src/hooks/useToggleTodo.ts` — optimistic toggle, inline `isError` state
- `apps/frontend/src/hooks/useDeleteTodo.ts` — optimistic delete, inline `isError` state
- All three mutations use `onMutate → onError (rollback) → onSettled (invalidate)` pattern
- `TodoItem.tsx` renders inline `<span>` error text per mutation (`Failed to delete`, `Failed to update`)

This story replaces per-item inline errors with a unified toast system and adds retry capability.

### Architecture & File Locations

| Action | File |
|--------|------|
| CREATE | `apps/frontend/src/context/ToastContext.tsx` |
| CREATE | `apps/frontend/src/hooks/useToast.ts` |
| CREATE | `apps/frontend/src/components/ToastContainer.tsx` |
| MODIFY | `apps/frontend/src/hooks/useCreateTodo.ts` |
| MODIFY | `apps/frontend/src/hooks/useToggleTodo.ts` |
| MODIFY | `apps/frontend/src/hooks/useDeleteTodo.ts` |
| MODIFY | `apps/frontend/src/components/TodoItem.tsx` |
| MODIFY | `apps/frontend/src/components/TodoInput.tsx` |
| MODIFY | `apps/frontend/src/App.tsx` |
| CREATE | `apps/frontend/src/components/__tests__/ToastContainer.test.tsx` |
| CREATE | `apps/frontend/src/context/__tests__/ToastContext.test.tsx` |

### Technical Implementation Details

#### NodeNext import convention

All relative imports must use `.js` extension (NodeNext module resolution):

```ts
import { useToastContext } from '../context/ToastContext.js'
import { useToast } from './useToast.js'
```

#### ToastContext.tsx — full implementation

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Toast {
  id: string
  message: string
  onRetry?: () => void
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, onRetry?: () => void) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, onRetry?: () => void) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    // [...prev.slice(-2), newToast] keeps at most 3 (previous 2 + new one)
    setToasts((prev) => [...prev.slice(-2), { id, message, onRetry }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}
```

#### useToast.ts — full implementation

```ts
import { useToastContext } from '../context/ToastContext.js'

export function useToast() {
  const { addToast } = useToastContext()
  return { addToast }
}
```

#### ToastContainer.tsx — full implementation

```tsx
import { useToastContext } from '../context/ToastContext.js'

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext()

  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      className="fixed bottom-4 right-4 flex flex-col gap-2 z-50"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="bg-red-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 max-w-sm"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.onRetry && (
            <button
              onClick={() => {
                toast.onRetry?.()
                removeToast(toast.id)
              }}
              className="underline font-medium"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
            className="ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
```

#### Retry pattern for mutation hooks

The cleanest approach is to pass an optional `onError` callback into each hook so the calling component can supply both the toast message and the retry closure (which requires access to `mutate` and the original variables).

Hook signature change (same pattern for all three):

```ts
// useDeleteTodo.ts (same shape for useCreateTodo and useToggleTodo)
type Options = {
  onError?: (message: string, retry: () => void) => void
}

export function useDeleteTodo(options?: Options) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id) => { /* existing optimistic logic */ },
    onError: (_err, variables, context) => {
      // existing rollback
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      // new: surface error to caller
      options?.onError?.('Failed to delete todo', () => mutate(variables))
      // NOTE: `mutate` here refers to the function returned by useMutation,
      // which is NOT available inside onError. Use the pattern below instead.
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
}
```

**The `mutate` closure problem**: `mutate` is only available on the object returned by `useMutation`, not inside the `onError` callback. Resolve this with a `ref`:

```ts
export function useDeleteTodo(options?: Options) {
  const queryClient = useQueryClient()
  const mutateRef = useRef<((id: string) => void) | null>(null)

  const mutation = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (id) => { /* ... */ },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
      options?.onError?.(
        'Failed to delete todo',
        () => mutateRef.current?.(variables)
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  mutateRef.current = mutation.mutate
  return mutation
}
```

The same `useRef` pattern applies to `useCreateTodo` and `useToggleTodo`.

#### Wiring in components

```tsx
// TodoItem.tsx
import { useToast } from '../hooks/useToast.js'

function TodoItem({ todo }: { todo: Todo }) {
  const { addToast } = useToast()

  const toggleMutation = useToggleTodo({
    onError: (message, retry) => addToast(message, retry),
  })

  const deleteMutation = useDeleteTodo({
    onError: (message, retry) => addToast(message, retry),
  })

  // Remove all inline error <span> elements
}
```

```tsx
// TodoInput.tsx
import { useToast } from '../hooks/useToast.js'

function TodoInput() {
  const { addToast } = useToast()

  const { mutate } = useCreateTodo({
    onError: (message, retry) => addToast(message, retry),
  })
  // ...
}
```

#### App.tsx update

```tsx
import { ToastProvider } from './context/ToastContext.js'
import { ToastContainer } from './components/ToastContainer.js'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TodoPage />
        <ToastContainer />
      </ToastProvider>
    </QueryClientProvider>
  )
}
```

`ToastContainer` must be inside `ToastProvider` to access context. It can be a sibling of `TodoPage` — no need to nest it inside.

### Testing Approach

**`ToastContainer.test.tsx`** — render the component with a mock context value:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastContext } from '../../context/ToastContext.js'
import { ToastContainer } from '../ToastContainer.js'

const mockToast = { id: 't1', message: 'Failed to delete todo', onRetry: vi.fn() }

function renderWithToasts(toasts = [mockToast]) {
  const removeToast = vi.fn()
  render(
    <ToastContext.Provider value={{ toasts, addToast: vi.fn(), removeToast }}>
      <ToastContainer />
    </ToastContext.Provider>
  )
  return { removeToast }
}

test('renders toast message', () => {
  renderWithToasts()
  expect(screen.getByText('Failed to delete todo')).toBeInTheDocument()
})

test('close button removes toast', () => {
  const { removeToast } = renderWithToasts()
  fireEvent.click(screen.getByLabelText('Close notification'))
  expect(removeToast).toHaveBeenCalledWith('t1')
})

test('retry button calls onRetry and removes toast', () => {
  const { removeToast } = renderWithToasts()
  fireEvent.click(screen.getByText('Retry'))
  expect(mockToast.onRetry).toHaveBeenCalled()
  expect(removeToast).toHaveBeenCalledWith('t1')
})

test('each toast has role="alert"', () => {
  renderWithToasts()
  expect(screen.getByRole('alert')).toBeInTheDocument()
})
```

Note: to test `ToastContext` directly you need to export `ToastContext` (not just `useToastContext`). Add `export const ToastContext = createContext<ToastContextValue | null>(null)` to the context file.

**`ToastContext.test.tsx`** — test provider behavior with fake timers:

```tsx
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { ToastProvider, useToastContext } from '../../context/ToastContext.js'

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

test('addToast adds a toast', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('Hello'))
  expect(result.current.toasts).toHaveLength(1)
  expect(result.current.toasts[0].message).toBe('Hello')
})

test('removeToast removes the correct toast', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('A'))
  const id = result.current.toasts[0].id
  act(() => result.current.removeToast(id))
  expect(result.current.toasts).toHaveLength(0)
})

test('toast auto-dismisses after 5 seconds', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('Auto'))
  expect(result.current.toasts).toHaveLength(1)
  act(() => vi.advanceTimersByTime(5000))
  expect(result.current.toasts).toHaveLength(0)
  vi.useRealTimers()
})

test('adding 4th toast drops the oldest, keeping only 3', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => {
    result.current.addToast('1')
    result.current.addToast('2')
    result.current.addToast('3')
    result.current.addToast('4')
  })
  expect(result.current.toasts).toHaveLength(3)
  expect(result.current.toasts.map((t) => t.message)).toEqual(['2', '3', '4'])
})
```

### Scope Boundary — What NOT to Implement

- External toast libraries (react-hot-toast, sonner, notistack, etc.) — keep zero new runtime dependencies
- Success toasts — only error toasts are in scope
- Persistent error log or error history UI
- Server-side error tracking (Sentry, Datadog, etc.)
- Toast animations or transitions beyond basic CSS (can be added later)
- Different toast severity levels (info, warning, success) — error only

## Dev Agent Record

### Agent Model Used

_[leave blank]_

### Debug Log References

_[leave blank]_

### Completion Notes List

_[leave blank]_

## File List

_[leave blank]_

## Change Log

_[leave blank]_
