import { test, expect, devices } from '@playwright/test'

test.use({
  viewport: devices['iPhone SE'].viewport,
  userAgent: devices['iPhone SE'].userAgent,
  deviceScaleFactor: devices['iPhone SE'].deviceScaleFactor,
  hasTouch: devices['iPhone SE'].hasTouch,
  isMobile: devices['iPhone SE'].isMobile,
})

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    const r = await request.delete(`/api/v1/todos/${todo.id}`)
    if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
  }
})

test('mobile layout: input, list, and buttons are visible and functional at 375px', async ({
  page,
}) => {
  await page.request.post('/api/v1/todos', {
    data: { text: 'Mobile task' },
    headers: { 'Content-Type': 'application/json' },
  })

  await page.goto('/')

  // No horizontal scroll
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(hasHorizontalScroll).toBe(false)

  // Input is visible
  await expect(page.getByRole('textbox')).toBeVisible()

  // Todo item is visible
  await expect(page.getByText('Mobile task')).toBeVisible()

  // Delete button is visible
  const deleteBtn = page
    .locator('li')
    .filter({ hasText: 'Mobile task' })
    .getByRole('button', { name: /delete/i })
  await expect(deleteBtn).toBeVisible()

  const btnBox = await deleteBtn.boundingBox()
  expect(btnBox).not.toBeNull()
  expect(btnBox!.width).toBeGreaterThan(0)

  // Checkbox is visible and functional
  const checkbox = page
    .locator('li')
    .filter({ hasText: 'Mobile task' })
    .locator('input[type="checkbox"]')
  await expect(checkbox).toBeVisible()
  await checkbox.click()
  await expect(checkbox).toBeChecked()
})
