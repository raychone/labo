# TECH-001A - Technician Workbench UX

## Status

COMPLETED

## Objective

Split the technician workbench into `Lucrari de preluat` and `Lucrarile mele` using the claim/state behavior already enforced by the backend.

## Dependencies

- CLAIM-001B
- STATE-001A

## Scope

- Simplified `/workbench` around the final technician surfaces.
- Replaced the stage-queue primary UI with two work lists: available works and own claimed works.
- Kept `Preia` for available works.
- Added own-work actions: `Detalii`, `Manopere`, `Finalizata`.
- Added a full-screen `Manopere` modal shell with empty state until the operation catalog/snapshot subepics provide real data.
- Wired `Finalizata` to `POST /works/:id/status` with status `FINALIZATA`.
- Added frontend API helper/hook for work status mutation.
- Preserved mobile filter behavior.

## Out of scope

- Editable detail fields and technical `Cod` textarea.
- Real manopere catalog, selection and earnings.
- Route/logistics delivery candidate UI.

## Acceptance criteria

1. Technician sees `Lucrari de preluat` and `Lucrarile mele` as the primary workbench surfaces.
2. Available work cards expose `Preia`.
3. Own work cards expose `Detalii`, `Manopere`, and `Finalizata`.
4. `Manopere` opens a full-screen modal shell.
5. `Finalizata` calls the status endpoint and refreshes workbench/status queries.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/shared typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/web test -- technician-workbench-page.test.tsx
```

Results:

- Shared typecheck passed.
- Web typecheck passed.
- Web focused command passed; current Vitest package config still executed the full web test set: 26 files, 86 tests.

## Manual checks

- Reviewed `/workbench` flow for desktop/mobile layout.
- Verified old stage queue is no longer the primary technician surface.
- Verified `Manopere` remains a shell because operation/rate/snapshot data is owned by later `OPS-*` tasks.

## Files changed

- `apps/web/src/features/technician-workbench/technician-workbench-page.tsx`
- `apps/web/src/features/technician-workbench/technician-workbench-page.css`
- `apps/web/src/features/technician-workbench/technician-workbench-page.test.tsx`
- `apps/web/src/features/works/works-api.ts`
- `packages/shared/src/works.ts`
- `packages/shared/src/index.ts`
- `docs/modules/technician-execution.md`
- `docs/modules/works.md`
- `docs/tasks/TECH-001A.md`

## Next task

`TECH-001B` should add editable technician details and the `Cod` textarea.
