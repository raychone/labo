# ASSETS-DOCS-001 - Integrate real client assets into pricing, laboratory sheet, payment note, invoice and printable documents

## Status

COMPLETED

## Objective

Align the application with the client-provided source assets under `assets/` for pricing, laboratory sheet, payment note, invoice, collaboration terms, and printable branding without inventing business rules.

## Dependencies

- WORKFORM-REAL-001A
- WORKFORM-REAL-001B
- BILLING-REALIGN-001B
- ORG-DATA-MIGRATION-001
- PRICING-002

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../TESTING.md](../TESTING.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/works.md](../modules/works.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/payments.md](../modules/payments.md)
- [../modules/organizations.md](../modules/organizations.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/pricing.md](../modules/pricing.md)
- [../modules/settings.md](../modules/settings.md)
- [../discovery/ASSETS-DOCS-AUDIT.md](../discovery/ASSETS-DOCS-AUDIT.md)
- [../discovery/ASSETS-PRICE-RECONCILIATION.md](../discovery/ASSETS-PRICE-RECONCILIATION.md)

## Scope

- Audit every file in `assets/`.
- Reconcile the real Creative Dental price list with the current seeded pricing catalog.
- Keep the real laboratory sheet, payment note, invoice, and statement print views aligned with the supplied assets.
- Preserve NC/NG company-aware behavior and historical snapshots.
- Keep collaboration terms as a reference document and validation aid, not a new enforcement engine.
- Update module docs and permanent planning docs.

## Delivered scope

- `docs/discovery/ASSETS-DOCS-AUDIT.md`
- `docs/discovery/ASSETS-PRICE-RECONCILIATION.md`
- asset-backed document notes in pricing/billing/settings docs
- printable payment-note support with A4 primary and A5 optional formatting
- invoice print layout alignment with the supplied historical invoice reference
- printer-facing copy alignment for the pricing audit note

## Confirmed mappings

- Creative Dental price list -> seeded real pricing catalog.
- Blank laboratory sheet -> real cycle-scoped work sheet.
- Collaboration terms -> operational guidance and validation reference.
- Historical invoice photo -> billing print structure reference.
- A4 payment-note PDF -> primary note de plată / statement branding shell.
- A5 payment-note PDF -> optional compact note de plată / statement branding shell.

## Confirmation gaps

- Some price rows are intentionally ambiguous and remain documented that way.
- The historical invoice photo must not be reused as literal company data.
- Collaboration terms remain informational wherever the current app does not already enforce them.

## Verification

To be run after implementation changes:

```bash
pnpm --filter @dental-lab/api prisma validate
pnpm --filter @dental-lab/api prisma generate
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

## Commit

`ASSETS-DOCS-001: align client assets with pricing and printable documents`
