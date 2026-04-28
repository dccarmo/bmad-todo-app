import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const todos = pgTable('todos', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  text: varchar('text', { length: 500 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type TodoRow = typeof todos.$inferSelect
