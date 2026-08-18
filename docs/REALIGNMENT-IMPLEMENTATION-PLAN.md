# Realignment Implementation Plan

Canonical implementation source for the final real-world Dental Lab workflow realignment.

Status: `IN_PROGRESS`  
Scope: planning only; implement one subepic at a time.  
Primary rule: extend the existing app; do not rewrite working modules.

## Repository Audit

| Area | Current finding |
|---|---|
| Monorepo | `pnpm` workspace with `apps/api`, `apps/web`, `packages/ui`, `packages/shared`, `packages/config`. |
| Backend | NestJS, Prisma, PostgreSQL, REST controllers, services, DTO validation, guards, cookie auth, CSRF, Argon2id. |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, feature folders. |
| Prisma | Existing models cover users/RBAC, clinics/doctors, patients, work types, works, QR, forms, workflow, cycles, logistics, delivery, billing, payments, audit. |
| Migrations | Deterministic migrations exist from auth through billing archive; no reset strategy allowed. |
| RBAC | Roles: `MANAGER`, `RECEPTIE`, `TEHNICIAN`, `LOGISTICA`, `CURIER`, `MEDIC`; granular permission registry exists. |
| Work orders | `WorkOrder` has `code`, opaque `qrToken`, clinic/doctor/work type, patient, deadline fields, claim fields, active cycle. `clinicId` and `doctorId` are currently required. |
| Work numbering | `WorkOrderCodeService` currently returns `WO-${fullYear}-${6-digit sequence}` from global `work_order_code_seq`. |
| QR | QR uses opaque token; preserve all existing tokens and scan behavior. |
| Work types | Existing `WorkType` has generated `code`, `name`, price, active/archive audit; final catalog needs explicit `symbol` semantics. |
| Forms | Dynamic work form templates/submissions and real lab sheet exist; extend rather than duplicate. |
| Status | Operational status API/page and TV mode exist; must be realigned to final column/order/card rules. |
| Technician | Claim, execution snapshot, workbench, colors, workflow stage execution exist; final workbench must be simplified around `Preia`, `Detalii`, `Manopere`, `Finalizata`. |
| Logistics | Operational center, logistics state/events, preparation groups exist; final route builder and pickup model need extension. |
| Courier | Delivery planning/execution and proof exist; final UI should move to assigned route stops with delivery/pickup outcomes. |
| Billing | Billing docs, payments, statements, archive, company context and series exist; final CDT/NG naming, automatic series, editable commercial snapshots, simplified invoices, payment notes, invoice payments, discounts and storno need extension. |
| Audit | `AuditLog` exists; mutation coverage must be expanded and manager visibility completed. |
| Navigation | Route registry and role-filtered sidebar exist; add `Castiguri`, `Traseu`, `Tehnicieni`, `Storno` surfaces as scoped pages/tabs. |
| Tests | Vitest unit/controller/service tests and Playwright smoke exist. Future subepics must add focused tests. |
| Seeds | Main/demo seeds include roles, permissions, legal entities NC/NG and demo data; use idempotent upserts/backfills. |
| Existing roadmap | Canonical `docs/MASTER_PLAN.md`; task docs in `docs/tasks`; root `IMPLEMENTATION_STATUS.md` is historical. |

## Canonical Domain Rules

| ID | Rule |
|---|---|
| R1 | Work Type / `Tip lucrare` is the customer-requested catalog item. |
| R2 | Technician Operation / `Manopera` is performed work by a technician; it is not a Work Type. |
| R3 | Technician Rate is configured per technician per operation. |
| R4 | Technician Earning Snapshot is immutable once a performed operation becomes financially relevant. |
| R5 | Customer Price is commercial pricing for customer billing; never use it as technician earning. |
| R6 | Invoice is accounting output from customer values, not technician earnings. |
| R7 | Visible work code and QR token are separate; QR stays opaque and existing QR codes remain valid. |
| R8 | Clinic and doctor are optional for work creation/edit, DTOs, service validation and DB constraints. |
| R9 | Teeth are adult permanent only, optional globally, multiselect, no duplicates, deterministic order. |
| R10 | Reception-created work is immediately claimable by technicians without manual Status/logistics dispatch. |
| R11 | Operational state and technician assignment are separate concepts. `Receptie` can be claimable. |
| R12 | `Preia` must be atomic server-side; exactly one technician can claim a work. |
| R13 | Domain timestamps are explicit fields; never infer claim/completion/deadline/route execution from `updatedAt`. |
| R14 | Audit complements canonical state; it does not replace persisted domain fields. |
| R15 | Status columns are fixed in the final order; do not reorder without explicit approval. |
| R16 | Route stop order is persisted explicitly; no accidental DB ordering. |
| R17 | Issued invoices are immutable; storno/corrections link to originals instead of editing them. |
| R18 | Normal billing action is `Emite factura`: calculated values may become an internal draft and issue immediately without forcing manual draft management. |
| R19 | `Revizuieste valorile` is the exceptional path where Manager edits a commercial draft/snapshot before issue. |
| R20 | One frozen commercial snapshot is shared by invoice and payment note; invoice total and payment-note total must always agree. |
| R21 | Payments are recorded per issued invoice against final invoice total, paid amount and remaining amount. |
| R22 | Proforma is not part of the final user-facing billing workflow; legacy support may remain internal/deferred if removal is risky. |
| R23 | Storno is allowed for unpaid, partially paid and fully paid invoices; historical payments stay associated with the original invoice and are never deleted, rewritten or automatically transferred. |

## Official Work Type Catalog

Work creation/edit forms show long `name` as primary label; short `symbol` may be secondary. Status/compact views show `symbol`. Store both on one `WorkType` record.

| Symbol | Name |
|---|---|
| I BAR | Structura metalica tip bara Titan / Cr-Co / Cr-Ni |
| Zr | Zirconia FULL anatomic |
| Zr I | Zirconia pe implant |
| Richmond | RCR Zirconia + Coroana Zirconia (Endo Coroana Totala) |
| Zr E | Zirconia placata integral Ceramica |
| Zr SF | Zirconia placata V Ceramica |
| Inlay / Table Top | Incrustatie |
| EMax | Integral Ceramica |
| PMMA | Provizorie frezata |
| Shell | PMMA cu grosime dirijata |
| Try-in | Provizorie printata |
| Nexco | Compozit |
| TF / MC | Total fizionimic / Metalo Ceramica |
| TFI / MCI | Total fizionimic pe implant / Metalo Ceramica pe implant |
| SF | Semifizionomic (Weiser Portelan) |
| MP | Model Printat |
| MS | Model de studiu (gips) |
| Wax-up | Modelaj in ceara arcada dentara |
| GB/GC/GA/Essix | Gutiere Bruxism / Contentie / Albire / Retainer Essix |
| PPA | Proteza Partiala Acrilica |
| PTA | Proteza Totala Acrilica |
| SCH | Proteza Scheletata / Mobilizabila |
| KMY | Proteza Kemeny |
| LI + SO | Lingura + Sabloane ocluzie |
| MACH | Machete |
| REP PROT | Reparatie Proteza |
| RCR/DCR | Pivot / Dispozitiv corono-radicular |
| RCR/DCR cu bila/claveta | Pivot / Dispozitiv corono-radicular cu sisteme |
| CC | Cheie Control |

Backfill must match equivalent existing names/codes before insert to avoid duplicates.

## Teeth

Use FDI permanent adult numbering unless existing implementation proves a different client-approved numbering. Canonical quadrants:

| UI label | Teeth |
|---|---|
| Sus dreapta | 18,17,16,15,14,13,12,11 |
| Sus stanga | 21,22,23,24,25,26,27,28 |
| Jos stanga | 31,32,33,34,35,36,37,38 |
| Jos dreapta | 48,47,46,45,44,43,42,41 |

Persist selected teeth as structured identifiers. Sort deterministically by canonical FDI order for storage/API responses. Tooth selection is optional unless a future explicit WorkType rule says otherwise.

## Final Status Model

Canonical visible columns, exactly in this order:

1. Clinica sau Medic
2. Pacient
3. Tip lucrare
4. Culoare
5. Tehnician - culoare + nume
6. Preluare
7. Termen
8. Stare
9. Alerte
10. Livrare/Ridicare

Clinic/doctor display: clinic if present; else doctor; else `-`. `Tip lucrare` uses `WorkType.symbol`. `Preluare` uses persisted claim timestamp. `Termen` computes overdue dynamically and displays a large red `!` while deadline-relevant and overdue.

Canonical operational states: `RECEPTIE`, `IN_LUCRU`, `IN_ASTEPTARE`, `FINALIZATA`, plus downstream route/delivery states where needed. `IN_ASTEPTARE` can be set by technician/logistics/manager and returned to `IN_LUCRU`.

Logistics alert colors: `rosu`, `galben`, `verde`, `albastru`, `negru`. Keep separate from technician identity color and state.

`Livrare/Ridicare` must distinguish `DELIVERY` vs `PICKUP`; do not model final behavior as a single ambiguous boolean.

## Final Billing Model

Canonical flow: `works -> calculated commercial values -> optional review/edit -> issue invoice + payment note together -> payments per invoice -> optional storno -> works/value become available for re-invoicing`.

Normal path uses primary action `Emite factura`: calculated catalog/agreement/work values may become an internal draft/equivalent and issue immediately. Exceptional path uses secondary action `Revizuieste valorile`: Manager reviews and edits the commercial draft before issue. Users should not manually manage or "convert" proformas/drafts during normal invoicing.

Adjustments/discounts apply to work, patient-within-current-invoice, or whole invoice; each supports percentage and fixed amount. The UI must show calculated total, total adjustments/discount, and final invoice total, with reset-to-calculated behavior where appropriate. Catalog/agreement/work prices remain unchanged; documents use the frozen commercial snapshot.

Issuing creates one immutable shared commercial snapshot for both documents. Invoice shows only simplified line `Lucrari protetice` and final total. Payment note keeps the required header/footer and detailed works/patients/prices/adjustments/final total. Totals must always agree.

Payments are recorded per issued invoice. Storno may be created for unpaid, partially paid or fully paid invoices; the original invoice remains immutable and historically accessible, existing payments remain associated with it, and the UI/domain must preserve how much had been paid before storno. Storno creates the reversing/net-zero effect for the original invoice and restores related works/commercial values for re-invoicing, but it does not delete, transfer or attach historical payments to any replacement invoice. Future payment reallocation/regularization is a separate concern. Proforma and user-facing invoice series management are not part of the final product. Future e-Factura or external billing platform support must use adapter/export boundaries; do not implement fiscal integration in MVP.

## RBAC Target Matrix

Reuse current permission naming where possible; add granular permissions only where current keys are too broad.

| Capability | Manager | Reception | Technician | Logistics | Courier |
|---|---:|---:|---:|---:|---:|
| Create/edit intake work | ALL | ALL | - | ALL | - |
| Read status | ALL | ALL | ASSIGNED/CLAIMABLE | ALL | OWN_ROUTE |
| Claim available work | assign/reassign | - | OWN | - | - |
| Edit technician details/code | ALL | - | OWN | read | - |
| Manage performed operations | ALL | - | OWN | read | - |
| Set technician rates | ALL | - | - | - | - |
| View technician earnings | ALL | - | OWN | - | - |
| Change deadline | ALL | limited if approved | - | ALL | - |
| Set waiting/in-progress | ALL | - | OWN | ALL | - |
| Logistics alerts | ALL/override | - | read | ALL | - |
| Pickup requests | ALL | - | - | ALL | OWN_ROUTE read |
| Route management | ALL | - | - | ALL | OWN_ROUTE read |
| Route outcomes | ALL/correct | - | - | ALL/correct | OWN_ROUTE execute |
| Billing/storno/discounts | ALL | - | - | - | - |
| Audit viewer | ALL | - | - | optional limited | - |

Current permissions to extend include `works.*`, `logistics.*`, `delivery.*`, `invoice.*`, `pricing.*`, `audit.read`, `files.*`. Likely new keys: `technician.operations.*`, `technician.earnings.read_own`, `technician.rates.manage`, `pickup.*`, `routes.*`, `invoice.storno.create`, `discounts.manage`.

## Existing Roadmap Classification

| Existing item | Classification | Realignment note |
|---|---|---|
| `FOUNDATION-*`, `AUTH-001`, `RBAC-001`, `SHELL-001` | KEEP | Preserve architecture/security/navigation foundations. |
| `CLINICS-001`, `PATIENTS-001` | EXTEND | Clinic/doctor must become optional for works; registries remain valid. |
| `WORKTYPES-001` | EXTEND | Add official symbol/name catalog and display rules. |
| `WORKS-001`, `RECEPTION-WORK-CREATE-001` | EXTEND | Realign fields, optional clinic/doctor, teeth, new code format. |
| `QR-001`, `SCAN-002` | KEEP | Preserve opaque QR and existing scan behavior. |
| `WORK-DEADLINES-001A/B/C` | EXTEND | Preserve engine/snapshots; add final Status overdue `!` and deadline edit audit. |
| `WORKFORMS-*`, `WORKFORM-REAL-*` | EXTEND | Reuse submissions/templates; do not duplicate form engine. |
| `RECEPTION-TO-TECH-001` | SUPERSEDE PARTIAL | Any manual dispatch/handoff assumption is superseded by automatic claim eligibility after create. |
| `TECH-CLAIM-001A/B` | EXTEND | Preserve claim/snapshot; verify automatic eligibility and atomic race behavior. |
| `TECH-CLAIM-001C` | KEEP DEFERRED | Recovery hardening stays deferred unless needed by final claim race fixes. |
| `TECH-001`, `TECH-EXECUTION-001` | EXTEND | Add details/code, manopere, finalize, earnings. |
| `STATUS-001A/B`, `STATUS-TV-*` | EXTEND | Realign columns/order/cards/filters. |
| `WORK-CYCLES-001A/B`, `RECEPTION-TO-DELIVERY-001` | KEEP/EXTEND | Preserve active-cycle model; integrate final states/routes without overwriting cycle history. |
| `LOGISTICS-001` | EXTEND | Add logistics work creation attachments, pickup requests, final cards/filters. |
| `DELIVERY-001`, `SIGNATURES-001` | EXTEND | Recast courier workflow around route stops including delivery and pickup. |
| `BILLING-REALIGN-001A/B`, `BILLING-ARCHIVE-001` | EXTEND | Preserve company-aware billing; add CDT/CD, NG/NG, automatic backend series, editable commercial snapshots, simplified invoices, payment notes, discounts, invoice payments, storno. |
| `BILLING-REALIGN-001C` | SUPERSEDE | Replace ambiguous legacy correction with explicit storno subepics. |
| `PAYMENTS-002` | EXTEND/DEFER EVIDENCE | Invoice payment tracking remains required; payment evidence upload remains deferred unless explicitly approved. |
| `AUDIT-UI-001` | EXTEND | Manager audit visibility becomes required. |
| `FILES-001/002` | EXTEND FROM DEFERRED | Needed only if no safe existing attachment path supports logistics images. |
| `DEMO-REAL-DATA-001`, `E2E-001`, `SECURITY-001`, `PERFORMANCE-001` | KEEP | Run after functional realignment. |

## Subepics

### REALIGN-001A - Domain Audit Checkpoint
Objective: Freeze current implementation facts and create migration guardrails before schema changes.
Dependencies: none
Scope: verify nullable risks, existing work type duplicates, code sequences, QR tokens, RBAC gaps, billing series, delivery models.
Out of scope: feature implementation.
Acceptance criteria: audit notes added to this plan or subtask doc; no code changed.
Automated checks: `pnpm typecheck`; no migration run required.
Manual checks: inspect representative DB/dev seed state.
Risk / migration note: required before nullable clinic/doctor and numbering migrations.

### REALIGN-001B - RBAC Permission Registry
Objective: Add final granular permission keys and role grants.
Dependencies: REALIGN-001A
Scope: permission registry, seed upserts, guards on new/changed endpoints, tests.
Out of scope: UI pages.
Acceptance criteria: every mutation has server permission; role matrix matches target table.
Automated checks: RBAC unit tests, API tests for forbidden/allowed cases, typecheck.
Manual checks: login as each seeded role and verify sidebar/actions.

### WORKTYPE-REALIGN-001A - Official Catalog Schema
Objective: Support `symbol` plus long `name` on `WorkType`.
Dependencies: REALIGN-001A
Scope: Prisma migration, backfill from existing work types, unique active symbol strategy, views/API.
Out of scope: pricing changes.
Acceptance criteria: one source of truth for symbol/name; no duplicate equivalent catalog rows.
Automated checks: service tests for list/options/display payloads and backfill.
Manual checks: Work Type admin shows expected catalog.

### WORKTYPE-REALIGN-001B - Catalog UX Display Rules
Objective: Apply long-name form display and short-symbol operational display.
Dependencies: WORKTYPE-REALIGN-001A
Scope: work forms, status, compact cards, tests.
Out of scope: new pricing UI.
Acceptance criteria: creation selector primary text is long name; Status shows symbol.
Automated checks: frontend tests for selector/status rendering.
Manual checks: create `Zirconia FULL anatomic`; Status shows `Zr`.

### WORK-ID-001A - Short Annual Work Code
Objective: Change visible work code to `WO-YY-NNNN`.
Dependencies: REALIGN-001A
Scope: annual sequence design, concurrency-safe generation, rollover rule, preserve existing codes.
Out of scope: QR token changes.
Acceptance criteria: new 2026 work codes are `WO-26-0001+`; existing works remain valid.
Automated checks: code service tests, transaction/concurrency test.
Manual checks: create multiple works and verify sequence.
Risk / migration note: do not renumber historical records.

### WORK-ID-001B - QR Separation Regression
Objective: Prove visible code changes do not break opaque QR resolution.
Dependencies: WORK-ID-001A
Scope: QR tests, scan views showing short code, compatibility checks.
Out of scope: new QR design.
Acceptance criteria: old QR tokens resolve; QR never exposes predictable DB IDs.
Automated checks: QR controller/service tests.
Manual checks: scan pre-existing demo QR.

### INTAKE-001A - Optional Clinic/Doctor Data Model
Objective: Allow works with clinic only, doctor only, both, or neither.
Dependencies: REALIGN-001A
Scope: nullable DB fields, DTO/Zod/service validation, downstream null handling.
Out of scope: doctor-without-clinic registry redesign unless current relation blocks it.
Acceptance criteria: all five required optionality scenarios create successfully.
Automated checks: API/frontend validation tests.
Manual checks: create works for each optionality case.
Risk / migration note: existing foreign keys must be relaxed safely without losing data.

### INTAKE-001B - Canonical Intake Fields
Objective: Realign Reception `Lucrare noua` fields.
Dependencies: INTAKE-001A, WORKTYPE-REALIGN-001B, WORK-ID-001A
Scope: patient, optional clinic/doctor, work type, color, deadline date/time, elements, teeth hook, notes, audit.
Out of scope: attachments, pickups.
Acceptance criteria: save persists fields and audit; newly created work is claimable.
Automated checks: reception create tests including audit and claimable API.
Manual checks: create a work and immediately see it in technician pool.

### TEETH-001A - Canonical Tooth Config
Objective: Add one reusable adult permanent FDI tooth configuration.
Dependencies: INTAKE-001A
Scope: shared config/types, API validation helper, deterministic ordering.
Out of scope: UI selector.
Acceptance criteria: only adult permanent IDs allowed; duplicates rejected/deduped by service rule.
Automated checks: validation unit tests.
Manual checks: inspect available teeth list.

### TEETH-001B - Four-Quadrant Multiselect UI
Objective: Implement reusable four-quadrant tooth multiselect.
Dependencies: TEETH-001A
Scope: Reception/Logistics forms, edit/reload behavior, mobile layout.
Out of scope: per-work-type mandatory tooth rules.
Acceptance criteria: select/deselect one or many teeth across quadrants; persisted order stable.
Automated checks: frontend component/form tests.
Manual checks: select `11+12+21+22`, reload, edit.

### CLAIM-001A - Automatic Claim Eligibility
Objective: Remove manual dispatch dependency from Reception to technician pool.
Dependencies: INTAKE-001B
Scope: server claimable query, eligibility tests, frontend available-work list.
Out of scope: claim mutation changes.
Acceptance criteria: after valid create, claimable-work API returns the work without further mutation.
Automated checks: required negative acceptance test.
Manual checks: create from Reception; technician sees `Preia`.

### CLAIM-001B - Atomic Claim Race Hardening
Objective: Guarantee exactly one `Preia` succeeds.
Dependencies: CLAIM-001A, REALIGN-001B
Scope: transactional conditional update/constraint, conflict response, audit, UI refresh.
Out of scope: stale claim recovery.
Acceptance criteria: two simultaneous claims yield one success, one conflict, one owner, one timestamp.
Automated checks: integration race test.
Manual checks: simulate two users/browsers.

### STATE-001A - Final Work State Transitions
Objective: Align operational states with final workflow.
Dependencies: CLAIM-001B
Scope: `RECEPTIE`, `IN_LUCRU`, `IN_ASTEPTARE`, `FINALIZATA`, allowed transitions, timestamps, audit.
Out of scope: delivery route outcomes.
Acceptance criteria: state transitions enforce role and allowed path.
Automated checks: service/controller transition tests.
Manual checks: technician sets waiting, returns to in lucru, finalizes.

### TECH-001A - Technician Workbench UX
Objective: Split technician surfaces into `Lucrari de preluat` and `Lucrarile mele`.
Dependencies: CLAIM-001B, STATE-001A
Scope: available list with `Preia`; own list with `Detalii`, `Manopere`, `Finalizata`.
Out of scope: operation financial model.
Acceptance criteria: claimed work disappears from available list and appears in own list.
Automated checks: frontend workbench tests.
Manual checks: technician full claim path.

### TECH-001B - Details and Technical Code
Objective: Add editable technical details and `Cod` textarea.
Dependencies: TECH-001A
Scope: authorized fields, API mutation, audit old/new where safe, UI detail modal/page.
Out of scope: operations modal.
Acceptance criteria: technician edits permitted data; unauthorized edits blocked.
Automated checks: DTO/RBAC/service/frontend tests.
Manual checks: edit and inspect manager audit.

### OPS-001A - Technician Operation Catalog
Objective: Add `Manopera` catalog separate from Work Types.
Dependencies: REALIGN-001B
Scope: schema/API/admin seed or manager config base, active/inactive, audit.
Out of scope: technician rates.
Acceptance criteria: operations can be listed and managed without changing Work Types.
Automated checks: service/controller tests.
Manual checks: manager sees operations catalog.

### OPS-001B - Technician Rates
Objective: Configure rate per technician per operation.
Dependencies: OPS-001A
Scope: schema, manager API/UI, currency minor units, future-rate semantics, audit.
Out of scope: historical earning reports.
Acceptance criteria: Technician A and B can have different rates for same operation.
Automated checks: rate resolution and audit tests.
Manual checks: update a rate and verify future value.

### OPS-001C - Performed Operations and Earning Snapshots
Objective: Let technicians select manopere and snapshot earnings.
Dependencies: OPS-001B, TECH-001A
Scope: full-screen modal, add/remove behavior, performed timestamp, immutable earning minor snapshot, audit.
Out of scope: settlement/paid state unless already present.
Acceptance criteria: changing future rate does not alter existing performed-operation earning.
Automated checks: snapshot immutability tests.
Manual checks: perform at 30, change rate to 40, old remains 30.

### TECH-001C - Finalize Work
Objective: Implement `Finalizata` production completion.
Dependencies: OPS-001C, STATE-001A
Scope: completion timestamp/actor, state update, logistics visibility, audit.
Out of scope: route creation.
Acceptance criteria: finalized work appears in logistics candidate pool.
Automated checks: service/API/frontend tests.
Manual checks: technician finalizes; logistics sees candidate.

### EARNINGS-001A - Technician Own Earnings
Objective: Add sidebar page `Castiguri` for technician own earnings.
Dependencies: OPS-001C
Scope: daily/monthly views, totals, work/operation breakdown, own-only RBAC.
Out of scope: manager financial page.
Acceptance criteria: totals use earning snapshots only.
Automated checks: API aggregation and frontend tests.
Manual checks: compare performed operations to daily/monthly totals.

### LOGISTICS-001A - Logistics Work Creation With Attachments
Objective: Add Logistics `Lucrare noua` with intake fields plus images/files.
Dependencies: INTAKE-001B, TEETH-001B, REALIGN-001B
Scope: reuse/create attachment storage, drag/drop, file picker, metadata, audit.
Out of scope: pickup requests.
Acceptance criteria: logistics-created work follows same claimability rules.
Automated checks: upload validation/API tests and form tests.
Manual checks: add multiple files and preview where supported.

### PICKUP-001A - Pickup Request Domain
Objective: Add standalone `Ridicare` requests.
Dependencies: REALIGN-001B
Scope: clinic, medic, date, exact time or range, status, audit, edit schedule.
Out of scope: route builder.
Acceptance criteria: exact time and time window are represented unambiguously.
Automated checks: DTO/service tests.
Manual checks: create exact pickup and ranged pickup.

### STATUS-REALIGN-001A - Status Read Model
Objective: Realign Status API to final columns, null clinic/doctor handling, short symbols and timestamps.
Dependencies: INTAKE-001A, WORKTYPE-REALIGN-001B, STATE-001A
Scope: server read model, pagination, overdue calculation, deadline change audit.
Out of scope: logistics cards.
Acceptance criteria: columns return data in final semantics; missing clinic/doctor displays `-`.
Automated checks: status view/service tests.
Manual checks: inspect Status for optional clinic/doctor cases.

### STATUS-REALIGN-001B - Status UI
Objective: Render final Status table responsively.
Dependencies: STATUS-REALIGN-001A
Scope: column order, red overdue `!`, technician color+name, alerts, delivery/pickup marker.
Out of scope: advanced filters/cards.
Acceptance criteria: visual order matches final list exactly.
Automated checks: frontend rendering tests.
Manual checks: desktop and mobile status smoke.

### LOGISTICS-STATUS-001A - Five Shortcut Cards
Objective: Add exactly five logistics shortcut cards.
Dependencies: STATUS-REALIGN-001A, PICKUP-001A
Scope: `Toate`, `Intarziate`, `In asteptare`, `De livrat`, `De ridicat`; 1/2/3 day horizons where required.
Out of scope: advanced filters.
Acceptance criteria: cards show counts and click filters; horizons use documented calendar-day interpretation.
Automated checks: API filter/count tests and UI tests.
Manual checks: verify each card with seeded data.

### LOGISTICS-STATUS-001B - Advanced Filters
Objective: Add collapsed server-side filters.
Dependencies: LOGISTICS-STATUS-001A
Scope: clinic, medic, pacient search, date from/to, exact date, technician, reception user, work type, pagination.
Out of scope: browser-side full dataset filtering.
Acceptance criteria: filters compose by intersection with predictable precedence.
Automated checks: API query tests.
Manual checks: combine card + advanced filters.

### ROUTE-001A - Route Domain
Objective: Model route and ordered mixed stops.
Dependencies: PICKUP-001A, TECH-001C
Scope: route, route date/name/number, courier, status, ordered stops, stop type `DELIVERY|PICKUP`, outcome fields, audit.
Out of scope: UI builder.
Acceptance criteria: stop order is persisted explicitly and history is queryable by day/month/year.
Automated checks: schema/service tests.
Manual checks: inspect created route data.

### ROUTE-001B - Route Builder
Objective: Add Logistics `Traseu` page and manual route composition.
Dependencies: ROUTE-001A, LOGISTICS-STATUS-001A
Scope: candidate pool, selection order as stop order, multiple routes/day, courier assignment, audit.
Out of scope: geographic optimization.
Acceptance criteria: selected order is saved and shown unchanged.
Automated checks: frontend/API route builder tests.
Manual checks: create Route 1 and Route 2 with mixed stops.

### COURIER-001A - Courier Assigned Routes
Objective: Simplify courier UI to assigned routes today/future.
Dependencies: ROUTE-001B
Scope: route list, ordered stops, correct delivery/pickup labels.
Out of scope: signature redesign unless required by existing delivery proof integration.
Acceptance criteria: courier sees only authorized assigned routes.
Automated checks: RBAC/API/frontend tests.
Manual checks: login courier and inspect current/future routes.

### COURIER-001B - Route Stop Outcomes
Objective: Record delivered/not delivered and picked up/not picked up outcomes.
Dependencies: COURIER-001A
Scope: idempotency/duplicate prevention, timestamps, actor, optional failure info, correction policy, audit.
Out of scope: automatic rescheduling.
Acceptance criteria: each stop outcome persists once unless authorized correction occurs.
Automated checks: transition service tests.
Manual checks: mark each outcome type.

### MANAGER-TECH-001A - Manager Technicians Page
Objective: Add `Tehnicieni` page for rates and earnings.
Dependencies: OPS-001B, EARNINGS-001A
Scope: technician selector, operation rate editor, historical earning view.
Out of scope: payroll settlement unless separately approved.
Acceptance criteria: manager can set future rates and inspect earned totals.
Automated checks: API/frontend tests.
Manual checks: compare manager and technician earning totals.

### BILLING-001A - Company Naming and Invoice Series
Objective: Realign companies to CDT/CD and NG/NG.
Dependencies: REALIGN-001A
Scope: legal entity display migration, backend series config, independent concurrency-safe sequences, automatic series selection by active legal/company context, no historical renumbering.
Out of scope: storno.
Acceptance criteria: new CDT invoice uses `CD 260001+`; NG uses `NG 260001+`; Manager does not manually choose or manage invoice series in normal invoicing.
Automated checks: billing sequence tests.
Manual checks: issue one invoice per company.
Risk / migration note: do not blindly replace internal IDs; preserve existing relations.

### BILLING-001D - Commercial Draft and Issue Flow
Objective: Add the canonical commercial snapshot flow for direct issue and exceptional review/edit.
Dependencies: BILLING-001A
Scope: calculated values, internal draft/equivalent, `Emite factura` direct issue path, `Revizuieste valorile` review path, reset-to-calculated behavior, frozen shared issue snapshot.
Out of scope: proforma user workflow; fiscal/e-Factura integration.
Acceptance criteria: normal path can issue directly from calculated catalog/agreement/work values; review path lets Manager edit commercial values before issue; issued snapshot is immutable and shared by invoice/payment note.
Automated checks: billing service tests for calculated-to-issued and reviewed-to-issued paths.
Manual checks: issue directly; then review values, reset one value, issue, and compare frozen totals.

### BILLING-001B - Simplified Invoice Lines
Objective: Make customer invoice line content `Lucrari protetica` plus total.
Dependencies: BILLING-001A, BILLING-001D
Scope: billing document generation from frozen commercial snapshot, print/PDF, tests.
Out of scope: payment note detailed breakdown.
Acceptance criteria: invoice has simplified line `Lucrari protetice` plus final total only; invoice does not list technical operations or detailed work breakdown.
Automated checks: billing print/export tests.
Manual checks: generated invoice visual/PDF.

### BILLING-001C - Payment Note Detailed Breakdown
Objective: Preserve/extend `Nota de plata` as detailed commercial statement.
Dependencies: BILLING-001B, BILLING-001D
Scope: required header/footer, detailed works, patients, prices, discounts/adjustments, final total, print/PDF, same frozen snapshot as invoice.
Out of scope: technician earnings.
Acceptance criteria: statement shows detailed work/pricing and adjustments; invoice remains simplified; invoice total and payment-note total always agree.
Automated checks: statement service/render tests.
Manual checks: print payment note.

### DISCOUNT-001A - Patient and Invoice Discounts
Objective: Add commercial adjustments/discounts for work, patient-within-current-invoice, and whole invoice.
Dependencies: BILLING-001D
Scope: percentage mode, fixed-amount mode, work-specific final price adjustment, patient-level discount within invoice, invoice-level discount, calculated total, total adjustments/discount, final total, validation, snapshot into documents, audit.
Out of scope: changing catalog/agreement/work base prices.
Acceptance criteria: Manager can apply examples such as patient `10%`, patient `150 lei`, work-specific final price adjustment, invoice `5%`, invoice `300 lei`; no negative totals; issued invoices do not change after later discount changes.
Automated checks: billing calculation tests.
Manual checks: apply each adjustment level/mode, issue invoice, verify calculated/original values remain unchanged and issued snapshot is immutable.

### PAYMENT-001A - Invoice Payment Tracking
Objective: Record payments against issued invoices.
Dependencies: BILLING-001B, BILLING-001C
Scope: invoice total, paid amount, remaining amount, payment history against invoice, status updates where current model supports them.
Out of scope: payment evidence upload and external payment reconciliation.
Acceptance criteria: payments are never recorded against proforma or catalog/agreement values; remaining amount is derived from issued invoice total minus invoice payments; if an invoice is later storno'd, its existing payments remain visible on the original invoice and are not automatically moved to the replacement invoice.
Automated checks: payment service tests.
Manual checks: record partial/full payment and verify invoice remaining amount.

### STORNO-001A - Storno Domain
Objective: Add immutable invoice storno support as a reversing commercial/accounting effect.
Dependencies: BILLING-001B, BILLING-001C, PAYMENT-001A
Scope: source invoice relation, eligibility for unpaid/partially paid/fully paid invoices, duplicate prevention, numbering, reversing storno effect, net zero display, original payment preservation, work/value re-invoicing eligibility, audit.
Out of scope: automatic deletion, transfer, attachment or regularization of historical payments on replacement invoices.
Acceptance criteria: original issued invoice total/history remains unchanged; linked storno is created once for an eligible invoice regardless of paid amount; historical payments remain associated with the original invoice and visible as paid before storno; UI/domain can show original as `Stornata / sold 0`; related works/value become available for correct re-invoicing.
Automated checks: service tests.
Manual checks: create storno from invoices with `2,000 / paid 0`, `2,000 / paid 800` and `2,000 / paid 2,000`; verify original invoice/payment history is preserved, net effect is 0 and related works/value are re-invoice eligible.

### STORNO-001B - Storno UI and Documents
Objective: Add Manager billing tab `Storno`.
Dependencies: STORNO-001A
Scope: tab, eligible invoice search across unpaid/partially paid/fully paid invoices, create flow, printable/exportable storno document, display of original paid amount before storno.
Out of scope: original invoice edit/delete.
Acceptance criteria: manager can create and view storno from UI for unpaid, partially paid and fully paid invoices, see preserved payment history on the original invoice, then generate a new correct invoice for restored eligible works/value without historical payments being automatically attached to the replacement invoice.
Automated checks: frontend and billing export tests.
Manual checks: full storno flow.

### AUDIT-001A - Audit Coverage Expansion
Objective: Ensure all final meaningful mutations write useful audit.
Dependencies: REALIGN-001B
Scope: work create/edit, teeth, deadline, claim, state, code, operations, earnings, alerts, markers, pickups, routes, outcomes, rates, discounts, invoices, storno, company context.
Out of scope: duplicating sensitive payloads.
Acceptance criteria: each listed mutation has who/what/when/entity/before/after where safe.
Automated checks: representative service tests.
Manual checks: inspect audit entries per role flow.

### AUDIT-001B - Manager Audit Visibility
Objective: Complete manager-readable audit UI.
Dependencies: AUDIT-001A
Scope: filters by actor/action/entity/date, readable metadata, pagination.
Out of scope: SIEM/export.
Acceptance criteria: manager can trace the E2E scenario.
Automated checks: API/frontend tests.
Manual checks: find claim, deadline change, route outcome, storno entries.

### REPORTING-001A - History and Performance Hardening
Objective: Add final query performance and history coverage.
Dependencies: ROUTE-001B, BILLING-001C, EARNINGS-001A
Scope: route history day/month/year, earnings intervals, billing history, server pagination, justified indexes.
Out of scope: broad BI dashboard.
Acceptance criteria: large-ish seeded data remains server-filtered.
Automated checks: query tests where practical.
Manual checks: route/billing/status history navigation.

### DEMO-E2E-001A - Demo Data Realignment
Objective: Seed realistic final workflow data.
Dependencies: all functional subepics through STORNO-001B
Scope: catalog, roles, optional clinic/doctor cases, works, manopere/rates, pickups, routes, billing examples.
Out of scope: production data migration.
Acceptance criteria: demo supports final E2E scenario.
Automated checks: demo seed tests.
Manual checks: reset demo and inspect all roles.

### E2E-REALIGN-001A - Final Acceptance Coverage
Objective: Cover the canonical workflow end-to-end.
Dependencies: DEMO-E2E-001A
Scope: Playwright/smoke path across Reception, Technician, Logistics, Courier, Manager.
Out of scope: exhaustive UI permutations.
Acceptance criteria: final E2E scenario passes and negative manual dispatch workflow does not exist.
Automated checks: smoke tests, `pnpm test`, `pnpm typecheck`, `pnpm build`.
Manual checks: mobile critical paths for intake, teeth, manopere, status, courier.

## Final E2E Acceptance Scenario

1. Reception creates `Lucrare noua` with optional clinic/doctor, long WorkType name, zero/one/many adult teeth, deadline, color, elements, notes.
2. Backend generates `WO-YY-NNNN`, preserves opaque QR, audits creation.
3. Work state is `Receptie` and claimable API immediately returns it without dispatch.
4. Status shows short WorkType symbol and optional clinic/doctor gracefully.
5. Two technicians race on `Preia`; exactly one succeeds.
6. Claim timestamp appears in `Preluare`; work moves to `Lucrarile mele` and state `In lucru`.
7. Technician edits details/`Cod`, selects manopere, earning snapshots are captured.
8. Work can move `In asteptare` and back to `In lucru`.
9. Technician finalizes; logistics sees delivery candidate.
10. Logistics sets alert/marker, creates pickup request, creates one or more mixed routes.
11. Route stop order equals manual selection order.
12. Courier sees assigned route and records delivered/not delivered or picked up/not picked up.
13. Manager sees audit, rates, earnings, billing, discounts, storno.
14. CDT invoices use `CD 260001+`; NG invoices use `NG 260001+`.
15. Manager can use `Emite factura` directly from calculated values, or `Revizuieste valorile` for exceptional edits before issue.
16. Adjustments can be percentage or fixed amount at work, patient-within-invoice, or invoice level; catalog/agreement/work base price remains unchanged.
17. Issuing creates one immutable commercial snapshot shared by simplified invoice and detailed payment note.
18. Invoice line is `Lucrari protetice`; payment note contains detailed works/patients/prices/adjustments/total; totals always agree.
19. Payments are recorded per issued invoice and show total, paid and remaining amounts.
20. Storno links to the original invoice whether it was unpaid, partially paid or fully paid; preserves original amount/history and paid-before-storno amount; creates net zero effect; restores related works/value for re-invoicing; does not automatically move historical payments to the replacement invoice; and audits the operation.

Negative acceptance: after Reception creates a valid work, no `Trimite la tehnician`, `Aloca`, `Porneste` or `Muta` step may be required before the technician claimable-work API returns it.

## Master Test Matrix

| Area | Required coverage |
|---|---|
| Reception | optional clinic/doctor combinations, long WorkType display, intake save audit. |
| Teeth | adult only, one/many/cross-quadrant, deselect, edit, no duplicates, deterministic reload. |
| Work ID/QR | annual short code, concurrency, QR token opacity, old QR compatibility. |
| Claim | automatic availability, race conflict, one timestamp, one owner, audit. |
| Status | exact column order, short symbols, technician color/name, overdue `!`, alerts, marker type. |
| Technician | available/own lists, details/code edit, manopere modal, snapshots, finalize, earnings. |
| Logistics | work with attachments, pickup exact/range, five cards, advanced filters, route builder. |
| Courier | assigned routes, ordered stops, outcomes, duplicate prevention/correction. |
| Manager | rates, earnings, audit UI, review values, discounts/adjustments, storno, billing docs. |
| Billing | CDT/CD and NG/NG automatic series, direct issue, editable commercial draft, simplified invoice, detailed payment note, shared immutable snapshot, invoice payments, storno payment-history preservation. |
| Discounts | work, patient-within-invoice and invoice levels; percentage and fixed amount; reset-to-calculated; no base price mutation. |
| Storno | immutable original invoice, linked reversing effect, unpaid/partial/full paid eligibility, historical payments preserved on original invoice, no automatic payment transfer to replacement invoice, net zero display, re-invoicing eligibility restored. |
| RBAC | all mutations server-enforced; UI hiding is not sufficient. |
| Migration | safe nullable/backfill/constraint steps; no DB reset; history preserved. |
| UX | mobile intake, teeth, manopere, status, courier route; loading/empty/error states. |

## Definition Of Done

For every implementation subepic unless explicitly not applicable:

- scope implemented and no unrelated refactor;
- migration/backfill safe and documented;
- server-side permission enforced;
- validation and audit implemented;
- automated tests added/updated;
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass or failures are documented;
- manual acceptance checklist passes;
- roadmap/task checkpoint updated;
- change can be committed independently.

## Conflicts And Open Decisions

| Item | Conflict/open point | Planned resolution |
|---|---|---|
| `WorkOrder.clinicId`/`doctorId` required | Final requirement says optional. | Nullable migration plus service/read-model null handling. |
| Work code format | Current code uses full year and 6 digits. | New annual two-digit year sequence; preserve existing codes. |
| `WorkType.code` vs final `symbol` | Existing generated code may not equal business symbol. | Add/derive `symbol`; avoid duplicate name/symbol lists. |
| `RECEPTION-TO-TECH-001` handoff wording | May imply handoff. | Supersede any manual dispatch requirement; automatic claimability wins. |
| Route vs existing delivery group | Existing delivery model is group/delivery oriented. | Extend or bridge to route/ordered stops; avoid second courier stack if current delivery can be adapted. |
| Attachments | File permissions exist; storage stack may be deferred/incomplete. | Reuse if present; otherwise implement minimal shared attachment stack under logistics need. |
| Proforma | Client does not use proforma in final flow, but legacy backend support may exist. | Remove from final user-facing workflow; avoid destructive cleanup for MVP unless it blocks billing UX. |
| Invoice series UI | Existing/admin concepts may expose series management. | Final product must not expose series as a normal separate page/tab; active company context selects CDT/CD or NG/NG automatically. |
| Storno legal details | Exact accounting representation may need accountant confirmation. | Model immutable source relation and reversing net effect; flag numbering/line sign decisions before implementation. |
| Fiscal integrations | Future e-Factura/external billing adapters may be needed. | Preserve clean export/adapter boundary; do not implement e-Factura in MVP. |
| Settlement | Earned vs paid may not exist. | Show earned; do not imply paid unless settlement is implemented. |

## Recommended First Subepic

Start with `REALIGN-001A - Domain Audit Checkpoint`.

Reason: several early changes are schema-sensitive (`clinicId`/`doctorId` nullability, work code sequence, WorkType symbol backfill, company series). A short audit checkpoint prevents destructive migrations, duplicate catalog rows and broken QR/billing history before implementation starts.
