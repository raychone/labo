# STATUS-TV-001 - Laboratory TV status mode

## Status

COMPLETED.

## Objective

Add a dedicated fullscreen operational status mode for a physical laboratory TV.

## Dependencies

- STATUS-001A
- STATUS-001B
- SHELL-001
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../TESTING.md](../TESTING.md)
- [../SECURITY.md](../SECURITY.md)
- [../modules/works.md](../modules/works.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../tasks/STATUS-001A.md](STATUS-001A.md)
- [../tasks/STATUS-001B.md](STATUS-001B.md)

## Scope

- Dedicated authenticated route such as `/status/tv`.
- Fullscreen read-only layout with no sidebar, top navigation, or shell chrome.
- No mutation controls.
- Large readable typography and row spacing suitable for several meters of viewing distance.
- Uses the existing operational status read model.
- Default view favors active / in-progress works.
- Filters are hidden by default and optional if exposed.
- Periodic polling refresh only, with a conservative interval.
- Technician preferred color badge when assigned.
- Patient name.
- Work type badge.
- Cycle number.
- Current stage / flux badge.
- State badge.
- Priority badge.
- Deadline.
- Logistics / delivery state only if already safely exposed by the read model.
- Loading, empty, and error states.
- Romanian labels.
- Authenticated and permission-aware access.
- No financial data.

## Out of scope

- Backend business-rule changes.
- New read-model semantics.
- WebSockets.
- Public unauthenticated access.
- Mutating actions.
- Financial totals or billing views.
- New workflow execution logic.

## Business decisions

- Confirmed: the TV mode must reuse the existing operational status contracts.
- Confirmed: this is a readonly display mode for an internal laboratory screen, not a public page.
- Confirmed: polling is acceptable; WebSockets are not required.
- Confirmed: the route must still respect RBAC.

## Data model changes

None expected.

## API changes

No backend API redesign is expected. Reuse the existing operational status endpoint and contracts.

## UI changes

Implement a dedicated large-screen status workspace with a compact hidden-by-default filter panel, scalable row cards/table, current time and last-updated indicator if practical, and no shell navigation chrome.

## Security and RBAC

- Reuse status read permissions.
- Keep the route authenticated.
- Do not create public access.
- Do not expose financial fields.

## Audit

None expected. The page is read-only.

## Task-specific tests

- Route protection.
- Fullscreen no-shell rendering.
- Polling/refetch behavior.
- Active-cycle row visibility.
- Technician color rendering.
- No mutation controls.
- No financial fields.

## Acceptance criteria

1. `/status/tv` or the chosen canonical TV route exists and is protected.
2. The page renders without sidebar/top navigation.
3. The page is readable on a TV-sized display.
4. The page shows only read-only operational status data.
5. Polling refresh works without resetting UI state.
6. Technician color badges render when present.
7. No financial fields or mutation controls appear.
8. Loading, empty, and error states exist.
9. Tests pass.
10. Build passes.
11. Documentation is updated.
12. One commit only.
13. Working tree is clean.
14. Next task is not started.

Acceptance status:

- Completed. `/status/tv` is a protected fullscreen readonly operational display that reuses the existing status read model, hides shell chrome, polls periodically, and exposes no financial or mutating controls.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../modules/works.md](../modules/works.md)
- this task document

## Commit

`STATUS-TV-001: add laboratory TV status mode`

## Next task

Stop after STATUS-TV-001.
