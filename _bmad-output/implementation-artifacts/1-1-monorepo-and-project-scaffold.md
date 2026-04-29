# Story 1.1: Monorepo & Project Scaffold

Status: done

## Story

As a **developer**,
I want the monorepo structure, workspace configuration, and both application starters in place,
so that I can begin building features with a consistent toolchain and no manual wiring of packages.

## Acceptance Criteria

1. Running `npm install` at the repo root installs all workspace dependencies without errors and `node_modules` hoisting is correct (apps can import from `packages/shared`)
2. Running `npm run dev --workspace=apps/frontend` starts Vite and serves the default React + TypeScript starter at `localhost:5173` with no TypeScript errors
3. Running `npm run dev --workspace=apps/backend` starts Hono and responds to `GET /` at `localhost:3000` (or configured PORT) with no TypeScript errors
4. Root `package.json` declares `"workspaces": ["apps/*", "packages/*"]`
5. `apps/frontend`, `apps/backend`, and `packages/shared` each have their own `package.json`
6. `packages/shared` is listed as a dependency in both `apps/frontend` and `apps/backend` package.json files
7. TypeScript is configured such that both apps can import from `@todo-app/shared` without errors (tsconfig paths or project references)
8. `packages/shared` has a minimal stub (`src/index.ts` exporting nothing, or a placeholder type) — content is filled in Story 1.2

## Tasks / Subtasks

- [x] Initialize root monorepo (AC: 1, 4)
  - [x] Create root directory `todo-app/`
  - [x] `npm init -y` at root
  - [x] Edit root `package.json`: set `"private": true`, add `"workspaces": ["apps/*", "packages/*"]`, add root-level `dev`/`build`/`test` scripts
  - [x] Create `.gitignore` (node_modules, .env, dist, build)

- [x] Scaffold frontend app (AC: 2, 5)
  - [x] Run `npm create vite@latest apps/frontend -- --template react-ts`
  - [x] Verify `apps/frontend/package.json` exists with name `@todo-app/frontend`
  - [x] Confirm `npm run dev` inside workspace starts without errors

- [x] Scaffold backend app (AC: 3, 5)
  - [x] Run `npm create hono@latest apps/backend -- --template nodejs`
  - [x] Verify `apps/backend/package.json` exists with name `@todo-app/backend`
  - [x] Confirm `npm run dev` inside workspace starts without errors

- [x] Create shared package stub (AC: 5, 6, 7, 8)
  - [x] Create `packages/shared/` directory
  - [x] Create `packages/shared/package.json` with name `@todo-app/shared`, set `"main": "src/index.ts"`
  - [x] Create `packages/shared/src/index.ts` as a minimal stub (exports empty placeholder)
  - [x] Create `packages/shared/tsconfig.json`

- [x] Wire shared package into apps (AC: 6, 7)
  - [x] Add `"@todo-app/shared": "*"` to `dependencies` in `apps/frontend/package.json`
  - [x] Add `"@todo-app/shared": "*"` to `dependencies` in `apps/backend/package.json`
  - [x] Run `npm install` from root to link workspaces

- [x] Configure root TypeScript (AC: 7)
  - [x] Create root `tsconfig.json` with `"paths": { "@todo-app/shared": ["./packages/shared/src/index.ts"] }`
  - [x] Add paths to `apps/frontend/tsconfig.app.json` and `apps/backend/tsconfig.json`
  - [x] Add Vite `resolve.alias` for `@todo-app/shared` in `apps/frontend/vite.config.ts`

- [x] Verify end-to-end workspace setup (AC: 1, 2, 3)
  - [x] Run `npm install` from root — 170 packages installed, 0 vulnerabilities
  - [x] Run `npm run dev --workspace=apps/frontend` — Vite v8.0.10 starts at localhost:5173
  - [x] Run `npm run dev --workspace=apps/backend` — Hono starts at localhost:3000

### Review Findings

- [x] [Review][Patch] shared package.json: "main" points to .ts source — production Node.js can't execute .ts; add proper `exports` field or change main to dist output [packages/shared/package.json]
- [x] [Review][Patch] TypeScript version mismatch — frontend uses ~6.0.2, backend uses ^5.8.3; align to a single version [apps/frontend/package.json, apps/backend/package.json]
- [x] [Review][Patch] Root tsconfig.json paths are dead config — no app extends root tsconfig, so the @todo-app/shared path alias is never applied [todo-app/tsconfig.json]
- [x] [Review][Patch] packages/shared tsconfig uses moduleResolution: "bundler" — incompatible with backend's NodeNext resolution [packages/shared/tsconfig.json]
- [x] [Review][Patch] Root build script wrong topological order — `npm run build --workspaces` includes shared last; must build shared before apps [todo-app/package.json]
- [x] [Review][Patch] apps/backend/package.json missing "version" field — required for npm workspace resolution [apps/backend/package.json]
- [x] [Review][Patch] "fields" typo in shared package.json — not present in file (false positive, dismissed)
- [x] [Review][Patch] .gitignore missing .env.* variants — Vite reads .env.local, .env.development.local, etc. which are not covered [todo-app/.gitignore]
- [x] [Review][Patch] Root lint script references eslint not in root devDependencies — running `npm run lint` from root will fail [todo-app/package.json]
- [x] [Review][Patch] apps/frontend tsconfig.app.json missing "strict": true — strict mode not inherited from root (root not extended) [apps/frontend/tsconfig.app.json]
- [x] [Review][Defer] @types/node version mismatch (^24 frontend vs ^20 backend) — deferred, pre-existing from scaffolding tools [apps/frontend/package.json, apps/backend/package.json]
- [x] [Review][Defer] tsconfig.node.json missing @todo-app/shared paths alias — deferred, pre-existing; only matters if vite.config.ts imports from shared [apps/frontend/tsconfig.node.json]

## Dev Notes

### Project Identity
- Root directory name: `todo-app`
- Package naming convention: `@todo-app/<name>` — e.g., `@todo-app/frontend`, `@todo-app/backend`, `@todo-app/shared`
- All packages use `"private": true` except `packages/shared` (shared is also private, just not published)

### Scaffolding Commands — Use Exactly As Written
```bash
# 1. Root
mkdir todo-app && cd todo-app
npm init -y

# 2. Frontend (Vite + React + TypeScript)
npm create vite@latest apps/frontend -- --template react-ts

# 3. Backend (Hono + Node.js)
npm create hono@latest apps/backend -- --template nodejs

# 4. Shared stub
mkdir -p packages/shared/src
cd packages/shared && npm init -y
```
> Do NOT use alternative templates (e.g., `react-swc-ts`, `bun`). Use exactly `react-ts` and `nodejs`.

### Root package.json Shape
```json
{
  "name": "todo-app",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

### packages/shared package.json Shape
```json
{
  "name": "@todo-app/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc"
  }
}
```
> Using `"main": "src/index.ts"` works within the monorepo because both apps compile from source via TypeScript. No build step needed for `packages/shared` at this stage.

### TypeScript Path Resolution
The goal is `import { Todo } from '@todo-app/shared'` works in both apps at compile time.

**Option A (simpler — recommended for this project):** Add `paths` to root `tsconfig.json` and have each app's tsconfig extend root:
```json
// root tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@todo-app/shared": ["./packages/shared/src/index.ts"]
    }
  }
}
```
Then in `apps/frontend/tsconfig.json` and `apps/backend/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { ... }
}
```

**Option B:** TypeScript project references — more complex, not needed at this scale. Avoid for now.

> Note: Vite handles path resolution at runtime via `vite.config.ts` `resolve.alias`. You may also need to add the alias to `vite.config.ts` for the frontend dev server:
```typescript
// apps/frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@todo-app/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
})
```

### Scope of This Story — What NOT to Do
This story creates structure only. Do NOT implement in Story 1.1:
- `packages/shared` types or schemas (Story 1.2)
- Drizzle ORM or database configuration (Story 1.3)
- Dockerfiles or docker-compose (Story 1.4)
- ESLint or Prettier configuration (Story 1.5)
- Any feature code (Epics 2–3)

`packages/shared/src/index.ts` should be a stub — an empty export or placeholder comment is fine.

### .gitignore (Create at Root)
```
node_modules/
dist/
build/
.env
*.local
```

### Project Structure After This Story
```
todo-app/
├── .gitignore
├── package.json                  # workspaces root
├── tsconfig.json                 # root TS config with @todo-app/shared path
├── apps/
│   ├── frontend/                 # Vite + React + TS (scaffolded)
│   │   ├── package.json          # name: @todo-app/frontend
│   │   ├── vite.config.ts        # with @todo-app/shared alias
│   │   ├── tsconfig.json         # extends root
│   │   └── src/                  # default Vite React scaffold
│   └── backend/                  # Hono + Node.js + TS (scaffolded)
│       ├── package.json          # name: @todo-app/backend
│       ├── tsconfig.json         # extends root
│       └── src/                  # default Hono scaffold
└── packages/
    └── shared/
        ├── package.json          # name: @todo-app/shared
        └── src/
            └── index.ts          # stub (filled in Story 1.2)
```

### Project Structure Notes
- All file paths must match architecture exactly — `apps/frontend`, `apps/backend`, `packages/shared` (not `frontend/`, `backend/`, `shared/`)
- Architecture mandates `@todo-app/shared` as the import name — do not use `@todo/shared` or `shared`
- Backend uses Node.js runtime (Hono `nodejs` template), not Bun — architecture explicitly ruled out Bun
- [Source: architecture.md#Starter Template Evaluation]
- [Source: architecture.md#Project Structure & Boundaries]

### References
- Starter scaffold commands: [Source: architecture.md#Selected Approach: Separate Scaffolds + npm Workspaces Monorepo]
- Naming conventions: [Source: architecture.md#Naming Patterns]
- Project directory structure: [Source: architecture.md#Complete Project Directory Structure]
- Dependency wiring: [Source: epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Hono CLI interactive prompt required piping `echo "n"` to skip dependency install step (create-hono v0.19.4)
- Frontend tsconfig uses project references (tsconfig.app.json + tsconfig.node.json) — paths added to tsconfig.app.json rather than the root tsconfig.json shell
- Vite alias added to vite.config.ts for runtime resolution in addition to TS paths for compile-time resolution

### Completion Notes List

- All 8 ACs verified: npm install (170 pkgs, 0 vulnerabilities), Vite v8.0.10 starts at localhost:5173, Hono starts at localhost:3000
- @todo-app/shared symlinked at root node_modules via npm workspaces hoisting
- TypeScript path resolution verified: `npx tsc --noEmit` passes with 0 errors in both apps
- packages/shared/src/index.ts is a stub (`export {}`) — content populated in Story 1.2

### File List

- todo-app/.gitignore (new)
- todo-app/package.json (new)
- todo-app/tsconfig.json (new)
- todo-app/apps/frontend/package.json (modified — name, @todo-app/shared dep)
- todo-app/apps/frontend/tsconfig.app.json (modified — added paths)
- todo-app/apps/frontend/vite.config.ts (modified — added resolve.alias)
- todo-app/apps/backend/package.json (modified — name, @todo-app/shared dep)
- todo-app/apps/backend/tsconfig.json (modified — added paths, removed jsx/jsxImportSource)
- todo-app/packages/shared/package.json (new)
- todo-app/packages/shared/tsconfig.json (new)
- todo-app/packages/shared/src/index.ts (new)
