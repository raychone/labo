# BILLING-REALIGN-001B - Financial workspace, receivables and month-end UX

## Status

COMPLETED

Implemented in the application. `BILLING-REALIGN-001C` remains planned and was not started.

Delivered scope:

- company-scoped manager billing workspace;
- manager dashboard KPI view with company-scoped billing entry points only;
- billing overview counters and tabs;
- billing filters collapsed by default behind an explicit toggle;
- billable works filters and selection;
- proformas, invoices, manual payment recording, receivables/restanțe;
- clinic and doctor statements with printable browser views;
- month-end registry;
- company-scoped CSV/print exports;
- read-only ambiguous legacy review;
- RBAC and audit coverage;
- test and documentation updates.

## Objective

Finish the manager-facing billing workspace so `NC` and `NG` managers can quickly find, filter, issue, and track proformas, invoices, and manual receipts without mixing companies.

## Dependencies

- BILLING-REALIGN-001A
- BILLING-001
- BILLING-002
- ORG-CONTEXT-001
- ORG-DATA-MIGRATION-001
- SETTINGS-001

## Read First

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/payments.md](../modules/payments.md)
- [../modules/organizations.md](../modules/organizations.md)
- [../modules/settings.md](../modules/settings.md)
- [../modules/works.md](../modules/works.md)
- [../modules/clinics-doctors.md](../modules/clinics-doctors.md)
- [../modules/patients.md](../modules/patients.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)
- [../../REAL-LAB-WORKFLOW.md](../../REAL-LAB-WORKFLOW.md)

## Scope

### Billing Workspace UX

- Keep one `/billing` workspace.
- Respect the global `NC`/`NG` context.
- Show a clear issuing-company badge/header.
- Show no mixed-company data.
- Use Romanian labels.
- Provide responsive desktop and mobile layouts.
- Preserve existing routes and document flows where valid.

### Tabs

- `Prezentare generală`
- `Lucrări nefacturate`
- `Proforme`
- `Facturi`
- `Încasări`
- `Restanțe`
- `Închidere lună`
- `Serii`

### Overview

Show company-scoped counters:

- lucrări nefacturate;
- proforme deschise;
- facturi neachitate;
- facturi parțial achitate;
- facturi achitate;
- total emis;
- total încasat;
- sold restant;
- documente ambigue legacy requiring review.

No cross-company totals unless explicitly requested in a dedicated manager-only comparison view.

### Billable Works

Filters:

- clinic;
- doctor;
- patient;
- work code;
- work type;
- date interval;
- cycle;
- completed/billable status.

Features:

- select multiple compatible works;
- reject mixed-company selection;
- reject cycles already present on an active invoice;
- show price snapshot and total only to authorized managers;
- issue proforma or invoice;
- clear selected-total summary;
- no manual line items;
- no price override in this task.

### Proformas

- Search by number, clinic, doctor, patient, and work code.
- Filter by date/status.
- Print/open.
- Convert to invoice.
- Preserve company and lines.
- Show related invoice after conversion.
- No cross-company conversion.

### Invoices

Filters:

- `ACHITATĂ`;
- `PARȚIAL ACHITATĂ`;
- `NEACHITATĂ`;
- `RESTANTĂ`;
- `ANULATĂ`;
- clinic;
- doctor;
- patient;
- work code;
- date interval;
- due date interval;
- document number.

Show:

- total;
- paid amount;
- remaining balance;
- due date;
- overdue badge;
- company;
- clinic;
- doctor;
- linked cycles/works.

### Manual Receipt Recording

The application records payments only. It does not process money.

Supported informative methods:

- `CASH`;
- `CARD`;
- `BANK_TRANSFER`;
- `OTHER`.

Fields:

- invoice;
- amount;
- payment date;
- method;
- reference;
- receipt number if used;
- notes.

Rules:

- partial payments allowed;
- multiple payments per invoice allowed;
- amount must be positive;
- amount cannot exceed remaining balance unless an explicit overpayment rule already exists;
- payment company must match invoice company;
- update invoice derived payment state;
- do not generate fiscal receipt/POS output.

### Receivables / Restanțe

Company-scoped receivables list:

- unpaid;
- partially paid;
- overdue;
- balance;
- days overdue;
- clinic;
- doctor;
- patient;
- invoice number;
- issue date;
- due date.

Filters:

- clinic;
- doctor;
- patient;
- overdue only;
- balance range;
- date interval;
- search.

### Clinic And Doctor Statements

- Statement by clinic.
- Optional doctor filter.
- Date interval.
- Issued documents.
- Payments.
- Remaining balance.
- Printable browser view.
- CSV export using existing safe export conventions.

Doctor remains an operational filter, not automatically the legal beneficiary.

### Month-End Registry

- Company.
- Month/year.
- All proformas.
- All invoices.
- All payments.
- Unpaid/partial/paid totals.
- Clinic grouping.
- Doctor grouping.
- Patient/work references.
- CSV export.
- Print preview.
- No cross-company records.

### Legacy Ambiguous Records

- Expose a manager-only warning/count.
- List ambiguous documents separately.
- Read-only review in this task.
- No silent correction.
- No automatic company reassignment.
- Correction workflow stays for `BILLING-REALIGN-001C`.

### Search And Filters

Search should cover:

- proforma number;
- invoice number;
- patient;
- clinic;
- doctor;
- work code;
- payment reference;
- receipt number.

Preserve filter state in URL/query params where practical.

### RBAC And Masking

- Billing remains manager/finance only.
- Server-side company isolation.
- No financial data for reception, technician, logistics, courier, or doctor.
- No role-name checks.
- Permission-based actions.
- Safe `403`/`404` behavior.

### Audit

Audit:

- proforma issued;
- invoice issued;
- conversion;
- payment recorded;
- payment cancelled if existing functionality permits;
- export generated;
- statement opened;
- ambiguous legacy review opened;
- company mismatch rejected.

Do not log full financial payloads unnecessarily.

## Tests

Include coverage for:

- `NC` workspace only shows `NC`;
- `NG` workspace only shows `NG`;
- context switch refetches and does not mutate documents;
- filters/search;
- mixed-company selection rejected;
- issue proforma;
- issue invoice;
- convert proforma;
- partial payment;
- full payment;
- remaining balance;
- overdue state;
- statement;
- month-end registry;
- CSV export;
- ambiguous legacy warning;
- RBAC;
- no financial leakage;
- mobile layout;
- regression for `BILLING-REALIGN-001A`.

## Out Of Scope

- e-Factura/SPV.
- Fiscal receipt generation.
- POS/card processing.
- Bank reconciliation.
- Accounting integration.
- Credit notes/storno redesign.
- Correction UI for ambiguous legacy records.
- Document templates from assets.
- Global UI/UX polish outside billing.
- `BILLING-REALIGN-001C`.
- Next task.

## Acceptance Criteria

1. `/billing` is fully company-scoped.
2. `NC` and `NG` data never mix.
3. Overview counters are correct.
4. Billable works filters work.
5. Proforma issue flow works.
6. Invoice issue flow works.
7. Proforma conversion works.
8. Invoice payment state is correct.
9. Partial payments are supported.
10. Full payment is supported.
11. Overdue invoices are visible.
12. Receivables filters work.
13. Clinic/doctor statements work.
14. Month-end registry works.
15. CSV and print views are company-scoped.
16. Ambiguous legacy records are visible read-only.
17. Search covers financial identifiers and operational references.
18. RBAC and masking are server-side.
19. Mobile and desktop UX are usable.
20. Tests are defined and required verification passes.
21. `BILLING-REALIGN-001C` remains unstarted.
22. Application code changes are limited to the approved billing workspace scope.
23. Documentation checks pass.
24. One implementation commit.
25. Working tree is clean after commit.

## Implementation Notes

- `/billing` now exposes the required Romanian tabs: overview, billable works, proformas, invoices, payments, receivables/restanțe, month-end, and series.
- Overview counters are company-scoped and include unpaid, partial, paid, issued, collected, outstanding, and ambiguous legacy counts.
- Billable-work and document filters include date, search, patient, work code, payment status, and existing clinic/doctor/server filters.
- Proforma/invoice lists are split while preserving existing issue, print, conversion, and manual payment flows.
- Receivables are exposed through a company-scoped API and UI tab with balance, due date, days overdue, clinic, doctor, patient, and work references.
- Month-end registry includes patient/work/doctor references, paid/partial/unpaid totals, print preview, and safe CSV export.
- Ambiguous legacy records are visible read-only for managers/finance reports. No correction workflow, reassignment, or silent migration was added.
- Manual payments remain evidence-only. No e-Factura, fiscal receipts, POS/card processing, bank reconciliation, or accounting redesign was added.
- No Prisma schema change was required; no migration was created.

## Verification

Required documentation-task verification:

- inspect documentation diff;
- `git diff --check`;
- verify tracked working tree is clean after commit.

Implementation will require the full verification from [../TESTING.md](../TESTING.md).

## Commit

`DOCS: define BILLING-REALIGN-001B financial workspace`

## Next Task

`BILLING-REALIGN-001C` is planned only and must not be started.
