# Technician Execution

## Status

Partially implemented.

## Purpose

Give technicians a personal queue and operational workbench.

## Roles And Permissions

`technician.workbench.read`, `technician.workload.read`, claim permissions, workflow stage permissions.

## Domain Concepts

Available work, claimed work, workload, current technician, stage assignment.

## Business Rules

Technicians can claim available works, view own claimed works, release own work where permitted, and execute workflow actions exposed by current endpoints.

## Data Model

`WorkOrder` ownership fields, `WorkAssignmentEvent`, workflow stage execution models.

## API

`GET /technician/workbench`, `GET /technician/workload`, `GET /technicians/options`, stage assign/unassign endpoints.

## UI

`/workbench`.

## Audit

Claim/release/reassign and stage events.

## Security

Ownership and RBAC checks server-side.

## Edge Cases

Stale claims, abandoned assignments, conflicting stage actions. These are planned for TECH-CLAIM-001C.

## Implemented Tasks

TECH-001, TECH-CLAIM-001A, TECH-CLAIM-001B.

## Planned Tasks

TECH-CLAIM-001C.

## Deferred

Payroll/productivity analytics.

## Open Decisions

Stale claim timeout and recovery UX.

## Related Documents

[claim.md](claim.md), [workflow.md](workflow.md).
