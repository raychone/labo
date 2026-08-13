# STATUS-TV-001B - TV readability and rotation polish

## Status

COMPLETED.

## Objective

Refine the dedicated TV status mode so it reads cleanly on a wall display from several meters away.

## Dependencies

- STATUS-TV-001
- STATUS-001A
- STATUS-001B
- SHELL-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../TESTING.md](../TESTING.md)
- [../SECURITY.md](../SECURITY.md)
- [../modules/works.md](../modules/works.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../tasks/STATUS-TV-001.md](STATUS-TV-001.md)

## Scope

- Keep the same authenticated `/status/tv` route and read model.
- Reduce visual density for TV viewing.
- Bigger KPI cards and larger row typography.
- Compact operational table with fewer redundant fields.
- Show only the operational slices that help a live TV board: `În lucru`, `Întârziate`, `Revenite`.
- Compact deadline labels such as `Azi`, `Mâine`, `+3 zile`.
- Reduce `Livrare` to the useful state only.
- Hide cycle/code redundancy from the main TV view.
- Automatic page rotation every 10-15 seconds, while preserving the same filters and read model.
- Keep automatic polling.
- Keep filters hidden by default.
- Keep loading, empty and error states.

## Out of scope

- Backend business rules.
- New read-model semantics.
- WebSockets.
- Public unauthenticated access.
- Mutating controls.
- Financial data.
- Desktop `/status` redesign.

## Business decisions

- Confirmed: the TV page should behave like a presentation board, not like a dense desktop registry.
- Confirmed: page rotation is acceptable for a physical monitor.
- Confirmed: the underlying status read model stays shared with `/status`.

## Data model changes

None expected.

## API changes

No API redesign expected. Reuse the existing operational status endpoint and page/query parameters.

## UI changes

Implement a more spacious TV board with larger cards, fewer columns, compact labels, and an automatic page rotation loop.

## Security and RBAC

Reuse the same authenticated status permissions as STATUS-TV-001.

## Audit

None expected. The page is read-only.

## Task-specific tests

- Compact TV labels render.
- Redundant columns are removed from the main TV view.
- Operational slice counters are limited to the TV-relevant tabs.
- Page rotation advances the TV page automatically.
- Polling still works.
- Technician colors still render.

## Acceptance criteria

1. The TV page is easier to read at distance.
2. The main TV view no longer shows redundant work code/cycle noise.
3. The TV board emphasizes patient, work, stage, technician, deadline, state and delivery.
4. KPI cards are larger and more visible.
5. Only the TV-relevant operational slices are shown.
6. TV pages rotate automatically.
7. Polling still refreshes the read model.
8. Tests pass.
9. Build passes.
10. Documentation is updated.
11. One commit only.
12. Working tree is clean.

Acceptance status:

- Completed. The TV status mode now shows a compact operational board with automatic page rotation, larger readably spaced rows, simplified columns, and the same authenticated read-only status read model.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../modules/works.md](../modules/works.md)
- this task document

## Commit

`STATUS-TV-001B: improve TV readability and rotation`

## Next task

Stop after STATUS-TV-001B.
