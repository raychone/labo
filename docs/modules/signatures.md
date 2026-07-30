# Signatures

## Status

Implemented for internal delivery handover proof.

## Purpose

Capture and render delivery proof.

## Roles And Permissions

`delivery.signature.capture`, `delivery.signature.read`, `delivery.signature.override`, `delivery.proof.print`.

## Domain Concepts

Signature proof, recipient details, override reason, print view.

## Business Rules

The application records internal proof; it does not create legal fiscal receipts.

## Data Model

`DeliveryProof`, delivery proof fields and events.

## API

`GET /deliveries/:id/proof`, `GET /deliveries/:id/proof/print-view`, delivery complete/override flow.

## UI

Delivery proof print page and delivery completion UX.

## Audit

Proof capture and override should be auditable.

## Security

Protect proof access; avoid exposing signatures outside authorized users.

## Edge Cases

Missing signature, override reason, print failure.

## Implemented Tasks

SIGNATURES-001.

## Planned Tasks

External document center integration.

## Deferred

External e-signature provider.

## Open Decisions

Legal wording for final proof document.

## Related Documents

[delivery.md](delivery.md).
