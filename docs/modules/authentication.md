# Authentication

## Status

Implemented.

## Purpose

Authenticate internal users with secure cookie sessions.

## Roles And Permissions

Authentication is required before RBAC applies. Demo login supports local presentation roles when demo mode is enabled.

## Domain Concepts

User, password hash, session, CSRF token, login rate limit.

## Business Rules

No public signup. Manager-created users only. Inactive users lose access. Invalid credentials use safe generic errors.

## Data Model

`User`, `Session`.

## API

`GET /auth/csrf`, `POST /auth/login`, `POST /auth/demo-login`, `GET /auth/me`, `GET /auth/permissions`, `POST /auth/logout`.

## UI

`/login` supports normal login and demo role buttons in demo mode.

## Audit

Login/logout/security actions are audited where implemented.

## Security

Argon2id, httpOnly session cookie, readable CSRF cookie, server-side session token hash, login rate limiting.

## Edge Cases

Expired, revoked, inactive-user, and missing-CSRF sessions must fail safely.

## Implemented Tasks

AUTH-001.

## Planned Tasks

SECURITY-001 may harden production deployment concerns.

## Deferred

Public password recovery.

## Open Decisions

Production session storage scaling and password recovery flow.

## Related Documents

[../SECURITY.md](../SECURITY.md), [rbac.md](rbac.md).
