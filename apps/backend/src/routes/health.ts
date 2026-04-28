import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'

const health = new Hono()

health.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
  } catch {
    return c.json({ status: 'error', message: 'Database unavailable' }, 503)
  }
  return c.json({ status: 'ok' })
})

export { health }
