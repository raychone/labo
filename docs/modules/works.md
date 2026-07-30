# Works

## Status

Implemented and actively evolving.

## Purpose

Manage core dental laboratory work orders from registration through operational execution.

## Roles And Permissions

Key permissions include `works.create`, `works.read_all`, `works.read_assigned`, `works.update`, deadline permissions, claim permissions, and execution snapshot permissions.

## Domain Concepts

Work code, clinic, doctor, patient, work type, quantity, priority, status, QR token, deadline, workflow, ownership, execution snapshot.

## Business Rules

Reception creates works without selecting `NC`/`NG`. Company context is fixed by first valid technical claim or manager assignment. Work updates use optimistic revision checks where implemented.

## Data Model

`WorkOrder`, `WorkAssignmentEvent`, `WorkExecutionSnapshot`, `WorkFormSubmission`, workflow/logistics/billing relations.

## API

`GET /works`, `GET /works/:id`, `POST /works`, `PATCH /works/:id`, `GET /works/work-type-options`, deadline, claim, release, reassign, assignment-history endpoints.

## UI

`/works` registry, create modal, detail/edit drawer, QR modal, workflow section, deadline and execution context cards.

## Audit

Create/update/deadline/claim/release/reassign/snapshot actions.

## Security

Server-side RBAC, resource visibility, financial masking, CSRF on mutations.

## Edge Cases

Inactive clinic/doctor/work type, promised date constraints, pricing unresolved at claim, firm mismatch after snapshot, concurrent claim/reassign.

## Implemented Tasks

WORKS-001, QR-001, WORK-DEADLINES-001A/B/C, TECH-CLAIM-001A/B, WORKFORMS-002, WORKFLOW-002.

## Planned Tasks

TECH-CLAIM-001C, work cycles, materials/inventory integration.

## Deferred

Files and quality control.

## Open Decisions

Final work lifecycle closure rules and repair paths.

## Related Documents

[claim.md](claim.md), [deadlines.md](deadlines.md), [pricing.md](pricing.md), [workflow.md](workflow.md).
