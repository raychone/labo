# REALIGN-001A - Domain audit checkpoint

## Status

COMPLETED

## Objective

Freeze the current implementation facts and define non-destructive migration guardrails before the final workflow realignment starts.

## Dependencies

- [../REALIGNMENT-IMPLEMENTATION-PLAN.md](../REALIGNMENT-IMPLEMENTATION-PLAN.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)

## Read first

- [../REALIGNMENT-IMPLEMENTATION-PLAN.md](../REALIGNMENT-IMPLEMENTATION-PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../modules/works.md](../modules/works.md)
- [../modules/rbac.md](../modules/rbac.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)

## Current implementation facts

| Area | Verified fact | Impact |
|---|---|---|
| Architecture | Monorepo is `apps/api` NestJS/Prisma/PostgreSQL and `apps/web` React/Vite. | Preserve existing architecture. |
| WorkOrder required relations | `WorkOrder.clinicId` and `WorkOrder.doctorId` are non-null DB fields and required service/DTO inputs. | Blocks final optional clinic/doctor rule until migrated. |
| WorkCycle required relations | `WorkCycle.clinicId` is required and `doctorId` is nullable. | Optional clinic needs cycle migration and return-cycle handling. |
| Billing required clinic | `BillingDocument.clinicId` is required and snapshots clinic name. | Works without clinic need explicit billing eligibility/fallback rule before invoicing. |
| Work code | `WorkOrderCodeService` generates `WO-${fullYear}-${6-digit sequence}` from global `work_order_code_seq`. | Must become annual `WO-YY-NNNN`; preserve existing codes. |
| QR | `WorkOrder.qrToken` is unique opaque token separate from `code`. | Safe to change visible code without QR rewrite. |
| WorkType | `WorkType` has generated `code`, `name`, price, unit; no explicit business `symbol`. | Add/backfill symbol; avoid duplicate catalog rows. |
| Teeth/form data | Real lab form tests already reference fields like `teeth` and `shade`, but no canonical adult FDI config was found. | Build one shared tooth config before UI realignment. |
| Claim model | `claimStatus`, `assignedTechnicianId`, `claimedAt`, `claimedByUserId`, `claimRevision` exist. Claim uses `updateMany` with expected revision/status and conflict handling. | Good foundation for atomic `Preia`; still needs final race integration test and auto-eligibility proof. |
| Technician workbench | Existing page has available vs own claim tabs and legal-entity selection during claim. | Extend/simplify; do not rebuild from scratch. |
| Legal entity | NC/NG context exists with global switch; claim fixes execution company context. | Preserve mechanism; later rename/display realignment to CDT/NG must not change IDs blindly. |
| Logistics | `WorkLogisticsState`, events and delivery preparation groups exist. | Extend to final Status cards and delivery/pickup candidates. |
| Delivery | Delivery has courier, planned date, `sequenceOrder`, status transitions and proof. No mixed route/stop model found. | Route domain can reuse delivery pieces but needs explicit route/stop abstraction or compatible bridge. |
| Billing series | `BillingSeries` is company-aware with unique `[legalEntityId, documentType, prefix, year]`. | Good base for CDT/CD and NG/NG; sequence start and year rollover need controlled migration. |
| Invoice lines | `BillingDocumentLine` stores detailed work lines and non-negative totals. | Simplified invoice display/generation must preserve detailed payment-note data. |
| Discounts | Document-level `discountMinor` exists; no patient discount model found. | Add patient/invoice discount model with snapshots. |
| Storno | No explicit storno relation/type found; cancellation exists. | Implement storno separately; do not reuse cancel as storno. |
| Audit | `AuditLog` exists and many modules write audit/events. | Expand coverage and add manager-readable UI. |
| RBAC | Granular permission registry exists; Manager has all, other roles scoped. | Add only missing final permissions. |
| Attachments | `files.*` permissions exist; no full shared file model confirmed in Prisma schema. | Logistics attachments may need minimal shared attachment stack if no reusable storage exists. |

## Migration guardrails

1. Do not reset the database or renumber historical work/invoice records.
2. Add nullable fields first, backfill, then tighten only if final rules require it.
3. Preserve `qrToken` values and scan compatibility in every work-code migration.
4. For optional clinic/doctor, update Prisma schema, DTOs, services, deadline resolver inputs, work cycles, status read models, QR/scan views, billing eligibility and tests in the same vertical slice.
5. For `WorkType.symbol`, add a separate field or documented semantic mapping; do not repurpose generated `code` until existing references are audited.
6. For work code sequencing, define a concurrency-safe annual sequence table/row lock or PostgreSQL sequence strategy before changing `WorkOrderCodeService`.
7. For billing company realignment, update display/config only; do not change opaque IDs or historical issued document numbers.
8. For routes, preserve existing delivery/proof history and introduce ordered route stops with explicit `position`.
9. For technician earnings, use integer minor units and immutable performed-operation snapshots; never calculate historical earnings from current rates.
10. Every mutation introduced by later subepics must have server-side RBAC and audit before UI completion.

## Conflicts to resolve before coding

| Conflict | Required resolution |
|---|---|
| Final workflow allows no clinic/doctor; current work and billing models require clinic. | `INTAKE-001A` must include data model and downstream billing/status fallback decisions. |
| Final code is `WO-26-0001`; current code is `WO-2026-000001`. | `WORK-ID-001A` must add annual short sequence without editing old codes. |
| Final WorkType catalog uses short `symbol`; current `code` is generated catalog code. | `WORKTYPE-REALIGN-001A` must introduce symbol/backfill. |
| Final route includes delivery and pickup stops; current delivery model is delivery-group based. | `ROUTE-001A` must choose extend-vs-bridge design before UI. |
| Final storno is correction document; current system has cancellation only. | `STORNO-001A` must add immutable source-invoice relation and duplicate prevention. |
| Final attachment requirement is logistics-specific; file storage is not confirmed in schema. | `LOGISTICS-001A` must verify storage path before implementation. |

## Recommended implementation order after this checkpoint

1. `REALIGN-001B` - add missing RBAC permissions first, because all later endpoints depend on them.
2. `WORKTYPE-REALIGN-001A` - add official catalog `symbol` safely and idempotently.
3. `WORK-ID-001A` - introduce short annual work codes.
4. `INTAKE-001A` - make clinic/doctor optional across schema/API/read models.
5. `INTAKE-001B` + `TEETH-001A/B` - realign work creation UX and tooth selector.
6. `CLAIM-001A/B` - prove automatic claimability and atomic race behavior.

## Acceptance criteria

1. Current architecture and domain facts are documented with concrete file-backed findings.
2. Non-destructive migration guardrails are documented before implementation.
3. Conflicts between current implementation and final workflow are explicit.
4. Next implementation subepic is identified.
5. No application code, Prisma schema, migrations, seeds or tests are changed by this checkpoint.

## Automated checks

Not run. This checkpoint is documentation-only and does not change executable code.

## Manual checks

- Inspected Prisma schema, migrations, RBAC registry, work services, technician workbench, logistics/delivery and billing modules.
- Verified working tree before and after documentation changes.

## Completion note

`REALIGN-001A` is complete as a documentation checkpoint. Start implementation with `REALIGN-001B` unless the team wants to make WorkType catalog or work numbering the first code-bearing slice instead.
