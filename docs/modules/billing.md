# Billing

## Status

Implemented.

## Purpose

Manage billing workspace, proformas, invoices, printable documents, statements, registry, and manual payment recording.

## Roles And Permissions

`finance.read`, `finance.record_payment`, `finance.refund`, `finance.read_reports`, `invoice.create`, `invoice.read`, `invoice.download`, `invoice.cancel`, `invoice.configure_series`.

## Domain Concepts

Billing document, line, proforma, invoice, series, issue/cancel, print view, statement, payment balance.

## Business Rules

Application records manual payments only. It does not process money, connect to POS/bank, emit legal receipt automatically, or perform automatic reconciliation.

## Data Model

`BillingDocument`, `BillingDocumentLine`, `BillingSeries`, `Payment`.

## API

`/billing/overview`, `/billing/billable-works`, `/billing/search`, `/billing/statements/*`, `/billing/month-registry`, CSV export, `/billing-documents/*`, `/billing-series/*`.

## UI

`/billing`, print views under `/billing/documents/:id/print`.

## Audit

Create/update/issue/cancel documents, line changes, payment create/cancel.

## Security

Financial RBAC and masking. Non-financial roles must not receive prices/payment details.

## Edge Cases

Cancelled invoices, overpayment, partial payments, multiple payments, receipt/reference search.

## Implemented Tasks

BILLING-001, BILLING-002.

## Planned Tasks

PAYMENTS-002, DOCUMENTS-001, REPORTS-001.

## Deferred

e-Factura/ANAF, POS, bank integration.

## Open Decisions

Final fiscal/legal document requirements.

## Related Documents

[payments.md](payments.md), [pricing.md](pricing.md), [organizations.md](organizations.md).
