# Logistics

## Status

Implemented.

## Purpose

Track physical work location, blocking, packing, and delivery preparation.

## Roles And Permissions

`logistics.read`, `logistics.plan`, `logistics.assign`, `logistics.prepare_delivery`, `logistics.center.read`, `logistics.update_location`, `logistics.block_work`, `logistics.unblock_work`, `logistics.prepare_work`, `logistics.manage_groups`.

## Domain Concepts

Location, block reason, packing readiness, preparation group, logistics event.

## Business Rules

Physical status is operational and shared across `NC`/`NG`; financial fields must remain masked for non-financial roles. Current logistics APIs resolve the active work cycle. Registering a returned work creates a new active cycle with logistics state reset to reception/received and preserves previous-cycle logistics history.

## Data Model

`WorkCycle`, `WorkLogisticsState`, `LogisticsEvent`, `DeliveryPreparationGroup`, `DeliveryPreparationItem`.

## API

`/logistics/center`, `/logistics/center/summary`, `/works/:workId/logistics/*`, `/delivery-preparation-groups/*`. STATUS-001A reads logistics status through `GET /status/operational`.

## UI

`/logistics` presents a wrapped tab bar, a clear filter strip, grouped row metadata and responsive cards/tables. Billing labels and `NEFACTURATE` views stay hidden from non-financial users.

## Audit

Location updates, block/unblock, packing transitions, preparation group changes.

## Security

RBAC and resource validation.

## Edge Cases

Blocked work, already grouped work, cancelled groups, packing completion conflicts, returned work opening a new active cycle.

## Implemented Tasks

LOGISTICS-001, STATUS-001A read-model integration, WORK-CYCLES-001A cycle scoping, WORK-CYCLES-001B return/status integration.

## Planned Tasks

Future dashboard integration.

## Deferred

Inventory handoff.

## Open Decisions

Final physical labels beyond implemented returned-work language.

## Related Documents

[delivery.md](delivery.md), [works.md](works.md).
