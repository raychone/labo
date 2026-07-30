# Users

## Status

Implemented.

## Purpose

Manage internal application users.

## Roles And Permissions

Uses `users.create`, `users.read`, `users.update`, `users.disable`, `users.assign_roles`, `roles.read`, `permissions.read`.

## Domain Concepts

Internal account, active/disabled status, role assignment, temporary password, session revocation.

## Business Rules

No public signup. Disabling revokes sessions. Last active administrator protection is based on effective permissions.

## Data Model

`User`, `UserRole`, `Session`, RBAC tables.

## API

`GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/disable`, `POST /users/:id/enable`, `PUT /users/:id/roles`, `POST /users/:id/reset-password`.

## UI

`/users`.

## Audit

Create, update, disable, enable, role replacement, password reset.

## Security

Never return password hashes or raw temporary passwords from API.

## Edge Cases

Duplicate email, disabled users, revoking active sessions, last administrator.

## Implemented Tasks

USERS-001.

## Planned Tasks

None currently approved.

## Deferred

Public self-service account management.

## Open Decisions

Password rotation policy.

## Related Documents

[authentication.md](authentication.md), [rbac.md](rbac.md).
