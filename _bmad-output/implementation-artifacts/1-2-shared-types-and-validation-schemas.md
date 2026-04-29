# Story 1.2: Shared Types & Validation Schemas

Status: done

## Story

As a **developer**,
I want the shared TypeScript types and Zod validation schemas in `packages/shared`,
So that both the frontend and backend use the same data contracts with no duplication.

## Acceptance Criteria

1. `packages/shared/src/types.ts` exports the `Todo` interface: `{ id: string; text: string; completed: boolean; createdAt: string }`
2. `packages/shared/src/types.ts` exports `CreateTodoInput`: `{ text: string }`
3. `packages/shared/src/types.ts` exports `ApiError`: `{ error: { code: string; message: string } }`
4. `packages/shared/src/schemas.ts` exports `createTodoSchema` (Zod): validates `CreateTodoInput` — `text` is non-empty string, max 500 characters
5. `packages/shared/src/schemas.ts` exports `todoSchema` (Zod): validates the full `Todo` shape
6. `packages/shared/src/index.ts` re-exports all types and schemas from types.ts and schemas.ts
7. `import { Todo } from '@todo-app/shared'` resolves in `apps/frontend` with no TypeScript errors
8. `import { createTodoSchema } from '@todo-app/shared'` resolves in `apps/backend` with no TypeScript errors; `createTodoSchema.parse({ text: "hello" })` succeeds at runtime
9. Unit tests exist for schema validation — happy paths and edge cases (empty string, over 500 chars) pass with Vitest

## Tasks / Subtasks

- [x] Install dependencies in packages/shared (AC: 4, 5, 9)
  - [x] Add `"type": "module"` to `packages/shared/package.json` (required for NodeNext ESM)
  - [x] Add `zod` to dependencies in `packages/shared/package.json`
  - [x] Add `vitest` to devDependencies in `packages/shared/package.json`
  - [x] Add `"test": "vitest run"` to scripts in `packages/shared/package.json`
  - [x] Run `npm install` from monorepo root to hoist and link

- [x] Create `packages/shared/src/types.ts` (AC: 1, 2, 3)
  - [x] Export `Todo` interface with `id`, `text`, `completed`, `createdAt` fields
  - [x] Export `CreateTodoInput` interface with `text` field
  - [x] Export `ApiError` interface matching `{ error: { code: string; message: string } }`
  - [x] Export `MAX_TODO_LENGTH = 500` constant (used by both schema and frontend input)

- [x] Create `packages/shared/src/schemas.ts` (AC: 4, 5)
  - [x] Import `z` from `zod`
  - [x] Export `createTodoSchema` validating `{ text: non-empty string, max 500 chars }`
  - [x] Export `todoSchema` validating the full `Todo` shape
  - [x] Import and use `MAX_TODO_LENGTH` from types.ts for the 500-char limit

- [x] Update `packages/shared/src/index.ts` (AC: 6)
  - [x] Remove stub `export {}`
  - [x] Re-export everything from `./types`
  - [x] Re-export everything from `./schemas`

- [x] Write Vitest unit tests for schema validation (AC: 9)
  - [x] Create `packages/shared/src/schemas.test.ts`
  - [x] Test `createTodoSchema` happy path: `{ text: "hello" }` parses successfully
  - [x] Test `createTodoSchema` rejects empty string
  - [x] Test `createTodoSchema` rejects string over 500 chars
  - [x] Test `createTodoSchema` rejects missing text field
  - [x] Test `todoSchema` happy path: full Todo object parses successfully

### Review Findings

- [x] [Review][Patch] tsconfig.json missing "rootDir": "./src" — without explicit rootDir, tsc infers correctly now but won't guard against accidental future inclusion of files outside src/ [packages/shared/tsconfig.json]
- [x] [Review][Defer] "types" field points to src/index.ts source — deferred, intentional for monorepo dev; tsconfig paths in both apps bypass this; revisit at production build setup [packages/shared/package.json]
- [x] [Review][Defer] todoSchema/Todo interface structurally decoupled (no z.infer) — deferred, intentional per spec design; separate types.ts and schemas.ts is the stated architecture
- [x] [Review][Defer] Missing exports field in package.json — deferred, not needed for current monorepo tsconfig-paths workflow; revisit for production distribution [packages/shared/package.json]
- [x] [Review][Defer] Zod v3/v4 dual-install at root — deferred, pre-existing; zod@4 pulled by transitive dep; shared correctly uses local v3; no runtime conflict

- [x] Verify TypeScript resolution end-to-end (AC: 7, 8)
  - [x] Run `npx tsc --noEmit --project apps/frontend/tsconfig.app.json` — 0 errors
  - [x] Run `npx tsc --noEmit --project apps/backend/tsconfig.json` — 0 errors
  - [x] Run `npm test --workspace=packages/shared` — all tests pass

## Dev Notes

### Context from Story 1.1 — What Already Exists

Story 1.1 completed and code-reviewed. The following is the current state of the monorepo:

**packages/shared/src/index.ts** (current stub — UPDATE this file):
```typescript
// Shared types and schemas — populated in Story 1.2
export {};
```

**packages/shared/package.json** (current state after code review patches — target shape for this story):
```json
{
  "name": "@todo-app/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```
> `"type": "module"` is required because `packages/shared/tsconfig.json` uses `module: "NodeNext"` — without it, TypeScript/Node.js would treat compiled .js output as CommonJS, conflicting with the ESM backend (`apps/backend/package.json` also has `"type": "module"`). Add it as part of the first task.
> `types` points to `src/index.ts` (TypeScript source) — TypeScript resolves types via this field directly from source, no build step needed in the monorepo.

**packages/shared/tsconfig.json** (current state after code review patches):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```
> IMPORTANT: `module: "NodeNext"` and `moduleResolution: "NodeNext"` — this was changed from "bundler" in code review. This means imports in packages/shared MUST use explicit file extensions if using relative imports between files (e.g., `import { X } from './types.js'` not `./types`). For Zod imports from node_modules, the bare specifier `'zod'` is fine.

**TypeScript path resolution already configured in both apps:**
- `apps/frontend/tsconfig.app.json` has `"paths": { "@todo-app/shared": ["../../packages/shared/src/index.ts"] }`
- `apps/backend/tsconfig.json` has `"paths": { "@todo-app/shared": ["../../packages/shared/src/index.ts"] }`
- `apps/frontend/vite.config.ts` has `resolve.alias` pointing to `../../packages/shared/src/index.ts`

No changes needed to any app tsconfigs or vite.config.ts — path resolution is already wired.

### What to Implement: File Structure

```
packages/shared/
├── package.json          ← ADD: zod dependency, vitest devDependency
├── tsconfig.json         ← NO CHANGE
└── src/
    ├── index.ts          ← UPDATE: re-export from types + schemas
    ├── types.ts          ← NEW: TypeScript interfaces
    ├── schemas.ts        ← NEW: Zod schemas
    └── schemas.test.ts   ← NEW: Vitest tests
```

**Do NOT create** any other files. Do NOT modify files in apps/frontend or apps/backend.

### types.ts — Exact Interface Definitions

```typescript
// packages/shared/src/types.ts

export const MAX_TODO_LENGTH = 500;

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO 8601 string — matches JSON API response camelCase
}

export interface CreateTodoInput {
  text: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

**Critical naming notes:**
- `createdAt` is **camelCase** in the TypeScript interface — this is the JSON API field name
- DB column is `created_at` (snake_case) — Drizzle ORM handles this mapping in Story 1.3
- Never define these types anywhere else — single source of truth in packages/shared
- `MAX_TODO_LENGTH = 500` is used by both the Zod schema (max validation) and future frontend input

### schemas.ts — Zod Schema Definitions

```typescript
// packages/shared/src/schemas.ts
import { z } from 'zod';
import { MAX_TODO_LENGTH } from './types.js'; // .js extension required for NodeNext resolution

export const createTodoSchema = z.object({
  text: z.string().min(1, 'Text is required').max(MAX_TODO_LENGTH, `Text must be at most ${MAX_TODO_LENGTH} characters`),
});

export const todoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(MAX_TODO_LENGTH),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});
```

**Important:**
- The `.js` extension on the relative import (`'./types.js'`) is **required** because `packages/shared/tsconfig.json` uses `moduleResolution: "NodeNext"`. TypeScript NodeNext resolution requires explicit extensions on relative imports.
- `z.string().min(1)` enforces non-empty — this is the canonical backend validation for the create endpoint
- `todoSchema` uses `z.string().uuid()` for `id` and `z.string().datetime()` for `createdAt` — strict validation of the API response shape
- Zod error messages in `createTodoSchema` are user-surfaceable: "Text is required", "Text must be at most 500 characters"

### index.ts — Re-export Everything

```typescript
// packages/shared/src/index.ts
export * from './types.js';    // .js extension required for NodeNext
export * from './schemas.js';  // .js extension required for NodeNext
```

Replace the entire file. The `.js` extensions are mandatory for NodeNext module resolution.

### Zod Version

The architecture specifies Zod for validation. Use **zod v3** (not v4) — `"zod": "^3.24.0"`.

Zod v4 has breaking changes in some advanced APIs. For this project's simple use case (object + string schemas), v3 and v4 APIs are identical, but v3 is the more battle-tested choice for a new project setup and avoids surprise breaking changes.

Install via:
```bash
npm install zod@^3.24.0 --workspace=packages/shared
```

### Vitest Configuration

Add `"test": "vitest run"` to `packages/shared/package.json` scripts. No separate vitest config file needed — vitest auto-discovers `*.test.ts` files.

Install:
```bash
npm install -D vitest@^3.0.0 --workspace=packages/shared
```

### schemas.test.ts — Test Coverage

```typescript
// packages/shared/src/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { createTodoSchema, todoSchema } from './schemas.js';

describe('createTodoSchema', () => {
  it('accepts valid text', () => {
    const result = createTodoSchema.parse({ text: 'hello' });
    expect(result.text).toBe('hello');
  });

  it('rejects empty string', () => {
    expect(() => createTodoSchema.parse({ text: '' })).toThrow();
  });

  it('rejects text over 500 chars', () => {
    expect(() => createTodoSchema.parse({ text: 'a'.repeat(501) })).toThrow();
  });

  it('accepts text at exactly 500 chars', () => {
    const result = createTodoSchema.parse({ text: 'a'.repeat(500) });
    expect(result.text).toHaveLength(500);
  });

  it('rejects missing text field', () => {
    expect(() => createTodoSchema.parse({})).toThrow();
  });
});

describe('todoSchema', () => {
  it('accepts a valid todo', () => {
    const todo = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      text: 'Buy milk',
      completed: false,
      createdAt: '2026-04-26T10:00:00.000Z',
    };
    const result = todoSchema.parse(todo);
    expect(result.id).toBe(todo.id);
  });
});
```

### NodeNext Module Resolution — Key Gotcha

Because `packages/shared/tsconfig.json` uses `module: "NodeNext"` and `moduleResolution: "NodeNext"`, **all relative imports within packages/shared must use `.js` extensions**, even when importing `.ts` files. TypeScript compiles `.ts` → `.js` and NodeNext requires the final extension.

This applies to:
- `import ... from './types.js'` in schemas.ts ✅
- `import ... from './schemas.js'` in index.ts ✅
- `import ... from './schemas.js'` in schemas.test.ts ✅

Do NOT write `'./types'` or `'./types.ts'` — both will fail with NodeNext resolution.

### Scope Boundary — What NOT to Implement

This story is **types and schemas only**. Do NOT implement:
- Drizzle ORM schema (Story 1.3)
- Any Hono routes or handlers (Epics 2–3)
- Any React components or hooks (Epics 2–3)
- TanStack Query setup (Story 2.2)
- Any backend route that uses `createTodoSchema` (that's Story 2.1+)

### Verification Commands

After implementation:
```bash
# 1. Run tests
npm test --workspace=packages/shared

# 2. TypeScript compile check
npx tsc --noEmit --project apps/frontend/tsconfig.app.json
npx tsc --noEmit --project apps/backend/tsconfig.json

# 3. Quick sanity check — ensure exports are visible
node -e "const s = require('./packages/shared/src/index.ts')" # won't work (TS) — use tsc check instead
```

### References

- Shared types location: [Source: architecture.md#Structure Patterns]
- createdAt camelCase: [Source: architecture.md#Naming Patterns — JSON Field Naming]
- Zod validation pattern: [Source: architecture.md#Process Patterns — Zod Validation Pattern]
- MAX_TODO_LENGTH: [Source: architecture.md#Naming Patterns — Constants]
- API error shape: [Source: architecture.md#API & Communication Patterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- npm installed zod@3.25.76 into packages/shared/node_modules (root hoisted zod@4.3.6 from vitest, but packages/shared correctly uses local 3.x via closest-first resolution)
- Vitest@3.2.4 auto-discovered — no vitest.config.ts needed; `vitest run` found all `*.test.ts` files
- `.js` extensions on relative imports in packages/shared required and working with NodeNext

### Completion Notes List

- All 9 ACs verified: types.ts exports Todo/CreateTodoInput/ApiError/MAX_TODO_LENGTH, schemas.ts exports createTodoSchema/todoSchema, index.ts re-exports all, TypeScript resolves from both apps with 0 errors, 8 Vitest tests pass
- `"type": "module"` added to packages/shared/package.json for NodeNext ESM compatibility
- createTodoSchema validates text as non-empty string max 500 chars with user-surfaceable error messages
- todoSchema validates full Todo shape including uuid format and datetime format
- packages/shared/src/index.ts updated from stub to re-export barrel file

## File List

- packages/shared/package.json (modified — added type:module, zod dep, vitest devDep, test script)
- packages/shared/src/index.ts (modified — replaced stub with re-exports)
- packages/shared/src/types.ts (new)
- packages/shared/src/schemas.ts (new)
- packages/shared/src/schemas.test.ts (new)

## Change Log

- 2026-04-26: Story 1.2 implemented — shared TypeScript types and Zod validation schemas added to packages/shared
