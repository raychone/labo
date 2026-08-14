# BILLING-ARCHIVE-001 - Manager billing archive workspace

## Status

COMPLETED

## Objective

Extract the historical monthly billing archive out of the live manager billing workspace and expose it as a dedicated, company-scoped archive area for NC/NG.

## Dependencies

- BILLING-REALIGN-001B
- BILLING-MONTH-CLOSE-001
- ORG-CONTEXT-001
- SETTINGS-001
- BILLING-001
- BILLING-002

## Read First

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/organizations.md](../modules/organizations.md)
- [../modules/settings.md](../modules/settings.md)
- [../TESTING.md](../TESTING.md)

## Scope

- Dedicated `/billing/archive` workspace for historical month browsing.
- Month/year navigation that stays stable in the URL.
- Archive home and archive detail routes.
- Company-scoped archive summaries for the active NC/NG legal entity.
- Reopen historical month registry snapshots without overwriting them.
- PDF and CSV access for archived months.
- Keep `/billing` focused on the live financial workspace only.
- Update navigation so manager users see Finance → Facturare / Arhivă facturare.
- Add tests and documentation updates.

## Out of scope

- Billing document print layouts.
- Note de plată / factură visual redesign.
- Pricing rules.
- Month-close calculations.
- NC/NG company-scoping semantics.
- New archive persistence models.

## Acceptance Criteria

1. `/billing/archive` exists and is protected.
2. Historical month detail routes work.
3. Archive data is company-scoped.
4. The live `/billing` workspace no longer contains the archive browser.
5. Tests pass.
6. Documentation is updated.

## Commit

`BILLING-ARCHIVE-001: extract dedicated manager billing archive workspace`
