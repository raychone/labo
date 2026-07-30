# Inventory

## Status

Planned.

## Purpose

Manage stock, NIR, bon de consum, adjustments, transfers, returns, loss/scrap, and traceability.

## Roles And Permissions

Requires business confirmation.

## Domain Concepts

Stock item, warehouse/location, stock movement, NIR, consumption note, adjustment, transfer, return, scrap.

## Business Rules

No finalized schema or workflow. Do not infer Romanian accounting rules without approval.

## Data Model

Planned; no current Prisma models.

## API

Planned.

## UI

Planned.

## Audit

Every stock mutation must be audited.

## Security

Financial/stock valuation data must be permission-controlled.

## Edge Cases

Negative stock, batch traceability, correction documents, cancellation, returned unused material.

## Implemented Tasks

None.

## Planned Tasks

INVENTORY-001.

## Deferred

External accounting integration.

## Open Decisions

Requires business/legal/accounting confirmation.

## Related Documents

[materials.md](materials.md).
