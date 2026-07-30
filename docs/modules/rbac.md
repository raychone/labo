# RBAC

## Status

Implemented.

## Purpose

Authorize backend routes and resource actions with roles, permissions, scopes, and overrides.

## Roles And Permissions

Roles: `MANAGER`, `LOGISTICA`, `RECEPTIE`, `TEHNICIAN`, `CURIER`, `MEDIC`. Permission keys live in `apps/api/src/modules/rbac/permission-registry.ts`.

## Domain Concepts

Permission registry, role permissions, user overrides, scopes `ALL`, `ASSIGNED`, `OWN_CLINIC`, `OWN_DELIVERY`, `OWN_STAGE`.

## Business Rules

Backend RBAC is authoritative. Explicit deny overrides allow and role grants. `ALL` satisfies required scopes.

## Data Model

`Role`, `Permission`, `UserRole`, `RolePermission`, `UserPermissionOverride`.

## API

`GET /rbac/roles`, `GET /rbac/permissions`, `GET /auth/permissions`.

## UI

Navigation and actions are permission-aware but never replace backend checks.

## Audit

Role and override management should go through services that write audit events.

## Security

Do not store permissions in cookies. Re-evaluate effective permissions server-side.

## Edge Cases

Inactive users, deny overrides, resource ownership, and missing permission rows.

## Implemented Tasks

RBAC-001 and later permission extensions.

## Planned Tasks

Audit UI for inspecting authorization-relevant changes.

## Deferred

Advanced resource policies beyond current scopes.

## Open Decisions

Which override workflows will be exposed in UI beyond manager administration.

## Related Documents

[../SECURITY.md](../SECURITY.md), [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md).
