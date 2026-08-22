# TEETH-001B - Four-quadrant multiselect UI

## Status

COMPLETED

## Objective

Implement the reusable four-quadrant adult FDI tooth multiselect for work forms.

## Dependencies

- TEETH-001A

## Scope

- Updated the reusable dynamic `TOOTH` field renderer to group teeth by canonical quadrants.
- Kept the saved value contract as `string[]`.
- Normalized selected values on each toggle so UI submission order matches backend canonical order.
- Added responsive layout for desktop and mobile.
- Added focused frontend test coverage for quadrant rendering and ordered multiselect submission.

## Out of scope

- Per-work-type mandatory tooth rules.
- Separate logistics intake page, which will reuse this component when implemented.
- Tooth-level pricing or technical operation details.

## Acceptance criteria

1. The tooth selector shows `Sus dreapta`, `Sus stanga`, `Jos stanga`, and `Jos dreapta`.
2. Users can select and deselect multiple teeth across quadrants.
3. Submitted values remain a stable `string[]`.
4. Submitted values are normalized to canonical FDI order.
5. The layout remains usable on mobile.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/web test -- works-page.test.tsx
```

Results:

- Web typecheck passed.
- Web tests passed: 26 files, 85 tests. The command was targeted with `works-page.test.tsx`, but current Vitest config still ran the web package suite.

## Manual checks

- Reviewed the selector markup and CSS for stable button sizes and responsive single-column mobile layout.
- Verified the component remains reusable through the existing dynamic work-form renderer.

## Files changed

- `apps/web/src/features/works/work-dynamic-form.tsx`
- `apps/web/src/features/works/works-page.css`
- `apps/web/src/features/works/works-page.test.tsx`
- `docs/modules/forms.md`
- `docs/modules/works.md`
- `docs/tasks/TEETH-001B.md`

## Next task

`CLAIM-001A` should remove any manual dispatch dependency so newly created reception works are immediately visible in the technician claimable-work pool.
