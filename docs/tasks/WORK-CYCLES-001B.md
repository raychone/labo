# WORK-CYCLES-001B - Cycle returns, frontend lifecycle and operational integration

## Status

COMPLETED

## Objective

Expose the `WorkCycle` lifecycle in the application so authorized users can see previous cycles, register a work physically returned to reception, open the next cycle, and understand the complete work history without creating a duplicate `WorkOrder`.

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

### Register return at reception

- Add an authorized action labeled `Înregistrează revenirea`.
- Primary flow:
  - Reception searches the work by work code or resolves it through QR.
  - Reception opens the existing work.
  - Reception selects `Înregistrează revenirea`.
  - Reception confirms or reselects the source clinic and doctor from the existing registries.
  - Reception selects the return reason.
  - Reception adds notes when required.
  - The system calls the existing create-next-cycle API extended by this task.
  - The same `WorkOrder` and work code are preserved.
  - The previous cycle remains immutable.
  - The newly created cycle becomes active.
- Open a confirmation form/modal, not `browser confirm()`.
- Require return reason.
- Extend backend cycle reasons with distinct machine-readable values for `PROBA`, `FINISHING`, and `CLARIFICATION`; do not map them to `OTHER`.
- Support Romanian labels:
  - `PROBA` — `Probă`
  - `FINISHING` — `Finisare`
  - `ADJUSTMENT` — `Ajustare`
  - `REPAIR` — `Reparație`
  - `REMAKE` — `Refacere`
  - `WARRANTY` — `Garanție`
  - `CLARIFICATION` — `Clarificare`
  - `OTHER` — `Alt motiv`
- Require notes when `OTHER` / `Alt motiv` is selected.
- Notes remain optional for all other reasons.
- Clinic selector is required.
- Doctor selector is required and filtered by selected clinic.
- Clinic and doctor default to the previous cycle/work values and may be reselected.
- Doctors are selected from the existing Doctor registry, do not need `User` accounts, and never call the mutation endpoint directly.
- Extend the create-next-cycle API contract with `clinicId`, `doctorId`, `reason`, `notes` and the existing expected revision/version field.
- Prevent double submit.
- Handle revision/conflict errors.
- Refresh work, cycle history, status, and affected logistics queries.

### Backend compatibility changes

- Create one deterministic non-destructive migration.
- Extend `WorkCycleReason` with `PROBA`, `FINISHING`, and `CLARIFICATION`.
- Store the selected clinic on every cycle.
- Backfill existing cycle clinic data from the owning `WorkOrder` only where required and unambiguous.
- Preserve existing cycle rows.
- Do not reset or recreate the database.
- Validate on create-next-cycle:
  - `clinicId` is required.
  - `doctorId` is required.
  - The selected doctor belongs to the selected clinic.
  - Clinic and doctor are active.
  - `OTHER` requires notes.
  - Reception and manager may create the next cycle.
  - Technician, courier and doctor users cannot create the next cycle unless explicitly granted outside the role defaults.
- Operational reset for the new cycle:
  - Return the work to the appropriate reception/available operational state.
  - Clear active technician ownership.
  - Create no execution snapshot until the normal claim flow occurs.
  - Do not reuse the previous cycle pricing, deadline or execution snapshot as the active cycle snapshot.
  - Preserve previous-cycle snapshots as immutable history.

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
  - reception: read/create/history for returned work registration;
  - logistics: read/history only unless an existing approved permission already grants intake mutation;
  - technician: read/history, no create-next by default;
  - courier: limited read only;
  - doctor users, when they exist: no create-next permission.
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
12. Clinic and doctor are required, active, and validated against each other for the new cycle.
13. `/status` displays current cycle.
14. Returned works are visible in the `Revenite` tab.
15. Financial fields are not exposed.
16. Permission checks are enforced server-side and reflected in UI.
17. Loading, empty, error, and conflict states exist.
18. Double submission is prevented.
19. New machine-readable reasons `PROBA`, `FINISHING`, and `CLARIFICATION` are supported without mapping to `OTHER`.
20. Reception and manager can create next cycles; technician, courier and doctor defaults cannot.
21. New cycles clear active technician ownership and do not create execution snapshots.
22. Tests pass.
23. Typecheck passes.
24. Build passes.
25. Documentation is updated.
26. One commit only.
27. Working tree is clean.
28. No next task is started.

## Verification

Run the standard checks from [../TESTING.md](../TESTING.md). Add focused component/integration tests for the cycle UI and returned-work flow.

Completed verification:

- Prisma schema validation and generation.
- Typecheck.
- Unit/component tests, including return reasons, clinic/doctor validation, permission matrix, status returned-tab integration, work detail cycle history, and returned-work form submission.
- Build.
- `git diff --check`.

## Implementation Notes

- Added distinct machine-readable cycle reasons `PROBA`, `FINISHING`, and `CLARIFICATION`.
- Added deterministic non-destructive migration `20260804153000_work_cycle_return_reasons`.
- Added per-cycle clinic persistence with backfill from owning `WorkOrder`.
- Extended create-next-cycle API with required `clinicId`, `doctorId`, `reason`, `notes`, and active-cycle expectation.
- Enforced active clinic/doctor validation and doctor-within-clinic validation.
- Enforced `OTHER` notes validation.
- Added granular cycle permissions and default grants for manager/reception create, logistics/technician history/read, courier limited read, and no doctor create-next grant.
- Added `Cicluri` history and `Înregistrează revenirea` flow in work detail.
- Integrated current cycle display into `/status` through existing STATUS-001A data.

## Commit

`WORK-CYCLES-001B: add cycle return lifecycle UI`

## Documentation-only definition commit

`DOCS: define WORK-CYCLES-001B frontend lifecycle`

## Next task

No next task is approved. Do not start any task after WORK-CYCLES-001B.
