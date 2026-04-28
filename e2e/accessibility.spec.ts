import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility — WCAG AA', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/api/v1/todos')
    const todos: Array<{ id: string }> = await response.json()
    for (const todo of todos) {
      const r = await request.delete(`/api/v1/todos/${todo.id}`)
      if (!r.ok()) throw new Error(`Cleanup failed for todo ${todo.id}: ${r.status()}`)
    }
  })

  test('empty state has no critical WCAG violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/no tasks yet/i)).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('todo list has no critical WCAG violations', async ({ page, request }) => {
    await request.post('/api/v1/todos', {
      data: { text: 'Accessibility test todo' },
      headers: { 'Content-Type': 'application/json' },
    })

    await page.goto('/')
    await expect(page.getByText('Accessibility test todo')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('form inputs are accessible', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page })
      .include('form, input, button')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('h1 heading exists and is unique', async ({ page }) => {
    await page.goto('/')
    const headings = page.getByRole('heading', { level: 1 })
    await expect(headings).toHaveCount(1)
    await expect(headings).toBeVisible()
  })

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/')

    // Tab into the input
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()

    // The focused element should be the todo input or the Add button
    const tag = await focused.evaluate((el) => el.tagName.toLowerCase())
    expect(['input', 'button', 'a']).toContain(tag)
  })
})
