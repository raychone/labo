# Technician Execution

## Status

Partially implemented.

## Purpose

Give technicians a personal queue and operational workbench.

## Roles And Permissions

`technician.workbench.read`, `technician.workload.read`, claim permissions, workflow stage permissions.

## Domain Concepts

Available work, claimed work, workload, current technician, stage assignment, real laboratory sheet status.

## Business Rules

Technicians can claim available works, view own claimed works, release own work where permitted, execute workflow actions exposed by current endpoints, and open the real laboratory sheet for visible/owned work where sheet permissions allow it. Each technician may also choose a preferred color that is surfaced in operational status and technician selection views when the work is assigned.

## Data Model

`WorkOrder` ownership fields, `WorkAssignmentEvent`, workflow stage execution models.

## API

`GET /technician/workbench`, `GET /technician/workload`, `GET /technicians/options`, stage assign/unassign endpoints. Workbench rows include compact real laboratory sheet status for the active cycle.

## UI

`/workbench` is labelled as the technician workspace and groups available work, owned work, stage queue filters and workload summary. Claim copy uses `Preia` while keeping the existing `NC`/`NG` execution company selector in the claim modal. Sheet status badges and `Completează fișa`/`Continuă fișa` actions open the existing work detail sheet flow. Technician navigation is intentionally limited to the workbench and owned-work paths; operational status remains the shared read view for work discovery.

## Audit

Claim/release/reassign and stage events.

## Security

Ownership and RBAC checks server-side.

## Edge Cases

Stale claims, abandoned assignments, conflicting stage actions. These are planned for TECH-CLAIM-001C.

## Implemented Tasks

TECH-001, TECH-CLAIM-001A, TECH-CLAIM-001B, WORKFORM-REAL-001B workbench integration, CORE-ROLE-UX-001.

## Planned Tasks

TECH-CLAIM-001C.

## Deferred

Payroll/productivity analytics.

## Open Decisions

Stale claim timeout and recovery UX.

## Related Documents

[claim.md](claim.md), [workflow.md](workflow.md).
