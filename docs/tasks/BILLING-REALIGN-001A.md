# BILLING-REALIGN-001A - Company-aware billing foundation for NC and NG

## Status

APPROVED

Documentation-only definition created. Do not start implementation until explicitly requested.

## Objective

Realign the existing billing implementation so every financial document, billable work, payment record, billing series, and print view is strictly associated with the execution company fixed on the work cycle: `NC` or `NG`.

## Dependencies

- ORG-CONTEXT-001
- ORG-DATA-MIGRATION-001
- SETTINGS-001
- PRICING-002
- WORKS-001
- TECH-CLAIM-001B
- WORK-CYCLES-001A
- BILLING-001
- BILLING-002
- WORKFORM-REAL-001B

## Read First

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/payments.md](../modules/payments.md)
- [../modules/pricing.md](../modules/pricing.md)
- [../modules/organizations.md](../modules/organizations.md)
- [../modules/settings.md](../modules/settings.md)
- [../modules/works.md](../modules/works.md)
- [../modules/clinics-doctors.md](../modules/clinics-doctors.md)
- [../modules/patients.md](../modules/patients.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)
- [../../REAL-LAB-WORKFLOW.md](../../REAL-LAB-WORKFLOW.md)

## Scope

Backend, frontend, migration, seed, tests, and documentation required to make billing company-aware.

### Source Company

- Billing company comes from the immutable execution snapshot of the relevant `WorkCycle`.
- Active UI context must never override the company already fixed on a work cycle.
- Reception does not select billing company.
- Technicians fix `NC`/`NG` through the existing claim flow.
- A work cycle without a valid execution company cannot be invoiced.

### Isolation

- `NC` works can only be invoiced on `NC` documents.
- `NG` works can only be invoiced on `NG` documents.
- A billing document cannot mix `NC` and `NG` works.
- Company separation is enforced server-side.
- Context switch controls which company workspace the manager sees.

### Legal Data

Each document uses the issuing company settings from `LegalEntitySettings`:

- legal name;
- fiscal identifier;
- registration number;
- address;
- bank account;
- bank name;
- contact data;
- document footer and legal settings.

`LegalEntitySettings` is the canonical source for document legal data.

### Billing Series

- Separate proforma series for `NC` and `NG`.
- Separate invoice series for `NC` and `NG`.
- Numbering remains concurrency-safe.
- Document numbers are never reused.
- Existing legacy series and documents require an explicit safe migration/backfill policy.

### Billable Works

A completed work becomes billable under the company fixed in its cycle execution snapshot.

Billable lists must support filtering by:

- company;
- clinic;
- doctor;
- patient;
- work code;
- date interval;
- work type;
- invoiced/uninvoiced state.

Do not expose pricing to unauthorized roles.

### Cycle Behavior

- Each billable line references the correct `WorkCycle`.
- Historical cycles can be billed separately when applicable.
- The same cycle cannot appear in more than one active invoice.
- Proforma behavior must remain compatible with existing valid rules.
- Previous pricing snapshots remain immutable.

### Existing Billing Documents

Implement a deterministic non-destructive migration strategy:

- associate existing billing documents with `NC` or `NG` only when unambiguous;
- associate document lines with the correct cycle where possible;
- do not invent company assignment;
- mark ambiguous legacy records for controlled review;
- do not delete existing documents or payments.

### Payments

- Preserve existing payment records.
- Associate payments with the company of their billing document.
- Do not redesign payment UX.
- Do not implement payment processing.
- Detailed payment realignment remains for a later task if needed.

### API Outcomes

- Company-scoped billing overview.
- Company-scoped billable works.
- Company-scoped billing documents.
- Company-scoped billing series.
- Company-scoped print views.
- Strict cross-company validation.
- Server-side filters.
- Shared contracts updated only as necessary.

### UI Outcomes

- `/billing` responds to the global `NC`/`NG` context switch.
- Clear company label in billing workspace.
- No mixed-company selection.
- Document creation clearly shows the issuing company.
- Loading, empty, error, and conflict states.
- Romanian labels.
- No duplicate billing page.

### RBAC

- Only managers with finance permissions can access billing.
- Operational roles do not see financial values.
- No role-name checks.
- Resource and company isolation are enforced server-side.

### Audit

Audit:

- document created;
- document issued;
- proforma converted;
- company mismatch rejected;
- series allocation;
- legacy association/backfill;
- payment association where applicable.

Do not log full financial payloads unnecessarily.

## Ambiguous Legacy Decisions

Implementation must stop and report exact records or rules when any of these cannot be resolved safely:

- existing billing document has lines from both `NC` and `NG` cycle execution snapshots;
- existing billing document line cannot be matched to a single `WorkCycle`;
- existing document has no line evidence and no unambiguous company source;
- existing billing series is shared across companies and cannot be split without number-collision policy;
- existing payment belongs to a document whose company is ambiguous.

Ambiguous records must not be silently assigned.

## Out Of Scope

- Final fiscal PDF certification.
- RO e-Factura/SPV.
- Accounting integration.
- Bank reconciliation.
- Card/POS processing.
- Advanced payment UX.
- Credit notes/storno redesign.
- Invoice correction workflow.
- Document templates from assets.
- `BILLING-REALIGN-001B`.
- UI/UX global polish.
- Next task.

## Tests

Include coverage for:

- `NC` work invoiced on `NC`;
- `NG` work invoiced on `NG`;
- mixed `NC`/`NG` selection rejected;
- context switch does not mutate existing document company;
- document legal data comes from correct `LegalEntitySettings`;
- separate numbering per company;
- no number reuse;
- cycle association;
- legacy migration/backfill;
- ambiguous legacy record handling;
- financial masking;
- RBAC;
- audit;
- existing billing regression;
- demo seed idempotency.

## Acceptance Criteria

1. Billing company is derived from the cycle execution snapshot.
2. `NC` and `NG` works cannot be mixed.
3. All billing documents have a legal entity.
4. Document legal data uses the correct company settings.
5. Billing series are isolated by company.
6. Number allocation remains concurrency-safe.
7. Billable works are company-scoped.
8. Billing documents are company-scoped.
9. Payments inherit document company.
10. Cycle references are preserved.
11. Legacy migration strategy is explicit and non-destructive.
12. Ambiguous records are not silently assigned.
13. Context switching cannot mutate document ownership.
14. RBAC and financial masking remain server-side.
15. Audit requirements are explicit.
16. Existing billing behavior remains compatible where valid.
17. Tests are defined.
18. `BILLING-REALIGN-001B` remains unstarted.
19. No application code changes are made by this documentation-only definition.
20. Documentation checks pass.
21. One documentation commit.
22. Working tree is clean.

## Verification

For this documentation-only definition:

- inspect documentation diff;
- run `git diff --check`;
- verify tracked working tree is clean after commit.

For implementation, run the standard checks from [../TESTING.md](../TESTING.md), plus migrations and demo seed twice because schema and seed behavior are expected to change.

## Commit

`DOCS: define BILLING-REALIGN-001A company billing foundation`

## Next Task

`BILLING-REALIGN-001B` is planned only and must not be started.
