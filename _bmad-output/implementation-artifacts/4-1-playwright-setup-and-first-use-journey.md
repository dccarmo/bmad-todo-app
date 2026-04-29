# Story 4.1: Playwright Setup & First-Use Journey

Status: ready-for-dev

---

## Story

**As a developer**, I want Playwright configured in the monorepo and a test that verifies the full first-use journey, so that the core happy path is automatically verified on every CI run.

---

## Acceptance Criteria

1. Playwright is installed in `e2e/` at the monorepo root; `npx playwright test` (or `npm run e2e` from root) executes against the running full-stack application.
2. First-use journey test (empty database): page loads → input is visible → user types "Buy groceries" → submits → item appears in list → user toggles completion → item appears visually completed (checkbox is checked) → user deletes item → item removed from list — all assertions pass end-to-end through the real API and database.
3. `docker-compose.test.yml` is used for the isolated test database (`db-test` on port 5433).
4. `playwright.config.ts` lives at `e2e/playwright.config.ts` and reads `baseURL` from the `BASE_URL` environment variable (defaulting to `http://localhost`).
5. Each test cleans up (or resets) state via API calls in `beforeEach` so tests are fully independent.

---

## Tasks / Subtasks

- [ ] **Task 1 — Create e2e workspace**
  - [ ] Create `e2e/` directory at monorepo root
  - [ ] Create `e2e/package.json` declaring `@todo-app/e2e` workspace with `@playwright/test` as a dev dependency
  - [ ] Add `"e2e"` to the `workspaces` array in the root `package.json`
  - [ ] Run `npm install` from the monorepo root to link the new workspace
  - [ ] Run `npx playwright install chromium` (or add it to a postinstall/setup step)

- [ ] **Task 2 — Write playwright.config.ts**
  - [ ] Create `e2e/playwright.config.ts` with `baseURL`, single Chromium project, `workers: 1`, `fullyParallel: false`, HTML reporter, and trace on first retry

- [ ] **Task 3 — Write the first-use journey test**
  - [ ] Create `e2e/first-use.spec.ts`
  - [ ] Implement `beforeEach` that GETs all todos and DELETEs each one to guarantee a clean state
  - [ ] Implement the full journey: navigate → assert empty state → fill input → submit → assert item in list → toggle checkbox → assert checked → delete → assert removed

- [ ] **Task 4 — Wire root npm scripts**
  - [ ] Add `"e2e": "playwright test --config=e2e/playwright.config.ts"` to root `package.json` scripts
  - [ ] Optionally add `"e2e:report": "playwright show-report e2e/playwright-report"` for convenience

- [ ] **Task 5 — Verify end-to-end**
  - [ ] Start the test DB: `docker-compose -f docker-compose.test.yml up -d db-test`
  - [ ] Start the backend pointing at the test DB
  - [ ] Start the frontend dev server
  - [ ] Run `BASE_URL=http://localhost:5173 npm run e2e` and confirm all assertions pass

---

## Dev Notes

### Context from Previous Stories

By the time this story is implemented, Epics 1, 2, and 3 are fully complete. The current repo state (as of story 4.1 planning) shows scaffold-only frontend (`App.tsx`) and backend (`index.ts`). At implementation time the following will exist and be functional:

**Backend (Hono, Drizzle ORM, PostgreSQL):**
- `GET  /api/v1/todos`        → 200, `Todo[]`
- `POST /api/v1/todos`        → 201, `Todo`
- `PATCH /api/v1/todos/:id`   → 200, `Todo`  (toggles `completed`)
- `DELETE /api/v1/todos/:id`  → 204, no body

**Todo schema (already exists in `apps/backend/src/db/schema.ts`):**
```ts
{ id: uuid, text: varchar(500), completed: boolean, createdAt: timestamp }
```

**Frontend (React + Vite + TanStack Query):**
- `TodoInput` component: text `<input>` + submit `<button type="submit">` (or Enter key)
- `TodoList` component: `<ul>` containing `<li>` elements
- `TodoItem` component: `<input type="checkbox">` + text span + delete `<button>`
- `EmptyState` component: rendered when the todos array is empty
- `LoadingState` component: rendered while the initial fetch is in progress

**Docker (both files exist):**
- `docker-compose.yml`: production stack (db on 5432, backend on 3000, frontend on 80)
- `docker-compose.test.yml`: `db-test` service on port 5433 with database `todos_test`

---

### Architecture Requirements

- `e2e/` directory lives at the **monorepo root** (sibling of `apps/`, `packages/`)
- `playwright.config.ts` lives inside `e2e/` — not at the monorepo root
- `testDir` in the config should be `'.'` (relative to `e2e/`) so test discovery finds `*.spec.ts` inside `e2e/`
- `baseURL` must come from `process.env.BASE_URL` with a default of `'http://localhost'`
- Only Chromium is required for this story
- `workers: 1` and `fullyParallel: false` — tests must not run in parallel (state isolation via sequential execution + `beforeEach` cleanup)
- Test spec files per architecture plan (this story implements the first one; stubs for others are optional):
  - `e2e/first-use.spec.ts`  ← this story
  - `e2e/todo-create.spec.ts` ← Story 4.2+
  - `e2e/todo-complete.spec.ts`
  - `e2e/todo-delete.spec.ts`
  - `e2e/empty-state.spec.ts`
  - `e2e/error-handling.spec.ts`

---

### Technical Implementation

#### 1. e2e/package.json

```json
{
  "name": "@todo-app/e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0"
  }
}
```

#### 2. Root package.json changes

Add `"e2e"` to `workspaces` and add scripts:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "e2e"
  ],
  "scripts": {
    "e2e": "playwright test --config=e2e/playwright.config.ts",
    "e2e:report": "playwright show-report e2e/playwright-report"
  }
}
```

> **Note:** `@playwright/test` can also be installed at the monorepo root in `devDependencies` rather than in `e2e/package.json`. Either approach works. If installed at root, the `e2e/package.json` `devDependencies` block can be omitted. Whichever approach is chosen, the `playwright` CLI must be resolvable when `npm run e2e` is executed from the repo root.

#### 3. e2e/playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

#### 4. Test State Isolation (CRITICAL)

There is no "delete all todos" bulk endpoint. Each test must clean up via individual API calls in `beforeEach`. The `request` fixture in Playwright uses the same `baseURL` as `page`, so no separate base URL configuration is needed.

Pattern:
```typescript
test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})
```

This runs before **every** test. It must complete before the test body executes. Do **not** use `afterEach` for cleanup — if a test fails mid-way, `afterEach` cleanup data state is unreliable if the test did not finish creating/deleting items predictably.

#### 5. e2e/first-use.spec.ts — Selector Strategy

The exact markup is authored by Epics 2 and 3, but based on the component architecture the following selector precedence should be used. Try them in order; use whichever matches the actual implementation:

**Input field:**
```typescript
// Preferred (semantic):
page.getByRole('textbox')
// Fallback:
page.locator('input[type="text"], input:not([type="hidden"]):not([type="checkbox"])')
// With data-testid (if added by frontend dev):
page.getByTestId('todo-input')
```

**Submit action:**
```typescript
// Option A — press Enter in the input (always works if the form uses Enter):
await input.press('Enter')
// Option B — click the submit button:
await page.getByRole('button', { name: /add|submit|create/i }).click()
// Option C — explicit type submit:
await page.locator('button[type="submit"]').click()
```

**Todo item text:**
```typescript
page.getByText('Buy groceries')
// More targeted if ambiguous:
page.locator('ul li').filter({ hasText: 'Buy groceries' })
```

**Checkbox (toggle completion):**
```typescript
// Scoped to the specific todo item:
page.locator('li').filter({ hasText: 'Buy groceries' }).locator('input[type="checkbox"]')
// Or first checkbox (safe when only one todo exists):
page.locator('input[type="checkbox"]').first()
```

**Completed visual state:**
```typescript
// Verify the checkbox DOM state:
await expect(checkbox).toBeChecked()
// Verify visual class on the li or text span (if the frontend adds a CSS class):
await expect(page.locator('li').filter({ hasText: 'Buy groceries' })).toHaveClass(/completed|done|checked/)
// If the text gets a strikethrough via a class on a child element:
await expect(page.locator('[class*="completed"]')).toBeVisible()
```
> Use `toBeChecked()` as the baseline assertion. The visual class assertion is a bonus — only add it if you can confirm the class name from the actual component markup.

**Delete button:**
```typescript
// Scoped to the todo item:
page.locator('li').filter({ hasText: 'Buy groceries' }).getByRole('button', { name: /delete|remove/i })
// Fallback with aria-label:
page.locator('button[aria-label*="Delete" i], button[aria-label*="Remove" i]').first()
// Last resort — any button inside the li that is not the checkbox:
page.locator('li').filter({ hasText: 'Buy groceries' }).locator('button')
```

**Empty state:**
```typescript
// Match text content (case-insensitive partial match):
page.getByText(/no tasks|no todos|nothing here|empty/i)
// Or by test id if added:
page.getByTestId('empty-state')
```

**Loading state (if assertions needed):**
```typescript
page.getByText(/loading/i)
page.getByRole('status')
page.getByTestId('loading-state')
```

#### 6. Complete first-use.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  // Guarantee a clean slate — DELETE all existing todos via API
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})

test('first-use journey: create, complete, and delete a todo', async ({ page }) => {
  // ── Navigate ──────────────────────────────────────────────────────────────
  await page.goto('/')

  // ── Empty state is shown ──────────────────────────────────────────────────
  await expect(page.getByText(/no tasks|no todos|nothing here|empty/i)).toBeVisible()

  // ── Input is visible and focusable ───────────────────────────────────────
  const input = page.getByRole('textbox')
  await expect(input).toBeVisible()

  // ── Type "Buy groceries" and submit ──────────────────────────────────────
  await input.fill('Buy groceries')
  await input.press('Enter')

  // ── Todo appears in the list ─────────────────────────────────────────────
  const todoItem = page.locator('li').filter({ hasText: 'Buy groceries' })
  await expect(todoItem).toBeVisible()

  // ── Empty state is no longer visible ─────────────────────────────────────
  await expect(page.getByText(/no tasks|no todos|nothing here|empty/i)).not.toBeVisible()

  // ── Toggle completion ─────────────────────────────────────────────────────
  const checkbox = todoItem.locator('input[type="checkbox"]')
  await expect(checkbox).not.toBeChecked()
  await checkbox.click()

  // ── Item is visually completed ────────────────────────────────────────────
  await expect(checkbox).toBeChecked()

  // ── Delete the todo ───────────────────────────────────────────────────────
  const deleteBtn = todoItem.getByRole('button', { name: /delete|remove/i })
  await deleteBtn.click()

  // ── Item is gone from the list ────────────────────────────────────────────
  await expect(page.getByText('Buy groceries')).not.toBeVisible()
})
```

> **Selector adaptation required:** The selectors above follow the architecture spec. Before running tests, verify the actual rendered HTML from the Epic 2/3 implementation. If component attributes differ (e.g. `aria-label="Delete todo"` vs `aria-label="Remove"`), adjust the locators accordingly. Do **not** guess — inspect the DOM with `page.pause()` or `npx playwright codegen http://localhost:5173` to generate accurate selectors.

---

### Running the Tests

#### Prerequisites

1. Test database must be running
2. Backend must be running pointed at the test DB
3. Frontend must be running
4. `BASE_URL` must point to the frontend origin

#### Step-by-step

```bash
# Step 1 — Start the isolated test database
docker-compose -f docker-compose.test.yml up -d db-test

# Wait for it to be healthy (the healthcheck polls pg_isready):
docker-compose -f docker-compose.test.yml ps

# Step 2 — Run backend migrations against test DB (if a migration script exists)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/todos_test \
  npm run db:migrate --workspace=apps/backend

# Step 3 — Start the backend against the test DB (in a separate terminal)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/todos_test \
  npm run dev --workspace=apps/backend
# Backend should be listening on http://localhost:3000

# Step 4 — Start the frontend dev server (in a separate terminal)
npm run dev --workspace=apps/frontend
# Frontend should be listening on http://localhost:5173

# Step 5 — Install Playwright browsers (first time only)
npx playwright install chromium

# Step 6 — Run E2E tests
BASE_URL=http://localhost:5173 npm run e2e

# Step 7 — View HTML report if tests fail
npm run e2e:report
```

#### Against the full Docker stack (prod-like)

```bash
# Start everything
docker-compose up -d

# Run E2E against the nginx-served frontend on port 80
BASE_URL=http://localhost npm run e2e
```

#### Single test / headed mode (debugging)

```bash
# Run a specific file
BASE_URL=http://localhost:5173 npx playwright test e2e/first-use.spec.ts --config=e2e/playwright.config.ts

# Run headed (watch Chromium execute)
BASE_URL=http://localhost:5173 npx playwright test --headed --config=e2e/playwright.config.ts

# Interactive debug mode (pauses at page.pause() calls)
BASE_URL=http://localhost:5173 npx playwright test --debug --config=e2e/playwright.config.ts

# Codegen — auto-generate selectors by recording interactions
npx playwright codegen http://localhost:5173 --config=e2e/playwright.config.ts
```

---

### Common Pitfalls to Avoid

1. **Do not hardcode `localhost:3000` in tests.** The `request` fixture in Playwright resolves against `baseURL` (the frontend URL). API calls like `/api/v1/todos` are proxied by the frontend dev server (Vite proxy) or nginx. All requests should use relative paths: `/api/v1/todos`, not `http://localhost:3000/api/v1/todos`. Verify that `vite.config.ts` has a proxy rule for `/api` → `http://localhost:3000`.

2. **Do not use `page.waitForTimeout(ms)`.** Use Playwright's auto-waiting assertions (`expect(locator).toBeVisible()`, `expect(locator).not.toBeVisible()`) instead. Playwright waits up to the configured timeout (default 5 s) automatically.

3. **Do not assert on the loading state in the first-use test.** The loading spinner may render and disappear before Playwright can capture it. Loading state is tested in Story 4.4 with a mocked/delayed network.

4. **The `beforeEach` must handle an empty todos array gracefully.** If `GET /api/v1/todos` returns `[]`, the `for` loop simply does nothing — no error.

5. **`playwright.config.ts` must not use `testDir: './tests'` or `testDir: 'tests'`.** The spec files live directly in `e2e/`, so `testDir: '.'` is correct (relative to `e2e/playwright.config.ts`).

6. **Browser installation.** `@playwright/test` does not ship browser binaries. Run `npx playwright install chromium` (or `npx playwright install --with-deps chromium` on CI) before the first test run. This can be added as a postinstall script or a CI step.

7. **Test ID collisions.** If multiple elements match a locator (e.g., multiple `<button>` inside a `<li>`), scope the locator to the parent `li` first (`.filter({ hasText: ... }).locator('button')`).

8. **Port conflicts.** If port 5433 is already in use, the `db-test` container will fail to start. The `docker-compose.test.yml` uses the `TEST_DB_PORT` env var (default `5433`) — override it with `TEST_DB_PORT=5499 docker-compose -f docker-compose.test.yml up -d db-test` and update `DATABASE_URL` accordingly.

---

### Scope Boundary — What NOT to Implement Here

The following belong to Stories 4.2–4.4 and must **not** be implemented in this story:

| Out of Scope | Story |
|---|---|
| Returning-user journey (pre-populated list, persistence across reload) | 4.2 |
| Mobile viewport tests | 4.2 |
| Error recovery (network failure, API 500) | 4.3 |
| Empty state / loading state explicit tests | 4.4 |
| Additional spec files beyond `first-use.spec.ts` | 4.2–4.4 |
| CI workflow YAML (GitHub Actions / pipeline config) | Separate DevOps story |

Do not add stub/empty spec files for future stories — they will be created when those stories are implemented.

---

## Dev Agent Record

_To be filled in by the implementing agent._

- Agent model used:
- Date implemented:
- Notes / deviations from story:

---

## File List

_Files created or modified during implementation (to be filled in by the implementing agent):_

- `e2e/package.json` (new)
- `e2e/playwright.config.ts` (new)
- `e2e/first-use.spec.ts` (new)
- `package.json` (modified — workspaces, scripts)

---

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-27 | Story created | BMad create-story |
