# TEETH-001A - Canonical Tooth config

## Status

COMPLETED

## Objective

Add one reusable adult permanent FDI tooth configuration for work intake and dynamic work-form validation.

## Dependencies

- INTAKE-001A

## Scope

- Added shared adult permanent FDI quadrant configuration.
- Exported canonical tooth codes, quadrant labels and a deterministic selection normalizer from `@dental-lab/shared`.
- Kept `FDI_TOOTH_CODES` as a compatibility alias for adult permanent teeth.
- Updated dynamic tooth UI options to use adult permanent teeth only.
- Updated backend work-form submission validation to reject non-adult FDI values and normalize accepted selections to canonical order.
- Mirrored the canonical adult FDI list inside the API validator because the API package does not currently consume `@dental-lab/shared` at typecheck/build time without widening its `rootDir`.
- Added focused shared and API validation tests.

## Out of scope

- Four-quadrant multiselect UI layout.
- Per-work-type mandatory tooth rules.
- Tooth-specific pricing or technical details.

## Acceptance criteria

1. Adult permanent FDI identifiers are the only accepted tooth values.
2. Temporary teeth such as `51` are rejected by backend validation.
3. Duplicate selections are deduped.
4. Persisted/API selections are ordered deterministically by canonical quadrant order.
5. Shared config exposes the four final quadrants: `Sus dreapta`, `Sus stanga`, `Jos stanga`, `Jos dreapta`.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/shared typecheck
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/shared test -- work-forms
pnpm --filter @dental-lab/api test -- work-form-submission-validation.service
```

Results:

- Shared typecheck passed.
- API typecheck passed.
- Web typecheck passed.
- Shared tests passed: 12 files, 43 tests. The command was targeted with `work-forms`, but current Vitest config still ran the shared package suite.
- API tests passed: 54 files, 233 tests. The command was targeted with `work-form-submission-validation.service`, but current Vitest config still ran the API package suite.

## Manual checks

- Reviewed shared quadrant order against the canonical roadmap.
- Verified current tooth picker data source now excludes temporary teeth.

## Files changed

- `packages/shared/src/work-forms.ts`
- `packages/shared/src/work-forms.test.ts`
- `packages/shared/src/index.ts`
- `apps/api/src/modules/work-forms/work-form-submission-validation.service.ts`
- `apps/api/src/modules/work-forms/work-form-submission-validation.service.test.ts`
- `apps/web/src/features/works/work-dynamic-form.tsx`
- `docs/modules/forms.md`
- `docs/modules/works.md`
- `docs/tasks/TEETH-001A.md`

## Next task

`TEETH-001B` should replace the flat tooth selector with the reusable four-quadrant multiselect UI in Reception and Logistics forms.
