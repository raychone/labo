# Pricing

## Status

Implemented.

## Purpose

Resolve company-specific prices and commercial agreements.

## Roles And Permissions

`pricing.read`, `pricing.create`, `pricing.update`, `pricing.archive`, `pricing.resolve_preview`, `pricing.agreements.read`, `pricing.agreements.manage`. Financial exposure is manager-focused.

## Domain Concepts

Price catalog, execution time rules, clinic agreement, doctor agreement, adjustment types, preview resolver, execution pricing snapshot.

## Business Rules

Confirmed precedence from code: doctor-specific agreement, then clinic-specific agreement, then company standard catalog. Money uses minor units and currency. Reception, technicians, logistics, and couriers must not receive pricing fields unless explicitly permitted. Pricing snapshots are immutable inside each work cycle and are the billing source for cycle price and execution company.

## Data Model

`PriceCatalogItem`, `ExecutionTimeRule`, `PricingAgreement`, `PricingAgreementRule`, cycle-scoped pricing fields in `WorkExecutionSnapshot`.

## API

`/pricing/catalog`, `/pricing/catalog/:id/execution-rules`, `/pricing/agreements`, `/pricing/agreements/:id/rules`, `/pricing/resolve-preview`.

## UI

`/pricing`.

## Audit

Catalog/agreement create/update/archive/restore and snapshot pricing resolution events.

## Security

Financial masking server-side. Do not trust frontend totals.

## Edge Cases

No active catalog price, future agreement, archived agreement, conflicting agreement scope, firm mismatch on claim snapshot.

## Implemented Tasks

PRICING-002, TECH-CLAIM-001B integration, WORK-CYCLES-001A cycle snapshots.

## Planned Tasks

Future accounting/reporting refinements.

## Deferred

Importing final price list from assets.

## Open Decisions

Final production price list validation.

## Related Documents

[organizations.md](organizations.md), [deadlines.md](deadlines.md), [claim.md](claim.md), [billing.md](billing.md).
