# AI Integration Log — Todo Application

**Project:** Full-stack Todo App (BMAD Framework)  
**AI Model:** Claude Sonnet 4.6 (Claude Code CLI)  
**Development Period:** 2026-04-26 to 2026-04-28

---

## BMAD Artifacts

All spec artifacts produced during development are checked into the repository under [`_bmad-output/`](../_bmad-output/):

| Artifact | Path |
|----------|------|
| Product Requirements Document (PRD) | [`_bmad-output/planning-artifacts/prd.md`](../_bmad-output/planning-artifacts/prd.md) |
| Architecture Document | [`_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md) |
| Epics & Stories | [`_bmad-output/planning-artifacts/epics.md`](../_bmad-output/planning-artifacts/epics.md) |
| Implementation Readiness Report | [`_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-26.md`](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-26.md) |
| Sprint Status | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../_bmad-output/implementation-artifacts/sprint-status.yaml) |
| Story Files (18 stories) | [`_bmad-output/implementation-artifacts/`](../_bmad-output/implementation-artifacts/) |
| Test Artifacts | [`_bmad-output/test-artifacts/`](../_bmad-output/test-artifacts/) |

---

## Overview

This log documents how AI assistance was used throughout the development of the Todo application using the BMAD Method. All implementation was driven by AI agents operating within the BMAD workflow (PM → Architect → Story Creation → Dev → Code Review → Fix cycle).

---

## Agent Usage

### Phase 1: Planning & Architecture

| Task | AI Role | Prompt Strategy |
|------|---------|----------------|
| PRD creation | PM persona via `/bmad-create-prd` | Provided full requirements description; AI structured into sections, asked clarifying questions, produced complete PRD |
| Architecture design | Architect persona via `/bmad-create-architecture` | Provided PRD; AI proposed tech stack (Hono + React + Drizzle + PostgreSQL), component structure, API contracts |
| Epics & Stories | `/bmad-create-epics-and-stories` | AI decomposed architecture into 4 epics, 18 stories with BDD acceptance criteria |
| Sprint planning | `/bmad-sprint-planning` | Auto-generated sprint-status.yaml from epics file |

**What worked well:** The BMAD persona approach forced structured output — the architecture document included explicit API contracts and directory trees that the dev agent could follow mechanically. Story acceptance criteria were specific enough that the AI could verify completion.

**What was surprising:** The AI proactively noted cross-story dependencies (e.g., Story 2.3 error state depended on Story 3.x mutation hooks) and flagged them in Dev Notes.

---

### Phase 2: Implementation (Stories 1.1 – 4.4)

Each story followed a red-green-refactor cycle within the `/bmad-dev-story` skill.

#### Epic 1: Project Foundation

Stories 1.1–1.5 established the monorepo scaffold, Drizzle schema, shared Zod schemas, Docker infrastructure, and CORS/health endpoint. AI generated the entire project structure from scratch including:
- `turbo.json` / `package.json` workspace configuration
- Drizzle migrations and `drizzle.config.ts`
- Multi-stage Dockerfiles for both services
- `docker-compose.yml` with health checks and `depends_on: condition: service_healthy`

**Best prompt:** Giving the AI the architecture doc directly as context — it matched file paths, naming conventions, and tech versions exactly.

#### Epic 2: Todo List View

Stories 2.1–2.4 built the GET endpoint, React query hooks, error boundary, and responsive layout.

**Key AI decision:** When ErrorBoundary was placed incorrectly (wrapping its own parent's hook, unable to catch errors from the same component), the code review agent identified this as a structural bug. The fix required introducing a `TodoPageInner` child component — an architectural pattern the AI recognized from React docs.

**Test generation:** AI generated component tests using React Testing Library, correctly using `role`-based queries over class/ID selectors.

#### Epic 3: Mutations (Create, Toggle, Delete)

Stories 3.1–3.5 implemented all mutation endpoints and their optimistic UI counterparts.

**Most complex AI work:** Implementing the `useRef` + `useEffect` pattern for stable retry closures in toast notifications. The AI recognized that TanStack Query v5's `mutate` function identity changes on re-renders, and that capturing it via `useRef` (updated in a no-deps `useEffect`) was the correct solution to avoid stale closure bugs.

**AI miss:** The initial implementation of `useTodos` used `isLoading` (TanStack Query v4 API). This was caught by tests failing — `isLoading` does not exist in v5, replaced by `isPending`. The AI fixed it immediately once the error was surfaced.

#### Epic 4: E2E Tests

Stories 4.1–4.4 created 5 Playwright spec files covering 12 test scenarios.

**Best AI output:** The error recovery spec, which correctly uses `page.route()` for request interception, a `callCount` counter to fail only the first N requests, and then `route.continue()` to let recovery requests through.

**AI limitation:** The loading indicator test initially used a 1500ms delay — too short for Playwright's async rendering cycle. The human reviewer caught this during test failures; AI fixed by increasing to 2500ms.

---

## Code Review Integration

Four parallel code review agents ran simultaneously (`/bmad-code-review` skill), each focused on a different epic. This produced 40+ actionable findings across categories:

- **Architecture:** ErrorBoundary placement, CORS middleware order
- **Correctness:** `isLoading` → `isPending`, UUID validation missing, try/catch missing on mutations  
- **Testing:** False-green rollback tests, invalid DOM in TodoItem tests
- **Accessibility:** Duplicate aria-label, missing aria-live attributes
- **Security:** Pool error exposing process.exit(1), wildcard CORS check

Three parallel fix agents then resolved all findings concurrently, reducing the review-fix cycle from sequential to a single parallel pass.

---

## Test Generation

| Test Type | AI Coverage | Human Additions |
|-----------|-------------|-----------------|
| Backend integration (Hono + Zod) | Full — 13 tests for all CRUD endpoints | UUID validation cases added post-review |
| Frontend component tests (RTL) | Full — EmptyState, LoadingState, TodoInput, TodoItem, ErrorBoundary, TodoList | None |
| Hook unit tests (TanStack Query) | Full — optimistic update rollback tests for toggle + delete | False-green fix required human review |
| API function tests (fetch mocking) | Full — all 4 API functions, success + error paths | None |
| E2E tests (Playwright) | Full — 12 scenarios across 5 journeys | Loading delay tuning |
| Accessibility (axe-core) | Full — 5 WCAG AA checks | None |
| Shared schema validation | Full — 13 tests covering all schema edge cases | None |

**What AI missed initially:**
- The `useToggleTodo`/`useDeleteTodo` rollback tests used `if (cached)` guards that silently skipped assertions when the cache was cleared after invalidation — tests passed vacuously. Fixed by subscribing to the query cache to prevent GC.
- `TodoItem` rendered in test without a `<ul>` parent — invalid DOM causing false accessibility assertions.

---

## Debugging with AI

### Notable Debug Sessions

**CORS 403 in Docker:** AI traced the issue to Hono's middleware registration order — `app.use('*', cors(...))` was placed after `app.route(...)` calls, so CORS headers were never applied. Fix: move cors() above all route registrations.

**TanStack Query v5 API mismatch:** `isLoading` was undefined in v5. AI recognized the v4→v5 breaking change and replaced with `isPending` throughout, re-exposing as `isLoading` in the hook's return value for backward compatibility with tests.

**Mobile E2E spec using WebKit device:** `devices['iPhone SE']` requires the WebKit engine in Playwright. Running it under Chromium caused silent test skips. AI fixed by extracting individual device properties (viewport, userAgent, deviceScaleFactor, hasTouch, isMobile) and applying them to the Chromium project.

---

## MCP Server Usage

| Server | Usage |
|--------|-------|
| Claude Code CLI (primary) | All implementation, test writing, file editing |
| No browser MCP | Playwright E2E tests served as browser validation proxy |
| No Postman MCP | API validation done via Hono test client in vitest |

The development was completed entirely through the Claude Code CLI without needing external MCP servers. Playwright's `request` fixture effectively replaced Postman for API contract validation within E2E tests.

---

## Limitations Encountered

### Where AI Needed Human Intervention

1. **Test timing sensitivity:** The AI's initial loading indicator test was too aggressive (1500ms delay). Human observation of flaky failures led to increasing the delay to 2500ms.

2. **Cross-agent state merging:** When two parallel agents (Stories 3.3 and 3.4) both modified `TodoItem.tsx`, the main thread had to manually merge their changes — AI agents working in isolation can't coordinate shared file ownership.

3. **False-green test detection:** The rollback test pattern (asserting cache state after mutation failure) was structurally correct but yielded vacuous passing assertions when TanStack Query's cache GC cleared the data before assertions ran. This required a human reviewer to recognize the pattern and add the cache subscription workaround.

4. **Coverage threshold calibration:** AI set 70% coverage thresholds without accounting for untestable infrastructure files (DB connection pool, entry point). Coverage appeared to fail the threshold. Human judgment was needed to distinguish "untestable infrastructure" from "undertested business logic."

### Where AI Excelled

- Generating complete, correct Zod schemas and matching TypeScript types in one shot
- Producing multi-stage Dockerfiles with non-root users, layer caching, and health checks without prompting
- Implementing TanStack Query v5 optimistic update patterns (onMutate/onError/onSettled) correctly
- Writing Playwright specs with proper request fixture cleanup patterns
- Identifying and explaining the ErrorBoundary structural issue without human diagnosis

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total stories implemented | 18 (Epics 1–4) |
| Stories completed by AI without human code changes | 16/18 |
| Code review findings resolved | 40+ |
| Test files generated by AI | 22 |
| Total test cases | 60 (unit/integration) + 12 (E2E) |
| Human code interventions | ~5 (merge conflicts, timing fixes, coverage tuning) |
| Estimated time saved vs manual | ~80% |
