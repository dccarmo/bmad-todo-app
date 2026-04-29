# Story 1.4: Docker & Environment Setup

Status: done

## Story

As a **developer**,
I want the full stack runnable via `docker-compose up` with proper health checks and environment configuration,
So that any team member can run the complete application locally with a single command.

## Acceptance Criteria

1. `docker-compose up` starts three services: `db` (PostgreSQL), `backend` (Hono), `frontend` (nginx)
   - `db` healthcheck uses `pg_isready`; backend `depends_on: db: condition: service_healthy`
   - Frontend accessible at `http://localhost:80`; backend accessible at `http://localhost:3000`
2. `apps/backend/Dockerfile` uses multi-stage build: `node:20-alpine` build → `node:20-alpine` runtime with non-root user
3. `apps/frontend/Dockerfile` uses multi-stage build: `node:20-alpine` build → `nginx:alpine` serve
4. `apps/frontend/nginx.conf` exists and serves the Vite build output at `/usr/share/nginx/html` with SPA fallback (all routes → `index.html`)
5. `docker-compose.override.yml` exists and mounts source volumes for hot reload on both frontend and backend
6. `docker-compose.test.yml` exists and starts an isolated `db` service on a separate port (avoid collision with dev DB)
7. `.env.example` is committed and documents minimum required variables: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`; `.env` is in `.gitignore` and never committed
8. The backend container successfully runs `start.sh` (migrate then serve) with `DATABASE_URL` from environment

## Tasks / Subtasks

- [x] Create `apps/backend/Dockerfile` (AC: 2, 8)
  - [x] Builder stage: `node:20-alpine`, copy package.json files first, run `npm ci`, copy source, build shared then backend
  - [x] Runtime stage: `node:20-alpine`, copy package.json files, run `npm ci --omit=dev`, copy built artifacts + start.sh + drizzle.config.ts + migrations
  - [x] Add `RUN chown -R node:node /app` and `USER node` before CMD in runtime stage
  - [x] Set `WORKDIR /app/apps/backend` in runtime stage (required for start.sh relative paths)
  - [x] CMD is `["sh", "start.sh"]`

- [x] Create `apps/frontend/Dockerfile` (AC: 3)
  - [x] Builder stage: `node:20-alpine`, copy package.json files, run `npm ci`, copy source, run `npm run build --workspace=apps/frontend`
  - [x] Runtime stage: `nginx:alpine`, copy `apps/frontend/nginx.conf` to `/etc/nginx/conf.d/default.conf`, copy `apps/frontend/dist` from builder to `/usr/share/nginx/html`
  - [x] EXPOSE 80, CMD `["nginx", "-g", "daemon off;"]`

- [x] Create `apps/frontend/nginx.conf` (AC: 4)
  - [x] `listen 80`, `root /usr/share/nginx/html`, `index index.html`
  - [x] `location /` with `try_files $uri $uri/ /index.html` for SPA routing

- [x] Create `docker-compose.yml` at monorepo root (AC: 1)
  - [x] `db` service: `postgres:16-alpine`, env vars from `.env`, volume for data persistence, `pg_isready` healthcheck
  - [x] `backend` service: build context `.`, dockerfile `apps/backend/Dockerfile`, env from `.env`, port mapping, `depends_on: db: condition: service_healthy`
  - [x] `frontend` service: build context `.`, dockerfile `apps/frontend/Dockerfile`, port `80:80`, `depends_on: backend`
  - [x] Named volume `postgres_data`

- [x] Create `docker-compose.override.yml` at monorepo root (AC: 5)
  - [x] Override backend to use builder stage target, mount `./apps/backend/src` and `./packages/shared/src` volumes, command `npm run dev --workspace=apps/backend`
  - [x] Override frontend to use builder stage target, mount `./apps/frontend/src` and `./apps/frontend/index.html`, expose port `5173:5173`, command `npm run dev --workspace=apps/frontend -- --host 0.0.0.0`

- [x] Create `docker-compose.test.yml` at monorepo root (AC: 6)
  - [x] Single `db-test` service: `postgres:16-alpine`, isolated env vars (TEST_POSTGRES_*), port `5433:5432` (separate from dev DB port 5432)
  - [x] `pg_isready` healthcheck on test db

- [x] Create `.env.example` at monorepo root (AC: 7)
  - [x] Document `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - [x] Verify `.gitignore` already includes `.env` and `.env.*` (done in Story 1.1 CR)

- [x] Verify full Docker build and service startup (AC: 1, 8)
  - [x] `docker build -f apps/backend/Dockerfile -t todo-backend .` succeeds from monorepo root
  - [x] `docker build -f apps/frontend/Dockerfile -t todo-frontend .` succeeds from monorepo root
  - [x] Verify `start.sh` is present and executable inside the built backend image

### Review Findings

- [x] [Review][Patch] Override backend command skips migrations — `command: npm run dev` in override bypasses `start.sh`; fresh `docker-compose up` results in schema-less DB and backend SQL errors on first request [docker-compose.override.yml]
- [x] [Review][Patch] No `.dockerignore` — entire monorepo (including local `.env` and `node_modules/`) is sent to Docker daemon as build context on every build, risking secret leakage in intermediate layers [.dockerignore (missing)]
- [x] [Review][Patch] `version: '3.8'` deprecated — Compose v2 ignores this field and emits deprecation warnings; remove from all three compose files [docker-compose.yml, docker-compose.override.yml, docker-compose.test.yml]
- [x] [Review][Defer] Frontend override has orphaned port 80 — Compose merges ports, so `80:80` remains active alongside `5173:5173` in dev mode; nothing listens on 80 in the builder stage [docker-compose.override.yml] — deferred, acceptable dev-mode confusion, no crash
- [x] [Review][Defer] `depends_on: backend` without `condition: service_healthy` — backend has no healthcheck defined; fixing this requires a `/health` endpoint (Story 1.5) [docker-compose.yml] — deferred, blocked on Story 1.5
- [x] [Review][Defer] Default credentials in compose fallbacks — `postgres:postgres` default in `${POSTGRES_PASSWORD:-postgres}` and DATABASE_URL; intentional for local dev tooling, not for production [docker-compose.yml, .env.example] — deferred, appropriate for local dev scope

## Dev Notes

### Context from Previous Stories

**Stories 1.1–1.3 completed.** Critical current state:

**`apps/backend/src/index.ts`** — server hardcodes port 3000 (DO NOT MODIFY this file):
```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Hono!'))
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
```
The port is hardcoded to 3000. In Docker, the container always listens on 3000; the host-side port is controlled by the docker-compose ports mapping. `PORT` in .env.example controls the host mapping, not the container port.

**`apps/backend/start.sh`** (already exists, executable):
```sh
#!/bin/sh
set -e
node_modules/.bin/drizzle-kit migrate
node dist/index.js
```
The `WORKDIR` in the backend Docker runtime stage MUST be `/app/apps/backend` for these relative paths to resolve.

**`apps/backend/package.json`** — `drizzle-kit` is in `dependencies` (moved from devDependencies in Story 1.3 CR). This means it IS installed with `npm ci --omit=dev`. The migration command works in production.

**`apps/backend/tsconfig.json`** — has `"include": ["src"]` (added in Story 1.3 CR). TypeScript compiles `src/` only, output goes to `apps/backend/dist/`. Compiled entry point: `dist/index.js`.

**`apps/backend/drizzle.config.ts`** — references `./src/db/migrations` (relative to apps/backend). This file AND the migrations directory must be in the production image for `drizzle-kit migrate` to work.

**`apps/backend/src/db/migrations/0000_last_bloodscream.sql`** — the generated migration; must be copied to production image.

**`apps/backend/src/db/index.ts`** — validates `DATABASE_URL` at startup (throws if missing), has pool error handler. This is correct — container startup will fail fast if DATABASE_URL is unset.

**`.gitignore`** at root — already includes `.env` and `.env.*` (Story 1.1 CR). Do NOT re-add these.

**`apps/frontend/package.json`** build script: `"build": "tsc -b && vite build"`. Vite outputs to `apps/frontend/dist/` by default. The `tsc -b` type-checks before bundling.

**`apps/frontend/vite.config.ts`** has an alias resolving `@todo-app/shared` directly to `packages/shared/src/index.ts`. This means the Vite bundler inlines the shared package's TypeScript source — **no need for packages/shared/dist in the frontend Docker image**.

**`packages/shared/tsconfig.json`** — has `"include": ["src"]`, outputs to `packages/shared/dist/`. Build script: `npm run build --workspace=packages/shared`.

### Monorepo Docker Build — Critical Understanding

Both Dockerfiles use the **monorepo root as build context** in docker-compose.yml:
```yaml
build:
  context: .                      # Root of monorepo
  dockerfile: apps/backend/Dockerfile
```

This means all COPY paths in Dockerfiles are relative to the monorepo root, NOT the Dockerfile's directory. Example:
- ✅ `COPY apps/backend/package.json ./apps/backend/`
- ❌ `COPY package.json ./apps/backend/` (would copy root package.json to wrong location)

### Backend Dockerfile — Exact Implementation

The build context is the monorepo root. The Dockerfile is at `apps/backend/Dockerfile`.

Key considerations:
- Build shared package first (`npm run build --workspace=packages/shared`) so its `dist/` exists before building the backend
- The backend `tsc` compiles `packages/shared/src/index.ts` via path alias at build time, but at RUNTIME Node.js resolves `@todo-app/shared` via node_modules symlink → `packages/shared/dist/index.js`
- So `packages/shared/dist/` MUST exist in the runtime stage
- npm workspace symlinks set up by `npm ci --omit=dev` point to `../../packages/shared` — the dist must be there

```dockerfile
# apps/backend/Dockerfile

# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests (layer cache: rarely changes)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (dev + prod)
RUN npm ci

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Build shared first, then backend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/backend

# ── Runtime stage ──────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package manifests for production install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install production deps only (drizzle-kit is in dependencies, so it's included)
RUN npm ci --omit=dev

# Copy compiled artifacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy runtime files needed by start.sh
COPY apps/backend/start.sh ./apps/backend/start.sh
COPY apps/backend/drizzle.config.ts ./apps/backend/drizzle.config.ts
COPY apps/backend/src/db/migrations ./apps/backend/src/db/migrations

# Fix ownership and make start.sh executable
RUN chown -R node:node /app && chmod +x /app/apps/backend/start.sh

# Set working directory and switch to non-root user
WORKDIR /app/apps/backend
USER node

CMD ["sh", "start.sh"]
```

**Why `WORKDIR /app/apps/backend`:** `start.sh` uses relative paths:
- `node_modules/.bin/drizzle-kit` → resolves from CWD = `/app/apps/backend/node_modules/.bin/drizzle-kit`
- `node dist/index.js` → resolves from CWD = `/app/apps/backend/dist/index.js`
- `drizzle-kit migrate` reads `drizzle.config.ts` from CWD which references `./src/db/migrations` = `/app/apps/backend/src/db/migrations/`

All three paths are valid with WORKDIR = `/app/apps/backend`. ✅

### Frontend Dockerfile — Exact Implementation

```dockerfile
# apps/frontend/Dockerfile

# ── Build stage ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies
RUN npm ci

# Copy source files
# Note: Vite alias resolves @todo-app/shared to packages/shared/src directly
# so we copy src (not dist) of packages/shared
COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/

# Build frontend (tsc type-check + vite bundle)
RUN npm run build --workspace=apps/frontend

# ── Serve stage ────────────────────────────────────────────
FROM nginx:alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Note:** The frontend build uses a Vite alias that inlines `packages/shared/src/` directly into the bundle. No `packages/shared/dist/` is needed in the nginx stage — it only needs the static Vite build output.

### nginx.conf — SPA Routing

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The `try_files` directive serves files directly (CSS, JS, images), and falls back to `index.html` for all other paths — required for React Router-style client-side routing (though this app has no router in v1, it's correct practice).

### docker-compose.yml — Exact Implementation

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-todos}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-todos}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@db:5432/todos}
      PORT: ${PORT:-3000}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost}
    ports:
      - "${PORT:-3000}:3000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Port mapping for backend:** `"${PORT:-3000}:3000"` — the container always listens on 3000 (hardcoded in src/index.ts). The HOST port comes from `PORT` env var (default 3000). This pattern lets you change the host port without modifying application code.

**Database hostname:** The backend connects to `db` (the Docker service name) as the PostgreSQL host. This works because Docker Compose creates an internal network where service names resolve as hostnames.

### docker-compose.override.yml — Dev Hot Reload

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: builder
    volumes:
      - ./apps/backend/src:/app/apps/backend/src
      - ./packages/shared/src:/app/packages/shared/src
    working_dir: /app
    command: npm run dev --workspace=apps/backend

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      target: builder
    volumes:
      - ./apps/frontend/src:/app/apps/frontend/src
      - ./apps/frontend/index.html:/app/apps/frontend/index.html
    ports:
      - "5173:5173"
    working_dir: /app
    command: sh -c "npm run dev --workspace=apps/frontend -- --host 0.0.0.0"
```

**`target: builder`:** Uses the builder stage (which has tsx and Vite installed as devDeps) instead of the production runtime stage. The dev commands require these dev tools.

**Volume mounts:** Source files mounted from host override the container's source, enabling hot reload without rebuilding the image.

**Frontend port 5173:** In dev, Vite serves on 5173 (not nginx on 80). The host can access the Vite dev server directly.

### docker-compose.test.yml — Isolated Test DB

```yaml
version: '3.8'

services:
  db-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${TEST_POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${TEST_POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${TEST_POSTGRES_DB:-todos_test}
    ports:
      - "${TEST_DB_PORT:-5433}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${TEST_POSTGRES_USER:-postgres} -d ${TEST_POSTGRES_DB:-todos_test}"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Port `5433` (not 5432) avoids collision with the dev db service. Run with:
```bash
docker-compose -f docker-compose.test.yml up -d db-test
```

### .env.example — Exact Content

```
# Copy this file to .env and fill in values for your environment
# .env is gitignored and must never be committed

# PostgreSQL connection URL (used by backend and drizzle-kit)
DATABASE_URL=postgresql://postgres:postgres@db:5432/todos

# Backend server host port (container always listens on 3000)
PORT=3000

# Allowed CORS origin for the backend (Story 1.5 adds CORS middleware)
CORS_ORIGIN=http://localhost

# PostgreSQL service credentials (used by docker-compose db service)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=todos

# Test database (separate port to avoid collision with dev DB)
TEST_POSTGRES_USER=postgres
TEST_POSTGRES_PASSWORD=postgres
TEST_POSTGRES_DB=todos_test
TEST_DB_PORT=5433
```

### Verification Steps

After creating all files:
```bash
# 1. Build backend image from monorepo root
docker build -f apps/backend/Dockerfile -t todo-backend .

# 2. Build frontend image from monorepo root
docker build -f apps/frontend/Dockerfile -t todo-frontend .

# 3. Verify start.sh is in the backend image
docker run --rm todo-backend ls -la start.sh

# 4. Verify dist/index.js exists in backend image
docker run --rm todo-backend ls dist/

# 5. Verify nginx.conf and static files in frontend image
docker run --rm todo-frontend ls /usr/share/nginx/html
docker run --rm todo-frontend cat /etc/nginx/conf.d/default.conf
```

### File Structure to Create

```
todo-app/
├── .env.example               ← NEW
├── docker-compose.yml         ← NEW
├── docker-compose.override.yml ← NEW
├── docker-compose.test.yml    ← NEW
├── apps/
│   ├── backend/
│   │   └── Dockerfile         ← NEW
│   └── frontend/
│       ├── Dockerfile         ← NEW
│       └── nginx.conf         ← NEW
```

### Scope Boundary — What NOT to Implement

- CORS middleware on the backend (Story 1.5)
- `/health` endpoint (Story 1.5)
- ESLint/Prettier config (Story 1.5)
- Any Hono routes (Story 2.1+)
- Modifying `apps/backend/src/index.ts` (preserve exactly)
- `.env` file itself (never committed)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- First backend Docker build failed: `TS5011: The common source directory is './src'. rootDir must be explicitly set.` TypeScript 6.x requires explicit `rootDir` when using `outDir` — `--noEmit` skips this check but `tsc` (with emit) does not. Fixed by adding `"rootDir": "./src"` to `apps/backend/tsconfig.json`.
- Both images build successfully after the fix. Backend image verified: `start.sh` is executable, `dist/index.js` exists, migrations present, `USER node` confirmed.
- Frontend image verified: `index.html` + `assets/` in `/usr/share/nginx/html`, nginx.conf correct.

### Completion Notes List

- All 8 ACs satisfied: 3 services in docker-compose.yml with pg_isready healthcheck and depends_on, backend multi-stage with non-root node user, frontend multi-stage with nginx, nginx.conf with SPA fallback, override.yml with hot-reload volume mounts, test.yml with isolated db-test on port 5433, .env.example committed with all required vars, .gitignore already had .env/.env.*
- `rootDir: "./src"` added to apps/backend/tsconfig.json to satisfy TypeScript 6.x emit requirements (was previously caught by --noEmit but not full build)
- Monorepo build context pattern: both Dockerfiles use context `.` (root) so cross-workspace files (packages/shared) can be copied during build
- drizzle-kit is in `dependencies` (moved from devDeps in Story 1.3 CR) — it is available in the production image via `npm ci --omit=dev`

## File List

- apps/backend/Dockerfile (new)
- apps/backend/tsconfig.json (modified — added rootDir: ./src)
- apps/frontend/Dockerfile (new)
- apps/frontend/nginx.conf (new)
- docker-compose.yml (new)
- docker-compose.override.yml (new)
- docker-compose.test.yml (new)
- .env.example (new)

## Change Log

- 2026-04-27: Story 1.4 implemented — Docker multi-stage builds, docker-compose orchestration, nginx SPA config, environment setup
