# INTAKE-001B - Canonical Intake Fields

## Status

COMPLETED

## Objective

Realign Reception `Lucrare noua` around the final intake fields while preserving existing work creation, QR, deadline, form-template and audit flows.

## Dependencies

- INTAKE-001A
- WORKTYPE-REALIGN-001B
- WORK-ID-001A

## Scope

- Added native nullable `work_orders.shade` for dental color/shade.
- Exposed `shade` through work DTOs, API views and shared frontend types.
- Included `shade` in work create/update persistence, search and audit metadata/change detection.
- Reused existing `quantity` as canonical `Elemente`.
- Updated Reception work form labels to patient, optional clinic/doctor, long work type, `Elemente`, `Culoare`, delivery deadline date/time, and notes.
- Added `requestedDeliveryTime` UI state and mapped date+time to `manualDueAt` on create.
- Kept QR generation, work code generation, dynamic work form submission and creation audit on the existing flow.
- Added focused API and frontend coverage for canonical intake payload.

## Out of scope

- Native teeth storage and four-quadrant selector.
- Logistics attachments.
- Automatic claim eligibility changes beyond existing flow.
- Generic update-flow manual deadline redesign.

## Acceptance criteria

1. Reception create form shows patient, optional clinic/doctor, work type, elements, color, deadline date/time and notes.
2. Save persists `shade`, `quantity`, notes and deadline input.
3. Create continues to generate the short work code and opaque QR token through existing services.
4. Create audit metadata includes the new color/shade field.
5. Newly created work still uses the existing form-template and deadline preview mechanics.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- works.service
pnpm --filter @dental-lab/web test -- works-page.test.tsx
```

Results:

- Prisma Client generated.
- API typecheck passed.
- Web typecheck passed.
- API focused command passed: `works.service.test.ts` included, command result 54 files / 232 tests due current Vitest project matching behavior.
- Web focused command passed: `works-page.test.tsx` included with new canonical intake test, command result 26 files / 84 tests due current Vitest project matching behavior.

## Manual checks

- Reviewed migration: nullable add-column only.
- Verified `quantity` remains the persisted element count.
- Verified create form no longer presents "Cantitate" as the primary business label.
- Verified notes are submitted via existing `clinicalNotes`.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260820113000_work_order_shade/migration.sql`
- `apps/api/src/modules/works/dto/works.dto.ts`
- `apps/api/src/modules/works/works.service.ts`
- `apps/api/src/modules/works/works.service.test.ts`
- `apps/api/src/modules/works/works.view.ts`
- `apps/web/src/features/works/work-form.tsx`
- `apps/web/src/features/works/works-page.schema.ts`
- `apps/web/src/features/works/works-page.tsx`
- `apps/web/src/features/works/works-page.test.tsx`
- `packages/shared/src/works.ts`
- `docs/modules/works.md`
- `docs/tasks/INTAKE-001B.md`

## Next task

`TEETH-001A` should add the canonical adult permanent FDI tooth configuration and validation helper before the four-quadrant selector is implemented.
