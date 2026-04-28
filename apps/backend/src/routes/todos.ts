import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { todos } from '../db/schema.js'
import type { Todo } from '@todo-app/shared'
import { createTodoSchema, updateTodoSchema } from '@todo-app/shared'

const todosRouter = new Hono()

todosRouter.get('/', async (c) => {
  let rows
  try {
    rows = await db.select().from(todos).orderBy(asc(todos.createdAt))
  } catch (err) {
    console.error('Failed to fetch todos:', err)
    throw new HTTPException(500, { message: 'Internal server error' })
  }

  const result: Todo[] = rows.map((row) => ({
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  }))

  return c.json(result, 200)
})

todosRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const result = createTodoSchema.safeParse(body)
    if (!result.success) {
      throw new HTTPException(400, { message: result.error.issues[0].message })
    }
    const [inserted] = await db.insert(todos).values({ text: result.data.text }).returning()
    const mapped: Todo = {
      id: inserted.id,
      text: inserted.text,
      completed: inserted.completed,
      createdAt: inserted.createdAt.toISOString(),
    }
    return c.json(mapped, 201)
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('Failed to create todo:', err)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

todosRouter.patch('/:id', async (c) => {
  try {
    const idParse = z.string().uuid().safeParse(c.req.param('id'))
    if (!idParse.success) throw new HTTPException(400, { message: 'Invalid todo ID' })
    const id = idParse.data
    const body = await c.req.json()
    const result = updateTodoSchema.safeParse(body)
    if (!result.success) {
      throw new HTTPException(400, { message: result.error.issues[0].message })
    }
    const [updated] = await db
      .update(todos)
      .set({ completed: result.data.completed })
      .where(eq(todos.id, id))
      .returning()
    if (!updated) {
      throw new HTTPException(404, { message: 'Todo not found' })
    }
    const mapped: Todo = {
      id: updated.id,
      text: updated.text,
      completed: updated.completed,
      createdAt: updated.createdAt.toISOString(),
    }
    return c.json(mapped, 200)
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('Failed to update todo:', err)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

todosRouter.delete('/:id', async (c) => {
  try {
    const idParse = z.string().uuid().safeParse(c.req.param('id'))
    if (!idParse.success) throw new HTTPException(400, { message: 'Invalid todo ID' })
    const id = idParse.data
    const [deleted] = await db.delete(todos).where(eq(todos.id, id)).returning()
    if (!deleted) {
      throw new HTTPException(404, { message: 'Todo not found' })
    }
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof HTTPException) throw err
    console.error('Failed to delete todo:', err)
    throw new HTTPException(500, { message: 'Internal server error' })
  }
})

export { todosRouter }
