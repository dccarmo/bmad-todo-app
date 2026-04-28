import { test, expect } from '@playwright/test'

test.describe('Error Recovery Journey', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/api/v1/todos')
    const todos: Array<{ id: string }> = await response.json()
    for (const todo of todos) {
      const r = await request.delete(`/api/v1/todos/${todo.id}`)
      if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
    }
  })

  test('shows error state when API is unreachable', async ({ page }) => {
    // Abort all /api/v1/todos requests to simulate outage
    await page.route('/api/v1/todos', (route) => route.abort())

    await page.goto('/')

    // Error state with role="alert" should appear (TanStack Query retries once, then surfaces error)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 })
  })

  test('retries and shows todos after API recovers', async ({ page, request }) => {
    // Pre-create a todo that will appear after recovery
    await request.post('/api/v1/todos', {
      data: { text: 'Recovery task' },
      headers: { 'Content-Type': 'application/json' },
    })

    let callCount = 0
    await page.route('/api/v1/todos', (route) => {
      callCount++
      if (callCount <= 2) {
        route.abort()
      } else {
        route.continue()
      }
    })

    await page.goto('/')

    // Error state appears after the two failed attempts
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 })

    // Click retry — next call goes through
    await page.getByRole('button', { name: /retry/i }).click()

    // Error state gone, and the pre-created todo is visible
    await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Recovery task')).toBeVisible({ timeout: 5000 })
  })

  test('reverts optimistic create on POST failure', async ({ page }) => {
    // Allow GETs through, fail POST with 500
    await page.route('/api/v1/todos', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/')

    // Submit a new todo
    const input = page.getByRole('textbox')
    await input.fill('Doomed task')
    await input.press('Enter')

    // Optimistic item may flash briefly; after rollback it should be gone
    await expect(page.getByText('Doomed task')).not.toBeVisible({ timeout: 5000 })
  })

  test('reverts checkbox on PATCH failure', async ({ page, request }) => {
    // Create a todo via API (bypasses route intercept since route not set yet)
    const res = await request.post('/api/v1/todos', {
      data: { text: 'Toggle me' },
      headers: { 'Content-Type': 'application/json' },
    })
    const created = (await res.json()) as { id: string; completed: boolean }

    // Intercept PATCH to simulate failure
    await page.route(`/api/v1/todos/*`, (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/')

    const checkbox = page
      .locator('li')
      .filter({ hasText: 'Toggle me' })
      .locator('input[type="checkbox"]')

    const initialChecked = created.completed
    await expect(checkbox).toBeVisible()

    // Click to trigger optimistic update followed by rollback
    await checkbox.click()

    // After rollback, checkbox should revert to original state
    await page.waitForTimeout(1000)
    if (initialChecked) {
      await expect(checkbox).toBeChecked({ timeout: 3000 })
    } else {
      await expect(checkbox).not.toBeChecked({ timeout: 3000 })
    }
  })
})
