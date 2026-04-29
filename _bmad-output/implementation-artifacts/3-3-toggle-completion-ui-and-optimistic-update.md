# Story 3.3: Toggle Completion UI and Optimistic Update

Status: ready-for-dev

## Story

**As a user**, I want to click a checkbox to toggle a todo's completion status so that I can track my progress.

## Acceptance Criteria

1. Each todo item displays a checkbox that reflects the current `completed` state — checked when complete, unchecked when incomplete.
2. Clicking the checkbox immediately toggles the visual state (optimistic update) before the server responds.
3. If the PATCH request fails, the todo reverts to its previous `completed` state and an inline error indicator is shown next to the affected item.
4. While the PATCH request is in-flight, the checkbox is disabled to prevent double-submission.
5. Completed todos display their text with a strikethrough style and muted colour.
6. Screen readers announce the todo's completion state change via a dynamic `aria-label` on the checkbox.

**Optimistic update contract:**
- `onMutate`: cancel in-flight queries → snapshot current list → apply optimistic completed state to the matching todo → return snapshot as `{ previous }`.
- `onError`: restore the snapshot from context.
- `onSettled`: invalidate `['todos']` query so server truth replaces the optimistic state.

## Tasks / Subtasks

- [ ] **Task 1 — Add `toggleTodo` to `api.ts`**
  - [ ] 1.1 Add `toggleTodo(id: string, completed: boolean): Promise<Todo>` that PATCH-es `/api/v1/todos/:id`.
  - [ ] 1.2 Throw a descriptive `Error` on non-OK responses including the HTTP status.

- [ ] **Task 2 — Create `useToggleTodo` hook**
  - [ ] 2.1 Create `apps/frontend/src/hooks/useToggleTodo.ts`.
  - [ ] 2.2 Implement `useMutation` with the exact `onMutate` / `onError` / `onSettled` optimistic pattern.
  - [ ] 2.3 `onMutate` receives `{ id, completed }` where `completed` is the **new** desired state; map over the cached list and flip only the matching item.
  - [ ] 2.4 Return `{ previous }` from `onMutate` so `onError` can roll back.

- [ ] **Task 3 — Update `TodoItem` component**
  - [ ] 3.1 Import and call `useToggleTodo` inside `TodoItem`.
  - [ ] 3.2 Add a checkbox `<input type="checkbox">` with `checked={todo.completed}`.
  - [ ] 3.3 Wire `onChange` to call `mutate({ id: todo.id, completed: !todo.completed })`.
  - [ ] 3.4 Set `disabled={isPending}` on the checkbox (AC4).
  - [ ] 3.5 Set `aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}` on the checkbox (AC6).
  - [ ] 3.6 Apply `line-through text-gray-400` classes to the text `<span>` when `todo.completed` is true (AC5).
  - [ ] 3.7 Render an inline error message (e.g. `<span className="text-red-500 text-sm">Failed to update</span>`) when `isError` is true on the mutation instance (AC3).

- [ ] **Task 4 — Write unit tests for `TodoItem`**
  - [ ] 4.1 Create `apps/frontend/src/components/__tests__/TodoItem.test.tsx`.
  - [ ] 4.2 Test: checkbox is checked when `todo.completed` is true; unchecked when false.
  - [ ] 4.3 Test: clicking the checkbox calls `mutate` with `{ id: todo.id, completed: !todo.completed }`.
  - [ ] 4.4 Test: checkbox is disabled when `isPending` is true.
  - [ ] 4.5 Test: completed text has strikethrough class; incomplete text does not.
  - [ ] 4.6 Test: inline error message renders when `isError` is true.
  - [ ] 4.7 Mock `useToggleTodo` at the module level.

- [ ] **Task 5 — Write unit tests for `useToggleTodo` hook**
  - [ ] 5.1 Create `apps/frontend/src/hooks/__tests__/useToggleTodo.test.ts`.
  - [ ] 5.2 Test: optimistic update applies immediately (cache reflects toggled state before server responds).
  - [ ] 5.3 Test: cache rolls back to previous state on mutation error.
  - [ ] 5.4 Mock `api.toggleTodo`.

## Dev Notes

### Context from Previous Stories

By the time this story is implemented, the following are complete and available:

| Story | What it delivers |
|-------|-----------------|
| 1.1 | Monorepo scaffold — `apps/frontend`, `apps/backend`, `packages/shared` |
| 1.2 | `@todo-app/shared` package — exports `Todo` type, `UpdateTodoInput` schema, `MAX_TODO_LENGTH` constant |
| 1.3 | Database schema and migrations |
| 1.4 | Docker / environment setup |
| 1.5 | Code quality tooling, health endpoint |
| 2.1 | `GET /api/v1/todos` backend endpoint |
| 2.2 | Full read UI: `TodoPage`, `TodoList`, `TodoItem`, `EmptyState`, `LoadingState`, `useTodos` hook |
| 3.1 | `PATCH /api/v1/todos/:id` backend endpoint (accepts `{ completed: boolean }`, returns updated `Todo`) |
| 3.2 | `getTodos` and `createTodo` in `api.ts`; `useCreateTodo` hook; `TodoInput` component integrated into `TodoPage` |

The frontend uses:
- **Vite** as the build tool
- **React 19** with TypeScript
- **TanStack Query v5** (`@tanstack/react-query`) — `QueryClientProvider` wraps the app in `main.tsx`
- **Tailwind CSS v4** (CSS-based config, `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- **Vitest + React Testing Library** for unit tests

### Architecture & File Locations

| Action | File |
|--------|------|
| MODIFY | `apps/frontend/src/lib/api.ts` — append `toggleTodo` |
| CREATE | `apps/frontend/src/hooks/useToggleTodo.ts` |
| MODIFY | `apps/frontend/src/components/TodoItem.tsx` — add checkbox and connect `useToggleTodo` |
| CREATE | `apps/frontend/src/components/__tests__/TodoItem.test.tsx` |
| CREATE | `apps/frontend/src/hooks/__tests__/useToggleTodo.test.ts` |

### Technical Implementation Details

#### `apps/frontend/src/lib/api.ts` — Add `toggleTodo`

Append below the existing `createTodo` function. The `Todo` type import is already present from previous stories.

```typescript
export async function toggleTodo(id: string, completed: boolean): Promise<Todo> {
  const res = await fetch(`/api/v1/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  if (!res.ok) throw new Error(`Failed to toggle todo: ${res.status}`)
  return res.json() as Promise<Todo>
}
```

**Important:** Use `/api/v1/todos/${id}` — match the same base path convention used by `getTodos` and `createTodo` in the same file.

#### `apps/frontend/src/hooks/useToggleTodo.ts` — Full File

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

export function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleTodo(id, completed),

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? []
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['todos'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

Key rules:
- `onMutate` must `await cancelQueries` before reading the snapshot to prevent race conditions.
- `onMutate` returns `{ previous }` (not `{ snapshot }`) as the rollback context — `onError` checks `context?.previous`.
- `mutationFn` receives the full `{ id, completed }` object; `completed` is the **new** desired state, not the current one.
- Use `isPending` (NOT `isLoading`) to check mutation in-flight state in TanStack Query v5.
- `onSettled` fires after both success and error; invalidation at that point reconciles optimistic state with server truth.

#### `apps/frontend/src/components/TodoItem.tsx` — Modification

The existing `TodoItem` component (from Story 2.2) renders a `<li>` with the todo text. Extend it as follows:

```tsx
import { useToggleTodo } from '../hooks/useToggleTodo.js'
import type { Todo } from '@todo-app/shared'

export function TodoItem({ todo }: { todo: Todo }) {
  const { mutate, isPending, isError } = useToggleTodo()

  return (
    <li className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={isPending}
        onChange={() => mutate({ id: todo.id, completed: !todo.completed })}
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />
      <span className={todo.completed ? 'line-through text-gray-400' : ''}>
        {todo.text}
      </span>
      {isError && (
        <span className="text-red-500 text-sm">Failed to update</span>
      )}
    </li>
  )
}
```

**Behaviour notes:**
- `checked={todo.completed}` — controlled checkbox reflecting the current (possibly optimistic) cache value.
- `onChange` passes `!todo.completed` as the **new** desired state.
- `disabled={isPending}` — prevents double-submission while the request is in-flight (AC4).
- The `aria-label` is dynamic: it announces the action that will happen next (e.g. "Mark 'Buy milk' as complete"), satisfying AC6.
- `isError` is `true` on the specific mutation instance that failed; it resets automatically on the next mutation attempt.
- Preserve any existing Tailwind classes on `<li>` and `<span>` from Story 2.2 — only add to them, do not remove.

#### NodeNext Module Resolution

All relative imports **must** use the `.js` extension, even for `.ts` / `.tsx` source files:

```typescript
import { toggleTodo } from '../lib/api.js'         // correct
import { useToggleTodo } from '../hooks/useToggleTodo.js' // correct
```

### Testing Approach

#### `apps/frontend/src/components/__tests__/TodoItem.test.tsx`

Mock `useToggleTodo` at the module boundary so tests are pure unit tests that do not touch TanStack Query internals or the network.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TodoItem } from '../TodoItem.js'

const mockMutate = vi.fn()

vi.mock('../../hooks/useToggleTodo.js', () => ({
  useToggleTodo: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
  }),
}))

const incompleteTodo = { id: '1', text: 'Buy milk', completed: false, createdAt: '2026-01-01T00:00:00.000Z' }
const completeTodo   = { id: '2', text: 'Walk dog', completed: true,  createdAt: '2026-01-01T00:00:00.000Z' }

describe('TodoItem', () => {
  beforeEach(() => { mockMutate.mockReset() })

  it('renders an unchecked checkbox for an incomplete todo', () => {
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('renders a checked checkbox for a completed todo', () => {
    render(<TodoItem todo={completeTodo} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls mutate with toggled completed value on checkbox click', async () => {
    const user = userEvent.setup()
    render(<TodoItem todo={incompleteTodo} />)
    await user.click(screen.getByRole('checkbox'))
    expect(mockMutate).toHaveBeenCalledOnce()
    expect(mockMutate).toHaveBeenCalledWith({ id: '1', completed: true })
  })

  it('disables the checkbox when isPending is true', () => {
    vi.mocked(require('../../hooks/useToggleTodo.js').useToggleTodo).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: true,
      isError: false,
    })
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('applies line-through class when todo is completed', () => {
    render(<TodoItem todo={completeTodo} />)
    const span = screen.getByText('Walk dog')
    expect(span).toHaveClass('line-through')
  })

  it('does not apply line-through class when todo is incomplete', () => {
    render(<TodoItem todo={incompleteTodo} />)
    const span = screen.getByText('Buy milk')
    expect(span).not.toHaveClass('line-through')
  })

  it('shows inline error when isError is true', () => {
    vi.mocked(require('../../hooks/useToggleTodo.js').useToggleTodo).mockReturnValueOnce({
      mutate: mockMutate,
      isPending: false,
      isError: true,
    })
    render(<TodoItem todo={incompleteTodo} />)
    expect(screen.getByText('Failed to update')).toBeInTheDocument()
  })
})
```

> **Note on mocking per-test:** If `vi.mocked(require(...))` is awkward in the test setup, prefer creating a separate `mockReturnValue` helper or use `vi.mock` with a factory that reads from a shared mutable object — whichever pattern the existing test suite uses.

Run tests with:
```bash
pnpm --filter frontend test
# or for a specific file
pnpm --filter frontend test TodoItem
```

#### `apps/frontend/src/hooks/__tests__/useToggleTodo.test.ts`

Use `renderHook` from `@testing-library/react` wrapped in a `QueryClientProvider`.

Key scenarios:
- **Optimistic update**: after `mutate` is called (before the async `mutationFn` resolves), `queryClient.getQueryData(['todos'])` must already reflect the toggled state.
- **Rollback on error**: when `mutationFn` rejects, `queryClient.getQueryData(['todos'])` must revert to the pre-mutation snapshot.

Mock `../lib/api.js` with `vi.mock` and control resolution/rejection of `toggleTodo` per test.

### Scope Boundary — What NOT to Implement

| Out of scope | Handled in |
|---|---|
| Delete todo UI | Story 3.4 |
| Retry button / advanced toast error handling | Story 3.5 |
| `ErrorBanner` integration for mutation errors | Story 3.5 |
| E2E tests for the toggle flow | Epic 4 |
| Visual polish / design review | Not story-blocked |
| Pagination | Not in project scope |

The inline `<span className="text-red-500 text-sm">Failed to update</span>` is intentionally minimal for AC3. A richer toast/retry system is Story 3.5's responsibility.

## Dev Agent Record

### Agent Model Used
_[leave blank]_

### Debug Log References
_[leave blank]_

### Completion Notes List
_[leave blank]_

## File List

| File | Action |
|------|--------|
| `apps/frontend/src/lib/api.ts` | Modified |
| `apps/frontend/src/hooks/useToggleTodo.ts` | Created |
| `apps/frontend/src/components/TodoItem.tsx` | Modified |
| `apps/frontend/src/components/__tests__/TodoItem.test.tsx` | Created |
| `apps/frontend/src/hooks/__tests__/useToggleTodo.test.ts` | Created |

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-27 | Story file created | BMad Story Agent |
