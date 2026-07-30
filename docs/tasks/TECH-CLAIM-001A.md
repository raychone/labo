# TECH-CLAIM-001A - Technician claim, company selection and work ownership

## Status

COMPLETED.

## Objective

Add active ownership for work orders, allowing technicians to claim work and managers to assign/reassign while preserving assignment history.

## Dependencies

WORKFLOW-002, TECH-001, RBAC-001, ORG-CONTEXT-001.

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)

## Implementation

Added `WorkOrder` ownership fields, `WorkAssignmentEvent`, claim revision, claim/release/reassign services and endpoints, RBAC permission keys, audit events, `/workbench` UI, `/works` responsibility UI, and deterministic demo scenarios.

## API

`GET /works/available-for-claim`, `GET /works/my-claimed`, `POST /works/:id/claim`, `POST /works/:id/release`, `POST /works/:id/reassign`, `GET /works/:id/assignment-history`.

## RBAC

Claim permissions listed in [../modules/claim.md](../modules/claim.md).

## UI

Technician workbench, claim modal with `NC`/`NG`, release modal, manager reassign in work drawer.

## Seed

Demo seed includes available, claimed, manager-assigned, reassigned, and released scenarios.

## Tests

Service, RBAC registry, UI regression, typecheck/test/build.

## Commit

`c5c2448 TECH-CLAIM-001A: add technician work claiming`

## Limitations

Final pricing/deadline snapshot was not part of this task; implemented later in TECH-CLAIM-001B.
