# Story 3.2: Create Todo UI & Optimistic Update

Status: in-progress

## Story

**As a user**, I want to type a task and submit it to instantly see it appear in my list, so that adding tasks feels immediate with no waiting.

## Acceptance Criteria

1. Typing text and pressing Enter or clicking the submit button causes the todo to appear immediately in the list (before the server responds) and the input is cleared — refs FR21, NFR3.
2. When the server confirms creation, the optimistically added entry is replaced with the server-returned todo carrying a real persistent ID.
3. When the server rejects creation, the optimistically added todo is removed from the list and an error message is shown — refs FR22, FR18.
4. Submitting an empty input creates no todo and sends no request to the server.
5. The input field is an `<input>` element nested inside a `<form>`; pressing Enter submits the form — refs FR2, FR23, FR24.
6. The input enforces a maximum length of 500 characters client-side via the `maxLength` attribute (sourced from the shared constant `MAX_TODO_LENGTH`).

**Optimistic update contract:**
- `onMutate`: cancel in-flight queries → snapshot current list → apply optimistic todo with a `temp-` prefixed ID → return snapshot.
- `onError`: restore snapshot from context.
- `onSettled`: invalidate `['todos']` query so the real server response replaces the temp entry.

## Tasks / Subtasks

- [x] **Task 1 — Add `createTodo` to `api.ts`**
  - [x] 1.1 Add `createTodo(text: string): Promise<Todo>` that POST-s to `/api/v1/todos`.
  - [x] 1.2 Parse and re-throw API error messages from the response body on non-OK status.

- [x] **Task 2 — Create `useCreateTodo` hook**
  - [x] 2.1 Create `apps/frontend/src/hooks/useCreateTodo.ts`.
  - [x] 2.2 Implement `useMutation` with the exact `onMutate` / `onError` / `onSettled` optimistic pattern.
  - [x] 2.3 Build and prepend the optimistic `Todo` object using a `temp-${Date.now()}` id and `completed: false`.

- [x] **Task 3 — Create `TodoInput` component**
  - [x] 3.1 Create `apps/frontend/src/components/TodoInput.tsx`.
  - [x] 3.2 Render a `<form>` containing a text `<input>` and a submit `<button>`.
  - [x] 3.3 Guard against empty submission (trim check before calling mutate).
  - [x] 3.4 On success callback: clear the input text state.
  - [x] 3.5 On error callback: store the error message in local state and display it inline.
  - [x] 3.6 Disable input and button while `isPending` is true.
  - [x] 3.7 Apply `maxLength={MAX_TODO_LENGTH}` to the input.
  - [x] 3.8 Add `aria-label="New todo text"` to the input and `role="alert"` to the error paragraph.

- [ ] **Task 4 — Integrate `TodoInput` into `TodoPage`**
  > **DEFERRED**: TodoPage integration is deferred to post-parallel merge to avoid conflicts with other parallel stories (3.3, 3.4) modifying the same file.
  - [ ] 4.1 Import and render `<TodoInput />` above the list/loading/empty conditional in `TodoPage.tsx`.

- [x] **Task 5 — Write unit tests for `TodoInput`**
  - [x] 5.1 Create `apps/frontend/src/components/TodoInput.test.tsx`.
  - [x] 5.2 Test: component renders an input and a button.
  - [x] 5.3 Test: typing text and submitting calls the mutation with the trimmed text.
  - [x] 5.4 Test: submitting with an empty/whitespace-only input does NOT call the mutation.
  - [x] 5.5 Test: on success, the input is cleared.
  - [x] 5.6 Test: on error, an error message is displayed.
  - [x] 5.7 Mock `useCreateTodo` at the module level so tests are pure unit tests.

## Dev Notes

### Context from Previous Stories

By the time this story is implemented, the following are complete and available:

| Story | What it delivers |
|-------|-----------------|
| 1.1 | Monorepo scaffold — `apps/frontend`, `apps/backend`, `packages/shared` |
| 1.2 | `@todo-app/shared` package — exports `Todo` type and `MAX_TODO_LENGTH = 500` constant |
| 1.3 | Database schema and migrations |
| 1.4 | Docker / environment setup |
| 1.5 | Code quality tooling, health endpoint |
| 2.1 | `GET /api/v1/todos` backend endpoint |
| 2.2 | Full read UI: `TodoPage`, `TodoList`, `TodoItem`, `EmptyState`, `LoadingState`, `useTodos` hook |
| 2.3 | `ErrorBanner` component (`props: { message: string; onRetry: () => void }`) — available for use |
| 2.4 | Accessibility and responsive layout baseline |
| 3.1 | `POST /api/v1/todos`, `PATCH /api/v1/todos/:id`, `DELETE /api/v1/todos/:id` backend endpoints |

The frontend uses:
- **Vite** as the build tool
- **React 18** with TypeScript
- **TanStack Query v5** (`@tanstack/react-query`) — `QueryClientProvider` wraps the app in `main.tsx`
- **Tailwind CSS v4**
- **Vitest + React Testing Library** for unit tests

### File Layout After This Story

```
apps/frontend/src/
  components/
    TodoPage.tsx          # Modified — adds <TodoInput />
    TodoInput.tsx         # NEW
    TodoInput.test.tsx    # NEW
    TodoList.tsx          # Unchanged
    TodoItem.tsx          # Unchanged
    TodoItem.test.tsx     # Unchanged
    EmptyState.tsx        # Unchanged
    LoadingState.tsx      # Unchanged
  hooks/
    useCreateTodo.ts      # NEW
    useTodos.ts           # Unchanged
  lib/
    api.ts                # Modified — adds createTodo()
    queryClient.ts        # Unchanged
```

### Architecture Requirements

#### Optimistic Update Pattern (MUST match exactly)

All mutations in this project follow the canonical pattern below. Do not deviate from it.

```typescript
useMutation({
  mutationFn: apiCall,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const snapshot = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], optimisticUpdate)
    return { snapshot }
  },
  onError: (_err, _input, context) => {
    queryClient.setQueryData(['todos'], context?.snapshot)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

Key rules:
- Use `isPending` (NOT `isLoading`) to check mutation in-flight state in v5.
- `onMutate` must `await cancelQueries` before reading the snapshot to prevent race conditions.
- `onSettled` fires after both success and error; invalidation at that point reconciles the temp entry with the server-confirmed record.

#### Temp-ID Strategy

Because the optimistic todo is inserted before the server assigns an ID, a temporary string ID is used:

```typescript
const optimisticTodo: Todo = {
  id: `temp-${Date.now()}`,
  text,
  completed: false,
  createdAt: new Date().toISOString(),
}
```

When `onSettled` fires, `invalidateQueries` triggers a refetch that replaces the entire list (including the temp entry) with the server-confirmed data. There is no manual substitution of the temp ID.

### Technical Implementation

#### `apps/frontend/src/lib/api.ts` — Add `createTodo`

Append below the existing `getTodos` function:

```typescript
export async function createTodo(text: string): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Failed to create todo')
  }
  return res.json()
}
```

Import `Todo` from `@todo-app/shared` if not already imported at the top of the file.

#### `apps/frontend/src/hooks/useCreateTodo.ts` — Full File

```typescript
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { createTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
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

      queryClient.setQueryData<Todo[]>(['todos'], (old = []) => [
        ...old,
        optimisticTodo,
      ])

      return { snapshot }
    },
    onError: (_err, _text, context) => {
      queryClient.setQueryData(['todos'], context?.snapshot)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

#### `apps/frontend/src/components/TodoInput.tsx` — Full File

```tsx
import { useState } from 'react'
import { useCreateTodo } from '../hooks/useCreateTodo.js'
import { MAX_TODO_LENGTH } from '@todo-app/shared'

export function TodoInput() {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutate: createTodo, isPending } = useCreateTodo()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)
    createTodo(text.trim(), {
      onSuccess: () => setText(''),
      onError: (err) => setError(err.message),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_TODO_LENGTH}
        placeholder="Add a new task..."
        disabled={isPending}
        aria-label="New todo text"
      />
      <button type="submit" disabled={isPending || !text.trim()}>
        Add
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
```

**Behavior notes:**
- On success: `setText('')` clears the input; the optimistic todo is already visible and will be confirmed by the invalidation refetch.
- On error: the optimistic todo is rolled back by `onError` in the hook; the error message is shown inline; the input text is NOT cleared so the user can retry with the same text.
- `isPending` disables both the input and the button during the in-flight request, preventing duplicate submissions.

#### `apps/frontend/src/components/TodoPage.tsx` — Modification

Add the import and render `<TodoInput />` as the first child of `<main>`:

```tsx
import { useTodos } from '../hooks/useTodos.js'
import { TodoList } from './TodoList.js'
import { LoadingState } from './LoadingState.js'
import { EmptyState } from './EmptyState.js'
import { TodoInput } from './TodoInput.js'   // ADD THIS

export function TodoPage() {
  const { data: todos = [], isLoading } = useTodos()

  return (
    <main>
      <TodoInput />                          {/* ADD THIS */}
      {isLoading ? (
        <LoadingState />
      ) : todos.length === 0 ? (
        <EmptyState />
      ) : (
        <TodoList todos={todos} />
      )}
    </main>
  )
}
```

### Testing Approach

File: `apps/frontend/src/components/TodoInput.test.tsx`

Mock `useCreateTodo` at the module boundary so unit tests do not touch TanStack Query internals or the network.

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TodoInput } from './TodoInput.js'
import * as useCreateTodoModule from '../hooks/useCreateTodo.js'

// Controlled mock for the mutate function
const mockMutate = vi.fn()

vi.mock('../hooks/useCreateTodo.js', () => ({
  useCreateTodo: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

describe('TodoInput', () => {
  beforeEach(() => {
    mockMutate.mockReset()
  })

  it('renders an input field and an Add button', () => {
    render(<TodoInput />)
    expect(screen.getByRole('textbox', { name: /new todo text/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('calls mutate with trimmed text when the form is submitted', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /new todo text/i }), '  Buy milk  ')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(mockMutate).toHaveBeenCalledOnce()
    expect(mockMutate).toHaveBeenCalledWith('Buy milk', expect.any(Object))
  })

  it('does not call mutate when the input is empty or whitespace only', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /new todo text/i }), '   ')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('calls mutate when Enter is pressed inside the input', async () => {
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /new todo text/i }), 'Walk the dog{Enter}')
    expect(mockMutate).toHaveBeenCalledOnce()
    expect(mockMutate).toHaveBeenCalledWith('Walk the dog', expect.any(Object))
  })

  it('clears the input on successful submission', async () => {
    mockMutate.mockImplementation((_text, { onSuccess }) => onSuccess())
    const user = userEvent.setup()
    render(<TodoInput />)
    const input = screen.getByRole('textbox', { name: /new todo text/i })
    await user.type(input, 'Test task')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(input).toHaveValue('')
  })

  it('shows an inline error message on failed submission', async () => {
    mockMutate.mockImplementation((_text, { onError }) =>
      onError(new Error('Server error'))
    )
    const user = userEvent.setup()
    render(<TodoInput />)
    await user.type(screen.getByRole('textbox', { name: /new todo text/i }), 'Test task')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Server error')
  })

  it('does not clear the input on a failed submission', async () => {
    mockMutate.mockImplementation((_text, { onError }) =>
      onError(new Error('Server error'))
    )
    const user = userEvent.setup()
    render(<TodoInput />)
    const input = screen.getByRole('textbox', { name: /new todo text/i })
    await user.type(input, 'Persistent text')
    await user.click(screen.getByRole('button', { name: /add/i }))
    expect(input).toHaveValue('Persistent text')
  })
})
```

Run tests with:
```bash
pnpm --filter frontend test
# or
pnpm --filter frontend test TodoInput
```

### Scope Boundary

**In scope for this story:**
- `createTodo` function in `api.ts`
- `useCreateTodo` hook with the full optimistic pattern
- `TodoInput` component with form, input, button, and inline error
- Integration of `TodoInput` into `TodoPage`
- Unit tests for `TodoInput`

**Explicitly out of scope (handled in later stories):**
- Toggle completion UI (Story 3.3)
- Delete todo UI (Story 3.4)
- Retry button and advanced error handling (Story 3.5) — `ErrorBanner` exists from Story 2.3 but the retry affordance specific to mutations is Story 3.5's concern; for now, the inline `<p role="alert">` is sufficient
- E2E tests covering the create flow (Epic 4)
- Styling / Tailwind classes — apply sensible defaults but visual polish is not a blocking criterion

**`MAX_TODO_LENGTH` source of truth:** Import from `@todo-app/shared`; do not hardcode `500` anywhere in frontend code.

## Dev Agent Record

- **Agent Model**: claude-sonnet-4-6
- **Completion Notes**: Implemented createTodo API function, useCreateTodo hook with full optimistic update pattern, TodoInput component with form/validation/error handling, and unit tests (7 tests, all passing). TodoPage integration deferred to post-parallel merge to avoid conflicts with parallel stories 3.3 and 3.4.

## File List

| File | Action |
|------|--------|
| `apps/frontend/src/lib/api.ts` | Modified |
| `apps/frontend/src/hooks/useCreateTodo.ts` | Created |
| `apps/frontend/src/components/TodoInput.tsx` | Created |
| `apps/frontend/src/components/TodoInput.test.tsx` | Created |

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-27 | Story file created | BMad Story Agent |
| 2026-04-27 | Story 3.2 partial — createTodo API, useCreateTodo hook, TodoInput component + tests; TodoPage integration deferred to post-parallel merge | claude-sonnet-4-6 |
