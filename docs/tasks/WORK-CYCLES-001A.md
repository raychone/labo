# WORK-CYCLES-001A - Work cycle model and lifecycle foundation

## Status

APPROVED

## Objective

Allow one `WorkOrder` to go through multiple complete laboratory cycles without creating duplicate works. A work can be received, executed, delivered, returned by the doctor, adjusted or repaired, and delivered again while every cycle remains visible forever.

## Dependencies

- STATUS-001B
- WORKS-001
- WORKFLOW-002
- WORK-DEADLINES-001C
- TECH-CLAIM-001B
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
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/patients.md](../modules/patients.md)
- [../modules/pricing.md](../modules/pricing.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

- Backend only.
- Create the complete work-cycle data model.
- Each `WorkOrder` owns multiple `WorkCycle` records.
- Exactly one cycle is `ACTIVE` for a work at a time.
- Each cycle stores:
  - cycle number;
  - reason;
  - openedAt;
  - closedAt;
  - status;
  - createdBy;
  - audit trail.
- Cycle reasons include:
  - `INITIAL`;
  - `ADJUSTMENT`;
  - `REPAIR`;
  - `REMAKE`;
  - `WARRANTY`;
  - `OTHER`.
- Workflow execution belongs to a cycle.
- Logistics belongs to a cycle.
- Delivery belongs to a cycle.
- Timeline clearly indicates `Cycle 1`, `Cycle 2`, `Cycle 3`, and later cycles.
- Expose read API for cycles.
- Expose create-next-cycle API.
- Opening a new cycle must never destroy previous history.
- `WorkOrder` code remains identical across cycles.
- Patient remains identical across cycles.
- Clinic remains identical across cycles.
- Doctor may change between cycles.
- Company snapshot (`NC`/`NG`) remains immutable inside every cycle.
- Execution snapshot remains immutable inside each cycle.
- Pricing snapshot remains immutable inside each cycle.
- Deadline snapshot belongs to each cycle independently.
- Current APIs continue working through backwards-compatible current-cycle behavior.
- Add focused backend tests for lifecycle, history, API compatibility, RBAC, and audit.
- One commit.

## Out of scope

- Frontend.
- Status page changes.
- Workflow redesign.
- Notifications.
- Offline behavior.
- Documents.
- Billing.
- Payments.
- Materials.
- Inventory.
- Next task.

## Business case

Example expected lifecycle:

1. Cycle 1: Reception, Model, CAD, Print, Ceramic, QC, Delivery.
2. Doctor tests the work and returns it to the laboratory.
3. Cycle 2: Reception, Adjustment, Ceramic, QC, Delivery.
4. Doctor returns it again.
5. Cycle 3: Reception, Repair, QC, Delivery.

Every cycle remains visible forever and the original work is not duplicated.

## Business decisions

- Confirmed: one work can have unlimited cycles.
- Confirmed: exactly one active cycle exists per work.
- Confirmed: historical cycles are immutable after closure except through a future explicitly approved repair/audit task.
- Confirmed: work code, patient, and clinic remain stable across cycles.
- Confirmed: doctor may change between cycles.
- Confirmed: execution company, execution context, pricing, and deadline snapshots are cycle-scoped and immutable inside each cycle.
- Confirmed: current APIs must continue working while cycle-aware APIs are added.
- TBD: exact closure trigger for the active cycle when delivery completes or when a next cycle is opened.
- TBD: whether every returned work must start with a reception step or whether some return flows may begin directly in technical execution.
- Requires business confirmation: which roles may create a next cycle and whether doctor changes require clinic-level validation beyond existing doctor ownership rules.

## Data model changes

- Add `WorkCycle` and related enums for status and reason.
- Link workflow execution, logistics state/events, delivery/preparation relations, deadline snapshots, and execution/pricing snapshots to a cycle where required.
- Preserve existing `WorkOrder` identifiers and current work relations through migration/backfill.
- Backfill existing works with cycle number `1` and reason `INITIAL`.
- Enforce one active cycle per work with database and service-level constraints.
- Keep historical cycle rows immutable through service-level rules and audit.

## API changes

- Add read API for complete cycle history.
- Add create-next-cycle API.
- Existing work, workflow, logistics, delivery, deadline, claim, and status APIs must remain compatible by resolving the active/current cycle where applicable.
- Do not expose financial data to unauthorized roles through cycle history.

## UI changes

None. This task is backend-only.

## Security and RBAC

- Backend RBAC remains authoritative.
- Creating a next cycle requires a dedicated permission or a clearly documented existing manager/reception permission.
- Read APIs must respect existing work visibility rules.
- Financial snapshots remain masked unless the caller has existing financial permissions.
- Mutating requests require CSRF.

## Audit

- Audit cycle creation.
- Audit active-cycle closure when it happens as part of next-cycle creation.
- Audit conflicts such as duplicate active-cycle attempts or invalid doctor/company transitions.

## Task-specific tests

- Migration/backfill gives existing works a first cycle.
- One work can own multiple cycles.
- Exactly one active cycle exists.
- Creating a next cycle closes or supersedes the previous active cycle according to the implemented rule.
- Historical cycles cannot be mutated through normal lifecycle APIs.
- Workflow execution is scoped to the active cycle.
- Logistics state/events are scoped to the active cycle.
- Delivery state/history is scoped to the active cycle.
- Deadline snapshots are independent per cycle.
- Company, execution, and pricing snapshots are immutable inside each cycle.
- Doctor can change between cycles while patient, clinic, and work code remain stable.
- Existing APIs continue working against the active/current cycle.
- Cycle read API exposes complete authorized history.
- Create-next-cycle API is audited and permission-protected.

## Acceptance criteria

1. One work can own unlimited cycles.
2. Exactly one active cycle exists.
3. Historical cycles are immutable.
4. Current APIs continue working.
5. No duplicated `WorkOrder` records are created for returns/repairs.
6. Cycle creation is audited.
7. Read APIs expose complete authorized history.
8. Workflow execution belongs to a cycle.
9. Logistics belongs to a cycle.
10. Delivery belongs to a cycle.
11. Deadline snapshots belong to cycles independently.
12. Company, execution, and pricing snapshots remain immutable inside every cycle.
13. Tests cover lifecycle.
14. Build passes.
15. Documentation is updated.
16. Working tree is clean.
17. Single commit.
18. Next task is not started.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md) if current context changes
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/claim.md](../modules/claim.md)
- This task document

## Commit

`WORK-CYCLES-001A: add work cycle lifecycle foundation`

## Next task

WORK-CYCLES-001B remains planned and must not be started.
