# Works

## Status

Implemented and actively evolving.

## Purpose

Manage core dental laboratory work orders from registration through operational execution.

## Roles And Permissions

Key permissions include `works.create`, `works.read_all`, `works.read_assigned`, `works.update`, deadline permissions, claim permissions, execution snapshot permissions, cycle permissions (`cycles.read`, `cycles.history.read`, `cycles.create_next`), and real laboratory sheet permissions under `work_forms.real.*`.

## Domain Concepts

Work code, clinic, doctor, patient, work type, quantity, priority, status, QR token, deadline, workflow, ownership, execution snapshot, work cycles, cycle-scoped real laboratory sheet.

## Business Rules

Reception creates works without selecting `NC`/`NG`. Company context is fixed per cycle by first valid technical claim or manager assignment. Work updates use optimistic revision checks where implemented. A work can have multiple cycles while retaining the same work code and patient; exactly one cycle is active. Returned works are registered at reception through `Înregistrează revenirea`, with required active clinic and doctor selected from registries. The current `WorkOrder` clinic/doctor follow the active cycle, while prior cycle clinic/doctor/snapshots remain immutable history.

Each cycle can own one real laboratory sheet submission. Reception and permitted assigned technicians may edit the active cycle sheet until it is finalized. Closed cycles and finalized sheets are read-only; corrections require a new cycle. Editable sheet values are not copied automatically to a new cycle. Active-cycle sheet states are `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`, and `FINALIZED`; writes use revision checks to prevent stale draft/complete/finalize operations.

## Data Model

`WorkOrder`, `WorkCycle` with per-cycle clinic/doctor/reason/status, `WorkAssignmentEvent`, `WorkExecutionSnapshot`, cycle-aware `WorkFormSubmission`, workflow/logistics/billing relations.

## API

`GET /works`, `GET /works/:id`, `POST /works`, `PATCH /works/:id`, `GET /works/work-type-options`, deadline, claim, release, reassign, assignment-history endpoints, `GET /works/:id/cycles`, `POST /works/:id/cycles/next`, `GET/PATCH /works/:id/cycles/:cycleId/real-lab-sheet`, and `POST /works/:id/cycles/:cycleId/real-lab-sheet/finalize`.

STATUS-001A adds `GET /status/operational` as a separate read-only aggregate over work orders, claim ownership, workflow, deadlines, logistics, and delivery. WORKFORM-REAL-001B extends that read model with compact real laboratory sheet status and filtering. It returns operational fields only and masks financial data server-side.

## UI

`/works` registry, create modal, detail/edit drawer, QR modal, workflow section, `Cicluri` history section, `Fișă laborator` cycle sheet section with draft/complete/finalize UX, `Înregistrează revenirea` modal, deadline and execution context cards. `/workbench`, `/scan`, and `/status` surface sheet status and link into the existing `/works?workId=...` detail flow instead of duplicating work detail UI.

## Audit

Create/update/deadline/claim/release/reassign/snapshot actions, cycle creation, active-cycle closure, cycle conflicts.

## Security

Server-side RBAC, resource visibility, financial masking, CSRF on mutations.

## Edge Cases

Inactive clinic/doctor/work type, doctor outside selected clinic, missing `OTHER` return notes, promised date constraints, pricing unresolved at claim, firm mismatch after snapshot, concurrent claim/reassign, active-cycle conflicts, clinic/doctor changes between cycles.

## Implemented Tasks

WORKS-001, QR-001, WORK-DEADLINES-001A/B/C, TECH-CLAIM-001A/B, WORKFORMS-002, WORKFORM-REAL-001A/B, WORKFLOW-002, STATUS-001A, STATUS-001B, WORK-CYCLES-001A, WORK-CYCLES-001B.

## Planned Tasks

Materials/inventory integration.

## Deferred

Files and quality control.

## Open Decisions

Final work lifecycle closure rules and repair paths.

## Related Documents

[claim.md](claim.md), [deadlines.md](deadlines.md), [pricing.md](pricing.md), [workflow.md](workflow.md).
