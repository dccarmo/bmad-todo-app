# Story 1.5: Code Quality Tooling & Health Endpoint

Status: done

## Story

As a **developer**,
I want ESLint, Prettier, and a `/health` endpoint configured,
So that code style is enforced consistently and Docker can verify the backend is alive.

## Acceptance Criteria

1. Given ESLint and Prettier are configured at the monorepo root, when I run `npm run lint` from the repo root, then ESLint runs across all workspaces with no errors on the scaffold code.
2. When I run `npm run format:check` from the repo root, then Prettier reports all files are formatted correctly.
3. Given the backend is running, when I send `GET /health`, then the response is `200 OK` with body `{ "status": "ok" }`, and this route is registered before any auth or database middleware.
4. Given the docker-compose.yml backend service definition, the healthcheck calls `GET /health` and marks the container healthy on `200`.

## Tasks / Subtasks

- [x] **Task 1: Install ESLint tooling at the monorepo root** (AC1)
  - [x] Add `eslint`, `@eslint/js`, `typescript-eslint`, `globals` as root devDependencies (do NOT duplicate what is already in frontend's devDeps — install at root so the root `eslint.config.js` can resolve them)
  - [x] Run `npm install` from repo root to update `package-lock.json`

- [x] **Task 2: Create root `eslint.config.js`** (AC1)
  - [x] Write flat config (ESLint v9 format) covering `apps/backend/src/**`, `apps/frontend/src/**`, and `packages/shared/src/**`
  - [x] Include React-specific plugins only for frontend files
  - [x] Ignore `**/dist/**`, `**/node_modules/**`, `**/migrations/**`

- [x] **Task 3: Add `npm run lint` script to root `package.json`** (AC1)
  - [x] Script: `"lint": "eslint ."`
  - [x] Verify it runs without errors on the existing scaffold

- [x] **Task 4: Install Prettier and create config** (AC2)
  - [x] Add `prettier` as root devDependency
  - [x] Create `prettier.config.js` at repo root
  - [x] Create `.prettierignore` at repo root
  - [x] Add `"format": "prettier --write ."` and `"format:check": "prettier --check ."` scripts to root `package.json`

- [x] **Task 5: Create `apps/backend/src/routes/health.ts`** (AC3)
  - [x] Export a Hono sub-application named `health` with `GET /` returning `{ status: 'ok' }`

- [x] **Task 6: Update `apps/backend/src/index.ts`** (AC3)
  - [x] Import and mount the health route at `/health` — BEFORE any middleware
  - [x] Add CORS middleware using `hono/cors` and `process.env.CORS_ORIGIN`
  - [x] Add global error handler using `app.onError` and `HTTPException` from `hono/http-exception`
  - [x] Remove the placeholder `GET /` route

- [x] **Task 7: Add backend healthcheck to `docker-compose.yml`** (AC4)
  - [x] Add `healthcheck` block to the `backend` service using `wget`

- [x] **Task 8: Verify**
  - [x] `npm run lint` from root exits 0
  - [x] `npm run format:check` from root exits 0
  - [x] Backend TypeScript compiles cleanly (`tsc` exits 0)
  - [x] `docker-compose.yml` backend healthcheck uses `wget -qO- http://localhost:3000/health || exit 1`

## Dev Notes

### Context from Previous Stories

**What exists today (Story 1.4 completed):**

- `apps/backend/tsconfig.json` has `"rootDir": "./src"`, `"outDir": "./dist"`, and `"include": ["src"]` — TypeScript 6.x requires these explicitly.
- `apps/backend/src/index.ts` currently has only a placeholder `GET /` route — this must be replaced entirely.
- The frontend (`apps/frontend/`) already has ESLint in its own `devDependencies`:
  - `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
  - It also has its own `apps/frontend/eslint.config.js` (flat config, ESLint v9 format)
- **The root `package.json` has NO lint, format, or ESLint scripts yet.**
- docker-compose.yml backend service has NO `healthcheck` block yet.
- The backend has no `routes/` directory yet — you must create it.
- `drizzle-kit` is in `dependencies` (not `devDependencies`) in the backend — this is intentional, do not change it.

**Frontend `eslint.config.js` (already exists at `apps/frontend/eslint.config.js`, do NOT modify):**
```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```

**Frontend `tsconfig.app.json` (for reference — do NOT modify):**
- Uses `"moduleResolution": "bundler"` — different from backend which uses `"NodeNext"`
- Uses `"noUnusedLocals": true`, `"noUnusedParameters": true` — ESLint must not conflict

---

### Architecture Requirements

**Files to CREATE:**
- `eslint.config.js` — repo root
- `prettier.config.js` — repo root
- `.prettierignore` — repo root
- `apps/backend/src/routes/health.ts` — health route handler

**Files to MODIFY:**
- `package.json` (root) — add `lint`, `format`, `format:check` scripts; add `prettier`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals` devDependencies
- `apps/backend/src/index.ts` — full replacement: mount health route, CORS, error handler
- `docker-compose.yml` — add `healthcheck` to backend service

**Files to NOT touch:**
- `apps/frontend/eslint.config.js` — already correct, leave it alone
- `apps/frontend/package.json` — already has ESLint devDeps, do not duplicate
- `apps/backend/tsconfig.json` — already correct from Story 1.4
- `apps/backend/package.json` — no ESLint changes needed there; install at root instead

**Critical architecture rules:**
- `GET /health` is the ONLY backend route that lives outside `/api/v1/`
- The health route must be registered on `app` BEFORE `app.use('*', cors(...))` and before any future auth middleware
- `/health` must NOT touch the database — it is a pure liveness probe
- All other future routes will be mounted under `/api/v1/`

---

### Technical Specifications

#### 1. Root `package.json` — updated scripts and devDependencies

The root `package.json` currently looks like:
```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "build": "npm run build --workspace=packages/shared && npm run build --workspace=apps/backend && npm run build --workspace=apps/frontend",
    "test": "npm run test --workspaces --if-present"
  }
}
```

Add the following scripts and devDependencies:

```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "build": "npm run build --workspace=packages/shared && npm run build --workspace=apps/backend && npm run build --workspace=apps/frontend",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "globals": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

> **Note on versions:** The frontend already pins `eslint@^10.2.1`, `@eslint/js@^10.0.1`, `typescript-eslint@^8.58.2`, `globals@^17.5.0`. To avoid npm hoisting conflicts, match those exact ranges in the root devDependencies:
>
> ```json
> "devDependencies": {
>   "@eslint/js": "^10.0.1",
>   "eslint": "^10.2.1",
>   "globals": "^17.5.0",
>   "prettier": "^3.0.0",
>   "typescript-eslint": "^8.58.2"
> }
> ```
>
> This ensures the root config and the frontend workspace both resolve the same package versions from the hoisted `node_modules`.

---

#### 2. Root `eslint.config.js` — NEW FILE

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Global ignores — applied to every config block below
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/migrations/**',
    '**/.next/**',
  ]),

  // All TypeScript files across the monorepo (backend + shared)
  {
    files: [
      'apps/backend/src/**/*.ts',
      'packages/shared/src/**/*.ts',
    ],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Frontend TypeScript/TSX files — includes React-specific plugins
  {
    files: ['apps/frontend/src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```

> **IMPORTANT:** The React plugin packages (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) are installed in `apps/frontend/package.json`. When `eslint .` runs from the root, npm workspaces hoists them to the root `node_modules`, so they are resolvable from `eslint.config.js` at the root. Do NOT move them to root devDependencies — leave them in the frontend.

> **IMPORTANT:** Do NOT add `eslint-plugin-react-hooks` or `eslint-plugin-react-refresh` to root `devDependencies`. They are already in the frontend workspace and will be hoisted by npm workspaces. Adding them to root devDependencies creates version conflicts.

---

#### 3. Root `prettier.config.js` — NEW FILE

```js
/** @type {import("prettier").Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
}
```

---

#### 4. Root `.prettierignore` — NEW FILE

```
# Build outputs
dist/
build/
.next/

# Dependencies
node_modules/

# Database migrations (auto-generated)
apps/backend/src/db/migrations/

# Lock files
package-lock.json

# Docker
.dockerignore
```

---

#### 5. `apps/backend/src/routes/health.ts` — NEW FILE

```typescript
import { Hono } from 'hono'

const health = new Hono()

const getHealth = health.get('/', (c) => c.json({ status: 'ok' }))

export { health }
export type HealthRoute = typeof getHealth
```

> **Note:** The named function `getHealth` follows the architecture naming convention (camelCase verb+noun). The type export is optional for this route but follows the pattern for future RPC-style typed clients. If keeping it simple, the following minimal form is also correct:
>
> ```typescript
> import { Hono } from 'hono'
>
> const health = new Hono()
>
> health.get('/', (c) => c.json({ status: 'ok' }))
>
> export { health }
> ```

---

#### 6. `apps/backend/src/index.ts` — FULL REPLACEMENT

Replace the entire file contents:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { health } from './routes/health.js'

const app = new Hono()

// ── Health check — registered BEFORE all other middleware ──────────────────
// This route must not depend on the database or any auth middleware.
// Docker healthcheck calls GET /health to determine container liveness.
app.route('/health', health)

// ── Global middleware ──────────────────────────────────────────────────────
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost',
  })
)

// ── Global error handler ───────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: err.status.toString(),
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
        code: '500',
        message: 'Internal Server Error',
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
```

> **GOTCHA — Import paths with `.js` extension:** The backend uses `"module": "NodeNext"` in `tsconfig.json`. With `NodeNext` module resolution, TypeScript requires that relative imports use the `.js` extension even though the source file is `.ts`. Always write `import { health } from './routes/health.js'` — NOT `'./routes/health'` or `'./routes/health.ts'`. This is the most common mistake with NodeNext projects.

> **GOTCHA — `hono/cors` import:** Hono ships its middleware as sub-path exports. Import as `import { cors } from 'hono/cors'` — NOT `from 'hono'`.

> **GOTCHA — `hono/http-exception` import:** Same rule: `import { HTTPException } from 'hono/http-exception'` — NOT `from 'hono'`.

---

#### 7. `docker-compose.yml` — add healthcheck to backend service

Add the `healthcheck` block inside the `backend:` service. The full updated `backend:` section:

```yaml
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
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

> **Why `wget` instead of `curl`?** The backend Dockerfile is based on a Node.js Alpine image. Alpine includes `wget` by default but does NOT include `curl`. Using `curl` in the healthcheck will fail silently with "command not found". Always use `wget` for Alpine-based containers unless `curl` has been explicitly installed.

> **Why `start_period: 10s`?** The backend runs migrations via `start.sh` before starting the server. The `start_period` gives the container a grace window before failed healthchecks count against `retries`. Without it, Docker may mark the container unhealthy during the migration window.

---

### Installation Command

After updating `package.json` at the root, run:

```bash
npm install
```

from the repo root. This installs `prettier` and any newly-added root devDependencies. Because npm workspaces hoist packages, the frontend's React ESLint plugins will also be available to the root `eslint.config.js`.

---

### Scope Boundary

**Do NOT implement in this story:**

- Any `/api/v1/` routes — those belong to Epic 2+ stories
- Database connectivity checks in `/health` — the endpoint is a liveness probe only; a readiness probe (checking DB) is out of scope
- Jest or Vitest test configuration — belongs to a future testing story
- CI/CD pipeline changes — out of scope for Epic 1
- Husky or lint-staged git hooks — not specified in requirements
- Any frontend ESLint rule changes — the existing `apps/frontend/eslint.config.js` is correct and must not be modified

---

### Common Mistakes to Avoid

1. **Forgetting `.js` in relative imports inside the backend.** The backend uses `"module": "NodeNext"`. All relative imports need explicit `.js` extensions. This applies to your new `./routes/health.js` import.

2. **Running `eslint` from a workspace subdirectory** instead of the repo root. The root `eslint.config.js` handles all workspaces — always run `npm run lint` from the repo root.

3. **Using `curl` in Docker healthcheck** instead of `wget`. The Node.js Alpine image does not have `curl`.

4. **Registering CORS middleware before the health route.** While CORS won't break `/health`, the architecture rule is explicit: health route first. Future auth middleware must also come after `/health`.

5. **Exporting `default` instead of named export from `routes/health.ts`.** The index.ts imports it as `import { health } from './routes/health.js'`. Use a named export.

6. **Adding React ESLint plugins to root `devDependencies`.** They are already in frontend's devDeps and npm workspaces hoists them. Adding them again causes version conflicts.

7. **Modifying `apps/frontend/eslint.config.js`.** It is already correct. The root `eslint.config.js` covers frontend files — these two configs do not conflict because running `eslint .` from the root uses only the root config; the frontend config is only used when ESLint is run from within `apps/frontend/`.

8. **Using `app.use('/health', health.fetch)` instead of `app.route('/health', health)`.** With Hono sub-applications, always use `app.route()` for composing routers.

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ESLint v10 (initially installed via `^10.2.1` from frontend) introduced per-directory config lookup as the default, causing `apps/frontend/eslint.config.js` to be loaded during root-level lint. This triggered `typescript-eslint`'s stack-based `tsconfigRootDir` detection to find two candidate roots (repo root + `apps/frontend/`), throwing "multiple candidate TSConfigRootDirs". Downgraded both root and frontend to ESLint `^9.0.0` which does not do per-directory config lookup by default.

### Completion Notes List

- Installed ESLint v9, `@eslint/js`, `typescript-eslint`, `globals`, and `prettier` as root devDependencies.
- Also downgraded `apps/frontend/package.json` `eslint` and `@eslint/js` from `^10.x` to `^9.0.0` to prevent npm workspace hoisting of v10.
- Created root `eslint.config.js` using `tseslint.config()` with `tsconfigRootDir` set via `fileURLToPath(import.meta.url)`. Backend/shared block uses `globals.node`; frontend block adds React plugins.
- Created `prettier.config.js` (singleQuote, no semi, trailingComma es5, printWidth 100) and `.prettierignore`.
- Ran `npm run format` to reformat all scaffold files to match the new Prettier config.
- Created `apps/backend/src/routes/health.ts` — Hono sub-app returning `{ status: 'ok' }` on `GET /`.
- Replaced `apps/backend/src/index.ts` with full implementation: health route first, then CORS middleware, global error handler with status-to-code mapping, dynamic PORT.
- Added Docker healthcheck (`wget -qO-`) with `start_period: 10s` to `docker-compose.yml` backend service.
- All verifications pass: `npm run lint` (exit 0), `npm run format:check` (exit 0), `tsc` (exit 0).

## File List

- `package.json` (modified — added lint/format scripts, added devDependencies: eslint, @eslint/js, globals, prettier, typescript-eslint)
- `eslint.config.js` (created — root flat config for ESLint v9)
- `prettier.config.js` (created)
- `.prettierignore` (created)
- `apps/frontend/package.json` (modified — downgraded eslint and @eslint/js from ^10 to ^9)
- `apps/backend/src/routes/health.ts` (created)
- `apps/backend/src/index.ts` (modified — full replacement with health, CORS, error handler)
- `docker-compose.yml` (modified — added healthcheck to backend service)
- `package-lock.json` (modified — updated by npm install)

### Review Findings

- [x] [Review][Decision] CORS default origin won't match Vite dev server — Resolved: allow both `http://localhost` and `http://localhost:5173` by default; `CORS_ORIGIN` env var overrides (comma-separated). [apps/backend/src/index.ts]
- [x] [Review][Patch] React ESLint plugins missing from root devDependencies — Fixed: added `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` to root `devDependencies`. [package.json]
- [x] [Review][Patch] Docker frontend `depends_on` missing `condition: service_healthy` — Fixed: updated to `condition: service_healthy`. [docker-compose.yml]
- [x] [Review][Defer] Frontend eslint downgrade violates story scope boundary — deferred, pre-existing

## Change Log

- 2026-04-27: Implemented Story 1.5 — ESLint, Prettier, health endpoint, Docker healthcheck. Downgraded ESLint from v10 to v9 to avoid per-directory config lookup conflict with nested frontend eslint.config.js.
