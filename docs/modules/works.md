# Works

## Status

Implemented and actively evolving.

## Purpose

Manage core dental laboratory work orders from registration through operational execution.

## Roles And Permissions

Key permissions include `works.create`, `works.read_all`, `works.read_assigned`, `works.update`, deadline permissions, claim permissions, and execution snapshot permissions.

## Domain Concepts

Work code, clinic, doctor, patient, work type, quantity, priority, status, QR token, deadline, workflow, ownership, execution snapshot, work cycles.

## Business Rules

Reception creates works without selecting `NC`/`NG`. Company context is fixed per cycle by first valid technical claim or manager assignment. Work updates use optimistic revision checks where implemented. A work can have multiple cycles while retaining the same work code, patient, and clinic; exactly one cycle is active.

## Data Model

`WorkOrder`, `WorkCycle`, `WorkAssignmentEvent`, `WorkExecutionSnapshot`, `WorkFormSubmission`, workflow/logistics/billing relations.

## API

`GET /works`, `GET /works/:id`, `POST /works`, `PATCH /works/:id`, `GET /works/work-type-options`, deadline, claim, release, reassign, assignment-history endpoints, `GET /works/:id/cycles`, `POST /works/:id/cycles/next`.

STATUS-001A adds `GET /status/operational` as a separate read-only aggregate over work orders, claim ownership, workflow, deadlines, logistics, and delivery. It returns operational fields only and masks financial data server-side.

## UI

`/works` registry, create modal, detail/edit drawer, QR modal, workflow section, deadline and execution context cards. `/status` links into the existing `/works?workId=...` detail flow instead of duplicating work detail UI.

## Audit

Create/update/deadline/claim/release/reassign/snapshot actions, cycle creation, active-cycle closure, cycle conflicts.

## Security

Server-side RBAC, resource visibility, financial masking, CSRF on mutations.

## Edge Cases

Inactive clinic/doctor/work type, promised date constraints, pricing unresolved at claim, firm mismatch after snapshot, concurrent claim/reassign, active-cycle conflicts, doctor changes between cycles.

## Implemented Tasks

WORKS-001, QR-001, WORK-DEADLINES-001A/B/C, TECH-CLAIM-001A/B, WORKFORMS-002, WORKFLOW-002, STATUS-001A, STATUS-001B, WORK-CYCLES-001A.

## Planned Tasks

WORK-CYCLES-001B cycle return UI/integration and materials/inventory integration.

## Deferred

Files and quality control.

## Open Decisions

Final work lifecycle closure rules and repair paths.

## Related Documents

[claim.md](claim.md), [deadlines.md](deadlines.md), [pricing.md](pricing.md), [workflow.md](workflow.md).
