# STATUS-REALIGN-001A - Status Read Model

## Status

COMPLETED

## Scope

- Added final Status fields for persisted claim timestamp and work color/shade.
- Kept WorkType symbol in the operational payload.
- Preserved null clinic/doctor handling for UI fallback.
- Kept overdue calculation dynamic from deadline state.

## Validation

- `pnpm --filter @dental-lab/api test -- operational-status.view.test.ts --reporter=dot`
- `pnpm --filter @dental-lab/api typecheck`
- `pnpm --filter @dental-lab/shared typecheck`
