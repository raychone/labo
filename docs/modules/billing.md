# Billing

## Status

Implemented, including company-aware `NC`/`NG` realignment in BILLING-REALIGN-001A. BILLING-REALIGN-001B is approved to finish the manager-facing billing workspace UX.

## Purpose

Manage billing workspace, proformas, invoices, printable documents, statements, registry, and manual payment recording.

## Roles And Permissions

`finance.read`, `finance.record_payment`, `finance.refund`, `finance.read_reports`, `invoice.create`, `invoice.read`, `invoice.download`, `invoice.cancel`, `invoice.configure_series`.

## Domain Concepts

Billing document, line, proforma, invoice, series, issue/cancel, print view, statement, payment balance, execution company, cycle billing line.

## Business Rules

Application records manual payments only. It does not process money, connect to POS/bank, emit legal receipt automatically, or perform automatic reconciliation.

Billable works, documents, series, payments, and print views are scoped by the `NC`/`NG` company fixed in the relevant cycle execution snapshot. The active UI company context filters the billing workspace, but it must not override a document or work cycle company.

A work cycle without an unambiguous locked execution snapshot cannot be invoiced. One document cannot mix `NC` and `NG` cycles. Ambiguous legacy documents are flagged for review instead of being silently assigned.

BILLING-REALIGN-001B must keep `/billing` company-scoped through the global `NC`/`NG` context, expose receivables, statements, month-end registry, manual receipt recording, and read-only ambiguous legacy review, and leave ambiguous correction workflow to BILLING-REALIGN-001C.

## Data Model

`BillingDocument`, `BillingDocumentLine`, `BillingSeries`, `Payment`. Billing documents, lines, payments, and series have legal-entity associations. Billing lines reference `WorkCycle`.

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

BILLING-001, BILLING-002, BILLING-REALIGN-001A.

## Planned Tasks

BILLING-REALIGN-001B is approved. BILLING-REALIGN-001C, PAYMENTS-002, DOCUMENTS-001, and REPORTS-001 are planned.

## Deferred

e-Factura/ANAF, POS, bank integration.

## Open Decisions

Ambiguous legacy company assignment, final fiscal/legal document requirements.

## Related Documents

[payments.md](payments.md), [pricing.md](pricing.md), [organizations.md](organizations.md).
