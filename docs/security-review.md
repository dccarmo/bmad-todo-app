# Security Review — Todo Application

**Date:** 2026-04-28  
**Reviewer:** AI-assisted (Claude Sonnet 4.6) + human verification  
**Scope:** Full-stack TypeScript monorepo (Hono backend, React frontend, PostgreSQL)

---

## Methodology

AI-assisted review covering OWASP Top 10 (2021) categories, with focus on:
- Injection (A03)
- Broken Access Control (A01)
- Security Misconfiguration (A05)
- XSS (A03/A07)
- Insecure Design (A04)
- Logging & Monitoring (A09)

---

## Findings

### ✅ PASS — SQL Injection

**Assessment:** Not vulnerable.

All database queries use Drizzle ORM's parameterized query builder (`db.select().from(todos)`, `.where(eq(todos.id, id))`). No raw SQL string concatenation is used anywhere in the application. The health check uses `sql\`SELECT 1\`` via Drizzle's tagged template, which is also parameterized.

---

### ✅ PASS — Input Validation

**Assessment:** Strong validation at API boundary.

- All POST/PATCH request bodies are validated with Zod schemas (`createTodoSchema`, `updateTodoSchema`) from the shared package.
- Route parameters (`:id`) are validated as UUIDs with `z.string().uuid().safeParse()` before reaching the database — invalid IDs return 400 without touching the DB.
- Validation errors return structured 400 responses, never raw stack traces.

---

### ✅ PASS — XSS (Cross-Site Scripting)

**Assessment:** Not vulnerable.

React's JSX rendering escapes all dynamic content by default. Todo text is rendered via `{todo.text}` in JSX, never via `dangerouslySetInnerHTML`. No `innerHTML` or `document.write` usage found.

---

### ✅ PASS — CORS Configuration

**Assessment:** Properly restricted.

- Wildcard origin (`*`) is explicitly rejected at startup with a thrown error.
- Invalid URLs in `CORS_ORIGIN` are also rejected at startup.
- Default allowed origins are `http://localhost` and `http://localhost:5173` (dev only).
- Production deployments must set `CORS_ORIGIN` explicitly via environment variable.

---

### ✅ PASS — Secrets Management

**Assessment:** No secrets committed.

- `.env` is gitignored; `.env.example` contains only placeholder values.
- `DATABASE_URL` and `POSTGRES_PASSWORD` are injected at runtime via environment variables.
- Docker Compose uses `${VAR:-default}` syntax; defaults are dev-only values not suitable for production.

---

### ✅ PASS — Error Handling / Information Disclosure

**Assessment:** Internal errors are not exposed.

- All route handlers use try/catch; only `HTTPException` messages pass through to clients.
- Unhandled errors are logged with `console.error` and respond with `"Internal server error"` — no stack traces in responses.
- Database connection errors are logged but not surfaced to the frontend.

---

### ✅ PASS — Dependency Security

**Assessment:** No known critical vulnerabilities.

`npm audit` was run post-install. One moderate advisory in a dev-only transitive dependency (unrelated to the application's runtime surface). No critical or high-severity vulnerabilities in production dependencies.

---

### ⚠️ ADVISORY — No Authentication / Authorization

**Assessment:** By design (noted in PRD), but documented for deployment awareness.

The API has no authentication. Any client with network access to the backend can read, create, modify, or delete all todos. This is acceptable for a single-user local deployment but must be addressed before any multi-user or internet-facing deployment.

**Recommended remediation for future stories:**
- Add JWT-based authentication middleware in Hono
- Scope all queries to `userId` foreign key
- Rotate the `POSTGRES_PASSWORD` default before production use

---

### ⚠️ ADVISORY — Rate Limiting Absent

**Assessment:** Low risk for local use, relevant for internet-facing deployment.

The API has no rate limiting. A malicious client could flood the POST endpoint creating unbounded todos.

**Recommended remediation:** Add Hono's rate-limiting middleware or upstream reverse-proxy limits (nginx, Cloudflare) before internet deployment.

---

### ⚠️ ADVISORY — HTTP-only (no HTTPS enforcement)

**Assessment:** Acceptable for local Docker deployment; required for production.

The Nginx frontend config does not enforce HTTPS redirects. In production, TLS termination should occur at the load balancer / reverse proxy, and HTTP → HTTPS redirect should be configured.

---

### ⚠️ ADVISORY — Content Security Policy (CSP) not set

**Assessment:** Low risk given no auth cookies or sensitive data, but best practice.

The Nginx config does not set a `Content-Security-Policy` header. Recommended for production:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
```

---

## Summary

| Category | Status | Severity |
|----------|--------|----------|
| SQL Injection | ✅ Not vulnerable | — |
| XSS | ✅ Not vulnerable | — |
| Input Validation | ✅ Strong | — |
| CORS | ✅ Properly restricted | — |
| Secrets | ✅ Not committed | — |
| Error Disclosure | ✅ Suppressed | — |
| Dependencies | ✅ Clean | — |
| Authentication | ⚠️ Absent by design | Advisory |
| Rate Limiting | ⚠️ Absent | Advisory |
| HTTPS / TLS | ⚠️ Not enforced | Advisory |
| CSP Header | ⚠️ Not set | Advisory |

**No critical or high-severity vulnerabilities found.** All advisories are pre-conditions for internet-facing deployment, not exploitable defects in the current local-Docker scope.
