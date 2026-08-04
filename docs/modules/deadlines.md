# Deadlines

## Status

Implemented.

## Purpose

Calculate, persist, display, and snapshot operational work deadlines.

## Roles And Permissions

`works.deadline.preview`, `works.deadline.read`, `works.deadline.recalculate`, `works.deadline.set_manual`, `works.deadline.override_lock`.

## Domain Concepts

Business calendar, Romanian holidays/weekends, execution days, calculated deadline, manual deadline, promised date, effective due date, visual state, snapshot.

## Business Rules

`effectiveDueAt` is the official visible due date for the active cycle. Manual deadlines can override calculated deadlines. Automatic deadlines use company timezone, currently `Europe/Bucharest`. Claim integration in TECH-CLAIM-001B uses claim timestamp as execution start for locked execution snapshot deadlines unless a manual deadline is already set. Each cycle keeps its own deadline snapshot.

## Data Model

Deadline fields on `WorkOrder` for current compatibility, cycle deadline snapshot fields on `WorkCycle`, and deadline fields/JSON in `WorkExecutionSnapshot`.

## API

`POST /works/deadline-preview`, `POST /works/:id/deadline/recalculate`, `POST /works/:id/deadline/manual`, deadline filters/sort in `GET /works`.

## UI

Deadline badges, countdowns, registry filters, dashboard summary, detail card.

## Audit

Recalculate, manual set, lock/override, unresolved snapshot events.

## Security

Deadline preview is non-financial. Execution rules must not leak pricing.

## Edge Cases

Unresolved rule, manual due date, due today/tomorrow, late, weekends/holidays, promised date mismatch.

## Implemented Tasks

WORK-DEADLINES-001A, WORK-DEADLINES-001B, WORK-DEADLINES-001C, TECH-CLAIM-001B integration, WORK-CYCLES-001A cycle snapshots.

## Planned Tasks

Lifecycle hardening in TECH-CLAIM-001C may refine stale/abandoned cases.

## Deferred

Client-specific holiday calendars beyond current Romanian business calendar.

## Open Decisions

Final SLA language for reports.

## Related Documents

[pricing.md](pricing.md), [works.md](works.md), [claim.md](claim.md).
