# WORK-CYCLES-001A - Work cycle model and lifecycle foundation

## Status

COMPLETED

Completed on 2026-08-04.

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

- Added `WorkCycle` plus `WorkCycleStatus` and `WorkCycleReason`.
- Linked workflow execution, logistics state/events, delivery preparation items, execution snapshots, deadline snapshots, and pricing snapshots to cycles.
- Preserved existing `WorkOrder` identifiers and current work relations through migration/backfill.
- Backfilled existing works with deterministic cycle `1` records using reason `INITIAL`.
- Enforced one active cycle per work with `WorkOrder.activeCycleId`, database constraints, and transactional service rules.
- Historical closed cycles are not mutated by normal lifecycle APIs.

## API changes

- Added `GET /works/:id/cycles` for authorized cycle history.
- Added `POST /works/:id/cycles/next` for creating a next active cycle.
- Existing work, workflow, logistics, delivery, deadline, claim, scan, QR, technician, patient, and status APIs resolve the active/current cycle where applicable.
- Financial cycle snapshot data is masked unless the caller has existing pricing visibility.

## UI changes

None. This task is backend-only.

## Security and RBAC

- Backend RBAC remains authoritative.
- Creating a next cycle requires a dedicated permission or a clearly documented existing manager/reception permission.
- Read APIs must respect existing work visibility rules.
- Financial snapshots remain masked unless the caller has existing financial permissions.
- Mutating requests require CSRF.

## Audit

- Cycle creation is audited.
- Active-cycle closure during next-cycle creation is audited.
- Active-cycle conflict checks are audited.

## Task-specific tests

- Service and controller tests cover cycle history and create-next-cycle behavior.
- Existing workflow, logistics, delivery, scan, technician, patient, and status tests were updated for active-cycle compatibility.
- Prisma validation/generation, typecheck, tests, build, and diff checks passed for the implementation.

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
