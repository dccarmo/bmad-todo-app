import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { todosRouter } from '../todos.js'

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { db } from '../../db/index.js'

type MockChain = {
  from: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
}

function mockChain(resolvedValue: unknown): MockChain {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(resolvedValue),
  }
}

function mockChainRejected(error: Error): MockChain {
  return {
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockRejectedValue(error),
  }
}

const testApp = new Hono()
testApp.route('/api/v1/todos', todosRouter)
testApp.onError((err, c) => {
  if (err instanceof HTTPException) {
    const codeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      404: 'NOT_FOUND',
      500: 'INTERNAL_ERROR',
    }
    return c.json(
      { error: { code: codeMap[err.status] ?? 'HTTP_ERROR', message: err.message } },
      err.status
    )
  }
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})

describe('GET /api/v1/todos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with empty array when no todos exist', async () => {
    vi.mocked(db.select).mockReturnValue(mockChain([]) as unknown as ReturnType<typeof db.select>)

    const res = await testApp.request('/api/v1/todos')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 200 with todos ordered by createdAt ASC', async () => {
    const t1 = new Date('2026-01-01T10:00:00.000Z')
    const t2 = new Date('2026-01-02T10:00:00.000Z')
    const mockRows = [
      { id: 'uuid-1', text: 'First todo', completed: false, createdAt: t1 },
      { id: 'uuid-2', text: 'Second todo', completed: true, createdAt: t2 },
    ]
    vi.mocked(db.select).mockReturnValue(
      mockChain(mockRows) as unknown as ReturnType<typeof db.select>
    )

    const res = await testApp.request('/api/v1/todos')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({
      id: 'uuid-1',
      text: 'First todo',
      completed: false,
      createdAt: '2026-01-01T10:00:00.000Z',
    })
    expect(body[1]).toEqual({
      id: 'uuid-2',
      text: 'Second todo',
      completed: true,
      createdAt: '2026-01-02T10:00:00.000Z',
    })
  })

  it('returns ISO string for createdAt (not a Date object)', async () => {
    const mockRows = [
      {
        id: 'uuid-1',
        text: 'Test',
        completed: false,
        createdAt: new Date('2026-04-27T12:00:00.000Z'),
      },
    ]
    vi.mocked(db.select).mockReturnValue(
      mockChain(mockRows) as unknown as ReturnType<typeof db.select>
    )

    const res = await testApp.request('/api/v1/todos')
    const body = await res.json()
    expect(typeof body[0].createdAt).toBe('string')
    expect(body[0].createdAt).toBe('2026-04-27T12:00:00.000Z')
  })

  it('returns 500 with INTERNAL_ERROR on DB failure', async () => {
    vi.mocked(db.select).mockReturnValue(
      mockChainRejected(new Error('DB connection lost')) as unknown as ReturnType<typeof db.select>
    )

    const res = await testApp.request('/api/v1/todos')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})

describe('POST /api/v1/todos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 201 with created todo on valid input', async () => {
    const mockInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'uuid-new',
          text: 'Buy groceries',
          completed: false,
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
        },
      ]),
    }
    vi.mocked(db.insert).mockReturnValue(mockInsertChain as unknown as ReturnType<typeof db.insert>)

    const res = await testApp.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Buy groceries' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({
      id: 'uuid-new',
      text: 'Buy groceries',
      completed: false,
      createdAt: '2026-04-27T10:00:00.000Z',
    })
  })

  it('returns 400 VALIDATION_ERROR on empty text', async () => {
    const res = await testApp.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR on text exceeding 500 chars', async () => {
    const res = await testApp.request('/api/v1/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(501) }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/v1/todos/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with updated todo on valid input', async () => {
    const mockUpdateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'uuid-1',
          text: 'Buy groceries',
          completed: true,
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
        },
      ]),
    }
    vi.mocked(db.update).mockReturnValue(mockUpdateChain as unknown as ReturnType<typeof db.update>)

    const res = await testApp.request('/api/v1/todos/123e4567-e89b-12d3-a456-426614174001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.completed).toBe(true)
    expect(body.id).toBe('uuid-1')
  })

  it('returns 404 NOT_FOUND when todo does not exist', async () => {
    const mockUpdateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(mockUpdateChain as unknown as ReturnType<typeof db.update>)

    const res = await testApp.request('/api/v1/todos/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 400 VALIDATION_ERROR on invalid UUID', async () => {
    const res = await testApp.request('/api/v1/todos/invalid-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /api/v1/todos/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 204 with no body on successful delete', async () => {
    const mockDeleteChain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'uuid-1',
          text: 'Buy groceries',
          completed: false,
          createdAt: new Date('2026-04-27T10:00:00.000Z'),
        },
      ]),
    }
    vi.mocked(db.delete).mockReturnValue(mockDeleteChain as unknown as ReturnType<typeof db.delete>)

    const res = await testApp.request('/api/v1/todos/123e4567-e89b-12d3-a456-426614174001', {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })

  it('returns 404 NOT_FOUND when todo does not exist', async () => {
    const mockDeleteChain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.delete).mockReturnValue(mockDeleteChain as unknown as ReturnType<typeof db.delete>)

    const res = await testApp.request('/api/v1/todos/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 400 VALIDATION_ERROR on invalid UUID', async () => {
    const res = await testApp.request('/api/v1/todos/invalid-id', { method: 'DELETE' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
