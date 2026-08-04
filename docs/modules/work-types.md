# Work Types

## Status

Implemented.

## Purpose

Define work categories used by works, forms, workflow templates, pricing, and deadlines.

## Roles And Permissions

Historically tied to pricing/admin permissions; `/work-types` route requires `pricing.read` in current web route registry.

## Domain Concepts

Code, name, unit, active/archive state, base price minor units.

## Business Rules

Inactive work types should not be selected for new work. Existing works keep historical relation.

## Data Model

`WorkType`.

## API

`GET /work-types`, `GET /work-types/options`, `GET /work-types/:id`, `POST /work-types`, `PATCH /work-types/:id`, archive/restore.

## UI

`/work-types`, plus form/workflow builder routes under a work type.

## Audit

Create/update/archive/restore.

## Security

RBAC and DTO validation.

## Edge Cases

Duplicate code, inactive type referenced by old works.

## Implemented Tasks

WORKTYPES-001.

## Planned Tasks

Real laboratory sheet template foundation and operational completion are implemented by WORKFORM-REAL-001A/B.

## Deferred

Bulk import from external assets.

## Open Decisions

Final production price list mapping from assets.

## Related Documents

[pricing.md](pricing.md), [forms.md](forms.md), [workflow.md](workflow.md).
