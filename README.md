# Todo App

A full-stack Todo application built with the [BMAD Method](https://github.com/bmadcode/bmad-method) — spec-driven, agent-implemented, fully containerized.

**Stack:** React + TanStack Query · Hono (Node.js) · PostgreSQL · Drizzle ORM · Docker Compose

---

## Quick Start

### With Docker (recommended)

```bash
# 1. Clone and enter the project
cd todo-app

# 2. Copy environment config
cp .env.example .env

# 3. Start everything
docker compose up --build

# App:     http://localhost
# API:     http://localhost:3000
# Health:  http://localhost:3000/health
```

To stop:

```bash
docker compose down          # keep data
docker compose down -v       # wipe data too
```

### Local Development

**Prerequisites:** Node 20+, PostgreSQL 16+

```bash
npm install

# Set your local DATABASE_URL in .env
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/todos

# Start backend (port 3000) and frontend (port 5173) in separate terminals:
npm run dev:backend
npm run dev:frontend
```

The frontend dev server proxies `/api/*` to `http://localhost:3000`.

---

## Project Structure

```
todo-app/
├── apps/
│   ├── backend/          # Hono API server
│   │   ├── src/
│   │   │   ├── routes/   # todos.ts, health.ts
│   │   │   └── db/       # Drizzle schema + migrations
│   │   └── Dockerfile
│   └── frontend/         # React + Vite SPA
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/    # TanStack Query mutations
│       │   ├── context/  # ToastContext
│       │   └── lib/      # api.ts fetch helpers
│       └── Dockerfile
├── packages/
│   └── shared/           # Zod schemas + TypeScript types
├── e2e/                  # Playwright end-to-end tests
├── docs/                 # QA reports, AI integration log
├── docker-compose.yml
└── docker-compose.override.yml  # dev overrides (hot reload)
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/todos` | List all todos (ordered by creation time) |
| `POST` | `/todos` | Create a todo — body: `{ "text": "string" }` |
| `PATCH` | `/todos/:id` | Update completion — body: `{ "completed": boolean }` |
| `DELETE` | `/todos/:id` | Delete a todo |
| `GET` | `/health` | Health check (includes DB connectivity) |

All error responses follow: `{ "error": { "code": "...", "message": "..." } }`

---

## Running Tests

### Unit & Integration Tests

```bash
npm test                          # all workspaces
npm test --workspace=apps/backend
npm test --workspace=apps/frontend
```

### Coverage Report

```bash
npm test --workspace=apps/frontend -- --coverage
npm test --workspace=apps/backend -- --coverage
```

Coverage thresholds (enforced): statements ≥70%, functions ≥70%, lines ≥70%, branches ≥55%

### End-to-End Tests (Playwright)

Requires the app running at `http://localhost:5173` (dev server) or `http://localhost` (Docker).

```bash
# With dev servers running:
npm run e2e

# With Docker:
BASE_URL=http://localhost npm run e2e

# View HTML report:
npm run e2e:report
```

E2E test suites:
- `first-use.spec.ts` — create, complete, delete journey
- `returning-user.spec.ts` — persistence across page reloads
- `mobile.spec.ts` — responsive layout at 375px
- `error-recovery.spec.ts` — API failure and retry flows
- `empty-state-and-loading.spec.ts` — empty/loading/performance states
- `accessibility.spec.ts` — WCAG AA audit via axe-core

---

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/todos` | Postgres connection string |
| `CORS_ORIGIN` | `http://localhost` | Allowed CORS origins (comma-separated, no wildcards) |
| `PORT` | `3000` | Backend listen port |
| `POSTGRES_PASSWORD` | `postgres` | **Change for production** |

---

## Health Checks

All containers report health status:

```bash
docker compose ps              # see health status
docker compose logs backend    # backend logs
curl http://localhost:3000/health
# → {"status":"ok"}  or  {"status":"error","message":"Database unavailable"}
```

---

## QA Reports

- [Security Review](docs/security-review.md) — OWASP Top 10 analysis, no critical findings
- [AI Integration Log](docs/ai-integration-log.md) — How AI was used throughout development

---

## How BMAD Guided This Project

This application was built entirely through the BMAD agent workflow:

1. **`/bmad-create-prd`** — PM persona refined requirements into a structured PRD
2. **`/bmad-create-architecture`** — Architect persona designed the tech stack, API contracts, and component structure
3. **`/bmad-create-epics-and-stories`** — 4 epics, 18 stories with BDD acceptance criteria
4. **`/bmad-sprint-planning`** — Sprint tracking via `sprint-status.yaml`
5. **`/bmad-dev-story`** — Developer persona implemented each story (red → green → refactor)
6. **`/bmad-code-review`** — 4 parallel review agents audited all epics simultaneously
7. Fix agents addressed 40+ review findings across architecture, correctness, testing, a11y, and security

See [AI Integration Log](docs/ai-integration-log.md) for full documentation of agent usage, prompts, limitations, and outcomes.

All BMAD spec artifacts (PRD, architecture, epics, stories, sprint status) are in [`_bmad-output/`](_bmad-output/).
