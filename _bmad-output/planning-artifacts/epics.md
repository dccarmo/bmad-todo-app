---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [prd.md, architecture.md]
---

# Todo App - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Todo App, decomposing requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can create a new todo by entering a text description and submitting it
FR2: User can submit a new todo using the Enter key in the input field
FR3: User can mark an active todo as complete
FR4: User can mark a completed todo as active (toggle)
FR5: User can delete a todo
FR6: User can view all todos in a single, unified list
FR7: User can visually distinguish active todos from completed ones at a glance
FR8: Todos are displayed in a consistent order (by creation time)
FR9: Todos are persisted server-side and survive browser refresh and new sessions
FR10: Todos are loaded from the server when the application opens
FR11: Each todo stores a text description, completion status, and creation timestamp
FR12: The API supports creating a todo
FR13: The API supports retrieving all todos
FR14: The API supports updating a todo's completion status
FR15: The API supports deleting a todo
FR16: User sees a loading indicator while todos are being fetched from the server
FR17: User sees a meaningful empty state when no todos exist
FR18: User sees a clear, non-alarming error state when an API operation fails
FR19: Existing todos remain visible when a non-destructive operation fails
FR20: User can retry after a failed operation without reloading the page
FR21: The UI reflects task state changes immediately, before server confirmation
FR22: The UI reverts to the previous state if the server rejects an operation
FR23: All core actions are operable via keyboard
FR24: Interactive elements use semantic HTML (buttons, inputs, lists)
FR25: The layout is fully functional on desktop (≥1024px) and mobile (≥375px)
FR26: Touch targets on mobile are large enough for comfortable interaction

### NonFunctional Requirements

NFR1: Initial page load to interactive: ≤1 second on a standard broadband connection
NFR2: API response time for all CRUD operations: ≤200ms under normal conditions
NFR3: UI feedback on user actions (add, complete, delete) within 100ms — satisfied by optimistic updates independent of API latency
NFR4: Frontend must not load unnecessary dependencies
NFR5: API inputs validated server-side; malformed or oversized payloads rejected with appropriate error codes
NFR6: No sensitive user data stored in v1 (no passwords, no PII beyond todo text)
NFR7: XSS risk managed by the frontend rendering layer — todo text is not rendered as HTML server-side
NFR8: No silent data loss — failed write operations must inform the user and preserve prior state
NFR9: Persisted data survives server restarts (durable storage, not in-memory)
NFR10: API unavailability handled gracefully — no crashes, no blank screens

### Additional Requirements

- Monorepo: npm workspaces with apps/frontend (Vite + React + TypeScript), apps/backend (Hono + Node.js + TypeScript), packages/shared (Zod schemas + shared types)
- Starter scaffold: `npm create vite@latest apps/frontend -- --template react-ts` + `npm create hono@latest apps/backend -- --template nodejs`
- Database: PostgreSQL with Drizzle ORM; migrations via drizzle-kit generate + migrate
- Todo schema: id (UUID, gen_random_uuid()), text (varchar 500), completed (boolean, default false), created_at (timestamptz, default now)
- Backend startup: start.sh runs `drizzle-kit migrate` before server process — ensures DB is migrated before accepting requests
- Docker: multi-stage Dockerfiles — frontend (node:20-alpine build → nginx:alpine serve), backend (node:20-alpine build → node:20-alpine runtime, non-root user)
- Docker Compose: three services (frontend, backend, db); db healthcheck uses pg_isready; docker-compose.override.yml for dev hot reload; docker-compose.test.yml for isolated test DB
- Environment: .env (not committed) + .env.example (committed); CORS_ORIGIN, DATABASE_URL, PORT as minimum vars
- Code quality: ESLint + Prettier configured at monorepo root
- API: all routes under /api/v1/todos; GET /health for Docker healthcheck
- Shared types: packages/shared/src/types.ts (Todo, CreateTodoInput, ApiError) and schemas.ts (Zod schemas)
- Testing: Vitest for unit/integration (co-located); Playwright for E2E in e2e/ at monorepo root
- API error shape: `{ "error": { "code": "...", "message": "..." } }` — consistent across all errors
- DELETE returns 204 no body; POST returns 201; GET/PATCH return 200

### UX Design Requirements

N/A — No UX design document provided.

### FR Coverage Map

FR1: Epic 3 — User creates a new todo via text input
FR2: Epic 3 — Enter key submits new todo
FR3: Epic 3 — Mark active todo as complete
FR4: Epic 3 — Toggle completed todo back to active
FR5: Epic 3 — Delete a todo
FR6: Epic 2 — View all todos in a single unified list
FR7: Epic 2 — Visual distinction between active and completed todos
FR8: Epic 2 — Todos ordered consistently by creation time
FR9: Epic 2 — Server-side persistence survives refresh and new sessions
FR10: Epic 2 — Todos loaded from server on app open
FR11: Epic 2 — Todo schema: text, completed, created_at
FR12: Epic 3 — API supports creating a todo (POST /api/v1/todos)
FR13: Epic 2 — API supports retrieving all todos (GET /api/v1/todos)
FR14: Epic 3 — API supports updating a todo's completion status (PATCH)
FR15: Epic 3 — API supports deleting a todo (DELETE)
FR16: Epic 2 — Loading indicator while todos are being fetched
FR17: Epic 2 — Meaningful empty state when no todos exist
FR18: Epic 2 (GET errors) + Epic 3 (mutation errors) — Non-alarming error state on API failure
FR19: Epic 2 — Existing todos remain visible when a non-destructive operation fails
FR20: Epic 3 — User can retry after a failed operation without page reload
FR21: Epic 3 — UI reflects state changes immediately (optimistic updates)
FR22: Epic 3 — UI reverts to previous state if server rejects an operation
FR23: Epic 2 — All core actions operable via keyboard
FR24: Epic 2 — Semantic HTML for interactive elements
FR25: Epic 2 — Layout fully functional on desktop (≥1024px) and mobile (≥375px)
FR26: Epic 2 — Touch targets sized for comfortable mobile interaction

## Epic List

### Epic 1: Project Foundation & Infrastructure
Set up the complete monorepo, tooling, Docker environment, and shared packages so that every subsequent epic has a consistent, runnable foundation to build on.
**FRs covered:** N/A (infrastructure; enables all FR coverage in Epics 2–4)
**Additional Requirements covered:** All 13 architecture additional requirements

### Epic 2: Todo List View
Users can open the app and immediately see their full todo list — with loading, empty, and error states — on both desktop and mobile, using keyboard and semantic HTML, with data persisted server-side.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR13, FR16, FR17, FR18 (GET), FR19, FR23, FR24, FR25, FR26
**NFRs covered:** NFR1, NFR2, NFR4, NFR6, NFR9, NFR10

### Epic 3: Create, Complete & Delete Todos
Users can create new todos, toggle completion, and delete todos — with optimistic UI updates, server-side validation, and graceful error recovery — completing the full task lifecycle.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR12, FR14, FR15, FR18 (mutations), FR20, FR21, FR22
**NFRs covered:** NFR2, NFR3, NFR5, NFR7, NFR8, NFR10

### Epic 4: End-to-End Test Coverage
Playwright E2E tests cover all four user journeys (first use, returning user, error recovery, empty state), giving the team confidence that the full stack works correctly as an integrated system.
**FRs covered:** All FRs (verified through journey-based E2E specs)

---

## Epic 1: Project Foundation & Infrastructure

Set up the complete monorepo, tooling, Docker environment, and shared packages so that every subsequent epic has a consistent, runnable foundation to build on.

### Story 1.1: Monorepo & Project Scaffold

As a **developer**,
I want the monorepo structure, workspace configuration, and both application starters in place,
So that I can begin building features with a consistent toolchain and no manual wiring of packages.

**Acceptance Criteria:**

**Given** the repository is freshly cloned
**When** I run `npm install` at the root
**Then** all workspace dependencies install without errors and the `node_modules` hoisting is correct (apps can import from packages/shared)

**Given** the monorepo is installed
**When** I run `npm run dev --workspace=apps/frontend`
**Then** Vite starts and serves the default React + TypeScript starter at `localhost:5173` with no type errors

**Given** the monorepo is installed
**When** I run `npm run dev --workspace=apps/backend`
**Then** Hono starts and responds to `GET /` at `localhost:3000` (or configured PORT) with no type errors

**Given** the monorepo structure
**Then** the root `package.json` declares `workspaces: ["apps/*", "packages/*"]`
**And** `apps/frontend`, `apps/backend`, and `packages/shared` each have their own `package.json`
**And** `packages/shared` is listed as a dependency in both `apps/frontend` and `apps/backend`
**And** TypeScript `tsconfig.json` exists at root level with `paths` or project references wiring shared correctly

**Notes:**
- Use `npm create vite@latest apps/frontend -- --template react-ts` for the frontend scaffold
- Use `npm create hono@latest apps/backend -- --template nodejs` for the backend scaffold
- packages/shared should start as a minimal stub (empty index.ts is fine — filled in Story 1.2)
- Do not add any runtime feature code in this story

### Story 1.2: Shared Types & Validation Schemas

As a **developer**,
I want the shared TypeScript types and Zod validation schemas in `packages/shared`,
So that both the frontend and backend use the same data contracts with no duplication.

**Acceptance Criteria:**

**Given** the monorepo is set up (Story 1.1 complete)
**When** I inspect `packages/shared/src/types.ts`
**Then** it exports the `Todo` interface (`id: string`, `text: string`, `completed: boolean`, `createdAt: string`)
**And** it exports `CreateTodoInput` (`{ text: string }`)
**And** it exports `ApiError` (`{ error: { code: string; message: string } }`)

**Given** `packages/shared/src/schemas.ts` exists
**Then** it exports a Zod schema `createTodoSchema` that validates `CreateTodoInput` — `text` is a non-empty string, max 500 characters
**And** it exports a `todoSchema` that validates the full `Todo` shape

**Given** both apps list `packages/shared` as a dependency
**When** I import `{ Todo }` from `@todo-app/shared` in `apps/frontend`
**Then** TypeScript resolves the type without errors

**When** I import `{ createTodoSchema }` from `@todo-app/shared` in `apps/backend`
**Then** TypeScript resolves the schema without errors and `createTodoSchema.parse({ text: "hello" })` succeeds

**Notes:**
- Package name in `packages/shared/package.json` should be `@todo-app/shared`
- `createdAt` is camelCase in the shared type (matches JSON API response); DB column is `created_at` (Drizzle maps it)
- No feature code in this story — types and schemas only

### Story 1.3: Database Schema & Migrations

As a **developer**,
I want the PostgreSQL schema defined via Drizzle ORM and migrations applied automatically on startup,
So that the database is always in the correct state before the backend accepts any requests.

**Acceptance Criteria:**

**Given** Drizzle ORM and drizzle-kit are installed in `apps/backend`
**When** I inspect `apps/backend/src/db/schema.ts`
**Then** it defines a `todos` table with:
- `id`: UUID, primary key, default `gen_random_uuid()`
- `text`: varchar(500), not null
- `completed`: boolean, not null, default `false`
- `created_at`: timestamptz, not null, default `now()`

**Given** `drizzle-kit generate` has been run
**Then** a migration file exists under `apps/backend/src/db/migrations/`

**Given** a running PostgreSQL instance (via DATABASE_URL)
**When** `start.sh` is executed
**Then** it runs `drizzle-kit migrate` first
**And** only starts the Hono server process after the migration succeeds
**And** if migration fails, the server does not start (non-zero exit)

**Given** the backend is running with a valid DATABASE_URL
**When** I inspect the database
**Then** the `todos` table exists with the correct schema

**Notes:**
- `apps/backend/src/db/index.ts` exports the Drizzle db instance using DATABASE_URL from env
- `start.sh` is at the backend app root; it is the Docker CMD entrypoint
- drizzle.config.ts must point to `src/db/schema.ts` and `src/db/migrations/`

### Story 1.4: Docker & Environment Setup

As a **developer**,
I want the full stack runnable via `docker-compose up` with proper health checks and environment configuration,
So that any team member can run the complete application locally with a single command.

**Acceptance Criteria:**

**Given** Docker and Docker Compose are installed
**When** I run `docker-compose up` at the monorepo root
**Then** three services start: `db` (PostgreSQL), `backend` (Hono), `frontend` (nginx)
**And** the `db` service health check uses `pg_isready` and the backend waits for it to be healthy before starting
**And** the frontend is accessible at `http://localhost:80` (or configured port)
**And** the backend is accessible at `http://localhost:3000` (or configured PORT)

**Given** `docker-compose.override.yml` exists
**When** used in development
**Then** it mounts source volumes for hot reload on both frontend and backend

**Given** `docker-compose.test.yml` exists
**When** used for testing
**Then** it starts an isolated `db` service on a separate port to avoid colliding with dev DB

**Given** `.env.example` is committed
**Then** it documents the minimum required variables: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`
**And** `.env` is listed in `.gitignore` and never committed

**Given** the backend Dockerfile
**Then** it uses a multi-stage build: `node:20-alpine` for build, `node:20-alpine` for runtime
**And** the runtime stage runs as a non-root user

**Given** the frontend Dockerfile
**Then** it uses a multi-stage build: `node:20-alpine` for build, `nginx:alpine` for serving
**And** the nginx config serves the Vite build output at `/usr/share/nginx/html`

### Story 1.5: Code Quality Tooling & Health Endpoint

As a **developer**,
I want ESLint, Prettier, and a `/health` endpoint configured,
So that code style is enforced consistently and Docker can verify the backend is alive.

**Acceptance Criteria:**

**Given** ESLint and Prettier are configured at the monorepo root
**When** I run `npm run lint` from root
**Then** ESLint runs across all workspaces with no errors on the scaffold code

**When** I run `npm run format` (or `prettier --check`)
**Then** Prettier reports all files formatted correctly

**Given** the backend is running
**When** I send `GET /health`
**Then** the response is `200 OK` with body `{ "status": "ok" }`
**And** this route is registered before any auth or database middleware that could cause it to fail

**Given** the `docker-compose.yml` backend service definition
**Then** the healthcheck calls `GET /health` and marks the container healthy on `200`

**Notes:**
- ESLint config should cover TypeScript across all apps and packages
- Prettier config at root applies to all workspaces
- The `/health` route must not depend on database connectivity — it is a liveness check only

---

## Epic 2: Todo List View

Users can open the app and immediately see their full todo list — with loading, empty, and error states — on both desktop and mobile, using keyboard and semantic HTML, with data persisted server-side.

### Story 2.1: GET /api/v1/todos — Backend List Endpoint

As a **frontend developer**,
I want a `GET /api/v1/todos` endpoint that returns all todos ordered by creation time,
So that the frontend can display the persisted task list on load.

**Acceptance Criteria:**

**Given** the backend is running and the database has been migrated
**When** I send `GET /api/v1/todos`
**Then** the response is `200 OK`
**And** the body is a JSON array of todo objects, each with `id`, `text`, `completed`, and `createdAt` (camelCase)
**And** todos are ordered ascending by `created_at`

**Given** no todos exist in the database
**When** I send `GET /api/v1/todos`
**Then** the response is `200 OK` with an empty array `[]`

**Given** the backend encounters a database error during the query
**When** I send `GET /api/v1/todos`
**Then** the response is `500` with body `{ "error": { "code": "INTERNAL_ERROR", "message": "..." } }`

**Notes:**
- Route registered at `/api/v1/todos` per architecture conventions
- Response is a bare array — no success envelope
- Uses `@todo-app/shared` `Todo` type for response shaping
- NFR2: target ≤200ms response under normal conditions

### Story 2.2: Todo List UI — Fetch, Render & Visual States

As a **user**,
I want to open the app and immediately see my todo list with a loading indicator, then the actual list,
So that I know my tasks have been retrieved and I can orient myself immediately.

**Acceptance Criteria:**

**Given** the app loads and the API fetch is in progress
**When** the page renders
**Then** a loading indicator is visible (FR16)
**And** no todo items are shown during loading

**Given** the API returns a non-empty list of todos
**When** the fetch completes
**Then** all todos are displayed in a single list ordered by creation time (FR6, FR8)
**And** completed todos are visually distinct from active ones — e.g., strikethrough text and muted color (FR7)
**And** the loading indicator is no longer visible

**Given** the API returns an empty array
**When** the fetch completes
**Then** an empty state message is shown — e.g., "No tasks yet. Add one above." (FR17)
**And** no list items are rendered

**Given** todos are rendered
**Then** each todo is in a `<li>` within a `<ul>` (FR24)
**And** each todo shows its text description

**Notes:**
- Uses `useTodos` hook (wraps TanStack Query `useQuery`) for data fetching
- `queryClient.ts` sets up the TanStack Query client with sensible defaults (no unnecessary refetch)
- `api.ts` in `src/lib/` handles the fetch call and maps response to `Todo` type
- NFR1: page interactive within 1 second on broadband; NFR4: no unnecessary deps

### Story 2.3: Error State & Graceful Degradation (GET)

As a **user**,
I want to see a clear, non-alarming message when the app fails to load my todos,
So that I understand something went wrong without being alarmed, and I can retry.

**Acceptance Criteria:**

**Given** the `GET /api/v1/todos` request fails (network error or 5xx response)
**When** the fetch completes with an error
**Then** a non-alarming error banner or message is displayed — e.g., "Couldn't load your tasks. Try again." (FR18)
**And** the loading indicator is no longer visible
**And** the app does not crash or show a blank screen (NFR10)

**Given** an error state is shown
**When** the user clicks a "Retry" button
**Then** `GET /api/v1/todos` is re-fetched without a page reload (FR20)
**And** if the retry succeeds, the todo list renders and the error message disappears

**Given** the list was previously loaded and a subsequent background refetch fails
**Then** the previously loaded todos remain visible (FR19)
**And** a non-blocking error indicator appears (FR18)

**Notes:**
- TanStack Query's `isError` and `refetch` handle this naturally
- Error message must be non-alarming in tone — no "ERROR" or red alert language

### Story 2.4: Accessibility & Responsive Layout

As a **user on any device**,
I want the todo list to be fully usable via keyboard and to work correctly on desktop and mobile screens,
So that I can use the app comfortably regardless of how I access it.

**Acceptance Criteria:**

**Given** the todo list is rendered
**When** I navigate using only the keyboard (Tab, Enter, Space)
**Then** I can focus each todo item and any interactive controls within it (FR23)
**And** focus indicators are visible on all interactive elements

**Given** the todo list is rendered
**Then** the list uses `<ul>` and `<li>` elements (FR24)
**And** any buttons use `<button>` elements with descriptive `aria-label` attributes where the label is not visible text

**Given** a viewport of ≥1024px (desktop)
**Then** the layout displays correctly with no horizontal scroll and all content readable (FR25)

**Given** a viewport of 375px (mobile)
**Then** the layout adapts correctly with no horizontal scroll (FR25)
**And** interactive elements have a minimum touch target of 44×44px (FR26)

**Notes:**
- Tailwind CSS v4 handles responsive breakpoints via utility classes
- No formal WCAG audit required — semantic HTML and keyboard nav are the bar for v1
- Touch target size can be enforced via padding on `<button>` and `<li>` elements

---

## Epic 3: Create, Complete & Delete Todos

Users can create new todos, toggle completion, and delete todos — with optimistic UI updates, server-side validation, and graceful error recovery — completing the full task lifecycle.

### Story 3.1: Mutation API Endpoints (POST, PATCH, DELETE)

As a **frontend developer**,
I want `POST`, `PATCH`, and `DELETE` endpoints for todos,
So that the frontend can persist create, toggle, and delete operations to the database.

**Acceptance Criteria:**

**Given** a valid `POST /api/v1/todos` request with body `{ "text": "Buy groceries" }`
**When** the request is processed
**Then** the response is `201 Created` with the created `Todo` object (`id`, `text`, `completed: false`, `createdAt`)

**Given** a `POST /api/v1/todos` request with missing or empty `text`
**Then** the response is `400 Bad Request` with body `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` (NFR5)

**Given** a `POST /api/v1/todos` request with `text` exceeding 500 characters
**Then** the response is `400` with `VALIDATION_ERROR` (NFR5)

**Given** a valid `PATCH /api/v1/todos/:id` request with body `{ "completed": true }`
**When** the todo with that id exists
**Then** the response is `200 OK` with the updated `Todo` object

**Given** a `PATCH /api/v1/todos/:id` request for a non-existent id
**Then** the response is `404` with `{ "error": { "code": "NOT_FOUND", "message": "..." } }`

**Given** a valid `DELETE /api/v1/todos/:id` request
**When** the todo with that id exists
**Then** the response is `204 No Content` with no body

**Given** a `DELETE /api/v1/todos/:id` request for a non-existent id
**Then** the response is `404` with `NOT_FOUND` error

**Notes:**
- Validation uses `createTodoSchema` from `@todo-app/shared` (NFR5)
- `text` is not rendered as HTML server-side — stored as plain text (NFR7)
- All error responses follow the `{ "error": { "code": "...", "message": "..." } }` shape

### Story 3.2: Create Todo — UI & Optimistic Update

As a **user**,
I want to type a task and submit it to instantly see it appear in my list,
So that adding tasks feels immediate with no waiting.

**Acceptance Criteria:**

**Given** the todo input field is visible
**When** I type text and press Enter or click the submit button
**Then** the new todo appears in the list immediately — before the server responds (FR21, NFR3)
**And** the input field is cleared

**Given** the optimistic todo is added to the list
**When** the server confirms the creation
**Then** the optimistic entry is replaced with the server-returned todo (with its real `id`)

**Given** the server rejects the creation
**When** the API call fails
**Then** the optimistically added todo is removed from the list (FR22)
**And** an error message is shown (FR18)

**Given** I submit an empty input
**Then** no todo is created and no request is sent

**Given** the input field is rendered
**Then** it is an `<input>` element within a `<form>` (FR24)
**And** the submit is operable via keyboard — Enter key in the input submits (FR2, FR23)

**Notes:**
- Uses `useCreateTodo` hook wrapping TanStack Query `useMutation`
- Optimistic pattern: `onMutate` → snapshot + apply → `onError` → rollback → `onSettled` → invalidate
- Input max length enforced client-side at 500 chars to match server validation

### Story 3.3: Toggle Completion — UI & Optimistic Update

As a **user**,
I want to click a checkbox on any todo to instantly toggle its completion state,
So that marking tasks done or undone feels immediate.

**Acceptance Criteria:**

**Given** an active todo is rendered
**When** I click its checkbox
**Then** the todo immediately appears as completed — strikethrough text, muted color (FR3, FR7, FR21, NFR3)
**And** the `PATCH /api/v1/todos/:id` request is sent in the background

**Given** a completed todo is rendered
**When** I click its checkbox
**Then** the todo immediately appears as active — normal styling (FR4, FR21, NFR3)

**Given** the toggle is confirmed by the server
**Then** the todo state matches the server response

**Given** the server rejects the toggle
**Then** the todo reverts to its previous completion state (FR22)
**And** an error message is shown (FR18)

**Given** the checkbox is rendered
**Then** it is an `<input type="checkbox">` with an associated label or `aria-label` (FR24)
**And** it is focusable and togglable via keyboard Space key (FR23)

### Story 3.4: Delete Todo — UI & Optimistic Update

As a **user**,
I want to click a delete button on a todo to instantly remove it from my list,
So that clearing completed or unwanted tasks feels immediate.

**Acceptance Criteria:**

**Given** a todo is rendered
**When** I click its delete button
**Then** the todo is immediately removed from the list (FR5, FR21, NFR3)
**And** the `DELETE /api/v1/todos/:id` request is sent in the background

**Given** the server confirms the deletion (`204`)
**Then** the todo remains removed and the list is consistent with the server

**Given** the server rejects the deletion
**Then** the deleted todo is restored to its previous position in the list (FR22)
**And** an error message is shown (FR18)

**Given** the delete button is rendered
**Then** it is a `<button>` with an `aria-label` such as "Delete todo" (FR24)
**And** it is focusable and activatable via keyboard Enter key (FR23)
**And** it meets the 44×44px minimum touch target on mobile (FR26)

### Story 3.5: Mutation Error Handling & Retry

As a **user**,
I want clear, non-alarming feedback when a create, complete, or delete action fails — and the ability to try again without reloading,
So that a failed action never silently loses my data.

**Acceptance Criteria:**

**Given** any mutation (create, toggle, delete) fails with a network error or 5xx
**When** the error is received
**Then** a non-alarming error message is displayed — e.g., "Couldn't save your change. Try again." (FR18)
**And** the UI reverts to the state before the attempted action (FR22, NFR8)
**And** the app does not crash or go blank (NFR10)

**Given** an error message is shown after a failed mutation
**When** the user retries the same action
**Then** the mutation is re-attempted without a page reload (FR20)
**And** if it succeeds, the error message disappears and the list updates

**Given** a failed create
**Then** the optimistically added todo is removed and the input field retains the attempted text so the user can resubmit

**Given** a failed toggle or delete
**Then** the todo reverts to its pre-action state and the error message does not obscure the list

**Notes:**
- TanStack Query `onError` callback handles rollback; error state stored in component/hook state
- NFR8: no silent data loss — every failed write must surface to the user

---

## Epic 4: End-to-End Test Coverage

Playwright E2E tests cover all four user journeys (first use, returning user, error recovery, empty state), giving the team confidence that the full stack works correctly as an integrated system.

### Story 4.1: Playwright Setup & First-Use Journey

As a **developer**,
I want Playwright configured in the monorepo and a test that verifies the full first-use journey,
So that the core happy path is automatically verified on every CI run.

**Acceptance Criteria:**

**Given** Playwright is installed in `e2e/` at the monorepo root
**When** I run `npx playwright test`
**Then** tests execute against the running full-stack application

**Given** the first-use journey test
**When** the app loads fresh (empty database)
**Then** the test verifies: page loads → input is visible → user types "Buy groceries" → submits → item appears in list → user toggles completion → item appears visually completed → user deletes item → item is removed from list
**And** all assertions pass end-to-end through the real API and database

**Notes:**
- Use `docker-compose.test.yml` for an isolated test database
- `playwright.config.ts` at `e2e/` root specifies `baseURL` from environment
- Tests must be independent — each test resets state via the API or DB seed/teardown

### Story 4.2: Returning User & Mobile Journey

As a **developer**,
I want E2E tests verifying cross-session persistence and mobile layout,
So that regressions in persistence or responsive behavior are caught automatically.

**Acceptance Criteria:**

**Given** the returning-user journey test
**When** the user creates todos in one session and reopens the app
**Then** the test verifies: todos created in a prior session are visible on reload
**And** the list order matches creation time

**Given** the mobile layout test
**When** Playwright emulates a 375px viewport (e.g., iPhone SE)
**Then** the layout is fully functional — input, list, and buttons are all visible and operable
**And** no horizontal scroll is present
**And** touch targets are large enough to interact with

### Story 4.3: Error Recovery Journey

As a **developer**,
I want an E2E test that simulates API failure and verifies the app handles it gracefully,
So that error-state regressions are caught before they reach users.

**Acceptance Criteria:**

**Given** the error recovery journey test
**When** the backend API is made unavailable (e.g., Playwright route intercept returns 500)
**Then** the test verifies: error message appears → existing list remains visible → retry button is clickable
**And** when the intercept is removed and retry is clicked
**Then** the operation succeeds and the error message disappears

**Notes:**
- Use Playwright's `page.route()` to intercept and mock API failures
- Test must verify no crash, no blank screen, and graceful message

### Story 4.4: Empty State & Loading Journey

As a **developer**,
I want E2E tests for the empty state and loading indicator,
So that first-load UX regressions are caught automatically.

**Acceptance Criteria:**

**Given** the empty-state journey test
**When** the app loads with an empty database
**Then** the test verifies: loading indicator appears first → empty state message appears after fetch completes → no list items are rendered

**Given** the loading state test
**When** Playwright intercepts `GET /api/v1/todos` and delays the response
**Then** the loading indicator is visible during the delay
**And** once the response is released, the list renders correctly
