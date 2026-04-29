# Story 4.2: Returning User & Mobile Journey

Status: ready-for-dev

## Story

As a developer, I want E2E tests verifying cross-session persistence and mobile layout, so that regressions in persistence or responsive behavior are caught automatically.

## Acceptance Criteria

1. Returning-user test: todos created in a prior session are visible on reload; list order matches creation time (ascending createdAt).
2. Mobile layout test: Playwright emulates 375px viewport (iPhone SE); layout is fully functional — input, list, and buttons are all visible and operable; no horizontal scroll; touch targets large enough to interact with (delete button height ≥ 44px).

## Tasks / Subtasks

- [ ] Create `e2e/returning-user.spec.ts`
  - [ ] Add `beforeEach` cleanup hook using the `request` fixture
  - [ ] Implement test: create two todos via API, navigate to app, assert both visible in creation order, reload, assert todos persist
- [ ] Create `e2e/mobile.spec.ts`
  - [ ] Add `test.use({ ...devices['iPhone SE'] })` at file top level (outside any block)
  - [ ] Add `beforeEach` cleanup hook using the `request` fixture
  - [ ] Implement test: create a todo via API, navigate to app, assert no horizontal scroll, assert input/todo/delete button/checkbox are visible and functional, assert delete button height ≥ 44px

## Dev Notes

### Context from Previous Stories

Story 4.1 established the entire E2E infrastructure. The following already exists and must not be modified unless extending it:

```
e2e/
├── package.json          (workspace: @todo-app/e2e, dep: @playwright/test)
├── playwright.config.ts  (baseURL from BASE_URL env var, chromium only, workers: 1)
└── first-use.spec.ts     (full create/toggle/delete journey)
```

The root `package.json` already has:
```json
"e2e": "playwright test --config=e2e/playwright.config.ts"
```

The `beforeEach` cleanup pattern established in 4.1 (and reused in both new spec files):
```typescript
test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})
```

### Architecture Requirements

- All new spec files live under `e2e/` alongside `first-use.spec.ts`.
- Test isolation is enforced by the `beforeEach` cleanup — every test starts with an empty todo list.
- The Playwright config (`e2e/playwright.config.ts`) does **not** need to be modified for these stories. The `test.use()` call inside `mobile.spec.ts` is sufficient to override the viewport for that file.
- Fixture distinction: inside `test.beforeEach`, use the `request` fixture parameter directly. Inside a `test()` body that also has `page`, use `page.request` for API calls to stay in the same browser context.

### Existing playwright.config.ts (for reference — do not modify)

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

### Technical Implementation

#### File: `e2e/returning-user.spec.ts` (create new)

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})

test('returning user sees previously created todos on reload', async ({ page }) => {
  // Create todos via API (not UI) for speed and reliability
  await page.request.post('/api/v1/todos', {
    data: { text: 'First task' },
    headers: { 'Content-Type': 'application/json' },
  })
  // Small delay to ensure distinct createdAt timestamps
  await page.waitForTimeout(10)
  await page.request.post('/api/v1/todos', {
    data: { text: 'Second task' },
    headers: { 'Content-Type': 'application/json' },
  })

  // Navigate to app (simulates new session)
  await page.goto('/')

  // Both todos are visible
  await expect(page.getByText('First task')).toBeVisible()
  await expect(page.getByText('Second task')).toBeVisible()

  // Order: First task before Second task (ascending createdAt)
  const items = page.locator('li')
  await expect(items.nth(0)).toContainText('First task')
  await expect(items.nth(1)).toContainText('Second task')

  // Reload (new browser session simulation)
  await page.reload()

  // Todos still visible after reload
  await expect(page.getByText('First task')).toBeVisible()
  await expect(page.getByText('Second task')).toBeVisible()
})
```

Key implementation notes:
- `page.request.post` (not bare `request.post`) is used inside the test body because `page` is in scope and API calls should share the browser context.
- `page.waitForTimeout(10)` inserts a minimal delay so the two POSTs get distinct `createdAt` timestamps, making the order assertion deterministic.
- The `li` locator assumes the app renders todos as `<li>` elements. If the app uses a different element, adjust to match the actual DOM.

#### File: `e2e/mobile.spec.ts` (create new)

```typescript
import { test, expect, devices } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})

test.use({ ...devices['iPhone SE'] })

test('mobile layout: input, list, and buttons are visible and functional at 375px', async ({ page }) => {
  // Add a todo via API for list to show
  await page.request.post('/api/v1/todos', {
    data: { text: 'Mobile task' },
    headers: { 'Content-Type': 'application/json' },
  })

  await page.goto('/')

  // No horizontal scroll (scrollWidth === clientWidth)
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(hasHorizontalScroll).toBe(false)

  // Input is visible
  const input = page.getByRole('textbox')
  await expect(input).toBeVisible()

  // Todo item is visible
  await expect(page.getByText('Mobile task')).toBeVisible()

  // Delete button is visible and has adequate touch target (≥44px height)
  const deleteBtn = page
    .locator('li')
    .filter({ hasText: 'Mobile task' })
    .getByRole('button', { name: /delete|remove/i })
  await expect(deleteBtn).toBeVisible()

  const btnBox = await deleteBtn.boundingBox()
  expect(btnBox).not.toBeNull()
  expect(btnBox!.height).toBeGreaterThanOrEqual(44)

  // Checkbox is visible
  const checkbox = page
    .locator('li')
    .filter({ hasText: 'Mobile task' })
    .locator('input[type="checkbox"]')
  await expect(checkbox).toBeVisible()

  // Can interact with the checkbox (touch works)
  await checkbox.click()
  await expect(checkbox).toBeChecked()
})
```

Key implementation notes:
- `test.use({ ...devices['iPhone SE'] })` **must** appear at the top level of the file, outside any `describe` or `test` block. This overrides the project-level device for every test in this file.
- `devices` is imported from `@playwright/test` (same import line as `test` and `expect`).
- The `boundingBox()` call returns `null` if the element is not visible; the `expect(btnBox).not.toBeNull()` guard prevents a confusing null-dereference error and surfaces a clear assertion failure instead.
- The `btnBox!.height` non-null assertion is safe after the null guard on the previous line.
- The horizontal scroll check uses `page.evaluate` to read DOM properties synchronously in the browser context — this is the canonical Playwright approach.

### Running the Tests

```bash
# From repo root — runs all E2E tests (first-use + returning-user + mobile)
npm run e2e

# Run only the new specs
BASE_URL=http://localhost npx playwright test --config=e2e/playwright.config.ts e2e/returning-user.spec.ts e2e/mobile.spec.ts

# View HTML report after a run
npx playwright show-report e2e/playwright-report
```

The app must be running and reachable at `BASE_URL` (default `http://localhost`) before executing the tests.

### Scope Boundary

The following are explicitly out of scope for this story and will be addressed in later stories:

- **Story 4.3** — Error-recovery journey (network failures, API error states)
- **Story 4.4** — Empty-state and loading-state journey

Do not add tests for those scenarios here.

## Dev Agent Record

_To be filled in by the implementing agent._

## File List

_To be filled in by the implementing agent upon completion._

## Change Log

_To be filled in by the implementing agent upon completion._
