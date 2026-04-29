---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-04-26'
inputDocuments: [prd.md]
workflowType: 'architecture'
project_name: 'Todo App'
user_name: 'Diogo'
date: '2026-04-26'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 26 FRs across 6 capability areas.

- *Task Management (FR1–5):* Core CRUD — create via text input (Enter key supported), toggle completion bidirectionally, delete. Simple, synchronous interactions from the user's perspective.
- *Task Display (FR6–8):* Single unified list, visual distinction between active/completed, consistent creation-time ordering. No filtering, grouping, or sorting controls in v1.
- *Data Persistence (FR9–15):* Full server-side persistence. REST API supports all four operations. Todo model: text description + completion status + creation timestamp. No client-only storage.
- *Application States (FR16–20):* Loading, empty, and error states are first-class requirements. Error state must be non-destructive (existing data preserved) and recoverable without reload.
- *Optimistic Updates (FR21–22):* UI reflects changes before server confirmation; must roll back cleanly on failure. This is the primary architectural complexity in an otherwise simple app.
- *Accessibility & Usability (FR23–26):* Keyboard navigable, semantic HTML, responsive (375px–1024px+).

**Non-Functional Requirements driving architecture:**
- Performance: ≤1s initial load, ≤200ms API, ≤100ms UI feedback (met by optimistic updates)
- Security: Server-side input validation, XSS prevention at the rendering layer
- Reliability: No silent data loss, durable persistence (survives restarts), graceful API degradation

**Scale & Complexity:**

- **Primary domain:** Full-stack web (SPA + REST API)
- **Complexity level:** Low — single user, no auth, no real-time, no multi-tenancy, no background jobs
- **Estimated architectural components:** ~5 frontend components, ~4 API routes, 1 DB table, 1 service/repository layer

### Technical Constraints & Dependencies

- Frontend and backend must be independently deployable
- No SSR or static generation — CSR only
- Modern evergreen browsers only
- Backend must use durable storage (database, not in-memory) to satisfy reliability NFR
- Architecture must not block adding authentication or multi-user support later — clean separation of concerns is a hard constraint

### Cross-Cutting Concerns Identified

- **Optimistic update + rollback pattern:** Touches state management, API layer, and error display — needs a consistent approach across all mutations
- **Error state management:** All three write operations (create, toggle, delete) must surface errors without destroying current list state
- **Data model extensibility:** Todo schema should accommodate future fields (owner ID, priority, deadline) without a destructive migration
- **Testability:** Jest/Vitest for unit/integration tests, Playwright for E2E — test infrastructure is a first-class design constraint, not an afterthought

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript monorepo — React SPA frontend + Hono REST API backend + PostgreSQL database, orchestrated via Docker Compose.

### Starter Options Considered

- **BHVR** (Bun + Hono + Vite + React monorepo) — closest match but uses Bun runtime; deviates from Node.js ecosystem implied by test tooling (Vitest/Playwright)
- **Separate scaffolds + npm workspaces** — scaffold frontend and backend independently, wire together as a monorepo; more control, better fit for explicit Docker requirements
- **NestJS + React** — too heavy; NestJS brings patterns the PRD explicitly doesn't need

### Selected Approach: Separate Scaffolds + npm Workspaces Monorepo

**Rationale:** Given explicit Docker multi-stage build requirements (separate Dockerfiles per service), a simple npm workspaces monorepo is the right fit. No Turborepo overhead for a two-service project of this scope.

**Initialization Commands:**

```bash
# Root monorepo
mkdir todo-app && cd todo-app
npm init -y

# Frontend
npm create vite@latest apps/frontend -- --template react-ts

# Backend
npm create hono@latest apps/backend -- --template nodejs

# Shared types package
mkdir -p packages/shared && cd packages/shared && npm init -y
```

**Architectural Decisions Established by This Setup:**

**Language & Runtime:**
- TypeScript throughout (frontend + backend)
- Node.js runtime for backend (Hono nodejs template)
- Vite 8 for frontend build tooling

**ORM & Database Access:**
- **Drizzle ORM** — SQL-first, ~90% smaller bundle than Prisma, excellent TypeScript inference. Added to the backend package.

```bash
cd apps/backend && npm install drizzle-orm pg && npm install -D drizzle-kit @types/pg
```

**Testing Framework:**
- Vitest for unit/integration tests (Vite-native, faster than Jest)
- Playwright for E2E tests

**Project Structure:**

```
todo-app/
├── apps/
│   ├── frontend/        # Vite + React + TypeScript
│   └── backend/         # Hono + TypeScript + Drizzle
├── packages/
│   └── shared/          # Shared TypeScript types (Todo interface, API response types)
├── docker-compose.yml
├── docker-compose.test.yml
└── package.json         # npm workspaces root
```

**Docker Architecture:**
- `apps/frontend/Dockerfile` — multi-stage: build (Node) → serve (nginx)
- `apps/backend/Dockerfile` — multi-stage: build (Node) → runtime (Node slim, non-root user)
- `docker-compose.yml` — orchestrates frontend, backend, postgres with health checks
- Environment profiles: `dev` (hot reload via volume mounts) / `test` (isolated DB)

**Note:** Project initialization using these commands is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database schema + Drizzle migration strategy — required before any backend story
- API error shape — required before frontend can handle errors consistently
- TanStack Query setup — required before any frontend data-fetching story

**Important Decisions (Shape Architecture):**
- Zod validation on API boundary
- Tailwind CSS v4 for styling

**Deferred Decisions (Post-MVP):**
- Authentication strategy (architecture must not block it, but no decision required now)
- Rate limiting (not needed for single-user v1)
- API documentation / OpenAPI spec (useful post-MVP)
- Monitoring and observability (Docker logs sufficient for v1)

### Data Architecture

- **ORM:** Drizzle ORM with `drizzle-kit generate` + `migrate` workflow
- **Migration strategy:** SQL migration files generated via `drizzle-kit generate`, applied at container startup via `drizzle-kit migrate` — production-safe, auditable
- **Todo schema:** `id` (UUID), `text` (varchar, max 500 chars), `completed` (boolean, default false), `created_at` (timestamp with timezone, default now)
- **Schema extensibility:** `user_id` column added in a future migration when auth is introduced — no destructive changes required
- **Validation:** Zod validates all API request bodies server-side; shared schema types live in `packages/shared`

### Authentication & Security

- **Auth:** None in v1. Hono middleware layer is the designated hook point — a future `authMiddleware` is registered before route handlers without restructuring the API
- **CORS:** Configured via Hono CORS middleware; `localhost:5173` allowed in dev, origin locked in production via environment variable
- **Input validation:** Zod parses and rejects malformed payloads before they reach business logic; oversized `text` fields rejected at schema level
- **XSS:** Frontend renders todo text as plain text (React default) — never as `dangerouslySetInnerHTML`

### API & Communication Patterns

- **Style:** REST, JSON only
- **Error shape (all errors):**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "text is required" } }
  ```
- **Success responses:** Data returned directly, no envelope wrapper
- **HTTP status codes:** 200 (GET/PATCH/DELETE success), 201 (POST success), 400 (validation), 404 (not found), 500 (server error)
- **API prefix:** All routes under `/api/v1/todos` — version prefix enables non-breaking future changes

### Frontend Architecture

- **State management:** TanStack Query for all server state — handles loading/error states, cache invalidation, and optimistic mutations (FR21–22) via `onMutate`/`onError`/`onSettled` hooks
- **Local UI state:** React `useState` only — no global state library needed
- **Routing:** None — single view, no React Router
- **Styling:** Tailwind CSS v4 — PostCSS-based, zero config with Vite
- **Component structure:** Flat — no deeply nested component trees for a list UI of this scope
- **Optimistic update pattern:** Consistent across all mutations — cancel in-flight queries → snapshot current cache → apply optimistic change → rollback to snapshot on error → invalidate on settle

### Infrastructure & Deployment

- **Orchestration:** Docker Compose with three services: `frontend` (nginx), `backend` (Node.js), `db` (PostgreSQL)
- **Frontend Dockerfile:** Multi-stage — `node:20-alpine` build stage → `nginx:alpine` serve stage
- **Backend Dockerfile:** Multi-stage — `node:20-alpine` build stage → `node:20-alpine` runtime with non-root user (`node`)
- **Health checks:** Backend exposes `GET /health` → 200; Compose `healthcheck` on all three services
- **Environment profiles:** `docker-compose.yml` (production-like), `docker-compose.override.yml` (dev — volume mounts for hot reload), `docker-compose.test.yml` (isolated test DB)
- **Environment variables:** `.env` file at repo root, never committed; `.env.example` committed as reference

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold + Docker Compose baseline
2. Database schema + Drizzle migrations
3. Hono API routes + Zod validation
4. TanStack Query setup + React components
5. Optimistic update wiring
6. E2E tests

**Cross-Component Dependencies:**
- Zod schemas in `packages/shared` consumed by both frontend and backend — must be scaffolded before either can be fully implemented
- Migration runs before backend starts — Docker Compose `depends_on` + `healthcheck` enforces this
- TanStack Query error handling depends on consistent API error shape being in place

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming (PostgreSQL / Drizzle):**
- Tables: `snake_case` plural — `todos` not `Todo` or `todo`
- Columns: `snake_case` — `created_at`, `user_id`, not `createdAt`
- Primary keys: `id` (UUID type via `gen_random_uuid()`)
- Foreign keys: `{referenced_table_singular}_id` — e.g. `user_id`
- Indexes: `idx_{table}_{column}` — e.g. `idx_todos_created_at`

**API Naming (Hono / REST):**
- Resources: plural kebab-case — `/api/v1/todos` not `/api/v1/todo`
- Route params: `:id` — e.g. `/api/v1/todos/:id`
- Query params: `camelCase` — `?sortBy=createdAt`
- HTTP verbs map strictly: GET=read, POST=create, PATCH=partial update, DELETE=remove

**Code Naming (TypeScript):**
- React components: `PascalCase` files and exports — `TodoItem.tsx`, `export function TodoItem`
- Hooks: `camelCase` prefixed with `use` — `useTodos.ts`, `useCreateTodo.ts`
- Utility functions: `camelCase` — `formatDate`, `parseError`
- Types/interfaces: `PascalCase` — `Todo`, `CreateTodoInput`, `ApiError`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_TODO_LENGTH`
- Backend route handlers: `camelCase` verb+noun — `getTodos`, `createTodo`

**JSON Field Naming:**
- All API request/response bodies: `camelCase` — `{ "createdAt": "...", "userId": "..." }`
- Drizzle maps `snake_case` DB columns → `camelCase` JS fields automatically

### Structure Patterns

**Monorepo Layout:**
```
apps/
  frontend/
    src/
      components/     # React components (PascalCase files)
      hooks/          # Custom hooks (camelCase, use- prefix)
      lib/            # API client, utilities
      types/          # Frontend-only types
    src/main.tsx
  backend/
    src/
      routes/         # Hono route handlers (one file per resource)
      middleware/     # Hono middleware (auth, cors, error)
      db/
        schema.ts     # Drizzle schema definitions
        migrations/   # Generated SQL migration files
        index.ts      # DB connection
      lib/            # Shared utilities
    src/index.ts      # App entry point
packages/
  shared/
    src/
      types.ts        # Shared Todo type, API response types
      schemas.ts      # Shared Zod schemas
```

**Test File Location:** Co-located with source — `TodoItem.test.tsx` next to `TodoItem.tsx`; backend integration tests in `src/routes/__tests__/`

**Playwright E2E:** `e2e/` directory at monorepo root

### Format Patterns

**API Response Formats:**
```typescript
// Success — data returned directly, no wrapper
GET /api/v1/todos → Todo[]
POST /api/v1/todos → Todo (201)
PATCH /api/v1/todos/:id → Todo
DELETE /api/v1/todos/:id → 204 (no body)

// Error — always this shape
{ "error": { "code": "VALIDATION_ERROR", "message": "text is required" } }
```

**Date Format:** ISO 8601 strings in all API responses — `"2026-04-26T10:00:00.000Z"` — never Unix timestamps

**Boolean:** `true`/`false` — never `1`/`0` or `"true"`/`"false"`

### Process Patterns

**Optimistic Update Pattern (applied consistently to ALL mutations):**
```typescript
// Every mutation follows this exact structure — no variation
useMutation({
  mutationFn: apiCall,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const snapshot = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], optimisticUpdate)
    return { snapshot }
  },
  onError: (_err, _input, context) => {
    queryClient.setQueryData(['todos'], context?.snapshot)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

**Error Handling:**
- Backend: all errors thrown as `HTTPException` from Hono — never `res.status(500).json(...)`
- Frontend: TanStack Query `error` state drives inline error UI — no global error boundary for API errors
- User-facing messages: friendly, non-technical — "Something went wrong, try again" not "500 Internal Server Error"

**Loading States:**
- Use TanStack Query `isPending` (not `isLoading`) for mutations
- Use `isLoading` for initial data fetch only
- Skeleton/spinner shown only during initial load — subsequent refreshes are silent

**Zod Validation Pattern (backend):**
```typescript
// Always validate at route handler entry, before any business logic
app.post('/api/v1/todos', async (c) => {
  const result = CreateTodoSchema.safeParse(await c.req.json())
  if (!result.success) {
    throw new HTTPException(400, { message: result.error.issues[0].message })
  }
  // proceed with result.data
})
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow snake_case for DB, camelCase for TS/JSON — no mixing
- Use the exact optimistic update pattern above for every mutation
- Return 204 with no body for DELETE — never `{ success: true }`
- Place shared types in `packages/shared/src/types.ts` — never duplicate type definitions across frontend/backend
- Run `drizzle-kit generate` after any schema change — never edit migration files manually

**Anti-Patterns to Avoid:**
- ❌ `res.json({ success: true, data: todos })` — no success envelope
- ❌ `catch (e) { console.error(e) }` — always surface errors to the user
- ❌ `Date.now()` in API responses — always ISO strings
- ❌ Defining `Todo` type in both frontend and backend — single source of truth in `packages/shared`

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-app/
├── .env.example                  # Committed reference — DATABASE_URL, PORT, CORS_ORIGIN
├── .gitignore
├── package.json                  # npm workspaces root
├── docker-compose.yml            # Production-like orchestration
├── docker-compose.override.yml   # Dev overrides (volume mounts, hot reload)
├── docker-compose.test.yml       # Isolated test DB
├── e2e/                          # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── todo-create.spec.ts       # Journey 1: first use / create
│   ├── todo-complete.spec.ts     # Journey 1–2: toggle completion
│   ├── todo-delete.spec.ts       # Journey 1: delete
│   ├── empty-state.spec.ts       # Journey 4: empty state
│   └── error-handling.spec.ts    # Journey 3: error recovery
│
├── apps/
│   ├── frontend/
│   │   ├── Dockerfile            # Multi-stage: node:20-alpine build → nginx:alpine serve
│   │   ├── nginx.conf            # nginx config for SPA (all routes → index.html)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx          # App entry — QueryClientProvider + App
│   │       ├── App.tsx           # Root component — layout + TodoPage
│   │       ├── components/
│   │       │   ├── TodoPage.tsx          # FR6: single view, composes all below
│   │       │   ├── TodoInput.tsx         # FR1–2: text input + Enter/submit
│   │       │   ├── TodoList.tsx          # FR6–8: renders list, handles ordering
│   │       │   ├── TodoItem.tsx          # FR3–5,7: item row, toggle, delete, visual distinction
│   │       │   ├── TodoItem.test.tsx     # Unit tests
│   │       │   ├── EmptyState.tsx        # FR17: empty state UI
│   │       │   ├── LoadingState.tsx      # FR16: loading skeleton
│   │       │   └── ErrorBanner.tsx       # FR18–20: inline error + retry
│   │       ├── hooks/
│   │       │   ├── useTodos.ts           # FR10: GET /api/v1/todos via TanStack Query
│   │       │   ├── useCreateTodo.ts      # FR1,12,21–22: optimistic create mutation
│   │       │   ├── useToggleTodo.ts      # FR3–4,14,21–22: optimistic toggle mutation
│   │       │   └── useDeleteTodo.ts      # FR5,15,21–22: optimistic delete mutation
│   │       ├── lib/
│   │       │   ├── api.ts               # Typed fetch wrapper — all API calls live here
│   │       │   └── queryClient.ts       # TanStack QueryClient singleton config
│   │       └── types/                   # Frontend-only types (if any)
│   │
│   └── backend/
│       ├── Dockerfile            # Multi-stage: node:20-alpine build → runtime, non-root user
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # App entry — Hono app, middleware, routes, listen
│           ├── routes/
│           │   ├── todos.ts      # FR12–15: GET/POST/PATCH/DELETE /api/v1/todos
│           │   ├── todos.test.ts # Integration tests for all todo routes
│           │   └── health.ts     # GET /health → 200 (Docker healthcheck)
│           ├── middleware/
│           │   ├── cors.ts       # Hono CORS — origin from env
│           │   └── error.ts      # Global HTTPException → JSON error shape
│           ├── db/
│           │   ├── schema.ts     # FR11: Drizzle todos table definition
│           │   ├── index.ts      # DB connection (pg Pool + Drizzle instance)
│           │   └── migrations/   # Generated by drizzle-kit — never edited manually
│           │       └── 0000_create_todos.sql
│           └── lib/
│               └── validate.ts   # Zod parse helper — throws HTTPException on failure
│
└── packages/
    └── shared/
        ├── package.json
        └── src/
            ├── types.ts          # Todo, CreateTodoInput, UpdateTodoInput, ApiError
            └── schemas.ts        # Zod schemas — CreateTodoSchema, UpdateTodoSchema
```

### Architectural Boundaries

**API Boundaries:**
- All client→server communication through `apps/frontend/src/lib/api.ts` — no raw `fetch` calls in components or hooks
- All routes mounted under `/api/v1/` — no exceptions
- `GET /health` is the only route outside `/api/v1/`
- Backend enforces CORS — frontend never sets origin headers

**Component Boundaries:**
- Components own only render logic and local UI state (`useState`)
- Data fetching and mutation live exclusively in `hooks/` — components receive data as props or call hook-returned functions
- `ErrorBanner` is the only component that handles API error display — not individual items

**Data Boundaries:**
- `packages/shared` is the single source of truth for `Todo` type and Zod schemas
- Frontend imports types from `@todo-app/shared` — never redefines them
- Drizzle schema in `db/schema.ts` maps directly to shared `Todo` type — no separate DTO layer needed at this scale

### Requirements to Structure Mapping

| FR Category | Frontend | Backend |
|---|---|---|
| Task Management (FR1–5) | `TodoInput`, `TodoItem`, `useCreate/Toggle/Delete` hooks | `routes/todos.ts` POST/PATCH/DELETE |
| Task Display (FR6–8) | `TodoList`, `TodoItem` | `routes/todos.ts` GET |
| Data Persistence (FR9–15) | `lib/api.ts`, `useTodos` | `db/schema.ts`, `db/migrations/`, `routes/todos.ts` |
| Application States (FR16–20) | `LoadingState`, `EmptyState`, `ErrorBanner` | `routes/todos.ts` error responses |
| Optimistic Updates (FR21–22) | `useCreate/Toggle/Delete` hooks (`onMutate`/`onError`/`onSettled`) | N/A |
| Accessibility (FR23–26) | All components (semantic HTML, Tailwind responsive) | N/A |

### Data Flow

```
User action
  → Component calls hook function
    → Hook runs TanStack mutation (optimistic update applied to cache)
      → lib/api.ts sends fetch to Hono backend
        → middleware/cors.ts → middleware/error.ts → routes/todos.ts
          → Zod validation → Drizzle query → PostgreSQL
        → Response JSON
      → TanStack cache invalidated on settle / rolled back on error
    → Component re-renders from updated cache
```

### Development Workflow

- `docker-compose up` (with override) — all three services with hot reload
- `npm run test` at root — Vitest runs across both apps
- `npm run e2e` at root — Playwright against running stack
- `drizzle-kit generate` in `apps/backend` — after any schema change
- `drizzle-kit migrate` runs automatically on backend container start

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and well-tested together. TypeScript flows end-to-end with no runtime boundary — shared package eliminates the frontend/backend type gap. Vite 8 + React + TanStack Query + Vitest is a native combination with no version conflicts. Hono + Node.js + Drizzle + PostgreSQL + Zod is a clean, well-documented stack. Tailwind v4 + Vite PostCSS integration is supported out of the box.

**Pattern Consistency:**
snake_case → camelCase mapping is unidirectional (DB → TS) and handled by Drizzle automatically. All three mutations (create, toggle, delete) use the identical optimistic update template — no variation. Error handling is centralized: `HTTPException` on backend, TanStack `error` state on frontend.

**Structure Alignment:**
npm workspaces correctly scopes `packages/shared` as `@todo-app/shared` importable by both apps. Separate Dockerfiles per service match the independent deployability requirement. Co-located test files align with Vitest's default discovery pattern.

### Requirements Coverage Validation ✅

| FR Category | Coverage | Notes |
|---|---|---|
| FR1–5 Task Management | ✅ | 3 mutation hooks + POST/PATCH/DELETE routes |
| FR6–8 Task Display | ✅ | TodoList + TodoItem + `ORDER BY created_at ASC` |
| FR9–15 Data Persistence | ✅ | Drizzle schema + migrations + all 4 API routes |
| FR16–20 App States | ✅ | LoadingState + EmptyState + ErrorBanner with retry |
| FR21–22 Optimistic Updates | ✅ | Rollback pattern mandated for all mutations |
| FR23–26 Accessibility | ✅ | Semantic HTML + Tailwind responsive at component level |

**NFR Coverage:**
- Performance ≤1s load: Vite production build + nginx static serving ✅
- API ≤200ms: Single-table Drizzle query, no joins, no N+1 ✅
- UI ≤100ms: Optimistic updates bypass API latency entirely ✅
- Security: Zod server-side validation + plain text rendering ✅
- Reliability: PostgreSQL durability + rollback pattern + error states ✅

### Gap Analysis Results

**Minor gaps (non-blocking):**

1. **Backend startup script** — `drizzle-kit migrate` needs to run before the Hono server starts. Add a `start.sh` entry script to the backend container: `npx drizzle-kit migrate && node dist/index.js`. Set as Dockerfile `CMD`.

2. **Postgres health check command** — Docker Compose `db` service healthcheck should use `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` for `depends_on` to work correctly.

3. **Code style tooling** — ESLint + Prettier not yet specified. Add to root devDependencies with a shared config to prevent AI agents making inconsistent style choices.

### Architecture Completeness Checklist

- [x] Project context analyzed — scale, constraints, cross-cutting concerns
- [x] Critical decisions documented with verified versions
- [x] Technology stack fully specified (Vite 8, Hono 4.12, Drizzle, TanStack Query, Tailwind v4)
- [x] Naming conventions established (DB, API, code, JSON)
- [x] Optimistic update pattern specified exactly — no agent variation possible
- [x] Complete directory structure with specific filenames
- [x] FR-to-file mapping complete
- [x] Integration points mapped (`lib/api.ts` as single fetch boundary)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**
**Confidence Level: High**

**Key Strengths:**
- Single source of truth for types in `packages/shared` eliminates the most common full-stack consistency bug
- Optimistic update pattern specified exactly — no AI agent variation possible
- Every FR maps to a specific file — unambiguous placement guidance

**First Implementation Priority:** Monorepo scaffold + Docker Compose baseline, then backend startup script (`start.sh`) + postgres healthcheck as part of that story.
