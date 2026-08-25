# Technician Execution

## Status

Implemented for the current MVP execution lifecycle.

## Purpose

Give technicians a personal queue and operational workbench.

## Roles And Permissions

`technician.workbench.read`, `technician.workload.read`, claim permissions, workflow stage permissions.

## Domain Concepts

Available work, claimed work, current technician, final operational state, technician details, `Cod`, categorized technician labor operations, snapshot-based earnings, and real laboratory sheet status.

## Business Rules

Technicians can claim available works, view own claimed works, open details for owned work, edit technical notes and `Cod`, open the `Manopere` modal shell, and mark owned work as `FINALIZATA`. Reception-created unclaimed works are immediately visible in the technician available-for-claim pool without a manual reception handoff. `Finalizata` uses the persisted work status endpoint, not workflow-stage completion. `Cod` is stored separately from the visible work code and QR token. Each technician may also choose a preferred color that is surfaced as a badge in operational status and technician selection views when the work is assigned. The workbench narrows search results to the best matching work when a search term is present, and the work drawer surfaces the live execution context first for the currently owned work.

## Data Model

`WorkOrder` ownership, operational status fields and `technicalCodeNotes`, `WorkAssignmentEvent`, workflow stage execution models, `TechnicianOperation`, `TechnicianOperationRate`, and `TechnicianPerformedOperation` with immutable rate/earning snapshots.

## API

`GET /works/available-for-claim`, `GET /works/my-claimed`, `GET /works/:id`, `POST /works/:id/claim`, `PATCH /works/:id/technician-details`, `POST /works/:id/status`, plus legacy/manager `GET /technician/workbench`, `GET /technician/workload`, `GET /technicians/options`, and stage assign/unassign endpoints where still used outside the simplified technician surface.

## UI

`/workbench` is labelled as the technician workspace and now centers on `Lucrări de preluat` and `Lucrările mele`. Available cards expose `Preia` while keeping the existing `NC`/`NG` execution company selector in the claim modal. Own cards expose `Detalii`, `Manopere`, and `Finalizata`; `Manopere` groups the official catalog by category and uses a keyboard-accessible card control with green active state. Completed operations persist through the existing performed-operation model and use the rate snapshot for earnings. The WorkOrder composition view derives deterministic WorkType colors for ELEMENT teeth and renders a legend; BUCATA remains case-level and is not duplicated by tooth references.

## Audit

Claim/release/reassign, technical detail updates, operational status changes, and stage events.

## Security

Ownership and RBAC checks server-side.

## Edge Cases

Stale claims, abandoned assignments, finalization conflicts, and conflicting stage actions. Advanced recovery is planned for TECH-CLAIM-001C.

## Implemented Tasks

TECH-001, TECH-CLAIM-001A, TECH-CLAIM-001B, WORKFORM-REAL-001B workbench integration, CORE-ROLE-UX-001, TECH-EXECUTION-001, CLAIM-001A, CLAIM-001B, STATE-001A, TECH-001A, TECH-001B.

## Planned Tasks

OPS-001A/B/C, TECH-001C, EARNINGS-001A, TECH-CLAIM-001C.

## Deferred

Payroll/productivity analytics and paid settlement state.

## Open Decisions

Stale claim timeout, recovery UX, and the final operation catalog contents.

## Related Documents

[claim.md](claim.md), [workflow.md](workflow.md).
