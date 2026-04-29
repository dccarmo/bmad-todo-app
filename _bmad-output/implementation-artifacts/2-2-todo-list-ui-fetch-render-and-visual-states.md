# Story 2.2: Todo List UI — Fetch, Render & Visual States

Status: review

## Story

As a **user**, I want to open the app and immediately see my todo list with a loading indicator, then the actual list, so that I know my tasks have been retrieved.

## Acceptance Criteria

1. While the API fetch is in progress, a loading indicator is visible and no todo items are shown (FR16).
2. When the API returns a non-empty list, all todos are displayed ordered by creation time; completed todos are visually distinct (strikethrough + muted color); the loading indicator is gone (FR6, FR7, FR8).
3. When the API returns an empty array, an empty state message is shown ("No tasks yet. Add one above." or similar) and no list items are rendered (FR17).
4. Each todo is rendered as an `<li>` within a `<ul>` (FR24), showing its text description.
5. The `useTodos` hook wraps TanStack Query `useQuery` for data fetching.
6. `queryClient.ts` sets up the TanStack Query client singleton.
7. `api.ts` in `src/lib/` handles the fetch call and maps the response to the `Todo` type.
8. The page is interactive within 1 second on broadband (NFR1); no unnecessary dependencies are introduced (NFR4).

## Tasks / Subtasks

- [x] **Task 1 — Install dependencies**
  - [x] Install TanStack Query: `pnpm add @tanstack/react-query --filter @todo-app/frontend`
  - [x] Install Tailwind CSS v4 + Vite plugin: `pnpm add tailwindcss @tailwindcss/vite --filter @todo-app/frontend`
  - [x] Install Vitest and React Testing Library devDeps: `pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --filter @todo-app/frontend`
  - [x] Add test scripts to `apps/frontend/package.json`: `"test": "vitest run"` and `"test:watch": "vitest"`

- [x] **Task 2 — Configure Tailwind CSS v4 and Vite proxy**
  - [x] Update `apps/frontend/vite.config.ts`: add `@tailwindcss/vite` plugin and `/api` dev proxy
  - [x] Update `apps/frontend/src/index.css`: replace existing content with `@import "tailwindcss";` plus any base resets needed
  - [x] Add Vitest config block to `vite.config.ts` (test environment: jsdom, setupFiles, globals)

- [x] **Task 3 — Create `src/lib/queryClient.ts`** (AC: 6)
  - [x] Instantiate and export a `QueryClient` singleton

- [x] **Task 4 — Create `src/lib/api.ts`** (AC: 7)
  - [x] Implement `getTodos(): Promise<Todo[]>` using `fetch('/api/v1/todos')`
  - [x] Throw an `Error` on non-OK response

- [x] **Task 5 — Create `src/hooks/useTodos.ts`** (AC: 5)
  - [x] Wrap TanStack Query `useQuery` with `queryKey: ['todos']` and `queryFn: getTodos`
  - [x] Use `isLoading` (not `isPending`) for initial fetch state

- [x] **Task 6 — Create display components** (AC: 1, 2, 3, 4)
  - [x] Create `src/components/LoadingState.tsx` — visible spinner/skeleton during initial fetch
  - [x] Create `src/components/EmptyState.tsx` — empty state message when list is empty
  - [x] Create `src/components/TodoItem.tsx` — renders a single `<li>` with visual distinction for completed items
  - [x] Create `src/components/TodoList.tsx` — renders `<ul>` containing `<TodoItem>` elements, ordered by `createdAt`
  - [x] Create `src/components/TodoPage.tsx` — top-level page component that calls `useTodos` and composes all display states

- [x] **Task 7 — Update `src/App.tsx`** — replace Vite scaffold with `<TodoPage />`

- [x] **Task 8 — Update `src/main.tsx`** — wrap `<App>` in `<QueryClientProvider>`

- [x] **Task 9 — Write unit tests for `TodoItem`** (AC: 4)
  - [x] Create `src/components/TodoItem.test.tsx`
  - [x] Test: renders todo text
  - [x] Test: active todo has no `line-through` class
  - [x] Test: completed todo has `line-through` styling applied

- [x] **Task 10 — Verify lint, format, and tests pass**
  - [x] Run `pnpm lint` from repo root; fix any issues
  - [x] Run `pnpm test` in `apps/frontend`; all tests green

## Dev Notes

### Context from Previous Stories

By the time this story is implemented, the following is already in place from Stories 1.1–2.1:

- **Monorepo** managed by pnpm workspaces; packages: `@todo-app/backend`, `@todo-app/frontend`, `@todo-app/shared`.
- **`packages/shared/src/types.ts`** exports `Todo`, `CreateTodoInput`, `ApiError`, and `MAX_TODO_LENGTH`.
- **`apps/frontend/src/main.tsx`** renders `<App>` in StrictMode — needs `QueryClientProvider` wrapper.
- **`apps/frontend/src/App.tsx`** is the Vite default scaffold (counter, logos) — **replace entirely**.
- **`apps/frontend/vite.config.ts`** has the `@todo-app/shared` alias but no proxy and no Tailwind plugin.
- **`apps/frontend/src/index.css`** contains Vite scaffold CSS variables and global styles — **replace** with Tailwind import and minimal base styles.
- **`apps/frontend/package.json`** has React 19 and Vite 8 but **no TanStack Query**, **no Tailwind**, **no Vitest**, and **no RTL**.
- **Backend** (Story 2.1) exposes `GET /api/v1/todos` returning a JSON array of `Todo` objects ordered by `createdAt` ASC. Backend runs on port 3000 in dev; frontend on port 5173 — requires Vite proxy.
- TypeScript is configured with `"moduleResolution": "bundler"` and `"allowImportingTsExtensions": true`, so imports use `.ts`/`.tsx` extensions directly within the src tree. The `@todo-app/shared` alias resolves to the shared package source.

### Architecture Requirements

#### Files to CREATE in this story

```
apps/frontend/src/
  components/
    TodoPage.tsx          # composes LoadingState | EmptyState | TodoList
    TodoList.tsx          # renders <ul> with <TodoItem> per todo
    TodoItem.tsx          # renders <li>, applies completed visual distinction
    TodoItem.test.tsx     # unit tests for TodoItem
    EmptyState.tsx        # "No tasks yet" message
    LoadingState.tsx      # spinner/skeleton during initial load
  hooks/
    useTodos.ts           # TanStack Query useQuery wrapper
  lib/
    api.ts                # getTodos() — all API calls go here
    queryClient.ts        # QueryClient singleton
```

#### Files to MODIFY in this story

| File | Change |
|------|--------|
| `apps/frontend/vite.config.ts` | Add Tailwind v4 plugin, Vite `/api` proxy, Vitest config |
| `apps/frontend/src/index.css` | Replace scaffold CSS with `@import "tailwindcss"` + base resets |
| `apps/frontend/src/App.tsx` | Replace Vite scaffold with `<TodoPage />` |
| `apps/frontend/src/main.tsx` | Wrap `<App>` in `<QueryClientProvider>` |
| `apps/frontend/package.json` | Add TanStack Query, Tailwind, Vitest, RTL to deps/devDeps; add test scripts |

#### Files NOT created in this story (future stories)

```
src/components/TodoInput.tsx    # Story 3.2
src/components/ErrorBanner.tsx  # Story 2.3
src/hooks/useCreateTodo.ts      # Story 3.2
src/hooks/useToggleTodo.ts      # Story 3.3
src/hooks/useDeleteTodo.ts      # Story 3.4
```

#### Architecture rules (must follow)

- Components own only render logic and local UI state (`useState`). No data fetching in components.
- Data fetching exclusively in `hooks/` — components receive data as props or call hook-returned functions.
- All API calls through `src/lib/api.ts` — no raw `fetch` in components or hooks directly.
- State management: TanStack Query for all server state.
- Styling: Tailwind CSS v4 (PostCSS-based, Vite plugin, CSS import — NOT `tailwind.config.js`).
- No routing — single view.
- Use `isLoading` for initial data fetch (not `isPending`, which is for mutations in TanStack Query v5).
- Skeleton/spinner only during initial load (i.e., when `isLoading === true`).

---

### Technical Implementation Details

#### Step 1 — Install dependencies

Run from the repo root (or with `--filter`):

```bash
# TanStack Query v5
pnpm add @tanstack/react-query --filter @todo-app/frontend

# Tailwind CSS v4 + Vite plugin
pnpm add tailwindcss @tailwindcss/vite --filter @todo-app/frontend

# Vitest + React Testing Library
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --filter @todo-app/frontend
```

After installing, add test scripts to `apps/frontend/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

#### Step 2 — `apps/frontend/vite.config.ts` (REPLACE entirely)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@todo-app/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

> **CRITICAL — Tailwind v4 gotcha**: Do NOT create a `tailwind.config.js`. Tailwind v4 is configured entirely through the CSS `@import "tailwindcss"` directive and the Vite plugin. The `@tailwindcss/vite` plugin replaces the PostCSS integration used in v3.

> **CRITICAL — Vite proxy gotcha**: Without the `server.proxy` block, `fetch('/api/v1/todos')` in the browser will hit the frontend dev server (port 5173), which has no API routes — resulting in 404s. The proxy forwards all `/api/**` requests to the backend at port 3000.

> **NOTE — `test.globals: true`**: This enables Vitest global test APIs (`describe`, `it`, `expect`, `beforeEach`, etc.) without needing to import them per file. Required for `@testing-library/jest-dom` matchers to work cleanly.

---

#### Step 3 — `apps/frontend/src/test-setup.ts` (CREATE)

```ts
import '@testing-library/jest-dom'
```

This file is referenced in `vite.config.ts` → `test.setupFiles`. It loads the jest-dom custom matchers (e.g., `toBeInTheDocument`, `toHaveClass`) into the Vitest environment.

---

#### Step 4 — `apps/frontend/src/index.css` (REPLACE entirely)

```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-height: 100svh;
  background-color: #f9fafb;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #111827;
  }
}
```

> **Why replace**: The scaffold's `index.css` contains Vite-specific CSS custom properties and layout rules for the scaffold's multi-section layout. These conflict with Tailwind's reset and the new app layout. Keep only the bare minimum base styles; Tailwind utility classes handle the rest.

---

#### Step 5 — `apps/frontend/src/lib/queryClient.ts` (CREATE)

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()
```

The default `QueryClient` configuration is appropriate for this app:
- `staleTime: 0` — data is always considered stale (will refetch on mount after background blur/focus).
- `refetchOnWindowFocus: true` — refetches when the tab regains focus (default; good UX for a shared todo list).

No custom configuration is needed at this stage. Error handling for mutations will be configured in Story 2.3 when `ErrorBanner` is added.

---

#### Step 6 — `apps/frontend/src/lib/api.ts` (CREATE)

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

**Rules for this file:**
- This is the only place in the frontend codebase that calls `fetch` for the todos resource.
- Always check `res.ok` and throw on failure — TanStack Query catches thrown errors and exposes them via `error` / `isError`.
- Import `Todo` as a type-only import to keep the bundle clean (`import type`).

---

#### Step 7 — `apps/frontend/src/hooks/useTodos.ts` (CREATE)

```ts
import { useQuery } from '@tanstack/react-query'
import { getTodos } from '../lib/api.js'

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })
}
```

**TanStack Query v5 note — `isLoading` vs `isPending`:**
- `isLoading` is `true` only during the **initial fetch** when there is no cached data. This is the correct flag for showing the `LoadingState` component.
- `isPending` is the more general "no data yet" state; in v5 it is also `true` when the query is `disabled`. Using `isPending` for the loading spinner can cause false positives.
- `isError` / `error` are available from the returned object for Story 2.3 (ErrorBanner).

---

#### Step 8 — `apps/frontend/src/components/LoadingState.tsx` (CREATE)

```tsx
export function LoadingState() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-label="Loading todos" role="status">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-10 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading your todos…</span>
    </div>
  )
}
```

- Uses Tailwind's `animate-pulse` for a skeleton loader effect — more polished than a spinner for a list.
- `role="status"` + `aria-label` ensures screen readers announce the loading state.
- `sr-only` span provides a text alternative for assistive technology.

---

#### Step 9 — `apps/frontend/src/components/EmptyState.tsx` (CREATE)

```tsx
export function EmptyState() {
  return (
    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg">No tasks yet. Add one above.</p>
    </div>
  )
}
```

Shown when the API returns a 200 with an empty array. The message instructs the user to use the input (Story 3.2 will add the actual `TodoInput` component above this).

---

#### Step 10 — `apps/frontend/src/components/TodoItem.tsx` (CREATE)

```tsx
import type { Todo } from '@todo-app/shared'

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-md bg-white dark:bg-gray-800 shadow-sm">
      <span
        className={
          todo.completed
            ? 'flex-1 text-gray-400 dark:text-gray-500 line-through'
            : 'flex-1 text-gray-900 dark:text-gray-100'
        }
      >
        {todo.text}
      </span>
    </li>
  )
}
```

**Visual distinction rules (AC: 2):**
- **Active todo**: `text-gray-900 dark:text-gray-100` — full contrast, no decoration.
- **Completed todo**: `text-gray-400 dark:text-gray-500 line-through` — muted color + strikethrough.

**What is NOT here (scope boundary):**
- No toggle checkbox — Story 3.3.
- No delete button — Story 3.4.
- No `onClick` handlers — Stories 3.3/3.4.

---

#### Step 11 — `apps/frontend/src/components/TodoList.tsx` (CREATE)

```tsx
import type { Todo } from '@todo-app/shared'
import { TodoItem } from './TodoItem.js'

interface TodoListProps {
  todos: Todo[]
}

export function TodoList({ todos }: TodoListProps) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Todo list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}
```

- Receives `todos` as a prop — ordering is as returned by the API (already ascending by `createdAt` per Story 2.1 AC1).
- Each `TodoItem` receives a stable `key={todo.id}`.
- `aria-label="Todo list"` provides semantic context for the `<ul>`.

---

#### Step 12 — `apps/frontend/src/components/TodoPage.tsx` (CREATE)

```tsx
import { useTodos } from '../hooks/useTodos.js'
import { TodoList } from './TodoList.js'
import { EmptyState } from './EmptyState.js'
import { LoadingState } from './LoadingState.js'

export function TodoPage() {
  const { data: todos, isLoading } = useTodos()

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-xl px-4">
        <h1 className="mb-8 text-3xl font-semibold text-gray-900 dark:text-white">
          My Todos
        </h1>

        {/* TodoInput will be added here in Story 3.2 */}

        <section aria-label="Todo items" className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : todos && todos.length > 0 ? (
            <TodoList todos={todos} />
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  )
}
```

**State machine for display (AC: 1, 2, 3):**
```
isLoading === true       → <LoadingState />
todos.length > 0         → <TodoList todos={todos} />
todos.length === 0       → <EmptyState />
```

**Note on `ErrorBanner`:** `isError` and `error` are intentionally not consumed here. Story 2.3 will add `ErrorBanner` and update `TodoPage` to handle the error state.

---

#### Step 13 — `apps/frontend/src/App.tsx` (REPLACE entirely)

```tsx
import { TodoPage } from './components/TodoPage.js'

function App() {
  return <TodoPage />
}

export default App
```

Remove all Vite scaffold imports (`reactLogo`, `viteLogo`, `heroImg`, `App.css`, `useState`). The `App.css` file can be left on disk or deleted — it is no longer imported.

---

#### Step 14 — `apps/frontend/src/main.tsx` (MODIFY)

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient.js'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

`QueryClientProvider` must wrap the entire application so `useTodos` (and all future query/mutation hooks) can access the shared `queryClient`.

---

### Testing Setup

#### Vitest + React Testing Library

The test environment is configured in `vite.config.ts` (shown in Step 2). Key settings:

```ts
test: {
  environment: 'jsdom',   // simulate DOM in Node.js
  globals: true,          // no need to import describe/it/expect per file
  setupFiles: './src/test-setup.ts',  // loads @testing-library/jest-dom matchers
}
```

`apps/frontend/src/test-setup.ts` (Step 3 above) contains only:
```ts
import '@testing-library/jest-dom'
```

#### `apps/frontend/src/components/TodoItem.test.tsx` (CREATE)

```tsx
import { render, screen } from '@testing-library/react'
import { TodoItem } from './TodoItem.js'
import type { Todo } from '@todo-app/shared'

const baseTodo: Todo = {
  id: '1',
  text: 'Buy groceries',
  completed: false,
  createdAt: '2026-04-27T10:00:00.000Z',
}

describe('TodoItem', () => {
  it('renders the todo text', () => {
    render(<TodoItem todo={baseTodo} />)
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('does not apply line-through for an active todo', () => {
    render(<TodoItem todo={baseTodo} />)
    const text = screen.getByText('Buy groceries')
    expect(text).not.toHaveClass('line-through')
  })

  it('applies line-through and muted color for a completed todo', () => {
    const completedTodo: Todo = { ...baseTodo, completed: true }
    render(<TodoItem todo={completedTodo} />)
    const text = screen.getByText('Buy groceries')
    expect(text).toHaveClass('line-through')
    expect(text).toHaveClass('text-gray-400')
  })
})
```

Run tests with:
```bash
pnpm test --filter @todo-app/frontend
# or from apps/frontend/
pnpm test
```

---

### Scope Boundary

The following are explicitly OUT OF SCOPE for this story. Do not implement them; placeholders or `// TODO` comments are acceptable where noted.

| Feature | Story |
|---------|-------|
| Todo text input and submit | Story 3.2 |
| Create todo API call + optimistic update | Story 3.2 |
| Toggle completion checkbox | Story 3.3 |
| Delete button | Story 3.4 |
| `ErrorBanner` component | Story 2.3 |
| `isError` handling in `TodoPage` | Story 2.3 |
| Accessible layout and responsive polish | Story 2.4 |
| `ReactQueryDevtools` | Optional future addition |

---

### Common Gotchas

1. **Tailwind v4 does not use `tailwind.config.js`**. If you create one, it will be silently ignored. Configuration happens via CSS directives (`@theme`, `@plugin`, etc.) in the CSS file. For this story, a bare `@import "tailwindcss"` is all that is needed.

2. **Vite proxy is required**. Without it, `fetch('/api/v1/todos')` resolves to `http://localhost:5173/api/v1/todos` — the Vite dev server — which returns a 404. The proxy in `vite.config.ts` forwards to `http://localhost:3000`.

3. **`isLoading` vs `isPending` in TanStack Query v5**. Use `isLoading` for the initial-fetch loading spinner. `isPending` has a broader semantic in v5 and can be true even when a query is disabled.

4. **Import extensions with `moduleResolution: "bundler"`**. The tsconfig uses `"moduleResolution": "bundler"` and `"allowImportingTsExtensions": true`, so you can use `.js` or `.tsx` extensions in relative imports — Vite resolves them correctly. Be consistent: the examples above use `.js` for `.ts` files and `.js` for `.tsx` files (standard TypeScript ESM convention). Alternatively, omit extensions entirely — both work with `"bundler"` resolution.

5. **`@testing-library/jest-dom` requires a setup file**. Without `import '@testing-library/jest-dom'` in the Vitest `setupFiles`, matchers like `toBeInTheDocument` and `toHaveClass` will throw "not a function" errors at runtime.

6. **`App.css` can be left on disk**. Removing the import from `App.tsx` is sufficient; deleting the file is optional but cleaner.

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Backend `vitest.config.ts` needed for `@todo-app/shared` alias — shared package `dist/` not built; Vitest can't resolve the package via its `main` field. Created `apps/backend/vitest.config.ts` with the alias to point to source.

### Completion Notes List

- Installed `@tanstack/react-query` (v5), `tailwindcss`, `@tailwindcss/vite`, and full testing stack (Vitest, RTL, jest-dom, jsdom) into frontend workspace.
- Added `test` and `test:watch` scripts to `apps/frontend/package.json`.
- Replaced `vite.config.ts` with Tailwind v4 plugin, `/api` proxy to port 3000, and Vitest jsdom config with `test-setup.ts`.
- Created `src/test-setup.ts` importing `@testing-library/jest-dom`.
- Replaced `src/index.css` with Tailwind v4 `@import "tailwindcss"` and minimal base styles.
- Created `src/lib/queryClient.ts`, `src/lib/api.ts` (`getTodos`), `src/hooks/useTodos.ts` (wraps `useQuery` with `isLoading`).
- Created `LoadingState`, `EmptyState`, `TodoItem`, `TodoList`, `TodoPage` components.
- Replaced scaffold `App.tsx` with `<TodoPage />` and wrapped `main.tsx` in `<QueryClientProvider>`.
- Created `TodoItem.test.tsx` with 3 tests (renders text, no line-through for active, line-through+muted for completed). All pass.
- All lint and format checks pass from repo root.

## File List

- `apps/frontend/package.json` (modified — added TanStack Query, Tailwind, Vitest/RTL deps; test scripts)
- `apps/frontend/vite.config.ts` (replaced — added Tailwind plugin, /api proxy, Vitest config)
- `apps/frontend/src/test-setup.ts` (created)
- `apps/frontend/src/index.css` (replaced — Tailwind v4 import + base styles)
- `apps/frontend/src/lib/queryClient.ts` (created)
- `apps/frontend/src/lib/api.ts` (created)
- `apps/frontend/src/hooks/useTodos.ts` (created)
- `apps/frontend/src/components/LoadingState.tsx` (created)
- `apps/frontend/src/components/EmptyState.tsx` (created)
- `apps/frontend/src/components/TodoItem.tsx` (created)
- `apps/frontend/src/components/TodoList.tsx` (created)
- `apps/frontend/src/components/TodoPage.tsx` (created)
- `apps/frontend/src/components/TodoItem.test.tsx` (created)
- `apps/frontend/src/App.tsx` (replaced — renders TodoPage)
- `apps/frontend/src/main.tsx` (modified — wrapped in QueryClientProvider)
- `apps/backend/vitest.config.ts` (created — shared package alias for Vitest)
- `package-lock.json` (modified)

## Change Log

- 2026-04-27: Implemented Story 2.2 — Todo list UI with TanStack Query fetch, LoadingState/EmptyState/TodoList/TodoItem components, Tailwind v4 styling, Vite proxy, and Vitest+RTL tests.
