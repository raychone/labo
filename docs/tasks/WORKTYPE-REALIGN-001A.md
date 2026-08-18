# WORKTYPE-REALIGN-001A - Work Type symbol foundation

## Status

COMPLETED

## Objective

Add a dedicated Work Type `symbol` field so operational views can later show the short business symbol while preserving the existing generated internal `code`.

## Dependencies

- REALIGN-001A
- REALIGN-001B
- WORKTYPES-001

## Scope

- Added `work_types.symbol` to Prisma schema.
- Added deterministic migration with safe backfill: `symbol = code` for existing rows.
- Added unique/indexed `symbol` constraint.
- Exposed `symbol` in Work Type DTOs, API views and shared frontend types.
- Made `symbol` required for Work Type create and editable on update.
- Included `symbol` in search and sort fields.
- Updated Work Type admin form/table and option label.
- Updated demo seed data and pricing seed creates to populate `symbol`.
- Updated focused backend/frontend tests and generated Prisma Client.

## Out of scope

- Official final catalog data import/upsert.
- Long-name form display vs short-symbol Status display rollout.
- Work creation form realignment.
- Pricing model changes.

## Acceptance criteria

1. Existing rows receive a non-null symbol during migration.
2. Existing generated internal `code` remains unchanged and unique.
3. New Work Types require `symbol`.
4. API list/detail/options include `symbol`.
5. Search can match `symbol`.
6. Admin UI can create/edit/view `symbol`.
7. Demo seeds create Work Types with `symbol`.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- work-types
pnpm --filter @dental-lab/web test -- work-types-page.test.tsx
```

Results:

- API typecheck passed.
- Web typecheck passed.
- API tests passed: 53 files, 223 tests.
- Web tests passed: 26 files, 83 tests.

## Manual checks

- Reviewed migration for non-destructive backfill.
- Verified `code` and `symbol` remain distinct fields.
- Verified Work Type admin displays a separate `Simbol` column/input.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260817141000_work_type_symbol/migration.sql`
- `apps/api/prisma/demo/demo-data.ts`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/api/src/modules/work-types/*`
- `apps/api/src/modules/workflow-templates/workflow-templates.service.test.ts`
- `apps/api/src/modules/works/works.service.test.ts`
- `apps/web/src/features/work-types/*`
- `apps/web/src/features/status/status-page.test.tsx`
- `apps/web/src/features/status/status-tv-page.test.tsx`
- `packages/shared/src/work-types.ts`
- `docs/modules/work-types.md`
- `docs/tasks/WORKTYPE-REALIGN-001A.md`

## Next task

`WORKTYPE-REALIGN-001B` should apply final display rules: work creation/edit forms show long `name` as the primary selector value, while Status/compact operational views show `symbol`.
