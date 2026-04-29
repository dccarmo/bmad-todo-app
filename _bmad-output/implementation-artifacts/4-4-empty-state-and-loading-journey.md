# Story 4.4: Empty State and Loading Journey

Status: ready-for-dev

## Story

As a **QA engineer**, I want E2E tests for empty state and loading states, so that first-time users see the correct UI and performance is acceptable.

## Acceptance Criteria

1. When no todos exist, the empty state UI is visible (not a blank page or spinner).
2. The loading indicator appears briefly when todos are being fetched (can be tested with network throttling).
3. After todos are loaded, the loading indicator disappears.
4. When all todos are deleted, the empty state appears without a page reload.
5. The initial page load with empty state completes within 3 seconds on a simulated 3G connection (LCP ≤ 3s).
6. The app has an accessible heading (h1).

## Tasks / Subtasks

- [ ] **Task 1 — Create `e2e/empty-state-and-loading.spec.ts`**
  - [ ] Add `test.describe('Empty State and Loading Journey', ...)` wrapper
  - [ ] Add `test.beforeEach` cleanup hook using the established pattern (GET all todos, DELETE each)
  - [ ] Implement AC1: `shows empty state when no todos exist` — navigate to `/`, assert empty state text is visible using flexible matcher (`/no todos/i`)
  - [ ] Implement AC2 + AC3: `shows loading indicator then hides it on slow network` — use CDPSession to apply network throttling, navigate to `/`, assert loading element visible, then assert it disappears (Chromium only; document the browser constraint)
  - [ ] Implement AC4: `shows empty state after deleting all todos without reload` — create one todo via API, navigate, delete it via UI delete button, assert empty state appears without page navigation
  - [ ] Implement AC5: `page load completes within 3 seconds` — navigate to `/` with `waitUntil: 'networkidle'` and assert `getByRole('main')` is visible within 3000 ms (cross-browser compatible fallback; document CDPSession-based LCP approach as alternative)
  - [ ] Implement AC6: `has accessible h1 heading` — navigate to `/`, assert `getByRole('heading', { level: 1 })` is visible

- [ ] **Task 2 — Verify tests pass against the running stack**
  - [ ] Confirm tests pass with `pnpm --filter @todo-app/e2e exec playwright test empty-state-and-loading`
  - [ ] Confirm no other test files are broken (full suite still passes)

## Dev Notes

### Context from Previous Stories

The E2E workspace (`e2e/`, package `@todo-app/e2e`) and Playwright configuration were established in Story 4-1. The `playwright.config.ts` sets `baseURL: process.env.BASE_URL || 'http://localhost'` and includes a `webServer` config that starts the stack automatically.

The `beforeEach` cleanup pattern was established in Story 4-1 and reused in all subsequent E2E stories:

```ts
test.beforeEach(async ({ request }) => {
  const todos = await request.get('/api/v1/todos')
  const list = await todos.json()
  for (const todo of list) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})
```

Story 2-2 established the LoadingState and EmptyState components. Story 2-2 may not have added `role="status"` to the LoadingState component — see the dependency note in the Technical Implementation Details section below.

### Architecture & File Locations

| Action | File |
|---|---|
| Create new E2E spec | `e2e/empty-state-and-loading.spec.ts` |
| Playwright config (reference only) | `e2e/playwright.config.ts` |
| Existing E2E specs for pattern reference | `e2e/returning-user.spec.ts`, `e2e/error-recovery.spec.ts` |
| Frontend LoadingState component (reference only) | `apps/frontend/src/` (wherever LoadingState lives) |
| Frontend EmptyState component (reference only) | `apps/frontend/src/` (wherever EmptyState lives) |

### Technical Implementation Details

**Empty state detection (AC1)**

Use a flexible text matcher so the test is not coupled to the exact copy:

```ts
test('shows empty state when no todos exist', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/no todos/i)).toBeVisible()
})
```

If the EmptyState component renders inside `<main>`, a container-level assertion is also acceptable:

```ts
await expect(page.getByRole('main')).toContainText(/no todos/i)
```

Do not use an exact string — the component copy is not specified in earlier stories.

**Loading indicator detection (AC2 + AC3) — CDPSession network throttling**

Network throttling via CDPSession requires a Chromium browser context. Mark the test accordingly and add a comment explaining the constraint:

```ts
// Note: CDPSession network throttling is Chromium-only.
// This test will be skipped on Firefox and WebKit projects.
test('shows loading indicator then hides it on slow network', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDPSession throttling is Chromium-only')

  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024 / 8, // 50 Kbps
    uploadThroughput: 20 * 1024 / 8,
    latency: 300,
  })

  await page.goto('/')
  // Loading indicator should appear before the API response arrives
  await expect(page.getByRole('status')).toBeVisible()
  // Loading indicator should disappear once todos (or empty state) are rendered
  await expect(page.getByRole('status')).not.toBeVisible({ timeout: 5000 })
})
```

**Dependency on LoadingState having `role="status"`**

The loading indicator assertions above rely on `role="status"` being present on the LoadingState component. If that attribute is absent, the test will fail with a locator not found error. Two fallback strategies in priority order:

1. Prefer `data-testid="loading-spinner"` if the component has a test id:
   ```ts
   await expect(page.getByTestId('loading-spinner')).toBeVisible()
   ```
2. Use an `aria-label` if present:
   ```ts
   await expect(page.getByRole('img', { name: /loading/i })).toBeVisible()
   ```

This story does NOT modify the LoadingState component. If `role="status"` is absent and no suitable fallback attribute exists, file a bug against Story 2-2 to add the attribute, and use a `data-testid` fallback in the interim.

**Dynamic empty state after deletes (AC4)**

Create one todo via the API fixture before navigating, then delete it through the UI and assert the empty state without reloading:

```ts
test('shows empty state after deleting all todos without reload', async ({ page, request }) => {
  await request.post('/api/v1/todos', { data: { text: 'Delete me' } })

  await page.goto('/')
  await expect(page.getByText('Delete me')).toBeVisible()

  await page.getByRole('button', { name: /delete "delete me"/i }).click()

  // Assert empty state without any page.goto() or page.reload()
  await expect(page.getByText(/no todos/i)).toBeVisible()
})
```

If the delete button's accessible name does not follow the `delete "<title>"` pattern, use a broader matcher:
```ts
await page.getByRole('button', { name: /delete/i }).click()
```

**Performance check (AC5) — simplified cross-browser approach**

True LCP measurement via the Performance API requires CDPSession PerformanceObserver and is Chromium-only. The simplified proxy below is cross-browser-compatible and sufficient for this story's scope:

```ts
test('page load completes within 3 seconds', async ({ page }) => {
  const start = Date.now()
  await page.goto('/', { waitUntil: 'networkidle' })
  const duration = Date.now() - start
  expect(duration).toBeLessThan(3000)

  // Belt-and-suspenders: assert main content is rendered
  await expect(page.getByRole('main')).toBeVisible({ timeout: 3000 })
})
```

This test runs against the local dev server; no artificial throttling is applied. The 3-second budget on a local network is intentionally generous. If the project adds a CI performance pipeline in the future, replace this with a CDPSession-based LCP measurement targeting the 3G throttle profile.

**Accessible heading (AC6)**

```ts
test('has accessible h1 heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
```

### Testing Approach

- `beforeEach` cleanup ensures all tests start with zero todos — empty state assertions are reliable without any additional setup.
- Use flexible text matchers (`/no todos/i`) for EmptyState assertions to decouple tests from exact copy.
- The CDPSession throttling test (AC2 + AC3) must be marked Chromium-only with `test.skip`. Do not attempt to call `page.context().newCDPSession()` on Firefox or WebKit — it will throw.
- For AC4, assert the empty state using `toBeVisible()` after the delete action completes. Do not use `page.waitForTimeout()` as the primary wait mechanism — prefer Playwright's built-in auto-waiting via `expect(...).toBeVisible()`.
- For AC5, `waitUntil: 'networkidle'` causes `page.goto()` to resolve only after network activity has quieted, which is the appropriate signal for a fully loaded page. Record wall-clock time around the `goto()` call.
- All five tests should be wrapped in a single `test.describe` block for grouped reporting.

### Scope Boundary — What NOT to Implement

- Visual regression tests or screenshot comparisons.
- Memory leak detection.
- Lighthouse integration or third-party performance tooling.
- Auth-related flows (project has no auth).
- Any changes to frontend or backend source code — this is an E2E test story only. If a missing `role="status"` or `data-testid` is discovered, file a bug; do not modify the component within this story's scope.
- True LCP measurement via CDPSession PerformanceObserver (document as a future enhancement, not in scope here).

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
