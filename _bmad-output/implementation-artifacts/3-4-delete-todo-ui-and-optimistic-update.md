# Story 3.4: Delete Todo UI and Optimistic Update

Status: ready-for-dev

## Story

As a **user**, I want to delete a todo by clicking a delete button, so I can remove tasks I no longer need.

## Acceptance Criteria

1. Each todo item has a delete button (visible on hover or always visible).
2. Clicking delete immediately removes the todo from the list (optimistic update).
3. If the DELETE request fails, the todo reappears and an error indicator is shown.
4. While the DELETE is in-flight, the delete button is disabled.
5. The delete button has an accessible label (`aria-label="Delete todo"`).
6. Deleted todos do not reappear after the mutation settles.

## Tasks / Subtasks

- [ ] **Task 1 — Add `deleteTodo` to `api.ts`**
  - [ ] Export `async function deleteTodo(id: string): Promise<void>`
  - [ ] Use `fetch` with `method: 'DELETE'` against `/api/v1/todos/${id}`
  - [ ] Throw on non-ok response; do NOT call `res.json()` (204 No Content has no body)

- [ ] **Task 2 — Create `useDeleteTodo` hook**
  - [ ] Create `apps/frontend/src/hooks/useDeleteTodo.ts`
  - [ ] Use `useMutation` from TanStack Query v5
  - [ ] Implement optimistic update in `onMutate`: cancel queries, snapshot previous data, filter out the deleted todo
  - [ ] Roll back to snapshot in `onError`
  - [ ] Invalidate `['todos']` query in `onSettled` to sync with server

- [ ] **Task 3 — Update `TodoItem` component**
  - [ ] Import and call `useDeleteTodo()` inside `TodoItem`
  - [ ] Add a delete `<button>` that calls `deleteMutation.mutate(todo.id)` on click
  - [ ] Disable the button when `deleteMutation.isPending`
  - [ ] Set `aria-label` to `Delete "${todo.text}"` (AC5)
  - [ ] Show an inline error message when `deleteMutation.isError` (AC3)

- [ ] **Task 4 — Write component tests**
  - [ ] Create `apps/frontend/src/components/__tests__/TodoItem.delete.test.tsx`
  - [ ] Mock `useToggleTodo` and `useDeleteTodo`
  - [ ] Test: delete button renders with correct `aria-label`
  - [ ] Test: clicking delete calls `mutate` with the todo's `id`
  - [ ] Test: button is disabled when `isPending` is true
  - [ ] Test: error message is shown when `isError` is true

- [ ] **Task 5 — Write hook unit tests**
  - [ ] Create `apps/frontend/src/hooks/__tests__/useDeleteTodo.test.ts`
  - [ ] Mock `api.deleteTodo`
  - [ ] Test: optimistic removal — todo is filtered from cache in `onMutate`
  - [ ] Test: rollback — previous data is restored on error

## Dev Notes

### Context from Previous Stories

- `apps/frontend/src/lib/api.ts` already exports `getTodos()`, `createTodo()`, and `toggleTodo(id, completed)`. Add `deleteTodo` following the same pattern.
- `apps/frontend/src/hooks/useToggleTodo.ts` is the canonical example of an optimistic-update mutation hook in this project — mirror its structure for `useDeleteTodo`.
- `apps/frontend/src/components/TodoItem.tsx` already renders a controlled checkbox wired to `useToggleTodo`. Add the delete button alongside the existing checkbox/label markup.
- The backend `DELETE /api/v1/todos/:id` endpoint is **already live** (implemented in Story 3-1):
  - `204 No Content` on success — no response body.
  - `404 { error: { code: 'NOT_FOUND', ... } }` if the id is unknown.
  - `500` on database error.

### Architecture & File Locations

| Action | File |
|--------|------|
| MODIFY | `apps/frontend/src/lib/api.ts` |
| CREATE | `apps/frontend/src/hooks/useDeleteTodo.ts` |
| MODIFY | `apps/frontend/src/components/TodoItem.tsx` |
| CREATE | `apps/frontend/src/components/__tests__/TodoItem.delete.test.tsx` |
| CREATE | `apps/frontend/src/hooks/__tests__/useDeleteTodo.test.ts` |

### Technical Implementation Details

**`api.ts` addition**

```ts
export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/v1/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete todo: ${res.status}`)
  // 204 No Content — no body to parse
}
```

**`useDeleteTodo` hook** (`apps/frontend/src/hooks/useDeleteTodo.ts`)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTodo } from '../lib/api.js'
import type { Todo } from '@todo-app/shared'

export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData<Todo[]>(['todos'])
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.filter((t) => t.id !== id) ?? []
      )
      return { previous }
    },

    onError: (_err, _id, context) => {
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

Key points:
- `onMutate` returns `{ previous }` which TanStack Query passes as `context` to `onError`.
- `onError` restores the pre-mutation snapshot, making the deleted todo reappear (AC3).
- `onSettled` always invalidates so the list stays consistent with the server after success or failure (AC6).
- The mutation variable is a plain `id: string` — not an object.

**`TodoItem` component** (`apps/frontend/src/components/TodoItem.tsx`)

```tsx
import { useToggleTodo } from '../hooks/useToggleTodo.js'
import { useDeleteTodo } from '../hooks/useDeleteTodo.js'

export function TodoItem({ todo }: { todo: Todo }) {
  const toggle = useToggleTodo()
  const deleteMutation = useDeleteTodo()

  return (
    <li className="flex items-center gap-3 py-2 px-4 bg-white rounded border">
      <label className="flex items-center gap-3 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={toggle.isPending}
          onChange={() => toggle.mutate({ id: todo.id, completed: !todo.completed })}
          aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          className="w-5 h-5"
        />
        <span className={todo.completed ? 'line-through text-gray-400' : ''}>
          {todo.text}
        </span>
      </label>
      <button
        onClick={() => deleteMutation.mutate(todo.id)}
        disabled={deleteMutation.isPending}
        aria-label={`Delete "${todo.text}"`}
        className="text-red-500 hover:text-red-700 disabled:opacity-50"
      >
        Delete
      </button>
      {deleteMutation.isError && (
        <span className="text-red-500 text-sm">Failed to delete</span>
      )}
    </li>
  )
}
```

Important: Each `TodoItem` creates its own `useDeleteTodo()` instance. This scopes `isPending` and `isError` to that individual row — clicking delete on one todo does not affect others.

**Module resolution reminder**: All relative imports must use the `.js` extension (NodeNext module resolution). Examples: `'../lib/api.js'`, `'../hooks/useDeleteTodo.js'`.

**TanStack Query v5**: Use `isPending` (not `isLoading`) for mutation pending state.

### Testing Approach

**Component tests** — `apps/frontend/src/components/__tests__/TodoItem.delete.test.tsx`

Mock both `useToggleTodo` and `useDeleteTodo`. For each test, configure the mock return value to simulate the desired state (`isPending: false`, `isError: false`, etc.). Cover:

1. Delete button renders with `aria-label` matching `Delete "${todo.text}"`.
2. Clicking the delete button calls `mutate` with the todo's `id`.
3. Button has `disabled` attribute when `isPending` is `true`.
4. Inline error message (`"Failed to delete"`) is visible when `isError` is `true`.

**Hook unit tests** — `apps/frontend/src/hooks/__tests__/useDeleteTodo.test.ts`

Use `@testing-library/react` with a `QueryClient` wrapper. Mock `deleteTodo` from `api.ts`. Cover:

1. **Optimistic remove**: after `mutate(id)` fires (before the server responds), the item is absent from the `['todos']` cache.
2. **Rollback on error**: when `deleteTodo` rejects, the original cache snapshot is restored and the item reappears.

### Scope Boundary — What NOT to Implement

- Confirmation dialog before delete
- Undo / undo toast after deletion
- Bulk delete
- Mutation error retry logic (covered by Story 3-5)

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
