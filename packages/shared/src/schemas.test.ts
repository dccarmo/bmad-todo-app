import { describe, it, expect } from 'vitest'
import { createTodoSchema, todoSchema, updateTodoSchema } from './schemas.js'

describe('createTodoSchema', () => {
  it('accepts valid text', () => {
    const result = createTodoSchema.parse({ text: 'hello' })
    expect(result.text).toBe('hello')
  })

  it('rejects empty string', () => {
    expect(() => createTodoSchema.parse({ text: '' })).toThrow()
  })

  it('rejects text over 500 chars', () => {
    expect(() => createTodoSchema.parse({ text: 'a'.repeat(501) })).toThrow()
  })

  it('accepts text at exactly 500 chars', () => {
    const result = createTodoSchema.parse({ text: 'a'.repeat(500) })
    expect(result.text).toHaveLength(500)
  })

  it('rejects missing text field', () => {
    expect(() => createTodoSchema.parse({})).toThrow()
  })
})

describe('todoSchema', () => {
  it('accepts a valid todo', () => {
    const todo = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      text: 'Buy milk',
      completed: false,
      createdAt: '2026-04-26T10:00:00.000Z',
    }
    const result = todoSchema.parse(todo)
    expect(result.id).toBe(todo.id)
    expect(result.text).toBe(todo.text)
    expect(result.completed).toBe(false)
  })

  it('rejects invalid uuid', () => {
    expect(() =>
      todoSchema.parse({
        id: 'not-a-uuid',
        text: 'Buy milk',
        completed: false,
        createdAt: '2026-04-26T10:00:00.000Z',
      })
    ).toThrow()
  })

  it('rejects invalid datetime', () => {
    expect(() =>
      todoSchema.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        text: 'Buy milk',
        completed: false,
        createdAt: 'not-a-date',
      })
    ).toThrow()
  })
})

describe('updateTodoSchema', () => {
  it('accepts { completed: true }', () => {
    expect(updateTodoSchema.parse({ completed: true })).toEqual({ completed: true })
  })

  it('accepts { completed: false }', () => {
    expect(updateTodoSchema.parse({ completed: false })).toEqual({ completed: false })
  })

  it('rejects empty object', () => {
    expect(() => updateTodoSchema.parse({})).toThrow()
  })

  it('rejects { completed: "true" }', () => {
    expect(() => updateTodoSchema.parse({ completed: 'true' })).toThrow()
  })

  it('rejects { completed: 1 }', () => {
    expect(() => updateTodoSchema.parse({ completed: 1 })).toThrow()
  })
})
