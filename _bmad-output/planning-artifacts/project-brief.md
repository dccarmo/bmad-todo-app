---
type: project-brief
generatedBy: BMAD PM persona (/bmad-create-prd workflow, steps 02b–02c)
date: 2026-04-26
---

# Project Brief — Todo App

**Author:** Diogo  
**Date:** 2026-04-26  
**Classification:** Web App (SPA + REST API) · Greenfield · General Domain · Low Complexity

---

## One-Liner

A lightweight full-stack Todo application for individual users to manage personal tasks — designed around one principle: get out of the user's way.

---

## Problem Statement

People need a frictionless way to track what they need to do. Existing tools accumulate features, settings, and onboarding until the tool itself becomes a task. The opportunity is to deliver radical simplicity executed with care: a todo app that does less and does it better.

## Target User

Any individual who needs to track personal tasks. No persona segmentation required — the experience is intentionally universal. The UI should require zero instruction for a first-time user.

## Value Proposition

*The easiest todo app you can use.* Every design and technical decision is evaluated against that standard.

---

## Scope

### In (v1)

- Create a todo with a short text description
- View all todos in a single, immediately visible list
- Mark a todo as complete (toggle)
- Delete a todo
- Persist todos across browser sessions via a backend API
- Visual distinction between active and completed todos
- Responsive layout (desktop + mobile)
- Graceful empty, loading, and error states

### Out (v1 — future consideration)

- User accounts / authentication
- Multi-user or collaboration features
- Task prioritization, deadlines, or tags
- Notifications or reminders
- Offline mode

---

## Architecture Constraints

- The backend API must be designed to support authentication and multi-user features in future versions without requiring a structural rewrite
- The solution must be fully containerized (Docker Compose) for consistent deployment
- Data must persist across sessions — no in-memory-only storage

---

## Success Criteria (Abbreviated)

| Criterion | Target |
|-----------|--------|
| First-time user completes full task lifecycle | < 60 seconds, no guidance |
| UI interactive on load | < 1 second under normal conditions |
| Data persistence | Survives browser refresh and new sessions |
| CRUD operations | All four work end-to-end |
| Test coverage | ≥ 70% meaningful code coverage |
| E2E tests | ≥ 5 passing Playwright scenarios |
| Accessibility | Zero critical WCAG AA violations |

---

## Delivery

Single release. No phased rollout. Scope is intentionally narrow to deliver a complete, polished core experience rather than a partial implementation of a broader one.
