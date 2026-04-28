import { test, expect } from '@playwright/test'

test.describe('Empty State and Loading Journey', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/api/v1/todos')
    const todos: Array<{ id: string }> = await response.json()
    for (const todo of todos) {
      const r = await request.delete(`/api/v1/todos/${todo.id}`)
      if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
    }
  })

  test('shows empty state when no todos exist', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/no tasks/i)).toBeVisible()
  })

  test('shows loading indicator then hides it on slow network', async ({ page }) => {
    // Simulate a slow API response using route interception + delay
    await page.route('/api/v1/todos', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await route.continue()
    })

    await page.goto('/')

    // Loading indicator (role="status") should be visible during the delayed fetch
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 })

    // Loading indicator disappears once the response arrives
    await expect(page.getByRole('status')).not.toBeVisible({ timeout: 10000 })
  })

  test('shows empty state after deleting all todos without reload', async ({ page, request }) => {
    await request.post('/api/v1/todos', {
      data: { text: 'Delete me' },
      headers: { 'Content-Type': 'application/json' },
    })

    await page.goto('/')
    await expect(page.getByText('Delete me')).toBeVisible()

    await page.getByRole('button', { name: /delete "delete me"/i }).click()

    // Empty state appears without page reload
    await expect(page.getByText(/no tasks/i)).toBeVisible()
  })

  test('page load completes within 3 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { waitUntil: 'load' })
    const duration = Date.now() - start
    expect(duration).toBeLessThan(3000)

    await expect(page.getByRole('main')).toBeVisible({ timeout: 3000 })
  })

  test('has accessible h1 heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
