import { test, expect } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    const r = await request.delete(`/api/v1/todos/${todo.id}`)
    if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
  }
})

test('returning user sees previously created todos on reload', async ({ page }) => {
  // Create todos via API for speed and deterministic createdAt ordering
  await page.request.post('/api/v1/todos', {
    data: { text: 'First task' },
    headers: { 'Content-Type': 'application/json' },
  })
  await page.waitForTimeout(50)
  await page.request.post('/api/v1/todos', {
    data: { text: 'Second task' },
    headers: { 'Content-Type': 'application/json' },
  })

  await page.goto('/')

  // Both todos visible
  await expect(page.getByText('First task')).toBeVisible()
  await expect(page.getByText('Second task')).toBeVisible()

  // Order: First task before Second task (ascending createdAt)
  const items = page.locator('li')
  await expect(items.nth(0)).toContainText('First task')
  await expect(items.nth(1)).toContainText('Second task')

  // Reload simulates returning user
  await page.reload()

  // Todos persist after reload
  await expect(page.getByText('First task')).toBeVisible()
  await expect(page.getByText('Second task')).toBeVisible()
})
