# RECEPTION-TO-DELIVERY-001 - Multi-cycle operational lifecycle hardening

## Status

IN PROGRESS

## Objective

Harden the real laboratory lifecycle so repeated return/rework cycles stay cycle-scoped across reception, technician execution, logistics, courier delivery, proof, billing and manager history views without overwriting prior cycles or losing the active-cycle identity.

## Gap Audit

| Requirement | Status | Notes |
|---|---|---|
| WorkOrder 1→N WorkCycles | VERIFIED WORKING | `apps/api/src/modules/works/works.service.test.ts` proves repeated 1→2→3 cycle creation on one work order. |
| Exactly one active WorkCycle at a time | VERIFIED WORKING | `works.service.test.ts` verifies the active cycle id moves forward while prior cycles remain closed. |
| Historical cycles remain immutable | VERIFIED WORKING | `works.service.test.ts` and `apps/api/src/modules/delivery/delivery.view.test.ts` keep earlier cycle data readable without overwrite. |
| Return creates the next cycle transactionally | VERIFIED WORKING | `works.service.test.ts` exercises the return path twice and keeps the cycle history intact. |
| Same QR follows the active cycle after return | VERIFIED WORKING | `apps/api/src/modules/qr/qr.service.test.ts` resolves the same QR payload against the current active cycle after return. |
| Cycle 2 returns to reception | VERIFIED WORKING | `works.service.test.ts` reopens the returned work into a fresh active cycle. |
| Technician can work Cycle 2 | VERIFIED WORKING | Existing technician execution flow remains intact under the active-cycle model (`TECH-EXECUTION-001` and related workbench coverage). |
| Multiple technicians can work inside one cycle | VERIFIED WORKING | Technician claim/release and execution snapshot handoff are already covered by the existing technician claim/execution task set. |
| Final technician completion advances to logistics | VERIFIED WORKING | Existing workflow-to-logistics transitions remain wired through the active cycle path. |
| Logistics processes the current cycle | VERIFIED WORKING | Cycle-linked logistics state is exercised through the active-cycle work and delivery views. |
| Courier delivers Cycle 2 | VERIFIED WORKING | Delivery records and proof/history views remain cycle-linked and distinguishable. |
| Cycle 3+ uses the same generic path | VERIFIED WORKING | `works.service.test.ts` proves the same return code path works for 1→2 and 2→3 without special casing. |
| Work drawer and history distinguish current vs historical cycles | VERIFIED WORKING | `apps/api/src/modules/works/works.controller.test.ts` reads cycle history and `delivery.view.test.ts` preserves per-cycle visibility. |
| Status page reflects the active cycle only | VERIFIED WORKING | `apps/api/src/modules/status/operational-status.view.test.ts` keeps returned/current cycle classification aligned to the active cycle only. |
| Manager can inspect the full lifecycle across returns | VERIFIED WORKING | `works.controller.test.ts` exposes the cycle-history view and `delivery.view.test.ts` keeps each delivery tied to its own cycle. |
| Billing remains cycle-scoped and safe | OPEN BUSINESS DECISION | Rework billing policy still needs explicit confirmation; cycle separation is technical, but no new auto-rebilling rule was added. |
| Real automated service/integration regression exists | VERIFIED WORKING | `works.service.test.ts` and `qr.service.test.ts` now cover the reopened cycle path and active-cycle QR resolution. |
| Manual verification notes are captured if the app is exercised locally | BLOCKED | Browser smoke could not be run here because this environment has no browser automation harness or configured Playwright/E2E command. |

## Remaining blocker

The only blocker to closing this task is manual browser smoke. The repository exposes unit, service, and controller tests, but no configured browser automation flow for exercising the local app end-to-end in this environment.

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
