# REALIGN-001B - Final realignment RBAC permissions

## Status

COMPLETED

## Objective

Seed the granular permission keys needed by the final workflow realignment before feature endpoints and UI actions are implemented.

## Dependencies

- REALIGN-001A
- RBAC-001

## Scope

- Added permission registry keys for:
  - technician technical details and production finalization;
  - technician operations, rates and earnings;
  - logistics alert and delivery/pickup marker updates;
  - pickup requests;
  - courier routes and route outcomes;
  - invoice storno;
  - discounts.
- Added final role grants for Manager, Technician, Logistics and Courier.
- Added override eligibility for the new keys.
- Updated registry tests to lock the new key set and representative grants.

## Out of scope

- No new endpoints.
- No Prisma schema changes.
- No seed data beyond registry-driven permission upserts.
- No sidebar or UI pages.

## Acceptance criteria

1. New final workflow permission keys exist exactly once in `PERMISSION_REGISTRY`.
2. Manager receives all new keys through the existing all-permissions grant.
3. Technician can read operations, manage own performed operations, read own earnings, edit assigned technical details and finalize assigned production.
4. Logistics can manage pickup requests, routes, logistics alerts and delivery/pickup markers.
5. Courier can read assigned routes, read assigned pickup context and execute own route outcomes.
6. Reception does not gain new billing, route, technician-rate or earnings permissions.
7. New permissions are eligible for user-level overrides where operationally useful.

## Automated checks

Command:

```sh
pnpm --filter @dental-lab/api test -- permission-registry.test.ts
```

Result: passed. Vitest ran the API suite: 53 test files, 223 tests.

## Manual checks

- Reviewed `apps/api/src/modules/rbac/permission-registry.ts`.
- Verified representative matrix expectations in `permission-registry.test.ts`.

## Files changed

- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/api/src/modules/rbac/permission-registry.test.ts`
- `docs/modules/rbac.md`
- `docs/tasks/REALIGN-001B.md`

## Next task

`WORKTYPE-REALIGN-001A` is the next safest code-bearing slice because it adds the official `symbol`/long-name catalog before intake and Status depend on display rules.
