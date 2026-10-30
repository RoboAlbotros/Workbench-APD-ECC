# ADR-0001 — Browser UI with loopback SQL API

Status: Accepted
Date: 2026-10-30
Owner: Brett (technical owner)
Related: SPRINT-006, SPRINT-007, DEC-015

## Context

The tracker began as a browser/localStorage prototype. Operators need shared
persistence on INTDEV without exposing a public API process.

## Decision

Keep the SPA in `CJISTracker/` and persist applicants through a Node API that
listens only on `127.0.0.1`, reverse-proxied by IIS. When SQL is connected, the
browser uses GET/PUT `/api/applicants`; otherwise it falls back to localStorage.
Documents and the change log remain browser-local in this architecture phase.

## Consequences

- Positive: shared SQL data; same-origin `/api` via IIS; no public Node bind.
- Negative: API is unauthenticated on loopback; host compromise can mutate data;
  browser audit trail is not server-immutable.
- Follow-on: SPRINT-008 / G-SEC for server authn/z; optional server audit later.
