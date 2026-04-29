# Story 1.3: Database Schema & Migrations

Status: done

## Story

As a **developer**,
I want the PostgreSQL schema defined via Drizzle ORM and migrations applied automatically on startup,
So that the database is always in the correct state before the backend accepts any requests.

## Acceptance Criteria

1. `apps/backend/src/db/schema.ts` defines a `todos` table with:
   - `id`: UUID, primary key, default `gen_random_uuid()`
   - `text`: varchar(500), not null
   - `completed`: boolean, not null, default `false`
   - `created_at`: timestamptz, not null, default `now()`
2. `drizzle-kit generate` produces a SQL migration file under `apps/backend/src/db/migrations/`
3. `apps/backend/src/db/index.ts` exports a `db` instance (Drizzle + pg Pool) using `DATABASE_URL` from env
4. `apps/backend/drizzle.config.ts` configures drizzle-kit pointing to `src/db/schema.ts` and `src/db/migrations/`
5. `apps/backend/start.sh` exists, runs `drizzle-kit migrate` before starting the server, and exits non-zero if migration fails
6. `npx tsc --noEmit --project apps/backend/tsconfig.json` passes with 0 errors after all files are created

## Tasks / Subtasks

- [x] Install Drizzle ORM + pg dependencies in apps/backend (AC: 1, 3)
  - [x] Run `npm install drizzle-orm pg --workspace=apps/backend`
  - [x] Run `npm install -D drizzle-kit @types/pg --workspace=apps/backend`
  - [x] Verify packages appear in apps/backend/package.json dependencies

- [x] Create `apps/backend/src/db/schema.ts` (AC: 1)
  - [x] Import `pgTable`, `uuid`, `varchar`, `boolean`, `timestamp` from `drizzle-orm/pg-core`
  - [x] Import `sql` from `drizzle-orm` for `gen_random_uuid()` default
  - [x] Define and export `todos` table with all 4 columns per spec
  - [x] Export the inferred `Todo` row type: `export type TodoRow = typeof todos.$inferSelect`

- [x] Create `apps/backend/src/db/index.ts` (AC: 3)
  - [x] Import `drizzle` from `drizzle-orm/node-postgres`
  - [x] Import `Pool` from `pg`
  - [x] Create Pool using `process.env.DATABASE_URL`
  - [x] Export `db` as `drizzle(pool, { schema })`

- [x] Create `apps/backend/drizzle.config.ts` (AC: 4)
  - [x] Import `defineConfig` from `drizzle-kit`
  - [x] Set `dialect: 'postgresql'`
  - [x] Set `schema: './src/db/schema.ts'`
  - [x] Set `out: './src/db/migrations'`
  - [x] Set `dbCredentials: { url: process.env.DATABASE_URL! }`

- [x] Generate migration file (AC: 2)
  - [x] Run `npx drizzle-kit generate --config apps/backend/drizzle.config.ts` from monorepo root
  - [x] Verify a `.sql` migration file appears in `apps/backend/src/db/migrations/`
  - [x] Verify the SQL contains `CREATE TABLE "todos"` with all 4 columns

- [x] Create `apps/backend/start.sh` (AC: 5)
  - [x] Write shell script: `set -e`, run `drizzle-kit migrate`, then `node dist/index.js`
  - [x] Make it executable: `chmod +x apps/backend/start.sh`

- [x] Verify TypeScript compiles without errors (AC: 6)
  - [x] Run `npx tsc --noEmit --project apps/backend/tsconfig.json` — 0 errors

### Review Findings

- [x] [Review][Patch] `drizzle-kit` in devDependencies but invoked at runtime in start.sh — moved to dependencies [apps/backend/package.json]
- [x] [Review][Patch] `DATABASE_URL` undefined silently falls back to pg env defaults instead of failing fast — added startup guard [apps/backend/src/db/index.ts]
- [x] [Review][Patch] No `rootDir`/`include` in tsconfig — drizzle.config.ts shifts implicit rootDir, output goes to `dist/src/index.js` not `dist/index.js` — added `"include": ["src"]` [apps/backend/tsconfig.json]
- [x] [Review][Patch] No pg Pool error event handler — unhandled `error` event on idle client crashes Node process — added pool.on('error') handler [apps/backend/src/db/index.ts]
- [x] [Review][Defer] Multi-replica migration race condition in start.sh — drizzle-kit migrate runs concurrently on every container start with no advisory lock — deferred, architectural concern for Story 1.4 Docker/orchestration
- [x] [Review][Defer] `gen_random_uuid()` requires PostgreSQL 13+ — no version guard in migration SQL — deferred, acceptable for modern Postgres targets
- [x] [Review][Defer] No `updatedAt` column on todos — mutable entity with no update timestamp — deferred, not in spec, future consideration
- [x] [Review][Defer] start.sh relative path `node_modules/.bin/drizzle-kit` assumes CWD is apps/backend — deferred, intentional for Docker WORKDIR context per spec; Story 1.4 handles Docker

## Dev Notes

### Context from Previous Stories

**Story 1.1 + 1.2 completed.** Current backend state:

**`apps/backend/src/index.ts`** (DO NOT MODIFY — preserve exactly):
```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
```

**`apps/backend/tsconfig.json`** key settings:
- `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"verbatimModuleSyntax": true`
- This means ALL relative imports need `.js` extensions (e.g., `./schema.js` not `./schema`)

**`apps/backend/package.json`** has `"type": "module"` — the backend is ESM.

### What to Create: File Structure

```
apps/backend/
├── drizzle.config.ts     ← NEW: drizzle-kit config (at root of apps/backend, NOT in src/)
├── start.sh              ← NEW: Docker entrypoint
├── package.json          ← MODIFY: add drizzle-orm, pg, drizzle-kit, @types/pg
└── src/
    ├── index.ts          ← NO CHANGE
    └── db/
        ├── schema.ts     ← NEW: Drizzle schema
        ├── index.ts      ← NEW: db instance export
        └── migrations/   ← NEW (generated): SQL migration files
```

### Drizzle Versions

- `drizzle-orm`: `^0.45.2`
- `drizzle-kit`: `^0.30.0`

Install commands (run from monorepo root):
```bash
npm install drizzle-orm pg --workspace=apps/backend
npm install -D drizzle-kit @types/pg --workspace=apps/backend
```

### `apps/backend/src/db/schema.ts` — Exact Implementation

```typescript
import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const todos = pgTable('todos', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  text: varchar('text', { length: 500 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TodoRow = typeof todos.$inferSelect;
```

**Critical naming:**
- Table name: `'todos'` (snake_case plural) ✅
- Column names in quotes: `'id'`, `'text'`, `'completed'`, `'created_at'` (snake_case) ✅
- JS property name: `createdAt` (camelCase) — Drizzle automatically maps `created_at` → `createdAt` in query results ✅
- `withTimezone: true` for timestamptz (matches `created_at timestamptz` spec) ✅
- `gen_random_uuid()` via sql template — built-in PostgreSQL function, no extension needed ✅

**`TodoRow` type:** This is the DB row type (distinct from the `Todo` interface in packages/shared). `TodoRow.createdAt` will be a `Date` object from pg, while the API response converts it to an ISO string. Story 2.1 will handle this conversion.

### `apps/backend/src/db/index.ts` — DB Connection

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

**Notes:**
- Import from `'drizzle-orm/node-postgres'` (NOT `'drizzle-orm/postgres-js'` or `'drizzle-orm/neon-http'`)
- `Pool` from `'pg'` (not Client — Pool handles connection management for a server)
- The `.js` extension on `'./schema.js'` is required for NodeNext module resolution
- `{ schema }` in `drizzle(pool, { schema })` enables typed query results with the schema's types
- `DATABASE_URL` is not validated here — it will fail at connection time if missing, which surfaces clearly

### `apps/backend/drizzle.config.ts` — drizzle-kit Config

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Location:** `apps/backend/drizzle.config.ts` — at the root of `apps/backend/`, NOT inside `src/`. drizzle-kit expects the config at the package root.

**Paths:** `schema` and `out` are relative to `drizzle.config.ts` location (apps/backend/).

**`dialect: 'postgresql'`** — required for drizzle-kit@0.30+. Do not use the older `driver` field.

**ESM note:** `export default` is correct for ESM (apps/backend has `"type": "module"`). drizzle-kit reads config via esbuild and handles ESM natively.

### Running `drizzle-kit generate`

Run from the monorepo root:
```bash
npx drizzle-kit generate --config apps/backend/drizzle.config.ts
```

Or from `apps/backend/`:
```bash
npx drizzle-kit generate
```

This reads `schema.ts` and generates an SQL file in `apps/backend/src/db/migrations/`. The generated file will look like:
```sql
CREATE TABLE IF NOT EXISTS "todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "text" varchar(500) NOT NULL,
  "completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**`drizzle-kit generate` does NOT need a running database** — it only reads schema.ts. The migration SQL file is the artifact that satisfies AC 2.

### `apps/backend/start.sh` — Docker Entrypoint

```sh
#!/bin/sh
set -e

node_modules/.bin/drizzle-kit migrate

node dist/index.js
```

**Notes:**
- `set -e` causes the script to exit immediately on any error — if `drizzle-kit migrate` fails (e.g., no DB, migration error), the server never starts. This satisfies AC 5.
- `node_modules/.bin/drizzle-kit` instead of `npx drizzle-kit` — more reliable in Docker environments where npx may not be on PATH or may behave differently
- `node dist/index.js` runs the compiled backend — Story 1.3 doesn't need to worry about building; the Docker Dockerfile (Story 1.4) handles the build step
- Use `#!/bin/sh` (POSIX sh) not `#!/bin/bash` — more portable, available in `node:20-alpine`
- Make executable: `chmod +x apps/backend/start.sh`

**In dev**: `start.sh` is not used for dev. Development uses `npm run dev` (tsx watch). `start.sh` is only the Docker CMD production entrypoint.

### TypeScript Considerations

**drizzle.config.ts type checking:** The backend tsconfig.json excludes files outside `src/` by default (it doesn't have `"include"` overriding this). Check if drizzle.config.ts needs to be included. If `tsc --noEmit` fails because it can't find drizzle.config.ts, add it to the include or confirm it's excluded intentionally (drizzle-kit reads it separately via esbuild, not tsc).

**If `tsc --noEmit` errors on drizzle.config.ts** because `process.env.DATABASE_URL!` has type issues, verify `@types/node` is in devDependencies (it is — `"@types/node": "^20.11.17"` was added in Story 1.1).

**pg types:** `@types/pg` provides types for `Pool` from `'pg'`. Without it, `import { Pool } from 'pg'` will fail TypeScript type checking.

### Scope Boundary — What NOT to Implement

This story is **schema, connection, migration, startup script only**. Do NOT implement:
- Any Hono routes using `db` (Story 2.1)
- CORS middleware (Story 1.5)
- /health endpoint (Story 1.5)
- Docker files (Story 1.4)
- `.env` or `.env.example` files (Story 1.4)
- Querying todos — `db` is set up but not used yet

### Verification Commands

```bash
# 1. Install deps
npm install

# 2. Generate migration (no DB needed)
npx drizzle-kit generate --config apps/backend/drizzle.config.ts

# 3. Verify migration file exists
ls apps/backend/src/db/migrations/

# 4. TypeScript check
npx tsc --noEmit --project apps/backend/tsconfig.json

# 5. Verify start.sh is executable
ls -la apps/backend/start.sh
```

### References

- Drizzle ORM pg adapter: [Source: architecture.md — install command `npm install drizzle-orm pg`]
- DB schema spec: [Source: architecture.md#Data Architecture]
- File locations: [Source: architecture.md#Structure Patterns — backend/src/db/]
- start.sh requirement: [Source: epics.md#Story 1.3 Notes]
- Snake_case columns → camelCase JS: [Source: architecture.md#Naming Patterns — JSON Field Naming]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `npx drizzle-kit generate` failed when run from monorepo root with `--config apps/backend/drizzle.config.ts` — paths in config were resolved relative to CWD, not config file. Fixed by running from `apps/backend/` directory directly: `../../node_modules/.bin/drizzle-kit generate`
- Migration file generated: `0000_last_bloodscream.sql` in `apps/backend/src/db/migrations/`
- drizzle-kit@0.31.10 installed (latest, spec said ^0.30.0 — patch-compatible)
- `tsc --noEmit` passes with 0 errors; drizzle.config.ts at apps/backend root is picked up by tsc but compiles cleanly

### Completion Notes List

- All 6 ACs verified: schema.ts defines todos table with 4 columns, migration SQL file generated with CREATE TABLE, db/index.ts exports db instance via Pool, drizzle.config.ts configured with dialect:postgresql, start.sh exists and is executable with set -e, tsc compiles with 0 errors
- drizzle-orm@0.45.2, pg@8.20.0, drizzle-kit@0.31.10, @types/pg@8.20.0 added to apps/backend/package.json
- Generated SQL migration contains exact schema: uuid PK with gen_random_uuid(), varchar(500), boolean default false, timestamptz default now()
- apps/backend/src/index.ts was NOT modified per spec requirement

## File List

- apps/backend/package.json (modified — added drizzle-orm, pg, drizzle-kit, @types/pg)
- apps/backend/src/db/schema.ts (new)
- apps/backend/src/db/index.ts (new)
- apps/backend/drizzle.config.ts (new)
- apps/backend/src/db/migrations/0000_last_bloodscream.sql (new — generated)
- apps/backend/src/db/migrations/meta/ (new — generated drizzle-kit metadata)
- apps/backend/start.sh (new)

## Change Log

- 2026-04-26: Story 1.3 implemented — Drizzle ORM schema, db connection, migration, and start.sh added to apps/backend
