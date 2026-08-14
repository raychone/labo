# Billing

## Status

Implemented, including company-aware `NC`/`NG` realignment in BILLING-REALIGN-001A and the manager-facing financial workspace, receivables, month-end registry, read-only ambiguous legacy review in BILLING-REALIGN-001B, and asset-aligned printable note/invoice layouts.

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

`/billing` is company-scoped through the global `NC`/`NG` context. It exposes overview counters, billable works, proformas, invoices, manual payment recording, receivables/restanțe, clinic/doctor statements, live month-end registry actions, company-scoped print/CSV views, series, and read-only ambiguous legacy review. Ambiguous correction workflow remains deferred to BILLING-REALIGN-001C.

## Data Model

`BillingDocument`, `BillingDocumentLine`, `BillingSeries`, `Payment`. Billing documents, lines, payments, and series have legal-entity associations. Billing lines reference `WorkCycle`.

## API

`/billing/overview`, `/billing/billable-works`, `/billing/search`, `/billing/receivables`, `/billing/ambiguous-legacy`, `/billing/statements/*`, `/billing/month-registry`, CSV export, `/billing-documents/*`, `/billing-series/*`.

## UI

`/billing` keeps the live financial workspace only, with tabs for overview, billable works, proformas, invoices, payments, receivables/restanțe, statements, a Romanian billing guide, and series. Filters start collapsed behind an explicit toggle so the page stays usable by default. Month navigation is query-driven with `year` and `month` in the URL for the live registry, while the dedicated archive workspace at `/billing/archive` handles historical month browsing and reopening. Manual payment recording is presented in a modal for a selected invoice or proforma with outstanding balance; proformas are converted to invoices before payment is recorded. The live month-end tab stays focused on the current registry and close action; the archive workspace lists server-persisted snapshots per legal entity and can reopen a historical archive without overwriting it; duplicate company+year+month archives are rejected server-side. Print views remain under `/billing/documents/:id/print`, and company-scoped clinic/doctor statement print views live under `/billing/statements/:scope/print`. The statement print view defaults to the supplied A4 payment-note asset and keeps the A5 variant available as an optional compact format. The billing document print view keeps the A4 invoice-style layout and company-specific legal snapshots, now including the persisted work-type unit snapshot so the rendered line items match the underlying work data more closely.

## Audit

Create/update/issue/cancel documents, line changes, payment create/cancel, statement/month registry/export views, ambiguous legacy review, and rejected company mismatches.

## Security

Financial RBAC and masking. Non-financial roles must not receive prices/payment details.

## Edge Cases

Cancelled invoices, overpayment, partial payments, multiple payments, receipt/reference search.

## Implemented Tasks

BILLING-001, BILLING-002, BILLING-REALIGN-001A, BILLING-REALIGN-001B, CORE-ROLE-UX-001.

## Planned Tasks

BILLING-REALIGN-001C, PAYMENTS-002, DOCUMENTS-001, and REPORTS-001 are planned.

## Deferred

e-Factura/ANAF, POS, bank integration.

## Open Decisions

Ambiguous legacy company assignment, final fiscal/legal document requirements.

## Related Documents

[payments.md](payments.md), [pricing.md](pricing.md), [organizations.md](organizations.md).
