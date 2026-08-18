# WORK-ID-001A - Short annual work code

## Status

COMPLETED

## Objective

Change newly generated visible work order codes to the short annual format `WO-YY-NNNN`, while keeping QR tokens opaque and preserving legacy work-code lookup.

## Dependencies

- REALIGN-001A
- WORKTYPE-REALIGN-001B

## Scope

- Added a dedicated `work_order_code_counters` table for annual work-code counters.
- Added Prisma model `WorkOrderCodeCounter`.
- Added deterministic migration with safe initialization from already existing short-format codes.
- Updated `WorkOrderCodeService` to generate `WO-YY-NNNN`.
- Kept existing `WorkOrder.code` values unchanged.
- Updated QR/manual lookup validation to accept both `WO-YY-NNNN` and legacy `WO-YYYY-NNNNNN`.
- Updated demo work codes to the new format.
- Updated manual scan placeholder and module documentation.
- Added focused generator and QR compatibility tests.

## Out of scope

- Renumbering historical work orders.
- Changing opaque QR token payloads.
- Changing invoice, delivery, status, or audit records that already reference legacy work codes.
- Physical label redesign.

## Acceptance criteria

1. A new 2026 work code can be generated as `WO-26-0001`.
2. Annual sequence increments atomically per year.
3. Existing legacy work codes remain searchable/resolvable.
4. QR payloads remain opaque `dl-work:` tokens.
5. Demo works use short annual codes.

## Migration notes

- The new table is initialized only from existing `WO-YY-NNNN` rows.
- Existing `WO-YYYY-NNNNNN` rows are not renumbered and do not advance the new annual counter.
- The old `work_order_code_seq` is left in place for historical compatibility and rollback safety but is no longer used by `WorkOrderCodeService`.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api prisma:validate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- work-order-code qr.service works.service works.controller
pnpm --filter @dental-lab/shared test -- scan
pnpm --filter @dental-lab/web test -- works-page.test.tsx work-scan-page.test.tsx
```

Results:

- Prisma generate passed.
- Prisma validate passed.
- API typecheck passed.
- Web typecheck passed.
- API tests passed: 54 files, 226 tests.
- Shared tests passed: 12 files, 42 tests.
- Web tests passed: 26 files, 83 tests.

## Manual checks

- Reviewed migration for non-destructive behavior.
- Verified generator returns `WO-26-0001` under a 2026 clock.
- Verified QR parser accepts both `WO-26-0001` and `WO-2026-000001`.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260817161000_short_annual_work_code/migration.sql`
- `apps/api/prisma/demo/demo.constants.ts`
- `apps/api/prisma/demo/demo-data.ts`
- `apps/api/src/modules/works/work-order-code.service.ts`
- `apps/api/src/modules/works/work-order-code.service.test.ts`
- `apps/api/src/modules/works/works.service.test.ts`
- `apps/api/src/modules/qr/qr.constants.ts`
- `apps/api/src/modules/qr/qr.service.test.ts`
- `apps/web/src/features/works/manual-scan-form.tsx`
- `docs/GLOSSARY.md`
- `docs/modules/works.md`
- `docs/modules/qr.md`
- `docs/tasks/WORK-ID-001A.md`
- `packages/shared/src/scan.test.ts`

## Next task

`WORK-ID-001B` should prove QR separation end to end for short visible work codes and legacy QR/manual fallback paths.

