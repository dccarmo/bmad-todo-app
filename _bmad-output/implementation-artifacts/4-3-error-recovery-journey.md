# Story 4.3: Error Recovery Journey

Status: ready-for-dev

## Story

As a **QA engineer**, I want E2E tests that verify error scenarios and recovery flows, so users are protected from silent failures.

## Acceptance Criteria

1. When the API is unreachable (simulated via route interception), the error state UI is shown.
2. Clicking the "Retry" button re-fetches and shows todos when the API recovers.
3. When creating a todo fails (POST returns 500), the optimistic UI reverts and an error indicator is shown.
4. When toggling completion fails (PATCH returns 500), the checkbox reverts to its original state.
5. Tests clean up after themselves (no state leaks between tests).

## Tasks / Subtasks

- [ ] **Task 1 — Create `e2e/error-recovery.spec.ts`**
  - [ ] Add `test.describe('Error Recovery Journey', ...)` wrapper
  - [ ] Add `test.beforeEach` cleanup hook using the established pattern (GET all todos, DELETE each)
  - [ ] Implement AC1: `shows error state when API is unreachable` using `page.route()` to abort all requests to `/api/v1/todos`, navigate, and assert `[role="alert"]` is visible
  - [ ] Implement AC2: `retries and shows todos after API recovers` — fail first two calls (initial + TanStack retry), then click the Retry button and assert the todo list becomes visible
  - [ ] Implement AC3: `reverts optimistic create on POST failure` — set up route to fulfill POST with 500, fill and submit the form, assert the optimistic item disappears after failure
  - [ ] Implement AC4: `reverts checkbox on PATCH failure` — create a todo via API, route PATCH to return 500, click the checkbox, assert it reverts to its original checked state
  - [ ] Verify all routes are set up per-test (not shared) so no state leaks between tests (AC5)

- [ ] **Task 2 — Verify tests pass against the running stack**
  - [ ] Confirm tests pass with `pnpm --filter @todo-app/e2e exec playwright test error-recovery`
  - [ ] Confirm no other test files are broken (full suite still passes)

## Dev Notes

### Context from Previous Stories

The E2E workspace (`e2e/`, package `@todo-app/e2e`) and Playwright configuration were established in Story 4-1. The `playwright.config.ts` sets `baseURL: process.env.BASE_URL || 'http://localhost'` and includes a `webServer` config that starts the stack automatically.

The `beforeEach` cleanup pattern was established in Story 4-1 and reused in 4-2:

```ts
test.beforeEach(async ({ request }) => {
  const todos = await request.get('/api/v1/todos')
  const list = await todos.json()
  for (const todo of list) {
    await request.delete(`/api/v1/todos/${todo.id}`)
  }
})
```

Story 2-3 established that error states must render with `role="alert"` and that a "Retry" button must be present. Story 2-3 also configured TanStack Query with `retry: 1`, meaning the library will make one automatic retry before surfacing an error to the UI — tests must account for this.

### Architecture & File Locations

| Action | File |
|---|---|
| Create new E2E spec | `e2e/error-recovery.spec.ts` |
| Playwright config (reference only) | `e2e/playwright.config.ts` |
| Existing E2E specs for pattern reference | `e2e/returning-user.spec.ts`, `e2e/mobile.spec.ts` |
| Frontend error state component (reference only) | `apps/frontend/src/` (wherever error UI lives) |

### Technical Implementation Details

**Network interception via `page.route()`**

Use Playwright's `page.route()` for all network simulation — do NOT use `page.setOfflineMode()`, which is too broad and affects non-API requests (assets, etc.).

Abort all requests to simulate a full outage:
```ts
await page.route('/api/v1/todos', (route) => route.abort())
```

Fulfill with a 500 to simulate a server error with a well-formed error body:
```ts
await page.route('/api/v1/todos', (route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
  })
)
```

Intercept only POST mutations while allowing GETs through:
```ts
await page.route('/api/v1/todos', (route) => {
  if (route.request().method() === 'POST') {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"INTERNAL_ERROR","message":"Server error"}}' })
  } else {
    route.continue()
  }
})
```

Intercept only PATCH mutations (wildcard path to match `todos/:id`):
```ts
await page.route('/api/v1/todos/*', (route) => {
  if (route.request().method() === 'PATCH') {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"code":"INTERNAL_ERROR","message":"Server error"}}' })
  } else {
    route.continue()
  }
})
```

**TanStack Query retry behavior**

TanStack Query is configured with `retry: 1` (Story 2-3), so 2 total fetch attempts happen before the error state renders. When simulating a full outage for AC1, aborting every request is sufficient — TanStack Query will retry once, fail again, and then set error state.

For AC2 (retry button), use a counter to track call count and only fail the first two calls:
```ts
let callCount = 0
await page.route('/api/v1/todos', (route) => {
  callCount++
  if (callCount <= 2) {
    route.abort()
  } else {
    route.continue()
  }
})
```

**Waiting for async UI changes**

Prefer `page.waitForSelector()` over `page.waitForTimeout()` for reliability:
```ts
// Preferred
await page.waitForSelector('[role="alert"]')
// Only use fixed waits when asserting absence (no selector to wait for)
await page.waitForTimeout(500) // e.g., after triggering mutation, before asserting item gone
```

**Asserting reverted state**

For the checkbox revert (AC4), capture the initial state before clicking, then assert equality after the expected revert window:
```ts
const checkbox = page.getByLabel(/mark "toggle me" as/i)
const initialChecked = await checkbox.isChecked()
await checkbox.click()
await page.waitForTimeout(500)
await expect(checkbox).toHaveProperty('checked', initialChecked, { timeout: 3000 })
```

**Route teardown / test isolation (AC5)**

Routes registered via `page.route()` are scoped to the `page` object for the duration of the test. Since Playwright creates a fresh browser context (and therefore a fresh `page`) per test by default, routes do not bleed between tests. No explicit `page.unroute()` is needed unless a single test needs to re-enable the API mid-test (as in AC2, where `route.continue()` is called after two failures — no unroute required).

### Testing Approach

- All interception must target only the API paths (`/api/v1/todos`, `/api/v1/todos/*`) to avoid interfering with static asset loading.
- `await expect(page.getByRole('alert')).toBeVisible()` is the canonical assertion for AC1 — matches the `role="alert"` contract established in Story 2-3.
- `await page.getByRole('button', { name: /retry/i }).click()` is the canonical way to trigger the retry action — matches the accessible button name contract from Story 2-3.
- For the optimistic revert tests (AC3, AC4), short fixed waits (`waitForTimeout(500)`) are acceptable immediately after triggering the mutation to let the optimistic render appear before asserting its eventual disappearance. The final assertion should use a generous timeout (`{ timeout: 3000 }`) to allow TanStack Query rollback to complete.
- The `beforeEach` cleanup hook (via `request` fixture) ensures no leftover todos from previous tests affect subsequent tests.

### Scope Boundary — What NOT to Implement

- Empty state and loading journey — covered in Story 4-4.
- Performance tests or timing assertions beyond what is needed to handle TanStack Query retry delays.
- Visual regression tests or screenshot comparisons.
- Auth-related error flows (project has no auth).
- Any changes to frontend or backend source code — this story is E2E tests only. If a test reveals a missing UI element (e.g., no `role="alert"` or no Retry button), that is a bug to be filed, not fixed within this story's scope.

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
