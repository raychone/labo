# Delivery

## Status

Implemented.

## Purpose

Plan and execute courier deliveries from prepared work groups.

## Roles And Permissions

`delivery.read_own`, `delivery.read`, `delivery.create`, `delivery.assign`, `delivery.pickup`, `delivery.start_transit`, `delivery.complete`, `delivery.fail`, `delivery.reschedule`, `delivery.cancel`, signature permissions.

## Domain Concepts

Delivery, courier, assignment, pickup, transit, completion, failure, reschedule, cancellation, delivery event.

## Business Rules

Delivery actions follow controlled transitions. Couriers see own deliveries where permitted.

## Data Model

`Delivery`, `DeliveryEvent`, delivery relations to preparation groups and users.

## API

`GET /deliveries`, `GET /deliveries/:id`, `GET /couriers/options`, create from preparation group, patch, assign/unassign, cancel, pickup, start-transit, complete, fail, reschedule.

## UI

`/deliveries`.

## Audit

Delivery transition events.

## Security

RBAC and own-delivery scope where applicable.

## Edge Cases

Already assigned, failed delivery, reschedule, cancelled delivery, proof requirements.

## Implemented Tasks

DELIVERY-001.

## Planned Tasks

Status/dashboard and reports integration.

## Deferred

External courier integrations.

## Open Decisions

Route optimization and proof requirements.

## Related Documents

[logistics.md](logistics.md), [signatures.md](signatures.md).
