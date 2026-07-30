# Dashboard

## Status

Partially implemented as a basic shell dashboard; real workflow dashboard is planned.

## Purpose

Provide operational overview.

## Roles And Permissions

Current `/dashboard` route has no specific required permission beyond authentication. Future dashboard sections must be permission-aware.

## Domain Concepts

Operational totals, deadline summaries, work status, role-specific visibility.

## Business Rules

Do not expose financial data to non-financial roles.

## Data Model

Uses existing module read models; no dedicated dashboard model currently.

## API

Existing module endpoints; future aggregate endpoint planned.

## UI

`/dashboard`.

## Audit

Read-only standard dashboard does not require audit.

## Security

Permission-aware cards and server-side masking.

## Edge Cases

Large lists, mixed company context, non-financial users.

## Implemented Tasks

SHELL-001 and module summaries.

## Planned Tasks

DASHBOARD-002, STATUS-001.

## Deferred

Legacy DASHBOARD-001 is superseded/deferred.

## Open Decisions

Final dashboard metrics.

## Related Documents

[works.md](works.md), [deadlines.md](deadlines.md), [reports.md](reports.md).
