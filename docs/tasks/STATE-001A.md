# STATE-001A - Final Work State Transitions

## Status

COMPLETED

## Objective

Align persisted work operational states with the final workflow: `RECEPTIE`, `IN_LUCRU`, `IN_ASTEPTARE`, and `FINALIZATA`.

## Dependencies

- CLAIM-001B

## Scope

- Added final `WorkStatus` enum values while keeping legacy `REGISTERED` readable.
- Changed new work default state to `RECEPTIE`.
- Added explicit persisted timestamps and actors for status changes and completion.
- Claim/reassign now move work to `IN_LUCRU`; release returns non-final work to `RECEPTIE`.
- Added `POST /works/:id/status` for authorized status changes.
- Enforced final transitions: `RECEPTIE -> IN_LUCRU`, `IN_LUCRU -> IN_ASTEPTARE|FINALIZATA`, `IN_ASTEPTARE -> IN_LUCRU`.
- Added audit entries for status changes.
- Split PostgreSQL enum and data/default migration steps to avoid unsafe enum-value usage in the same migration.

## Out of scope

- Delivery/route outcomes.
- Final Status table realignment.
- Technician workbench redesign.

## Acceptance criteria

1. New works are created in `RECEPTIE`.
2. Claimed/reassigned works move to `IN_LUCRU`.
3. Claimed works can move to `IN_ASTEPTARE` and back to `IN_LUCRU`.
4. Claimed works can move from `IN_LUCRU` to `FINALIZATA`.
5. Invalid direct transitions are rejected.
6. Status mutation stores explicit timestamp/actor fields and audit.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/shared typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- works.service
```

Results:

- Prisma Client generation passed.
- API typecheck passed.
- Shared typecheck passed.
- Web typecheck passed.
- API focused command passed; current Vitest package config still executed the full API test set: 54 files, 237 tests.

## Manual checks

- Reviewed migration order for PostgreSQL enum safety.
- Verified final states remain separate from workflow stage execution.
- Verified legacy `REGISTERED` remains in accepted read/filter constants for historical compatibility.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260820123000_final_work_states/migration.sql`
- `apps/api/prisma/migrations/20260820123100_final_work_states_columns/migration.sql`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/api/src/modules/patients/patients.constants.ts`
- `apps/api/src/modules/scan/scan.service.ts`
- `apps/api/src/modules/works/*`
- `packages/shared/src/works.ts`
- `packages/shared/src/index.ts`
- `docs/modules/works.md`
- `docs/modules/claim.md`
- `docs/modules/workflow.md`
- `docs/tasks/STATE-001A.md`

## Next task

`TECH-001A` should split the technician workbench into `Lucrari de preluat` and `Lucrarile mele` using the persisted claim/state behavior.
