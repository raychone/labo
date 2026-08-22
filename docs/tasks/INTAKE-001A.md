# INTAKE-001A - Optional Clinic/Doctor Data Model

## Status

COMPLETED

## Objective

Allow works and work cycles to be created or edited with clinic only, doctor only, both, or neither.

## Dependencies

- REALIGN-001A

## Scope

- Made `work_orders.clinic_id`, `work_orders.doctor_id`, and `work_cycles.clinic_id` nullable.
- Added deterministic non-destructive migration.
- Updated work create, edit, deadline preview, and next-cycle DTOs to accept missing clinic/doctor.
- Updated service validation so missing clinic/doctor is accepted, while doctor-clinic membership is still enforced when both are present.
- Updated deadline and pricing resolution to fall back to standard catalog pricing when clinic/doctor agreement context is missing.
- Updated API read models and frontend shared types for nullable clinic/doctor relations.
- Added UI support for optional clinic/doctor in work create/edit/return forms and doctor-only filtering.
- Added fallback rendering in Works, Status, Scan, Technician workbench, Dashboard, Patients, Logistics, Delivery and Billing surfaces.
- Added focused create-work coverage for all optional clinic/doctor combinations.

## Out of scope

- Doctor registry redesign.
- Logistics route/pickup final model.
- Final intake field layout and teeth selector.
- Billing commercial redesign.

## Acceptance criteria

1. Works can be created with both clinic and doctor.
2. Works can be created with clinic only.
3. Works can be created with doctor only.
4. Works can be created with neither clinic nor doctor.
5. Existing clinic/doctor foreign keys are preserved when present.
6. Doctor must still belong to the selected clinic when both are provided.
7. Downstream views render missing clinic/doctor without crashing.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- works.service
pnpm --filter @dental-lab/web test -- works-page.test.tsx work-scan-page.test.tsx status-page.test.tsx status-tv-page.test.tsx
```

Results:

- Prisma Client generated.
- API typecheck passed.
- Web typecheck passed.
- API tests passed: 54 files, 232 tests.
- Web tests passed: 26 files, 83 tests.

## Manual checks

- Reviewed migration for nullable-only changes with no data rewrite.
- Verified create-work service persists `clinicId`/`doctorId` as provided, including `null`.
- Verified forms no longer mark clinic/doctor as required.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260820102000_optional_work_clinic_doctor/migration.sql`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/api/src/modules/works/*`
- `apps/api/src/modules/pricing/pricing-resolver.service.ts`
- `apps/api/src/modules/status/operational-status.view.ts`
- `apps/api/src/modules/technician-assignments/technician-assignments.view.ts`
- `apps/api/src/modules/qr/qr.view.ts`
- `apps/api/src/modules/scan/scan.service.ts`
- `apps/api/src/modules/billing/*`
- `apps/api/src/modules/logistics/*`
- `apps/api/src/modules/delivery/*`
- `apps/api/src/modules/patients/patients.view.ts`
- `apps/web/src/app/dashboard-page.tsx`
- `apps/web/src/features/works/*`
- `apps/web/src/features/status/*`
- `apps/web/src/features/technician-workbench/technician-workbench-page.tsx`
- `apps/web/src/features/billing/billing-page.tsx`
- `apps/web/src/features/patients/patients-page.tsx`
- `packages/shared/src/works.ts`
- `packages/shared/src/status.ts`
- `packages/shared/src/technician-assignments.ts`
- `packages/shared/src/billing.ts`
- `packages/shared/src/patients.ts`
- `docs/modules/works.md`
- `docs/tasks/INTAKE-001A.md`

## Next task

`INTAKE-001B` should realign the actual Reception intake fields around patient, optional clinic/doctor, work type, color, deadline date/time, elements, teeth hook, and notes.
