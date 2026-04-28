import { test, expect } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const response = await request.get('/api/v1/todos')
  const todos: Array<{ id: string }> = await response.json()
  for (const todo of todos) {
    const r = await request.delete(`/api/v1/todos/${todo.id}`)
    if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
  }
})

test('first-use journey: create, complete, and delete a todo', async ({ page }) => {
  await page.goto('/')

  // Empty state is shown
  await expect(page.getByText('No tasks yet. Add one above.')).toBeVisible()

  // Input is visible
  const input = page.getByRole('textbox')
  await expect(input).toBeVisible()

  // Type and submit
  await input.fill('Buy groceries')
  await input.press('Enter')

  // Todo appears in list
  const todoItem = page.locator('li').filter({ hasText: 'Buy groceries' })
  await expect(todoItem).toBeVisible()

  // Empty state is gone
  await expect(page.getByText('No tasks yet. Add one above.')).not.toBeVisible()

  // Toggle completion
  const checkbox = todoItem.locator('input[type="checkbox"]')
  await expect(checkbox).not.toBeChecked()
  await checkbox.click()
  await expect(checkbox).toBeChecked()

  // Delete the todo
  const deleteBtn = todoItem.getByRole('button', { name: /delete/i })
  await deleteBtn.click()

  // Item is gone
  await expect(page.getByText('Buy groceries')).not.toBeVisible()
})
