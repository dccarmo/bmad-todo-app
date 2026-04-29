# Story 3.1: Mutation API Endpoints (POST, PATCH, DELETE)

Status: review

## Story

As a **frontend developer**,
I want POST, PATCH, and DELETE endpoints for todos,
So that the frontend can persist create, toggle, and delete operations to the database.

## Acceptance Criteria

1. `POST /api/v1/todos` with `{ "text": "Buy groceries" }` → 201 Created with Todo object (`id`, `text`, `completed: false`, `createdAt` as ISO string)
2. `POST /api/v1/todos` with missing or empty `text` → 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`
3. `POST /api/v1/todos` with `text` longer than 500 characters → 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`
4. `PATCH /api/v1/todos/:id` with `{ "completed": true }` (existing id) → 200 with the updated Todo object
5. `PATCH /api/v1/todos/:id` with a non-existent id → 404 with `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
6. `DELETE /api/v1/todos/:id` (existing id) → 204 No Content with **no response body**
7. `DELETE /api/v1/todos/:id` with a non-existent id → 404 with `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
8. `POST` validation uses `createTodoSchema` imported from `@todo-app/shared`
9. `PATCH` validation uses `updateTodoSchema` imported from `@todo-app/shared` (added in this story)
10. Text is stored as plain string and never rendered as HTML
11. All error responses follow `{ "error": { "code": "...", "message": "..." } }` shape

## Tasks / Subtasks

- [x] Add `updateTodoSchema` and `UpdateTodoInput` to `packages/shared` (AC: 9)
  - [x] Open `packages/shared/src/schemas.ts` and append `updateTodoSchema`
  - [x] Open `packages/shared/src/types.ts` and append `UpdateTodoInput` interface
  - [x] Verify `@todo-app/shared` exports both symbols (check `packages/shared/src/index.ts`)

- [x] Update the global error handler in `apps/backend/src/index.ts` (AC: 2, 5, 7)
  - [x] Replace the `app.onError` handler with the status-code-to-error-code mapping version
  - [x] Verify status 400 → `VALIDATION_ERROR`, 404 → `NOT_FOUND`, 500 → `INTERNAL_ERROR`
  - [x] Add `console.error` logging for unhandled (non-HTTPException) errors

- [x] Implement `POST /` handler in `apps/backend/src/routes/todos.ts` (AC: 1, 2, 3, 8, 10)
  - [x] Add import: `createTodoSchema` from `@todo-app/shared`
  - [x] Add import: `HTTPException` from `hono/http-exception`
  - [x] Parse request body with `c.req.json()`
  - [x] Validate with `createTodoSchema.safeParse(body)` — throw `HTTPException(400, ...)` on failure
  - [x] Insert row with `db.insert(todos).values({ text: result.data.text }).returning()`
  - [x] Map `inserted.createdAt` (Date) → ISO string
  - [x] Return `c.json(mapped, 201)`

- [x] Implement `PATCH /:id` handler in `apps/backend/src/routes/todos.ts` (AC: 4, 5, 9)
  - [x] Add import: `updateTodoSchema` from `@todo-app/shared`
  - [x] Add import: `eq` from `drizzle-orm` (if not already present)
  - [x] Extract `id` with `c.req.param('id')`
  - [x] Parse and validate request body with `updateTodoSchema.safeParse(body)` — throw `HTTPException(400, ...)` on failure
  - [x] Update row: `db.update(todos).set({ completed: result.data.completed }).where(eq(todos.id, id)).returning()`
  - [x] If `updated` is undefined/null → throw `HTTPException(404, { message: 'Todo not found' })`
  - [x] Map `updated.createdAt` → ISO string
  - [x] Return `c.json(mapped, 200)`

- [x] Implement `DELETE /:id` handler in `apps/backend/src/routes/todos.ts` (AC: 6, 7)
  - [x] Extract `id` with `c.req.param('id')`
  - [x] Delete row: `db.delete(todos).where(eq(todos.id, id)).returning()`
  - [x] If `deleted` is undefined/null → throw `HTTPException(404, { message: 'Todo not found' })`
  - [x] Return `new Response(null, { status: 204 })` — **NO body, not `c.json`**

- [x] Write tests in `apps/backend/src/routes/__tests__/todos.test.ts` (all ACs)
  - [x] POST valid text → 201 with correct shape (id, text, completed: false, createdAt)
  - [x] POST empty text → 400 VALIDATION_ERROR
  - [x] POST text exactly 501 chars → 400 VALIDATION_ERROR
  - [x] PATCH existing id, `{ completed: true }` → 200 with updated todo
  - [x] PATCH non-existent id → 404 NOT_FOUND
  - [x] DELETE existing id → 204, response body is empty
  - [x] DELETE non-existent id → 404 NOT_FOUND

- [x] TypeScript check passes (AC: all)
  - [x] Run `npx tsc --noEmit --project apps/backend/tsconfig.json` — 0 errors
  - [x] Run `npx tsc --noEmit --project packages/shared/tsconfig.json` — 0 errors

## Dev Notes

### Context: What Exists After Story 2.1

This story extends the todos route file created in Story 2.1. Do NOT rewrite the file from scratch — extend it.

**`apps/backend/src/routes/todos.ts` (exact state after Story 2.1):**

```typescript
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { todos } from '../db/schema.js'
import { asc } from 'drizzle-orm'
import type { Todo } from '@todo-app/shared'

const todosRoute = new Hono()

todosRoute.get('/', async (c) => {
  try {
    const result = await db.select().from(todos).orderBy(asc(todos.createdAt))
    const mapped: Todo[] = result.map(row => ({
      id: row.id,
      text: row.text,
      completed: row.completed,
      createdAt: row.createdAt.toISOString(),
    }))
    return c.json(mapped)
  } catch {
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

export { todosRoute }
```

Note: the GET handler references `HTTPException` but it may or may not be imported already. Confirm the actual file before editing and add the import if missing.

**`apps/backend/src/index.ts` (exact state after Story 2.1):**

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { health } from './routes/health.js'
import { todosRoute } from './routes/todos.js'

const app = new Hono()

app.use('*', cors({ origin: process.env.CORS_ORIGIN || 'http://localhost' }))

app.route('/health', health)
app.route('/api/v1/todos', todosRoute)

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

### Step 1: Add to `packages/shared`

#### `packages/shared/src/schemas.ts` — Append `updateTodoSchema`

```typescript
export const updateTodoSchema = z.object({
  completed: z.boolean(),
});
```

Add this after the existing `todoSchema` export. The `z` import is already present.

#### `packages/shared/src/types.ts` — Append `UpdateTodoInput`

```typescript
export interface UpdateTodoInput {
  completed: boolean;
}
```

#### `packages/shared/src/index.ts` — Verify exports

Confirm that `updateTodoSchema` and `UpdateTodoInput` are re-exported. If the index does barrel-exports like `export * from './schemas.js'` and `export * from './types.js'`, they will be picked up automatically. If explicit named exports are used, add them explicitly.

### Step 2: Update Global Error Handler in `apps/backend/src/index.ts`

The current `onError` handler uses a hardcoded `'HTTP_ERROR'` code. The acceptance criteria require specific codes (`VALIDATION_ERROR`, `NOT_FOUND`). Replace the handler with:

```typescript
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const codeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      404: 'NOT_FOUND',
      500: 'INTERNAL_ERROR',
    }
    const code = codeMap[err.status] ?? 'HTTP_ERROR'
    return c.json({ error: { code, message: err.message } }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})
```

This is the only change to `apps/backend/src/index.ts`.

### Step 3: Extend `apps/backend/src/routes/todos.ts`

Add these imports at the top (merge with existing imports — do not duplicate):

```typescript
import { HTTPException } from 'hono/http-exception'
import { eq } from 'drizzle-orm'
import { createTodoSchema, updateTodoSchema } from '@todo-app/shared'
import type { Todo } from '@todo-app/shared'
```

Note: `eq` might need to be added to the existing `drizzle-orm` import. If the file already has `import { asc } from 'drizzle-orm'`, change it to `import { asc, eq } from 'drizzle-orm'`.

#### POST Handler

```typescript
todosRoute.post('/', async (c) => {
  const body = await c.req.json()
  const result = createTodoSchema.safeParse(body)
  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message })
  }
  const [inserted] = await db.insert(todos).values({
    text: result.data.text,
  }).returning()
  const mapped: Todo = {
    id: inserted.id,
    text: inserted.text,
    completed: inserted.completed,
    createdAt: inserted.createdAt.toISOString(),
  }
  return c.json(mapped, 201)
})
```

Key points:
- `result.data.text` — use validated/parsed data, not raw `body.text`
- `inserted.createdAt` is a `Date` object from the DB driver — `.toISOString()` converts it
- Status 201 is the second argument to `c.json()`

#### PATCH Handler

```typescript
todosRoute.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const result = updateTodoSchema.safeParse(body)
  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message })
  }
  const [updated] = await db.update(todos)
    .set({ completed: result.data.completed })
    .where(eq(todos.id, id))
    .returning()
  if (!updated) {
    throw new HTTPException(404, { message: 'Todo not found' })
  }
  const mapped: Todo = {
    id: updated.id,
    text: updated.text,
    completed: updated.completed,
    createdAt: updated.createdAt.toISOString(),
  }
  return c.json(mapped, 200)
})
```

Key points:
- `db.update(...).returning()` returns an array. Destructure `[updated]` — if no row matched, `updated` will be `undefined`.
- Check `if (!updated)` AFTER destructuring — this is the 404 guard.

#### DELETE Handler — CRITICAL: 204 No Body

```typescript
todosRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const [deleted] = await db.delete(todos)
    .where(eq(todos.id, id))
    .returning()
  if (!deleted) {
    throw new HTTPException(404, { message: 'Todo not found' })
  }
  return new Response(null, { status: 204 })
})
```

**CRITICAL — The 204 No Content gotcha:**
- HTTP 204 must have **no body**. `c.json(null, 204)` may still set Content-Type and send an empty JSON body — this violates the spec.
- `new Response(null, { status: 204 })` is the correct pattern in Hono. It returns a native Web API Response with a null body, which Hono passes through correctly.
- **Never** return `{ success: true }` or any body from a 204 response.
- **Never** use `c.body(null, 204)` as it may behave differently across Hono versions.

### NodeNext Module Resolution — `.js` Extensions

The backend uses `"moduleResolution": "NodeNext"`. All relative imports **must** end in `.js`:

```typescript
import { db } from '../db/index.js'   // correct
import { todos } from '../db/schema.js' // correct
```

Package imports (`@todo-app/shared`, `hono`, `drizzle-orm`) do NOT need `.js` — only relative paths do.

### Drizzle ORM — `.returning()` Pattern

Drizzle's `.insert().returning()`, `.update().returning()`, and `.delete().returning()` all return an array. Use array destructuring to get the first element:

```typescript
const [inserted] = await db.insert(todos).values({ text: '...' }).returning()
const [updated] = await db.update(todos).set({ ... }).where(...).returning()
const [deleted] = await db.delete(todos).where(...).returning()
```

If no row was affected (UPDATE/DELETE on non-existent id), the array is empty and destructuring gives `undefined`. Always guard with `if (!updated)` / `if (!deleted)`.

For INSERT, if the insert itself fails (constraint violation, etc.), Drizzle throws — the `undefined` guard is not needed, but you may choose to add it for safety.

### Error Shape Contract

All error responses must match exactly:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Text is required" } }
```

The `code` field is driven by the HTTP status code via the `codeMap` in `onError`:
- 400 → `"VALIDATION_ERROR"`
- 404 → `"NOT_FOUND"`
- 500 → `"INTERNAL_ERROR"`
- any other → `"HTTP_ERROR"`

The `message` field comes from the `HTTPException` message string. For validation failures, this is the first Zod issue message: `result.error.issues[0].message`. The Zod messages from `createTodoSchema` are:
- Empty/missing text: `"Text is required"` (from `.min(1, 'Text is required')`)
- Text too long: `"Text must be at most 500 characters"` (from `.max(MAX_TODO_LENGTH, ...)`)

### Security: Plain Text Storage

The `text` field is stored verbatim as a plain string in the database. There is no HTML encoding, escaping, or sanitization at the API layer. The frontend is responsible for rendering it safely (e.g., as text content, not innerHTML). This is by design — the backend treats `text` as opaque user data.

### Testing Approach

Test file: `apps/backend/src/routes/__tests__/todos.test.ts`

This file may already exist from Story 2.1 (GET endpoint tests). If so, **add** the mutation test cases alongside the existing ones — do not rewrite the file.

Use Hono's `app.request()` helper or a compatible test client. Example pattern:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index.js'  // or construct a test app

describe('POST /api/v1/todos', () => {
  it('returns 201 with created todo for valid text', async () => {
    const res = await app.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Buy groceries' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({
      text: 'Buy groceries',
      completed: false,
    })
    expect(typeof body.id).toBe('string')
    expect(typeof body.createdAt).toBe('string')
  })

  it('returns 400 VALIDATION_ERROR for empty text', async () => {
    const res = await app.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR for text over 500 chars', async () => {
    const res = await app.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(501) }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/v1/todos/:id', () => {
  it('returns 200 with updated todo for existing id', async () => {
    // First create a todo, then patch it
    const createRes = await app.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test todo' }),
    })
    const created = await createRes.json()

    const res = await app.request(`/api/v1/todos/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.completed).toBe(true)
    expect(body.id).toBe(created.id)
  })

  it('returns 404 NOT_FOUND for non-existent id', async () => {
    const res = await app.request('/api/v1/todos/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/v1/todos/:id', () => {
  it('returns 204 with no body for existing id', async () => {
    const createRes = await app.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'To delete' }),
    })
    const created = await createRes.json()

    const res = await app.request(`/api/v1/todos/${created.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })

  it('returns 404 NOT_FOUND for non-existent id', async () => {
    const res = await app.request('/api/v1/todos/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
```

If the test suite requires a real database, ensure the test environment has a `DATABASE_URL` pointing to a test DB (or use a mock/stub for `db`). Check if Story 2.1's tests already established a testing pattern — follow it exactly.

### Verification Commands

```bash
# TypeScript checks
npx tsc --noEmit --project apps/backend/tsconfig.json
npx tsc --noEmit --project packages/shared/tsconfig.json

# Run tests
npm run test --workspace=apps/backend

# Manual smoke test (requires running backend + DB)
curl -s -X POST http://localhost:3000/api/v1/todos \
  -H 'Content-Type: application/json' \
  -d '{"text":"Buy groceries"}' | jq .
# Expected: 201 with id, text, completed: false, createdAt

curl -s -X PATCH http://localhost:3000/api/v1/todos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}' | jq .
# Expected: 200 with completed: true

curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE http://localhost:3000/api/v1/todos/<id>
# Expected: 204

curl -s -X DELETE http://localhost:3000/api/v1/todos/00000000-0000-0000-0000-000000000000 | jq .
# Expected: 404 with error.code "NOT_FOUND"
```

### Files to Modify

| File | Change |
|---|---|
| `packages/shared/src/schemas.ts` | Add `updateTodoSchema` |
| `packages/shared/src/types.ts` | Add `UpdateTodoInput` interface |
| `packages/shared/src/index.ts` | Verify/add exports for new symbols |
| `apps/backend/src/index.ts` | Replace `onError` handler with status→code mapping |
| `apps/backend/src/routes/todos.ts` | Add POST, PATCH, DELETE handlers; extend imports |
| `apps/backend/src/routes/__tests__/todos.test.ts` | Add mutation test cases |

### Common Mistakes to Avoid

1. **204 with a body** — Never call `c.json(...)` for a 204 response. Use `new Response(null, { status: 204 })`.
2. **Using raw `body.text` instead of `result.data.text`** — Always use the Zod-parsed value, not the raw input.
3. **Forgetting to check `if (!updated)` after `.returning()`** — An empty array destructures to `undefined`, which is falsy. This is the 404 gate for PATCH and DELETE.
4. **Missing `.js` on relative imports** — NodeNext requires `.js` on all relative imports: `'../db/index.js'`, not `'../db/index'`.
5. **Not extending the existing todos.ts** — The GET handler from Story 2.1 must remain. Add handlers alongside it.
6. **Forgetting to update `packages/shared/src/index.ts`** — The new `updateTodoSchema` and `UpdateTodoInput` must be exported from the package's barrel file.
7. **Hardcoded `'HTTP_ERROR'` code in onError** — The old handler used a single code. It must be replaced with the status-to-code mapping.
8. **`c.body(null, 204)` instead of `new Response(null, { status: 204 })`** — Hono's `c.body()` signature varies across versions. The native Response is safer and unambiguous.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None

### Completion Notes List

- Added `updateTodoSchema` to `packages/shared/src/schemas.ts` and `UpdateTodoInput` to `packages/shared/src/types.ts`; barrel exports picked up automatically via `export *` in index.ts
- Verified `apps/backend/src/index.ts` `onError` handler already had the correct status-to-code mapping (400→VALIDATION_ERROR, 404→NOT_FOUND, 500→INTERNAL_ERROR); no change needed
- Extended `apps/backend/src/routes/todos.ts` with POST, PATCH, DELETE handlers — GET handler left intact
- DELETE uses `new Response(null, { status: 204 })` as required (no body)
- Tests added to existing test file; updated `vi.mock` to include `insert`, `update`, `delete` alongside `select`; used mocked DB chains for all mutation tests; wired `testApp` with full error handler for correct error code mapping

## File List

- `packages/shared/src/schemas.ts` — added `updateTodoSchema`
- `packages/shared/src/types.ts` — added `UpdateTodoInput` interface
- `apps/backend/src/routes/todos.ts` — added POST, PATCH, DELETE handlers; added `eq`, `createTodoSchema`, `updateTodoSchema` imports
- `apps/backend/src/routes/__tests__/todos.test.ts` — extended mock with `insert/update/delete`; added POST, PATCH, DELETE test suites
- `apps/backend/vitest.config.ts` — created to resolve `@todo-app/shared` alias for Vitest (shared package `dist/` not built; alias points to source)

## Change Log

- 2026-04-27: Story 3.1 implemented by claude-sonnet-4-6 — added mutation endpoints (POST, PATCH, DELETE) to todos router, added `updateTodoSchema`/`UpdateTodoInput` to shared package, added unit tests for all mutation handlers
