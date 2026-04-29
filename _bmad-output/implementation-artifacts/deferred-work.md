# Deferred Work

## Deferred from: code review of 1-1-monorepo-and-project-scaffold (2026-04-26)

- **@types/node version mismatch** (^24 in frontend vs ^20 in backend) — pre-existing from scaffolding tools; both versions satisfy Node types for this scope; align when upgrading Node target
- **tsconfig.node.json missing @todo-app/shared paths alias** — only matters if vite.config.ts imports from @todo-app/shared, which it does not currently; revisit if that changes

## Deferred from: code review of 1-2-shared-types-and-validation-schemas (2026-04-26)

- **`"types"` field in packages/shared/package.json points to src/index.ts** — intentional for monorepo dev (tsconfig paths bypass this); revisit when setting up production build/distribution — needs to point to dist/index.d.ts
- **todoSchema and Todo interface structurally decoupled** — both defined independently instead of using `z.infer<typeof todoSchema>`; intentional per spec design; revisit if schemas and types diverge
- **Missing `exports` field in packages/shared/package.json** — not needed for current monorepo tsconfig-paths workflow; add when production distribution or subpath imports are needed
- **Zod v3/v4 dual-install at root** — zod@4 pulled by transitive dep (likely vitest); packages/shared uses local v3; no runtime conflict now; becomes relevant when apps add direct zod imports — ensure they pin to v3

## Deferred from: code review of 1-3-database-schema-and-migrations (2026-04-27)

- **Multi-replica migration race condition** — `drizzle-kit migrate` runs unconditionally on every container start with no advisory lock; two replicas starting simultaneously can run migrations concurrently — architectural concern for Story 1.4 Docker/orchestration setup
- **`gen_random_uuid()` requires PostgreSQL 13+** — migration SQL uses `DEFAULT gen_random_uuid()` which is a core function only from PG 13; no version guard or pgcrypto fallback — acceptable for modern Postgres targets in this project
- **No `updatedAt` column on todos table** — `completed` is mutable but there is no `updated_at` timestamp for audit trails, cache invalidation, or conflict resolution — not in spec, consider for future requirements
- **start.sh relative path assumes CWD = apps/backend** — `node_modules/.bin/drizzle-kit migrate` resolves relative to working directory; intentional per spec for Docker WORKDIR context — Story 1.4 Docker setup must ensure WORKDIR is set to /app (apps/backend) in the container

## Deferred from: code review of 1-4-docker-and-environment-setup (2026-04-27)

- **Frontend override has orphaned port 80** — Compose merges ports, so `80:80` remains active alongside `5173:5173` in dev mode; nothing listens on port 80 in the builder stage; acceptable developer confusion, no crash
- **`depends_on: backend` without `condition: service_healthy`** — backend has no healthcheck defined; fixing requires a `/health` endpoint which is planned for Story 1.5 — NOTE: this is now patched in Story 1.5
- **Default credentials in compose fallbacks** — `postgres:postgres` as default in `${POSTGRES_PASSWORD:-postgres}` and DATABASE_URL; intentional for local dev tooling, not a production concern

## Deferred from: code review of 1-5-code-quality-tooling-and-health-endpoint (2026-04-27)

- **Frontend eslint downgrade violates story scope boundary** — `apps/frontend/package.json` eslint downgraded `^10→^9` to fix ESLint v10 per-directory config lookup conflict. The scope boundary "do not modify frontend ESLint config" was intended to prevent rule changes, not toolchain fixes; flagged by Acceptance Auditor as out-of-scope but the change is required for correctness.
