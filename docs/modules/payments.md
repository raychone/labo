# Payments

## Status

Implemented as manual payment evidence inside billing.

## Purpose

Track payment records against invoices.

## Roles And Permissions

`finance.record_payment`, `finance.read`, `finance.refund`.

## Domain Concepts

Manual payment, amount, received date, method, optional receipt number/date, bank reference, notes, cancelled payment, derived balance.

## Business Rules

Payment statuses are derived: `UNPAID`, `PARTIALLY_PAID`, `PAID`. Zero/negative payments and overpayments are rejected. Cancelled invoices do not accept new payments. Cancelling a payment recalculates status and balance. Payment company is inherited from the billing document and cannot be selected independently.

## Data Model

`Payment`, relations to `BillingDocument`, inherited `LegalEntity`.

## API

`POST /billing-documents/:id/payments`, `GET /payments`, `POST /payments/:id/cancel`.

## UI

Payment evidence appears in billing workspace. BILLING-REALIGN-001B is approved to improve manual receipt recording UX without adding payment processing.

## Audit

Payment create/cancel.

## Security

Manual record only; no payment processing.

## Edge Cases

Partial payments, multiple payments, receipt/reference search, cancelled payment rollback.

## Implemented Tasks

BILLING-001.

## Planned Tasks

BILLING-REALIGN-001B integration, PAYMENTS-002.

## Deferred

POS/bank/reconciliation integrations.

## Open Decisions

Final accountant-approved terminology and exports.

## Related Documents

[billing.md](billing.md).
