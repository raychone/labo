# STATUS-REALIGN-001B - Status UI

## Status

COMPLETED

## Scope

- Rendered final Status columns in canonical order.
- Displayed clinic-or-doctor fallback, short work type symbol, color, technician color/name, claim timestamp, deadline, state, alerts and delivery/pickup marker.
- Added large red overdue `!` for overdue rows.

## Validation

- `pnpm --filter @dental-lab/web test -- status-page.test.tsx --reporter=dot`
- `pnpm --filter @dental-lab/web typecheck`
