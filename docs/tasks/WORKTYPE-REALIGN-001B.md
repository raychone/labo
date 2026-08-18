# WORKTYPE-REALIGN-001B - Catalog UX display rules

## Status

COMPLETED

## Objective

Apply final Work Type display rules: work creation/edit forms use the long catalog `name` as the primary selector text, while Status and compact operational views use the short `symbol`.

## Dependencies

- WORKTYPE-REALIGN-001A

## Scope

- Extended work and operational status read models with `workType.symbol`.
- Extended work form Work Type options with `symbol`.
- Updated the work form selector to show long `name` as the selected value and primary option text.
- Kept the Work Type symbol visible as secondary selector context.
- Updated Status and Status TV rows/cards/detail views to use the short symbol.
- Updated Status Work Type filters to show `symbol · name`.
- Added Status search support for Work Type `symbol`.
- Updated focused backend and frontend mocks/tests.

## Out of scope

- New pricing UI.
- Official final catalog import/upsert.
- Technician workbench display realignment.
- Work code/QR shortening.

## Acceptance criteria

1. Work creation/edit selector primary text is the long Work Type name.
2. Status table and cards show the short Work Type symbol.
3. Status TV table and cards show the short Work Type symbol.
4. API work/status responses include `workType.symbol`.
5. Status search can match Work Type symbol.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/shared typecheck
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- operational-status works.controller
pnpm --filter @dental-lab/web test -- works-page.test.tsx status-page.test.tsx status-tv-page.test.tsx dashboard-page.test.tsx
```

Results:

- Shared typecheck passed.
- API typecheck passed.
- Web typecheck passed.
- API tests passed: 53 files, 223 tests.
- Web tests passed: 26 files, 83 tests.

## Manual checks

- Reviewed work form selector rendering: selected value and option primary label use `name`, not generated internal `code`.
- Reviewed Status and Status TV rendering: Work Type badge uses `symbol` with fallback to `name`.
- Verified filters remain human-readable via `symbol · name`.

## Files changed

- `apps/api/src/modules/status/operational-status.service.ts`
- `apps/api/src/modules/status/operational-status.view.ts`
- `apps/api/src/modules/status/operational-status.*.test.ts`
- `apps/api/src/modules/works/works.service.ts`
- `apps/api/src/modules/works/works.view.ts`
- `apps/api/src/modules/works/works.controller.test.ts`
- `apps/web/src/features/works/work-form.tsx`
- `apps/web/src/features/works/works-page.tsx`
- `apps/web/src/features/works/works-page.test.tsx`
- `apps/web/src/features/works/work-scan-page.test.tsx`
- `apps/web/src/features/status/status-page.tsx`
- `apps/web/src/features/status/status-page.test.tsx`
- `apps/web/src/features/status/status-tv-page.tsx`
- `apps/web/src/features/status/status-tv-page.test.tsx`
- `apps/web/src/app/dashboard-page.test.tsx`
- `packages/shared/src/status.ts`
- `packages/shared/src/works.ts`
- `docs/modules/work-types.md`
- `docs/tasks/WORKTYPE-REALIGN-001B.md`

## Next task

`WORK-ID-001A` should implement the short annual visible work code format `WO-YY-NNNN` while keeping QR resolution independent.

