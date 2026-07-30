# Materials

## Status

Planned.

## Purpose

Track material catalog and material selection/consumption for works or stages.

## Roles And Permissions

Requires business confirmation. Likely manager/logistics/technician split.

## Domain Concepts

Material catalog, material template, selected materials per work/stage, consumption, costing.

## Business Rules

Confirmed only at concept level. Do not implement schema without a task.

## Data Model

Planned; no current Prisma models.

## API

Planned.

## UI

Planned.

## Audit

Material selection and consumption should be audited when implemented.

## Security

Costs must be masked from roles without financial access.

## Edge Cases

Substitutions, waste, rework, returned materials.

## Implemented Tasks

None.

## Planned Tasks

MATERIALS-001.

## Deferred

Inventory stock documents live in [inventory.md](inventory.md).

## Open Decisions

Requires business confirmation: catalog fields, costing method, per-stage versus per-work consumption.

## Related Documents

[inventory.md](inventory.md), [workflow.md](workflow.md).
