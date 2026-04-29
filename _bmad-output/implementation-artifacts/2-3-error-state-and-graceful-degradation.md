# Story 2.3: Error State and Graceful Degradation

Status: in-progress

## Story

As a **user**, I want to see a clear error message when todos can't be loaded, so I can understand what went wrong and retry.

## Acceptance Criteria

1. When the `GET /api/v1/todos` request fails (network error or 5xx), the UI shows an error message — not a blank screen or spinner.
2. The error message includes a "Retry" button that re-fetches todos.
3. If todos were previously loaded and a background refresh fails, the stale data remains visible with a non-blocking error indicator at the top.
4. An Error Boundary catches unexpected React render errors and shows a fallback UI.
5. The error message container has `role="alert"` so screen readers announce it.
6. No `console.error` leaks from handled fetch errors — TanStack Query manages error logging; `api.ts` must not call `console.error`.

## Tasks / Subtasks

- [x] **Task 1 — Create `ErrorState` component** (AC: 1, 2, 5)
  - [x] Create `apps/frontend/src/components/ErrorState.tsx`
  - [x] Render a `<div role="alert">` with the error message and a "Retry" button
  - [x] Accept `message: string` and `onRetry: () => void` as props
  - [x] Style with Tailwind — red/rose palette to signal error, accessible contrast

- [x] **Task 2 — Create `ErrorBoundary` component** (AC: 4)
  - [x] Create `apps/frontend/src/components/ErrorBoundary.tsx` as a class component
  - [x] Implement `getDerivedStateFromError` to flip `hasError` flag
  - [x] Implement `componentDidCatch` to log with `console.error` (intentional — render errors are unexpected)
  - [x] Accept `children` and optional `fallback?: ReactNode` prop
  - [x] Render `fallback` when `hasError`, otherwise render `children`

- [x] **Task 3 — Update `useTodos` hook** (AC: 2, 6)
  - [x] Modify `apps/frontend/src/hooks/useTodos.ts`
  - [x] Add `retry: 1` to the `useQuery` options (reduces wait before error state is shown)
  - [x] Expose `refetch` in the return value alongside existing `todos`, `isLoading`, `isError`, `error`

- [ ] **Task 4 — Update `TodoPage` to render error states** (AC: 1, 2, 3, 4) — DEFERRED: TodoPage.tsx is being updated post-parallel-merge; this task will be completed in a follow-up pass after all parallel stories complete
  - [ ] Modify `apps/frontend/src/pages/TodoPage.tsx`
  - [ ] Import `ErrorBoundary`, `ErrorState`
  - [ ] Destructure `refetch` from `useTodos()`
  - [ ] When `isError && todos.length === 0`: render `<ErrorState>` in place of list/empty
  - [ ] When `isError && todos.length > 0`: render stale `<TodoList>` with an error banner above it
  - [ ] Wrap the entire page return in `<ErrorBoundary>`

- [x] **Task 5 — Audit `api.ts` for console.error** (AC: 6)
  - [x] Open `apps/frontend/src/lib/api.ts`
  - [x] Remove any `console.error(...)` call inside `getTodos` if present from story 2-2 — none found; no change needed
  - [x] Confirm the function only throws — TanStack Query handles logging

- [x] **Task 6 — Write unit tests** (partially done)
  - [x] Create `apps/frontend/src/components/__tests__/ErrorState.test.tsx`
    - [x] Test: renders element with `role="alert"` containing the message
    - [x] Test: clicking "Retry" calls the `onRetry` callback
  - [ ] Create `apps/frontend/src/pages/__tests__/TodoPage.error.test.tsx` — DEFERRED: requires TodoPage to be updated first; will be created after post-parallel TodoPage merge

- [x] **Task 7 — Verify lint and tests pass**
  - [x] Run lint from repo root — passed
  - [x] Run tests in `apps/frontend` — 5 tests passed (2 files)

## Dev Notes

### Context from Previous Stories

Story 2-2 created all the base UI scaffolding. The following files exist and must be modified or leveraged — do not recreate them:

- **`apps/frontend/src/lib/api.ts`** — exports `getTodos(): Promise<Todo[]>`. The function throws an `Error` on non-2xx responses. It must NOT call `console.error` — verify and remove any such call if present.
- **`apps/frontend/src/lib/queryClient.ts`** — exports the `QueryClient` singleton.
- **`apps/frontend/src/hooks/useTodos.ts`** — wraps `useQuery({ queryKey: ['todos'], queryFn: getTodos })`. Currently returns `{ todos, isLoading, isError, error }`. This story adds `retry: 1` and `refetch`.
- **`apps/frontend/src/pages/TodoPage.tsx`** — renders loading / empty / list states. Story 2-2 explicitly left out error state rendering; that belongs here.
- **`apps/frontend/src/components/TodoList.tsx`**, **`TodoItem.tsx`**, **`EmptyState.tsx`**, **`LoadingState.tsx`** — all exist and are used unchanged by this story.
- **`apps/frontend/src/main.tsx`** — wraps `<App>` in `<QueryClientProvider>`. No changes needed.
- **Vitest + React Testing Library** — already configured in `vite.config.ts` with `environment: 'jsdom'`, `globals: true`, and `setupFiles: './src/test-setup.ts'`. `apps/frontend/src/test-setup.ts` imports `@testing-library/jest-dom`.

TanStack Query already exposes `isError` and `error` from `useQuery`. Story 2-2 intentionally passed them through from the hook but never consumed them in `TodoPage`. This story completes that circuit.

---

### Architecture & File Locations

| Action | File |
|--------|------|
| CREATE | `apps/frontend/src/components/ErrorState.tsx` |
| CREATE | `apps/frontend/src/components/ErrorBoundary.tsx` |
| CREATE | `apps/frontend/src/components/__tests__/ErrorState.test.tsx` |
| CREATE | `apps/frontend/src/pages/__tests__/TodoPage.error.test.tsx` |
| MODIFY | `apps/frontend/src/hooks/useTodos.ts` |
| MODIFY | `apps/frontend/src/pages/TodoPage.tsx` |
| AUDIT  | `apps/frontend/src/lib/api.ts` (remove `console.error` if present) |

---

### Technical Implementation Details

#### `apps/frontend/src/components/ErrorState.tsx` (CREATE)

```tsx
interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950"
    >
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Retry
      </button>
    </div>
  )
}
```

Key points:
- `role="alert"` is required for AC5. Assistive technology will announce the content immediately when it appears in the DOM.
- The component is purely presentational — it receives `onRetry` as a callback and does not call `refetch` directly. This keeps it testable in isolation.
- Tailwind classes use the red/rose palette for error semantics, with dark mode variants.
- Do not add `aria-live="assertive"` separately — `role="alert"` already implies `aria-live="assertive"`.

---

#### `apps/frontend/src/components/ErrorBoundary.tsx` (CREATE)

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Intentional console.error: render errors are unexpected and should be visible
    // in production error monitoring. This is NOT a handled fetch error (AC6 does
    // not apply here — AC6 is specifically about getTodos in api.ts).
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-800 dark:bg-red-950"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
```

Key points:
- **Must be a class component.** React 19 does not support hooks-based error boundaries. `getDerivedStateFromError` and `componentDidCatch` are class lifecycle methods with no hooks equivalent.
- `console.error` inside `componentDidCatch` is intentional and correct. AC6 prohibits `console.error` in the fetch layer (`api.ts`), not in the error boundary. Render errors are unexpected and should surface in error monitoring (e.g., Sentry in production).
- The `fallback` prop allows callers to customize the fallback UI. If not provided, a default `role="alert"` message is shown.
- The `nullish coalescing` operator `??` (not `||`) is used so an explicitly-passed `false` or empty string fallback does not trigger the default.

---

#### `apps/frontend/src/hooks/useTodos.ts` (MODIFY)

Replace the existing export with:

```ts
import { useQuery } from '@tanstack/react-query'
import { getTodos } from '../lib/api.js'

export function useTodos() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
    retry: 1,
  })
  return { todos: data ?? [], isLoading, isError, error, refetch }
}
```

Changes from Story 2-2:
- `retry: 1` — TanStack Query's default is 3 retries. With 3 retries and exponential back-off, users would wait ~7 seconds before seeing the error state. Setting `retry: 1` means one retry, so the error state appears after roughly 1–2 seconds on a broken connection.
- `refetch` is now destructured and returned — the `Retry` button in `ErrorState` (and the error banner) will call this.
- `data ?? []` is unchanged — stale data from a previous successful fetch is automatically kept by TanStack Query in `data` even when `isError` is true (this is the built-in stale-data behavior that implements AC3 without any extra code).

**TanStack Query stale-data behavior (AC3):**
When a background refetch fails after todos were previously loaded:
- `isError` becomes `true`
- `error` is set to the thrown Error
- `data` retains the last successfully fetched value (stale todos)
- `isLoading` remains `false` (initial fetch already completed)

The component can therefore check `isError && todos.length > 0` to distinguish the "stale data with error" scenario from "no data, hard error".

---

#### `apps/frontend/src/pages/TodoPage.tsx` (MODIFY)

Replace the existing component with:

```tsx
import { useTodos } from '../hooks/useTodos.js'
import { TodoList } from '../components/TodoList.js'
import { EmptyState } from '../components/EmptyState.js'
import { LoadingState } from '../components/LoadingState.js'
import { ErrorState } from '../components/ErrorState.js'
import { ErrorBoundary } from '../components/ErrorBoundary.js'

export function TodoPage() {
  const { todos, isLoading, isError, error, refetch } = useTodos()

  const errorMessage =
    error instanceof Error ? error.message : 'Failed to load todos. Please try again.'

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
        <div className="mx-auto max-w-xl px-4">
          <h1 className="mb-8 text-3xl font-semibold text-gray-900 dark:text-white">
            My Todos
          </h1>

          {/* TodoInput will be added here in Story 3.2 */}

          <section aria-label="Todo items" className="mt-6">
            {isLoading ? (
              <LoadingState />
            ) : isError && todos.length === 0 ? (
              <ErrorState message={errorMessage} onRetry={refetch} />
            ) : (
              <>
                {isError && (
                  <div
                    role="alert"
                    className="mb-4 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800 dark:bg-yellow-950"
                  >
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Couldn't refresh. Showing last known todos.
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="ml-4 rounded-md bg-yellow-600 px-3 py-1 text-sm font-medium text-white hover:bg-yellow-700"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {todos.length > 0 ? (
                  <TodoList todos={todos} />
                ) : (
                  <EmptyState />
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </ErrorBoundary>
  )
}
```

**State machine for display:**

```
isLoading === true                    → <LoadingState />
isError && todos.length === 0         → <ErrorState> (full replacement, no list)
isError && todos.length > 0           → yellow banner + <TodoList> (stale data visible)
!isError && todos.length > 0          → <TodoList>
!isError && todos.length === 0        → <EmptyState>
```

Design decisions:
- When `isError && todos.length === 0`, the `ErrorState` component replaces the list area entirely. The user has nothing useful to see, so the whole section is the error.
- When `isError && todos.length > 0`, a **yellow** (warning, not error) banner appears above the stale list. Yellow is used instead of red because the user's data is still visible and usable — this is a non-blocking degradation signal, not a hard failure.
- `isLoading` takes priority over `isError` in the condition order. This matters on initial load where both could theoretically be true momentarily during the retry sequence.
- `refetch` is wrapped in an arrow function `() => refetch()` in the inline banner's `onClick` to satisfy TypeScript (the `refetch` signature returns a Promise; wrapping it discards the Promise return).
- `ErrorBoundary` wraps the entire `<main>` to catch render errors in child components (e.g., a malformed `todo.text` that breaks `TodoItem`).

---

#### `apps/frontend/src/lib/api.ts` (AUDIT)

Open the file and verify `getTodos` does not contain `console.error`. The correct implementation from Story 2-2 is:

```ts
import type { Todo } from '@todo-app/shared'

const API_BASE = '/api/v1'

export async function getTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_BASE}/todos`)
  if (!res.ok) {
    throw new Error(`Failed to fetch todos: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Todo[]>
}
```

If a `console.error(...)` call exists (e.g., `console.error('Failed to fetch', res.status)`), remove it. TanStack Query surfaces errors through `isError` and `error` — logging in the fetch function creates duplicate noise and violates AC6.

---

### Testing Approach

#### Test file: `apps/frontend/src/components/__tests__/ErrorState.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorState } from '../ErrorState.js'

describe('ErrorState', () => {
  it('renders the error message with role="alert"', () => {
    render(<ErrorState message="Network error" onRetry={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Network error')
  })

  it('calls onRetry when Retry button is clicked', async () => {
    const user = userEvent.setup()
    const mockRetry = vi.fn()
    render(<ErrorState message="Network error" onRetry={mockRetry} />)
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })
})
```

#### Test file: `apps/frontend/src/pages/__tests__/TodoPage.error.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { TodoPage } from '../TodoPage.js'
import type { Todo } from '@todo-app/shared'

// Mock the entire useTodos module so we don't need a QueryClientProvider
vi.mock('../../hooks/useTodos.js', () => ({
  useTodos: vi.fn(),
}))

import { useTodos } from '../../hooks/useTodos.js'

const mockRefetch = vi.fn()

const staleTodo: Todo = {
  id: '1',
  text: 'Buy groceries',
  completed: false,
  createdAt: '2026-04-27T10:00:00.000Z',
}

describe('TodoPage — error states', () => {
  it('renders ErrorState when isError is true and no stale todos', () => {
    vi.mocked(useTodos).mockReturnValue({
      todos: [],
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: mockRefetch,
    })

    render(<TodoPage />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders stale todos and error banner when isError is true and todos are present', () => {
    vi.mocked(useTodos).mockReturnValue({
      todos: [staleTodo],
      isLoading: false,
      isError: true,
      error: new Error('Refresh failed'),
      refetch: mockRefetch,
    })

    render(<TodoPage />)

    // Stale todo is visible
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()

    // Error banner is present (role="alert")
    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(1)

    // Full list still rendered
    expect(screen.getByRole('list')).toBeInTheDocument()
  })
})
```

**Why `vi.mock` instead of QueryClientProvider wrapping:**
Mocking `useTodos` at the module level lets us test `TodoPage`'s rendering logic in complete isolation — no network, no QueryClient setup, no retry delays. This is the standard approach for testing components that depend on custom hooks.

**Note on `vi.mocked`:** Vitest's `vi.mocked()` utility wraps the import in the correct TypeScript type so `.mockReturnValue()` is available without a type cast.

**`__tests__` directory:** Tests are co-located under `__tests__/` subdirectories within `src/components/` and `src/pages/` to mirror the project structure established in Story 2-2 (`src/components/TodoItem.test.tsx` is a flat sibling — either convention is acceptable, but prefer `__tests__/` for new multi-test files to avoid cluttering component directories).

---

### Scope Boundary — What NOT to Implement

| Feature | Story |
|---------|-------|
| Error handling for create / toggle / delete mutations | Story 3.5 |
| Retry logic for mutations | Story 3.5 |
| `ReactQueryDevtools` error panel | Optional / future |
| Toast notifications for errors | Not in scope for this epic |
| Accessible layout polish beyond `role="alert"` | Story 2.4 |
| E2E test for error recovery flow | Story 4.3 |
| Error logging to external service (e.g., Sentry) | Outside PRD scope |
| Reset `ErrorBoundary` state on route change | No routing in this app |

---

### Common Gotchas

1. **ErrorBoundary must be a class component.** As of React 19, there is no hooks-based API for error boundaries. `getDerivedStateFromError` is a static class method — it cannot be replaced with `useEffect` or any hook.

2. **`console.error` in `ErrorBoundary.componentDidCatch` is correct.** AC6 ("no console.error leaks from handled fetch errors") applies specifically to `api.ts`. Render errors caught by the boundary are unexpected failures that should be logged. Do not remove `console.error` from `componentDidCatch`.

3. **TanStack Query keeps stale `data` when `isError` is true.** No extra state management is needed to implement AC3. When `refetch` fails after a successful initial load, `data` retains the previous value. Checking `todos.length > 0` in the render branch is sufficient.

4. **`retry: 1` is per-query, not global.** Setting it on the `useQuery` call in `useTodos.ts` only affects the todos query. The `QueryClient` singleton default (3 retries) remains for any future queries that don't override it. Do not change `queryClient.ts`.

5. **`refetch` return type.** `refetch` from TanStack Query returns `Promise<QueryObserverResult>`. Passing it directly as an `onClick` handler can cause TypeScript to warn about the unhandled promise. Wrap it: `onClick={() => refetch()}` or `onClick={() => void refetch()}`.

6. **Import path extensions.** All relative imports in this project use `.js` extensions (NodeNext module resolution convention, even for `.tsx` files):
   - `import { ErrorState } from '../components/ErrorState.js'`
   - `import { useTodos } from '../../hooks/useTodos.js'`
   Using `.tsx` extensions also works with `moduleResolution: "bundler"` — be consistent with the rest of the codebase.

7. **`vi.mock` must be at the top level.** Vitest hoists `vi.mock(...)` calls to the top of the file during compilation. Do not place them inside `describe` or `beforeEach`. The import of `useTodos` must come after the `vi.mock(...)` call in source order (Vitest handles the hoisting, but static analysis tools require this order).

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None

### Completion Notes List
- Task 4 (TodoPage update) deferred — TodoPage.tsx is out of scope per parallel story constraints; will be completed post-merge
- Task 6 partially done — ErrorState tests created and passing; TodoPage.error.test deferred alongside Task 4
- api.ts audit confirmed clean — no console.error present
- All 5 tests pass; lint and format checks clean

## File List

- `apps/frontend/src/components/ErrorState.tsx` — created
- `apps/frontend/src/components/ErrorBoundary.tsx` — created
- `apps/frontend/src/hooks/useTodos.ts` — modified (retry: 1, expose refetch)
- `apps/frontend/src/components/__tests__/ErrorState.test.tsx` — created

## Change Log

- 2026-04-27: Story 2.3 partial — ErrorState, ErrorBoundary, useTodos update; TodoPage integration deferred to post-parallel merge
