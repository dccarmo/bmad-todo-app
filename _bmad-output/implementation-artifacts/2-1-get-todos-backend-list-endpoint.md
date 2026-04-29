# Story 2.1: GET /api/v1/todos — Backend List Endpoint

Status: review

## Story

As a **frontend developer**,
I want a `GET /api/v1/todos` endpoint that returns all todos ordered by creation time,
so that the frontend can display the persisted task list on load.

## Acceptance Criteria

1. `GET /api/v1/todos` returns `200 OK` with a JSON array of todo objects (`id`, `text`, `completed`, `createdAt` camelCase), ordered ascending by `created_at`.
2. When no todos exist in the DB, `GET /api/v1/todos` returns `200 OK` with an empty array `[]`.
3. On a DB error, the endpoint returns `500` with `{ "error": { "code": "INTERNAL_ERROR", "message": "..." } }`.
4. Route is mounted at `/api/v1/todos`.
5. Response body is a bare array — no success envelope wrapper.
6. Response object fields use camelCase (`createdAt`), not snake_case.
7. `createdAt` is serialized as an ISO 8601 string (e.g. `"2026-04-27T12:00:00.000Z"`), not a `Date` object.
8. Response time is ≤ 200ms under normal load (NFR2).

## Tasks / Subtasks

- [x] **Task 1 — Create `apps/backend/src/routes/todos.ts`** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Define a `Hono` router for todos
  - [x] Implement the `getTodos` handler: query all todos ordered by `createdAt` ASC using Drizzle
  - [x] Map each `TodoRow` to `Todo`, converting `createdAt` (`Date`) to ISO string via `.toISOString()`
  - [x] Return the array with `c.json(mapped, 200)`
  - [x] Wrap the DB query in try/catch; on error throw `HTTPException(500, { message: 'Internal server error' })` so the global error handler serializes it correctly

- [x] **Task 2 — Mount the todos router in `apps/backend/src/index.ts`** (AC: 4)
  - [x] Import the todos router
  - [x] Mount it at `/api/v1` with `app.route('/api/v1', todos)`

- [x] **Task 3 — Add Vitest to backend devDependencies** (AC: none — testing infra prerequisite)
  - [x] Run `pnpm add -D vitest @vitest/coverage-v8 --filter @todo-app/backend` (or equivalent for your package manager)
  - [x] Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `apps/backend/package.json`

- [x] **Task 4 — Write integration tests** (AC: 1, 2, 3, 6, 7)
  - [x] Create `apps/backend/src/routes/__tests__/todos.test.ts`
  - [x] Test: empty DB → `200 []`
  - [x] Test: two seeded todos → `200` with both, ordered by `createdAt` ASC
  - [x] Test: response shape has `id` (string), `text` (string), `completed` (boolean), `createdAt` (ISO string)
  - [x] Test: DB error path → `500` with correct error shape

- [x] **Task 5 — Verify lint/format passes**
  - [x] Run `pnpm lint` and `pnpm format` from repo root; fix any issues before marking done

## Dev Notes

### Context from Previous Stories

By the time this story is implemented, the following is already in place from Stories 1.1–1.5:

- **Monorepo** managed by pnpm workspaces; packages: `@todo-app/backend`, `@todo-app/frontend`, `@todo-app/shared`.
- **`packages/shared/src/types.ts`** exports `Todo`, `CreateTodoInput`, `ApiError`, and `MAX_TODO_LENGTH`.
- **`apps/backend/src/db/schema.ts`** defines the `todos` table and `TodoRow` type.
- **`apps/backend/src/db/index.ts`** exports `db` (Drizzle instance backed by a `pg` Pool). It throws at startup if `DATABASE_URL` is missing.
- **`apps/backend/src/index.ts`** has CORS middleware, a `/health` route, and a global `onError` handler.
- **TypeScript** is configured with `"module": "NodeNext"` — all relative imports MUST use the `.js` extension.
- **ESLint** and **Prettier** are set up (Story 1.5); `pnpm lint` and `pnpm format` must pass.

### Architecture & File Locations

| Action | File |
|--------|------|
| **CREATE** | `apps/backend/src/routes/todos.ts` |
| **CREATE** | `apps/backend/src/routes/__tests__/todos.test.ts` |
| **MODIFY** | `apps/backend/src/index.ts` — mount todos router |

No other files need to change for this story.

### Technical Implementation Details

#### `apps/backend/src/routes/todos.ts` — Full Implementation

```typescript
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { asc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { todos } from '../db/schema.js'
import type { Todo } from '@todo-app/shared'

const todosRouter = new Hono()

todosRouter.get('/', async (c) => {
  let rows
  try {
    rows = await db.select().from(todos).orderBy(asc(todos.createdAt))
  } catch (err) {
    console.error('Failed to fetch todos:', err)
    throw new HTTPException(500, { message: 'Internal server error' })
  }

  const result: Todo[] = rows.map((row) => ({
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  }))

  return c.json(result, 200)
})

export { todosRouter }
```

Key points:
- The handler is named implicitly via the router — the architecture convention `getTodos` is the conceptual name; since Hono uses method chaining, the exported name is `todosRouter`.
- `HTTPException` is from `hono/http-exception` (not `hono`).
- The Drizzle query `db.select().from(todos).orderBy(asc(todos.createdAt))` returns `TodoRow[]` where `createdAt` is a `Date` instance. It MUST be converted to a string via `.toISOString()` before returning.
- Do NOT return `rows` directly — the JSON serializer may serialize `Date` objects in an unexpected format, and TypeScript will complain since `Todo.createdAt` is `string`.
- The try/catch wraps only the DB call. Mapping and returning are outside the try block (mapping cannot fail given Drizzle's types).
- `throw new HTTPException(500, ...)` — this propagates to the global `onError` handler already wired in `index.ts`, which correctly serializes it as `{ "error": { "code": "INTERNAL_ERROR", "message": "..." } }`. Do NOT manually call `c.json(...)` for errors inside route handlers.

#### `apps/backend/src/index.ts` — Required Changes

Add the import and mount. The final file should look like:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { health } from './routes/health.js'
import { todosRouter } from './routes/todos.js'    // ADD THIS

const app = new Hono()

// Middleware
app.use('*', cors({ origin: process.env.CORS_ORIGIN || 'http://localhost' }))

// Routes
app.route('/health', health)
app.route('/api/v1/todos', todosRouter)             // ADD THIS

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
```

Note: If `HTTPException` is not already imported in `index.ts`, add that import line too.

#### Critical: NodeNext `.js` Extension Rule

This project uses `"module": "NodeNext"` in `tsconfig.json`. This means:

- **All relative imports must have `.js` extension** — even though the source files are `.ts`.
- Correct: `import { db } from '../db/index.js'`
- Correct: `import { todos } from '../db/schema.js'`
- WRONG: `import { db } from '../db/index'` — this will fail at runtime.
- Node module imports (from `node_modules`) do NOT get extensions: `import { Hono } from 'hono'`

#### Critical: `TodoRow.createdAt` is a `Date`, not a string

Drizzle infers `createdAt` as `Date` (from the `timestamp` column definition). The `Todo` interface from `@todo-app/shared` requires `createdAt: string`. The mapping step is mandatory:

```typescript
createdAt: row.createdAt.toISOString()
// Output example: "2026-04-27T12:00:00.000Z"
```

Omitting this will cause a TypeScript compile error AND a runtime bug (JSON serializes `Date` as a quoted string but in a browser-locale-dependent format, not ISO 8601).

#### Critical: Response is a bare array, not an envelope

The response body must be a JSON array directly:
```json
[
  { "id": "...", "text": "...", "completed": false, "createdAt": "..." }
]
```

NOT:
```json
{ "success": true, "data": [...] }
```

#### Error Shape

The global `onError` in `index.ts` produces:
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Internal server error" } }
```

This satisfies AC 3. The route handler only needs to `throw new HTTPException(500, { message: 'Internal server error' })` — do not duplicate the error serialization logic in the route.

### Testing Approach

#### Testing Stack

Add `vitest` to backend devDependencies before writing tests:
```bash
pnpm add -D vitest @vitest/coverage-v8 --filter @todo-app/backend
```

Add to `apps/backend/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

#### Test File Location

`apps/backend/src/routes/__tests__/todos.test.ts`

The `__tests__` directory must be created inside `src/routes/`.

#### Recommended Test Strategy: Mock the `db` module

For unit/integration tests without a live database, mock the `db` module. This is faster and avoids Docker dependency in CI.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { todosRouter } from '../todos.js'

// Mock the db module
vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Import AFTER mocking
import { db } from '../../db/index.js'

describe('GET /api/v1/todos', () => {
  const app = new Hono()
  app.route('/api/v1/todos', todosRouter)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with empty array when no todos exist', async () => {
    // Drizzle's fluent API: db.select().from().orderBy() — chain must be mocked
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const res = await app.request('/api/v1/todos')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 200 with todos ordered by createdAt ASC', async () => {
    const t1 = new Date('2026-01-01T10:00:00.000Z')
    const t2 = new Date('2026-01-02T10:00:00.000Z')
    const mockRows = [
      { id: 'uuid-1', text: 'First todo', completed: false, createdAt: t1 },
      { id: 'uuid-2', text: 'Second todo', completed: true, createdAt: t2 },
    ]
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockRows),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const res = await app.request('/api/v1/todos')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({
      id: 'uuid-1',
      text: 'First todo',
      completed: false,
      createdAt: '2026-01-01T10:00:00.000Z',
    })
    expect(body[1]).toEqual({
      id: 'uuid-2',
      text: 'Second todo',
      completed: true,
      createdAt: '2026-01-02T10:00:00.000Z',
    })
  })

  it('returns ISO string for createdAt (not a Date object)', async () => {
    const mockRows = [
      { id: 'uuid-1', text: 'Test', completed: false, createdAt: new Date('2026-04-27T12:00:00.000Z') },
    ]
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockRows),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const res = await app.request('/api/v1/todos')
    const body = await res.json()
    expect(typeof body[0].createdAt).toBe('string')
    expect(body[0].createdAt).toBe('2026-04-27T12:00:00.000Z')
  })

  it('returns 500 with INTERNAL_ERROR on DB failure', async () => {
    const app2 = new Hono()
    app2.route('/api/v1/todos', todosRouter)
    app2.onError((err, c) => {
      const { HTTPException } = require('hono/http-exception')
      if (err instanceof HTTPException) {
        return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, err.status as any)
      }
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
    })

    const mockChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    }
    vi.mocked(db.select).mockReturnValue(mockChain as any)

    const res = await app2.request('/api/v1/todos')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})
```

Note: The mock chain mimics Drizzle's builder pattern. `db.select()` returns an object with `.from()`, which returns an object with `.orderBy()`, which returns the final promise. Each step must be mocked to return the next step (`mockReturnThis()`) except the terminal step which returns the resolved data.

#### Alternative: Real DB Integration Tests

If a test database is available via `docker-compose.test.yml`, integration tests can use the real `db` instance. In that case:
1. Set `DATABASE_URL` pointing to the test DB in the test environment.
2. Use `beforeEach` to truncate the `todos` table and insert known seed data.
3. Use `afterAll` to close the pool.

This approach is more thorough but slower and requires Docker. The mocked approach above is sufficient for this story.

### Scope Boundary — What NOT to Implement

The following are explicitly out of scope for this story and belong to later stories:

- **POST /api/v1/todos** — Create todo (Story 3.1)
- **PATCH /api/v1/todos/:id** — Toggle completion (Story 3.1)
- **DELETE /api/v1/todos/:id** — Delete todo (Story 3.1)
- **Pagination / filtering** — Not in MVP
- **Frontend fetch call** — Story 2.2
- **Frontend error state UI** — Story 2.3
- **Rate limiting** — Not in current epic
- **Authentication / authorization** — Not in MVP scope

Do not add any of these to satisfy perceived completeness. The endpoint must return a bare array with no query-parameter handling.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Test file initially used `as any` casts and `require()` — both flagged by ESLint. Replaced with typed `MockChain` helper functions and `as unknown as ReturnType<typeof db.select>` double-cast.
- TS6059 errors from `@todo-app/shared` being outside `rootDir` are pre-existing (deferred in Story 1.2) and not caused by this story.

### Completion Notes List

- Installed `vitest` and `@vitest/coverage-v8` as backend devDependencies; added `test` and `test:watch` scripts to `apps/backend/package.json`.
- Created `apps/backend/src/routes/todos.ts` — Hono router with `GET /` handler that queries all todos via Drizzle `db.select().from(todos).orderBy(asc(todos.createdAt))`, maps `createdAt` Date to ISO string, and throws `HTTPException(500)` on DB failure.
- Mounted `todosRouter` at `/api/v1/todos` in `apps/backend/src/index.ts`.
- Created `apps/backend/src/routes/__tests__/todos.test.ts` with 4 tests covering: empty array, ordered results, ISO string serialization, and DB error path. All 4 pass.
- All lint and format checks pass from repo root.

## File List

- `apps/backend/package.json` (modified — added vitest, @vitest/coverage-v8, test/test:watch scripts)
- `apps/backend/src/routes/todos.ts` (created)
- `apps/backend/src/routes/__tests__/todos.test.ts` (created)
- `apps/backend/src/index.ts` (modified — added todosRouter import and mount)
- `package-lock.json` (modified — updated by npm install)

## Change Log

- 2026-04-27: Implemented Story 2.1 — GET /api/v1/todos endpoint with Drizzle query, ISO date mapping, error handling, and Vitest tests.
