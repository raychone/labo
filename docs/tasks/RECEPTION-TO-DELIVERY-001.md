# RECEPTION-TO-DELIVERY-001 - Multi-cycle operational lifecycle hardening

## Status

IN PROGRESS

## Objective

Harden the real laboratory lifecycle so repeated return/rework cycles stay cycle-scoped across reception, technician execution, logistics, courier delivery, proof, billing and manager history views without overwriting prior cycles or losing the active-cycle identity.

## Gap Audit

| Requirement | Status | Notes |
|---|---|---|
| WorkOrder 1→N WorkCycles | ALREADY WORKING | The model and return path already create distinct cycles under one work order. |
| Exactly one active WorkCycle at a time | ALREADY WORKING | Active cycle is switched on return and previous cycle is closed. |
| Historical cycles remain immutable | ALREADY WORKING | Prior cycle data is kept as history and read-only rules already exist. |
| Return creates the next cycle transactionally | PARTIAL | The return transaction exists, but the reopened task needs an explicit end-to-end regression across the full chain. |
| Same QR follows the active cycle after return | ALREADY WORKING | The QR resolver follows the current active cycle and is covered by regression. |
| Cycle 2 returns to reception | ALREADY WORKING | The new active cycle is initialized back into reception/logistics state. |
| Technician can work Cycle 2 | ALREADY WORKING | The same workflow/claim model applies to the active cycle. |
| Multiple technicians can work inside one cycle | ALREADY WORKING | Stage assignment history and ownership already support handoff. |
| Final technician completion advances to logistics | ALREADY WORKING | Workflow completion already drives the logistics transition. |
| Logistics processes the current cycle | ALREADY WORKING | Logistics state is attached to the active work cycle, not stale history. |
| Courier delivers Cycle 2 | ALREADY WORKING | Delivery records are cycle-linked; cycle-aware proof/history visibility is already in place. |
| Cycle 3+ uses the same generic path | ALREADY WORKING | Repeated return regression now proves 1→2 and 2→3 cycle creation. |
| Work drawer and history distinguish current vs historical cycles | ALREADY WORKING | Cycle history views exist and preserve per-cycle execution/logistics/delivery data. |
| Status page reflects the active cycle only | ALREADY WORKING | The operational status view is active-cycle scoped. |
| Manager can inspect the full lifecycle across returns | PARTIAL | Manager history exists, but the reopened task still needs explicit proof across multiple returns. |
| Billing remains cycle-scoped and safe | BLOCKED BY BUSINESS RULE | Technical cycle separation exists; automatic re-billing of Cycle 2 depends on unresolved billing policy. |
| Real automated service/integration regression exists | PARTIAL | Focused service regressions now prove the active-cycle chain, but the full cross-module e2e path is still not exercised in one test. |
| Manual verification notes are captured if the app is exercised locally | MISSING | Not yet rerun for the reopened scope. |

## Dependencies

- RECEPTION-WORK-CREATE-001
- RECEPTION-TO-TECH-001
- TECH-EXECUTION-001
- WORK-CYCLES-001B
- STATUS-001B
- LOGISTICS-001
- DELIVERY-001
- BILLING-REALIGN-001A
- BILLING-REALIGN-001B
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../TESTING.md](../TESTING.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/work-cycles.md](../modules/work-cycles.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/payments.md](../modules/payments.md)
- [../modules/organizations.md](../modules/organizations.md)
- [../tasks/RECEPTION-WORK-CREATE-001.md](RECEPTION-WORK-CREATE-001.md)
- [../tasks/RECEPTION-TO-TECH-001.md](RECEPTION-TO-TECH-001.md)
- [../tasks/TECH-EXECUTION-001.md](TECH-EXECUTION-001.md)
- [../tasks/BILLING-REALIGN-001A.md](BILLING-REALIGN-001A.md)
- [../tasks/BILLING-REALIGN-001B.md](BILLING-REALIGN-001B.md)

## Scope

- Preserve the `WorkOrder` as the long-lived dossier and keep each return/rework attempt in a distinct `WorkCycle`.
- Keep previous cycles immutable while the active cycle can move through reception, technicians, logistics, courier and delivery again.
- Preserve cycle-specific workflow, logistics, delivery-proof and billing references.
- Keep QR resolution anchored to the `WorkOrder` while surfacing the active cycle and historical cycles correctly.
- Make delivery/proof/history views clearly show the cycle they belong to so repeated returns are distinguishable.
- Keep company-scoped billing tied to the correct cycle execution snapshot.

## Out of scope

- `BILLING-REALIGN-001C`.
- Automatic cycle creation on delivery without a return action.
- Reopening historical cycles.
- Changing the core claim model.
- New workflow engine.
- Global UI/UX redesign.
- Asset or template changes.

## Tests

- Cycle creation after return keeps the old cycle immutable.
- Active-cycle resolution remains correct after multiple returns.
- Delivery/detail/proof views show the correct cycle on historical deliveries.
- Billing continues to reference the right cycle snapshot after returns.
- QR resolution still points to the current active cycle.
- Existing reception, technician, logistics and delivery flows remain intact.

## Acceptance criteria

1. A returned work opens a new cycle without overwriting the old one.
2. Delivery and proof views identify the real cycle they belong to.
3. The active cycle remains the only mutable cycle.
4. QR and `WorkOrder` identity remain stable across cycles.
5. Billing stays linked to the correct cycle snapshot.
6. Prior history remains readable for managers.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- affected module docs
- this task document

## Commit

`RECEPTION-TO-DELIVERY-001: harden multi-cycle operational lifecycle`

## Next task

`DEMO-POLISH-002` remains planned and must not be started from this task.
