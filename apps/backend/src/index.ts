import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { health } from './routes/health.js'
import { todosRouter } from './routes/todos.js'

const app = new Hono()

// ── Global middleware ──────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost', 'http://localhost:5173']

for (const origin of allowedOrigins) {
  if (origin === '*') {
    throw new Error('CORS_ORIGIN must not contain wildcard "*"')
  }
  try {
    new URL(origin)
  } catch {
    throw new Error(`CORS_ORIGIN contains invalid URL: "${origin}"`)
  }
}

app.use('*', cors({ origin: allowedOrigins }))

// ── Routes ─────────────────────────────────────────────────────────────────
app.route('/health', health)
app.route('/api/v1/todos', todosRouter)

// ── Global error handler ───────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code:
            err.status >= 500
              ? 'INTERNAL_ERROR'
              : err.status === 404
                ? 'NOT_FOUND'
                : err.status === 400
                  ? 'VALIDATION_ERROR'
                  : 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status
    )
  }

  console.error('Unhandled error:', err)
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500
  )
})

// ── Server ─────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3000

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)
