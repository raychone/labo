# WORK-CYCLES-001B - Cycle returns, frontend lifecycle and operational integration

## Status

APPROVED

## Objective

Expose the `WorkCycle` lifecycle in the application so authorized users can see previous cycles, register a work returned from the doctor, open the next cycle, and understand the complete work history without creating a duplicate `WorkOrder`.

## Dependencies

- WORK-CYCLES-001A
- STATUS-001A
- STATUS-001B
- WORKS-001
- WORKFLOW-002
- LOGISTICS-001
- DELIVERY-001
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

### Work detail integration

- Add a dedicated `Cicluri` tab or section to the existing work detail flow.
- Show the current active cycle.
- Show all historical cycles.
- Show cycle number, reason, status, openedAt, closedAt, doctor, clinic, and relevant operational summary.
- Clearly distinguish active and closed cycles.
- Preserve and display the same `WorkOrder` code across cycles.
- Do not duplicate the works page or create a separate work detail implementation.

### Register return from doctor

- Add an authorized action labeled `Lucrarea a revenit`.
- Open a confirmation form/modal, not `browser confirm()`.
- Require return reason.
- Support Romanian labels mapped to existing backend cycle reasons:
  - `Probă`
  - `Finisare`
  - `Ajustare`
  - `Reparație`
  - `Refacere`
  - `Garanție`
  - `Clarificare`
  - `Alt motiv`
- Require notes when `Alt motiv` is selected.
- Allow selecting the doctor and clinic for the new cycle where permitted.
- Doctor may differ from the previous cycle.
- Call the existing create-next-cycle API from WORK-CYCLES-001A.
- Prevent double submit.
- Handle revision/conflict errors.
- Refresh work, cycle history, status, and affected logistics queries.

### Lifecycle visibility

- Show `Ciclul 1`, `Ciclul 2`, `Ciclul 3`, and later cycles.
- Show why each cycle was opened.
- Show who opened each cycle.
- Show opened and closed timestamps.
- Show workflow progress for each cycle when available.
- Show delivery/logistics summary for each cycle when available.
- Do not overwrite previous workflow, logistics, delivery, pricing, deadline, or execution snapshot history.

### Status page integration

- Display the current cycle in `/status`.
- Allow users to identify returned works.
- Make the `Revenite` tab use cycle-aware data from STATUS-001A.
- Show a compact cycle indicator such as `Ciclul 2`.
- Preserve all existing status tabs and filters.
- Do not expose financial data.

### Work registry integration

- Show current cycle where useful.
- Add a filter for returned or multi-cycle works only if supported cleanly by the existing API.
- Do not duplicate the status page.

### Permissions

- Define or reuse granular permissions for:
  - `cycles.read`
  - `cycles.create_next`
  - `cycles.history.read`
- Recommended behavior:
  - manager: read/create/history;
  - logistics: read/create/history if responsible for returned intake;
  - reception: read/create/history if the real workflow permits returned work registration;
  - technician: read/history, no create-next by default;
  - courier: limited read only;
  - doctor: only external-visible status if already supported; no internal history mutation.
- Do not use role-name checks. Use permissions.
- Permission checks must be enforced server-side and reflected in the UI.

### Audit

- Audit cycle returned/opened.
- Audit return reason.
- Audit previous cycle and new cycle.
- Audit actor.
- Audit doctor/clinic change where applicable.
- Audit conflict/rejected operation only according to existing audit policy.
- Do not log patient-sensitive payloads unnecessarily.

### UX

- Romanian labels with diacritics.
- Mobile-first layout.
- Use existing modal, tabs, timeline, badges, select, and form patterns.
- Provide loading, empty, error, disabled, and conflict states.
- Confirmation before opening a new cycle.
- No duplicated work pages.

### Tests

- Component tests for cycle history.
- Create-next-cycle modal tests.
- Reason validation tests.
- `Alt motiv` notes validation tests.
- Permission-based action visibility tests.
- Conflict handling tests.
- Query invalidation tests.
- Status page cycle indicator tests.
- Work detail cycle history tests.
- Mobile layout tests where practical.
- Regression coverage for existing work detail, status, logistics, and delivery UI.

### Documentation

- Update this task document.
- Update [../MASTER_PLAN.md](../MASTER_PLAN.md).
- Update [../AI_CONTEXT.md](../AI_CONTEXT.md) if current context changes.
- Update affected module docs.
- One implementation commit.
- Do not start the next task.

## Out of scope

- Changing the WORK-CYCLES-001A data model unless a proven integration bug exists.
- Backend cycle redesign.
- Automatic creation of cycles on delivery.
- Automatic return detection.
- Workflow template redesign.
- New pricing logic.
- Billing.
- Payments.
- Documents.
- Notifications.
- Offline.
- Materials.
- Inventory.
- Public doctor portal.
- Deleting or merging cycles.
- Reopening a closed historical cycle.
- Changing immutable execution/pricing/deadline snapshots.
- Next task.

## Security and RBAC

- Backend RBAC remains authoritative.
- Frontend action visibility is only UX and must not be treated as enforcement.
- Mutating requests require CSRF.
- Financial fields must never be exposed through cycle UI to unauthorized roles.
- Patient-sensitive payloads must not be logged unnecessarily.

## Acceptance criteria

1. Work detail shows current and historical cycles.
2. Active and closed cycles are visually distinct.
3. Authorized users can register a returned work.
4. Return reason is mandatory.
5. `Alt motiv` requires notes.
6. Existing create-next-cycle API is used.
7. No duplicate `WorkOrder` is created.
8. Work code remains unchanged.
9. Previous cycle history is preserved.
10. Previous workflow/logistics/delivery history is preserved.
11. Execution, pricing, and deadline snapshots are not modified.
12. Doctor/clinic may be selected for the new cycle according to permissions.
13. `/status` displays current cycle.
14. Returned works are visible in the `Revenite` tab.
15. Financial fields are not exposed.
16. Permission checks are enforced server-side and reflected in UI.
17. Loading, empty, error, and conflict states exist.
18. Double submission is prevented.
19. Tests pass.
20. Typecheck passes.
21. Build passes.
22. Documentation is updated.
23. One commit only.
24. Working tree is clean.
25. No next task is started.

## Verification

Run the standard checks from [../TESTING.md](../TESTING.md). Add focused component/integration tests for the cycle UI and returned-work flow.

## Commit

`WORK-CYCLES-001B: add cycle return lifecycle UI`

## Documentation-only definition commit

`DOCS: define WORK-CYCLES-001B frontend lifecycle`

## Next task

No next task is approved. Do not start any task after WORK-CYCLES-001B.
