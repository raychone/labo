# Billing

## Status

Implemented. Company-aware `NC`/`NG` realignment is approved for BILLING-REALIGN-001A.

## Purpose

Manage billing workspace, proformas, invoices, printable documents, statements, registry, and manual payment recording.

## Roles And Permissions

`finance.read`, `finance.record_payment`, `finance.refund`, `finance.read_reports`, `invoice.create`, `invoice.read`, `invoice.download`, `invoice.cancel`, `invoice.configure_series`.

## Domain Concepts

Billing document, line, proforma, invoice, series, issue/cancel, print view, statement, payment balance, execution company.

## Business Rules

Application records manual payments only. It does not process money, connect to POS/bank, emit legal receipt automatically, or perform automatic reconciliation.

BILLING-REALIGN-001A is approved to enforce that billable works, documents, series, payments, and print views are scoped by the `NC`/`NG` company fixed in the relevant cycle execution snapshot. The active UI company context may filter the billing workspace, but it must not override a document or work cycle company.

## Data Model

`BillingDocument`, `BillingDocumentLine`, `BillingSeries`, `Payment`. BILLING-REALIGN-001A is expected to add or realign legal entity and work-cycle associations non-destructively.

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

BILLING-REALIGN-001A, BILLING-REALIGN-001B, PAYMENTS-002, DOCUMENTS-001, REPORTS-001.

## Deferred

e-Factura/ANAF, POS, bank integration.

## Open Decisions

Ambiguous legacy company assignment, final fiscal/legal document requirements.

## Related Documents

[payments.md](payments.md), [pricing.md](pricing.md), [organizations.md](organizations.md).
