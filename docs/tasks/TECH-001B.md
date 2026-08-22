# TECH-001B - Details and Technical Code

## Status

COMPLETED

## Objective

Add technician-editable work details and the `Cod` textarea on owned work.

## Dependencies

- TECH-001A

## Scope

- Added `work_orders.technical_code_notes` for the technician `Cod` textarea.
- Added dedicated API payload and endpoint: `PATCH /works/:id/technician-details`.
- Enforced `works.technical_details.update` server-side; `ALL` can edit any work, scoped users can edit only owned/assigned work.
- Allowed technician detail updates for `clinicalNotes`, `internalNotes`, and `technicalCodeNotes`.
- Added audit action `work_orders.technical_details_updated` with changed fields.
- Exposed `technicalCodeNotes` in work detail API/shared types.
- Updated `/workbench` `Detalii` action to open an editable modal with work summary fields and textareas for notes plus `Cod`.

## Out of scope

- Editing all intake fields from the technician modal.
- Operation/manopere selection and earnings.
- Manager audit UI.

## Acceptance criteria

1. Technician can open `Detalii` from `Lucrarile mele`.
2. Modal shows reception-created work context.
3. Technician can save `Cod` as a textarea value.
4. Unauthorized/unassigned technician updates are blocked server-side.
5. Manager-visible audit data is written for changed technical detail fields.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/shared typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- works.service
pnpm --filter @dental-lab/web test -- technician-workbench-page.test.tsx
```

Results:

- Prisma Client generation passed.
- API typecheck passed.
- Shared typecheck passed.
- Web typecheck passed.
- API focused command passed; current Vitest package config still executed the full API test set: 54 files, 239 tests.
- Web focused command passed; current Vitest package config still executed the full web test set: 26 files, 86 tests.

## Manual checks

- Reviewed modal behavior for desktop/mobile constraints.
- Verified `Cod` is separate from visible work code and QR token.
- Verified regular reception update endpoint remains separate from technician details endpoint.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260820133000_work_technical_code_notes/migration.sql`
- `apps/api/src/modules/works/*`
- `apps/web/src/features/technician-workbench/*`
- `apps/web/src/features/works/works-api.ts`
- `packages/shared/src/works.ts`
- `packages/shared/src/index.ts`
- `docs/modules/technician-execution.md`
- `docs/modules/works.md`
- `docs/tasks/TECH-001B.md`

## Next task

`OPS-001A` should add the technician operation (`Manopera`) catalog, separate from Work Types.
