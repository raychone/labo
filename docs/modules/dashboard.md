# Dashboard

## Status

Implemented as a permission-aware landing page for core roles. ROLE-DASHBOARDS-002 composes distinct Manager, Recepție and Tehnician panels on the existing `/dashboard` route and reuses existing read models for operational and financial summaries. Manager view is KPI-only and does not surface technician worklists. Operational `/status` is implemented separately; `/status/tv` is a fullscreen read-only display variant that favors compact operational slices and automatic page rotation for a wall screen. Deeper workflow analytics remain planned.

## Purpose

Provide role-specific entry points and high-level operational/financial summaries without introducing a separate dashboard data model.

## Roles And Permissions

Current `/dashboard` route has no specific required permission beyond authentication. Its visible panels and actions are permission-driven. Financial counters require finance/invoice permissions. Technician counters require `technician.workbench.read`. The `/status` workspace and operational status read model use `works.read_all` and `works.read_assigned` with server-side resource visibility.

## Domain Concepts

Operational totals, deadline summaries, work status, real laboratory sheet status, role-specific visibility.

## Business Rules

Do not expose financial data to non-financial roles.

## Data Model

Uses existing module read models; no dedicated dashboard model currently. CORE-ROLE-UX-001 and ROLE-DASHBOARDS-002 compose works deadline summaries, billing overview counters, technician workbench summaries and role-specific dashboard panels.

## API

Existing module endpoints plus `GET /status/operational` from STATUS-001A.

`GET /status/operational` returns permission-aware rows, tab counters, bounded pagination, and compact real laboratory sheet status/filtering for operational work status. It does not expose pricing, billing, payments, agreements, or financial totals.

## UI

`/dashboard` shows permission-aware Manager, Recepție and Tehnician panels, primary actions, compact counters and links into `/works`, `/status`, `/workbench`, `/billing`, `/pricing` and `/scan` where allowed. Technician content is never blank when technician permissions exist. `/status` is the implemented operational status workspace with tabs, counters, filters, real laboratory sheet status, sorting, bounded pagination UX, desktop table, and mobile cards. `/status/tv` is the large-screen readonly TV mode with no shell chrome, no mutations, polling refresh, compact operational slices, and automatic page rotation.

## Audit

Read-only standard dashboard does not require audit.

## Security

Permission-aware cards and server-side masking. Financial totals are only requested when the user has finance/invoice permissions.

## Edge Cases

Large lists, mixed company context, non-financial users.

## Implemented Tasks

SHELL-001, module summaries, STATUS-001A, STATUS-001B, WORKFORM-REAL-001B status integration, CORE-ROLE-UX-001, ROLE-DASHBOARDS-002.

## Planned Tasks

DEMO-POLISH-002.

## Deferred

Legacy DASHBOARD-001 is superseded/deferred.

## Open Decisions

Final dashboard metrics and final work-cycle semantics for returned works.

## Related Documents

[works.md](works.md), [deadlines.md](deadlines.md), [reports.md](reports.md).
