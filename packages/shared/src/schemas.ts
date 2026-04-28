import { z } from 'zod'
import { MAX_TODO_LENGTH } from './types.js'

export const createTodoSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(MAX_TODO_LENGTH, `Text must be at most ${MAX_TODO_LENGTH} characters`),
})

export const todoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(MAX_TODO_LENGTH),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
})

export const updateTodoSchema = z.object({
  completed: z.boolean(),
})
