# STATUS-001B - Operational status page and internal role visibility

## Status

COMPLETED on 2026-08-04.

## Objective

Build the frontend `/status` workspace on top of the existing STATUS-001A read model and API.

## Dependencies

- STATUS-001A
- SHELL-001
- WORK-DEADLINES-001C
- WORKFLOW-002
- LOGISTICS-001
- DELIVERY-001
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

- Authenticated `/status` route.
- Shell/sidebar navigation entry `Status`.
- Visible to all internal roles that have operational status read permission.
- Responsive desktop table and mobile cards.
- Tabs:
  - `Astăzi`
  - `În lucru`
  - `Disponibile`
  - `Întârziate`
  - `Plecate la medic`
  - `Revenite`
  - `Finalizate`
- Summary counters from STATUS-001A.
- Search.
- Filters:
  - `NC` / `NG` / toate;
  - technician;
  - current stage;
  - clinic;
  - doctor;
  - work type;
  - deadline state;
  - priority;
  - operational state;
  - patient;
  - work code.
- Sorting.
- Pagination or bounded-result UX matching STATUS-001A.
- Fields:
  - work code;
  - patient;
  - clinic;
  - doctor;
  - work type;
  - `NC`/`NG`;
  - current stage;
  - workflow progress such as `1/4` or `4/5`;
  - current work owner;
  - current stage technician;
  - effective deadline;
  - deadline visual state and countdown;
  - priority;
  - logistics state;
  - delivery state;
  - current cycle only when data exists.
- Click/open work detail using the existing work detail flow.
- Loading, empty, and error states.
- Romanian labels.
- Permission-aware UI.
- Financial fields must not be shown.
- No request per row.
- Reuse existing shared UI components and deadline visual resolver.
- Preserve URL/query state for filters when practical.
- Component and integration tests.
- Documentation updates.
- One commit.

## Out of scope

- Backend business-rule changes.
- STATUS-001A redesign.
- Work cycles implementation.
- Charts.
- Polling.
- WebSockets.
- Notifications.
- Financial totals.
- Inline work mutations.
- Start/complete stage actions from `/status`.
- Offline behavior.
- Public display mode.
- Next task.

## Business decisions

- Confirmed: `/status` is an internal authenticated workspace, not a public display mode.
- Confirmed: the page must consume `GET /status/operational` instead of redefining status aggregation.
- Confirmed: counters, tabs, filters, sorting, and bounded pagination must follow STATUS-001A contracts.
- Confirmed: financial data must not be rendered on the page.
- Confirmed: the page is read-oriented and must not introduce work mutations.
- Confirmed: work-cycle fields are shown only when the API returns cycle data; cycles must not be invented.

## Data model changes

None expected. Do not add Prisma migrations for this task.

## API changes

No backend API redesign is expected. Use the existing STATUS-001A endpoint:

- `GET /status/operational`

Only fix proven integration bugs in existing frontend/API wiring if they block the page and do not change STATUS-001A business rules.

## UI changes

Implemented `/status` as an operational workspace in the authenticated app shell.

The page uses Romanian labels, existing shared UI components where applicable, dense operational layouts, and route/query-state handling consistent with existing frontend modules.

Desktop prioritizes a scan-friendly table. Mobile provides cards that expose the same operational facts without horizontal overflow.

Opening a work reuses the existing `/works?workId=...` detail flow rather than duplicating the works page.

## Security and RBAC

- The route must be authenticated and permission-aware.
- Sidebar/navigation visibility must follow the same permission rules used for page access.
- Backend RBAC remains authoritative; frontend checks are UX only.
- Do not display pricing, billing, payment, agreement, financial totals, or financial inference fields.
- Do not add mutating status actions from `/status`.

## Audit

No new audit events are expected because this task is read-only.

## Task-specific tests

- Route protection and navigation visibility.
- Required tabs and STATUS-001A counters.
- Search, filters, sorting, and pagination/bounded-result states.
- Desktop table and mobile-card rendering.
- Loading, empty, and error states.
- Permission-aware rendering.
- Regression coverage that financial fields are not rendered.
- Opening existing work detail flow from a status row.
- No polling/WebSocket behavior.

Implemented tests:

- `apps/web/src/features/status/status-page.test.tsx`
- `apps/web/src/app/route-registry.test.ts`

## Acceptance criteria

1. `/status` route exists and is protected.
2. Sidebar/navigation entry exists for authorized internal users.
3. All required tabs are implemented.
4. Counters come from STATUS-001A.
5. Search, filters, sorting and bounded/paginated loading work.
6. Desktop and mobile layouts are usable.
7. Progress, stage, owner, technician, company and deadline are visible.
8. Financial data is never displayed.
9. Role-based visibility is respected.
10. Work detail can be opened without duplicating the works page.
11. Loading, empty and error states exist.
12. No polling/WebSockets.
13. No backend business rule changes.
14. Tests pass.
15. Build passes.
16. Documentation is updated.
17. One commit only.
18. Working tree is clean.
19. Next task is not started.

Acceptance status:

- Completed. `/status` is an authenticated, permission-aware, read-only frontend workspace backed by `GET /status/operational`.
- Desktop table and mobile cards expose operational fields without financial data.
- URL-backed query state is preserved for server-supported filters, sorting, pagination, and the page-level current-stage filter.
- Current-stage filtering is page-level because STATUS-001A does not define a server query parameter for current stage key/name.
- Work detail opening reuses `/works?workId=...`.
- No polling, WebSockets, work-cycle implementation, backend business-rule changes, or work mutations were added.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../modules/dashboard.md](../modules/dashboard.md) if dashboard/status behavior changes.
- [../modules/works.md](../modules/works.md) if work UI/read-model integration changes.
- [../AI_CONTEXT.md](../AI_CONTEXT.md) only if global context changes materially.
- This task document.

## Commit

`STATUS-001B: add operational status page`

## Next task

MATERIALS-001 remains planned and was not started.
