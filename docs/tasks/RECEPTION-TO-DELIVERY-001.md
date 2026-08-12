# RECEPTION-TO-DELIVERY-001 - Multi-cycle operational lifecycle hardening

## Status

COMPLETED

## Objective

Harden the real laboratory lifecycle so repeated return/rework cycles stay cycle-scoped across reception, technician execution, logistics, courier delivery, proof, billing and manager history views without overwriting prior cycles or losing the active-cycle identity.

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
