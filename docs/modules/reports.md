# Reports

## Status

Planned; billing has some current summaries/statements.

## Purpose

Operational, financial, and productivity reporting.

## Roles And Permissions

`reports.operational`, `reports.financial`, `reports.productivity`, plus module-specific financial permissions.

## Domain Concepts

Period, totals, work status, revenue, payments, outstanding balance, productivity.

## Business Rules

Financial reports are manager/finance-only. Operational reports can be broader with masking.

## Data Model

Uses existing work, workflow, delivery, billing, and payment data.

## API

Planned. Current billing statements exist under billing endpoints.

## UI

Planned.

## Audit

Exports may require audit.

## Security

Server-side aggregation must enforce permissions.

## Edge Cases

Cancelled documents, partial payments, company context, date ranges, timezone.

## Implemented Tasks

Billing statements in BILLING-002.

## Planned Tasks

REPORTS-001.

## Deferred

Accounting export integrations.

## Open Decisions

Final KPI definitions.

## Related Documents

[billing.md](billing.md), [payments.md](payments.md), [workflow.md](workflow.md).
