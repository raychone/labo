# Implementation Status

## Overall Progress

80%

## ROADMAP

- [x] ROADMAP-REALIGN-002 - Realign product roadmap to validated laboratory workflow (COMPLETED)

## ORGANIZATION

- [x] ORG-CONTEXT-001 - Global NC/NG company context (COMPLETED)
- [x] ORG-DATA-MIGRATION-001 - Company-aware local data migration (COMPLETED)

## FOUNDATION

- [x] FOUNDATION-001 - Initialize monorepo
- [x] FOUNDATION-002 - Docker Compose development

## UI

- [x] UI-001 - Design tokens and base styles
- [x] UI-002 - Core UI components
- [x] UX-HARDENING-001 - Romanian UX, modal, sidebar, toast, QR and export hardening (COMPLETED)

## AUTH

- [x] AUTH-001 - Auth backend

## RBAC

- [x] RBAC-001 - Permission model

## USERS

- [x] USERS-001 - User management

## SETTINGS

- [x] SETTINGS-001 - Laboratory settings

## CLINICS

- [x] CLINICS-001 - Clinics and doctors

## WORK TYPES

- [x] WORKTYPES-001 - Work types and pricing base

## WORKS

- [x] WORKS-001 - Work order creation
- [x] WORK-DEADLINES-001A - Deadline engine and Romanian business-day calendar (COMPLETED)
- [x] WORK-DEADLINES-001B - Persisted work deadlines and controlled recalculation (COMPLETED)
- [x] WORK-DEADLINES-001C - Operational deadline UI, urgency indicators and work registry integration (COMPLETED)
- [ ] WORK-CYCLES-001 - Clinic return cycles and repeated handoffs (NOT STARTED)

## QR

- [x] QR-001 - QR generation and scan

## SHELL

- [x] SHELL-001 - Authenticated application shell and navigation

## DASHBOARD

- [ ] DASHBOARD-001 - Operational dashboard (SUPERSEDED BY DASHBOARD-002)
- [ ] DASHBOARD-002 - Real workflow dashboard (NOT STARTED)

## FORMS

- [x] FORMS-001 - Form patterns and validation UX
- [x] WORKFORMS-001 - Work form template builder (COMPLETED)
- [x] WORKFORMS-002 - Work form completion and immutable snapshot (COMPLETED)

## BILLING

- [x] BILLING-001 - Billing workspace, proformas, invoices and month-end registry
- [x] BILLING-002 - Printable billing documents and clinic statements (COMPLETED)

## DEMO

- [x] DEMO-SEED-001 - Realistic demonstration dataset (COMPLETED)
- [ ] DEMO-POLISH-001 - Commercial demo polish (SUPERSEDED BY DEMO-REAL-DATA-001)
- [ ] DEMO-REAL-DATA-001 - Validated NC/NG workflow demo dataset (NOT STARTED)

## FILES

- [ ] FILES-001 - Private file upload (DEFERRED)
- [ ] FILES-002 - File preview and lifecycle controls (DEFERRED)

## LABELS

- [ ] LABELS-001 - Printable labels and document templates (NOT STARTED)

## WORKFLOW

- [x] WORKFLOW-001 - Workflow templates (COMPLETED)
- [x] WORKFLOW-002 - Workflow execution snapshot (COMPLETED)
- [ ] TECH-CLAIM-001A - Technician self-claim deadline start integration (APPROVED)
- [ ] TECH-CLAIM-001 - Technician self-claim and first technical company selection (NOT STARTED)

## PATIENTS

- [x] PATIENTS-001 - Patient records and patient work history (COMPLETED)

## SCAN

- [x] SCAN-002 - Operational QR scan actions and physical work handoff (COMPLETED)

## LOGISTICS

- [x] LOGISTICS-001 - Laboratory operational center, intake and internal logistics (COMPLETED)

## TECHNICIAN

- [x] TECH-001 - Technician assignments and personal workbench (COMPLETED)

## QUALITY

- [ ] QC-001 - Quality control (DEFERRED)

## DELIVERY

- [x] DELIVERY-001 - Courier planning and delivery execution (COMPLETED)

## SIGNATURES

- [x] SIGNATURES-001 - Delivery signatures and proof capture (COMPLETED)

## NOTIFICATIONS

- [ ] NOTIFICATIONS-001 - Operational notifications (DEFERRED)

## PAYMENTS

- [x] PAYMENTS-001 - Payments and balances (covered by BILLING-001)
- [ ] PAYMENTS-002 - Manual payment evidence realignment (NOT STARTED)

## INVOICE

- [ ] INVOICE-001 - Invoice PDF and numbering (superseded by BILLING-002 for printable documents)

## REPORTS

- [ ] REPORTS-001 - Operational and financial reports (NOT STARTED)

## SEARCH

- [ ] SEARCH-001 - Global search (NOT STARTED)

## PRICING

- [x] PRICING-002 - Company-specific pricing and agreements (COMPLETED)

## DOCUMENTS

- [ ] DOCUMENTS-001 - Company-aware printable document center (NOT STARTED)
- [ ] COLLABORATION-TERMS-001 - Versioned collaboration terms (NOT STARTED)

## OFFLINE

- [ ] OFFLINE-001 - Essential offline operation and synchronization (NOT STARTED)

## STATUS

- [ ] STATUS-001 - Operational status page (NOT STARTED)

## AUDIT

- [ ] AUDIT-UI-001 - Audit viewer UI (NOT STARTED)

## SECURITY

- [ ] SECURITY-001 - Security hardening

## E2E

- [ ] E2E-001 - End-to-end critical flows

## DEPLOY

- [ ] DEPLOY-001 - Staging deployment

## Current Task

NONE / AWAITING APPROVAL

Status: AWAITING APPROVAL

Started: 2026-07-29T10:39:32Z

Completed: 2026-07-29T11:03:59Z

Last completed task: WORK-DEADLINES-001C - Operational deadline UI, urgency indicators and work registry integration

Completed: 2026-07-29T11:03:59Z

## Next Recommended Task

TECH-CLAIM-001A - APPROVED

## Latest Completion Summary

### WORK-DEADLINES-001C - Operational deadline UI, urgency indicators and work registry integration

- Status: COMPLETED.
- Started: 2026-07-29T10:39:32Z.
- Completed: 2026-07-29T11:03:59Z.
- Summary:
  - Added a reusable deadline visual-state resolver with `Europe/Bucharest` local calendar semantics for unknown, unresolved, on-time, due-today, due-tomorrow, warning, late and manual states.
  - Extended the work list read model with badge, color token, countdown, status, tooltip and dashboard deadline aggregates.
  - Added operational deadline sorting and filters to the work registry using only `effectiveDueAt`.
  - Added registry columns for effective deadline, countdown and deadline status, plus a work detail deadline card with timeline-oriented labels.
  - Added read-only dashboard metrics for due today, due tomorrow, late, manual, unresolved, next 7 days and recently completed on time.
  - Stabilized web tests by running test files sequentially because existing UI tests stub global `fetch`.
- Main files modified:
  - `packages/shared/src/work-deadline-visual-state.ts`
  - `packages/shared/src/work-deadline-visual-state.test.ts`
  - `packages/shared/src/works.ts`
  - `apps/api/src/modules/works/work-deadline-visual.ts`
  - `apps/api/src/modules/works/works.service.ts`
  - `apps/api/src/modules/works/works.view.ts`
  - `apps/api/src/modules/works/dto/works.dto.ts`
  - `apps/web/src/features/works/*`
  - `apps/web/src/app/dashboard-page.tsx`
  - `apps/web/src/app/app-shell.css`
  - `apps/web/vitest.config.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `REAL-LAB-WORKFLOW.md`
  - `IMPLEMENTATION_STATUS.md`
- Tests executed:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/shared test` passed before full regression.
  - `pnpm --filter @dental-lab/api test -- src/modules/works/works.service.test.ts src/modules/works/works.controller.test.ts` passed.
  - `pnpm --filter @dental-lab/web test -- src/features/works/works-page.test.tsx src/app/app-shell.test.tsx` passed.
  - `pnpm typecheck` passed.
  - First `pnpm test` exposed flaky web tests caused by parallel global `fetch` stubs; fixed via sequential web file execution.
  - Final `pnpm test` passed: packages/shared 12 files/42 tests, packages/ui 3 files/27 tests, apps/api 46 files/175 tests, apps/web 15 files/39 tests.
  - `pnpm build` passed.
- Manual verification:
  - Temporary API build started on `http://localhost:3020`.
  - `GET /health` returned `200` with `database: "ok"`.
  - CSRF + `POST /auth/demo-login` as `MANAGER` succeeded.
  - `GET /works?page=1&pageSize=3&sortBy=effectiveDueAt&sortDirection=asc` returned `deadlineDashboard` and visual deadline fields.
  - `GET /works?page=1&pageSize=3&deadlineFilter=LATE&sortBy=effectiveDueAt&sortDirection=asc` returned only `LATE` deadline states.
  - Temporary Vite started on `http://localhost:3001`; `/dashboard` and `/works` returned `200 text/html`.
- Architecture decisions:
  - `effectiveDueAt` remains the only official operational deadline used by the UI for sorting, filtering, badge state and countdowns.
  - Deadline visual semantics are read-only and do not modify the 001A calculation engine or the 001B persisted snapshot.
  - API keeps a module-local visual resolver because importing shared runtime code into the API currently violates the API `rootDir`; shared remains the public frontend/contract resolver.
  - Work registry deadline filters are applied after the base DB query for MVP correctness because visual state depends on Bucharest-local date resolution.
- Technical debt introduced:
  - Deadline visual resolver logic is mirrored between `packages/shared` and the API module until the monorepo TypeScript build can consume shared runtime code cleanly from the API.
  - Web tests now run files sequentially to avoid global `fetch` stub interference.
- Remaining risks:
  - Large work registries may need SQL-level deadline buckets or materialized read models later; current in-memory deadline filtering is acceptable for the MVP dataset.
  - Linting remains unconfigured.
  - Notifications, cron jobs, reports and technician claim start integration remain out of scope.

### WORK-DEADLINES-001B - Persisted work deadlines and controlled recalculation

- Status: COMPLETED.
- Started: 2026-07-29T10:03:26Z.
- Completed: 2026-07-29T10:23:54Z.
- Summary:
  - Added persisted WorkOrder deadline snapshots with mode, source, calculated/manual/effective due dates, calculation inputs, rule snapshot, explanation, reason code, lock metadata and optimistic `deadlineRevision`.
  - Added deterministic migration backfill from legacy `requestedDeliveryDate` into manual locked deadline snapshots with source `LEGACY_BACKFILL`.
  - Added side-effect-free `POST /works/deadline-preview`, create-time deadline resolution, controlled update recalculation and manager-only manual set/recalculate endpoints.
  - Kept non-manager deadline views free of prices, agreement IDs and internal rule IDs.
  - Added RBAC permissions for deadline preview/read/recalculate/manual set/override lock and enforced active legal entity context on works endpoints.
  - Updated Works UI with deadline preview in create/edit forms and an effective deadline column/detail summary.
  - Updated demo seed with deterministic calculated, manual and unresolved deadline examples.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260729101121_work_deadline_snapshots/migration.sql`
  - `apps/api/src/modules/works/*`
  - `apps/api/src/modules/rbac/permission-registry.ts`
  - `apps/web/src/features/works/*`
  - `packages/shared/src/works.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `REAL-LAB-WORKFLOW.md`
  - `DEMO.md`
  - `DEMO-SCRIPT.md`
- Tests executed:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name work_deadline_snapshots` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency.
  - `pnpm --filter @dental-lab/api typecheck` passed.
  - `pnpm --filter @dental-lab/api test -- src/modules/works/work-deadline.service.test.ts` passed and covered no-catalog deadline preview fallback.
  - `pnpm typecheck` passed.
  - `pnpm test` passed: packages/shared 11 files/37 tests, packages/ui 3 files/27 tests, apps/api 46 files/174 tests, apps/web 15 files/39 tests.
  - `pnpm build` passed.
- Manual verification:
  - Temporary current API build started on `http://localhost:3020`.
  - `GET /health` on the existing local API returned `200`.
  - Demo manager login through CSRF + `POST /auth/demo-login` on `3020` succeeded.
  - `POST /works/deadline-preview` on `3020` returned `UNRESOLVED/NO_EXECUTION_RULE` instead of `404` for a legacy demo work type without company catalog item.
  - Deadline preview response was checked for no price/agreement/total fields.
  - `GET /works?search=WO-2026-900001` returned a persisted `CALCULATED` deadline snapshot with `revision: 1`.
  - Temporary Vite started on `http://localhost:3001`; `/login` and `/works` returned `200 text/html`.
- Architecture decisions:
  - `effectiveDueAt` is the canonical operational deadline; `requestedDeliveryDate` remains as legacy/requested delivery compatibility.
  - Deadline recalculation is controlled and optimistic-lock guarded; non-relevant work edits do not recalculate.
  - Manual deadlines are manager-only and locked until an explicit authorized change.
  - Rule snapshots are sanitized operational data, not financial disclosure.
- Technical debt introduced:
  - Pricing/deadline resolution still reads through services around the transaction boundary; no observed failure, but a future transaction client adapter could make the read/write path stricter.
- Remaining risks:
  - Linting remains unconfigured.
  - Frontend does not yet implement overdue/near-due filters or alert colors; these remain outside 001B.
  - Backend shutdown still shows the existing `pg` deprecation warning, without request failures.

### WORK-DEADLINES-001A - Deadline engine and Romanian business-day calendar

- Status: COMPLETED.
- Started: 2026-07-29T09:02:14Z.
- Completed: 2026-07-29T09:17:10Z.
- Summary:
  - Added a reusable backend `DeadlinesModule` with deterministic Romanian business-day calendar coverage for 2026-2030.
  - Added pure execution-rule selection with controlled `MANUAL` and `UNRESOLVED` outcomes, including `AMBIGUOUS_EXECUTION_RULES`.
  - Added `DeadlineEngineService` with explicit `includeStartDay`, default `17:00 Europe/Bucharest`, weekend/holiday exclusion and DST-safe local-date calculation.
  - Extended `POST /pricing/resolve-preview` compatibly with optional `startAt` and `includeStartDay`; when absent, deadline preview remains `null`.
  - Preserved existing pricing source/total behavior, RBAC/CSRF and no-internal-ID response shape.
  - Did not modify Prisma schema, migrations, WorkOrder persistence, QR implementation, registry UI or `assets/`.
- Files modified:
  - `apps/api/src/modules/deadlines/*`
  - `apps/api/src/modules/pricing/dto/pricing.dto.ts`
  - `apps/api/src/modules/pricing/pricing-resolver.service.ts`
  - `apps/api/src/modules/pricing/pricing.service.ts`
  - `apps/api/src/modules/pricing/pricing.module.ts`
  - `apps/api/src/modules/pricing/pricing.controller.test.ts`
  - `packages/shared/src/deadlines.ts`
  - `packages/shared/src/pricing.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `REAL-LAB-WORKFLOW.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `git diff --check` passed.
- Manual verification:
  - API smoke started on `http://localhost:3025` with `DEMO_MODE=true`.
  - `GET /health` returned 200 with database `ok`.
  - Demo manager login via `/auth/demo-login` returned 200 for `manager@demo.local`.
  - `GET /pricing/catalog?pageSize=1` returned an active catalog item with execution rules.
  - `POST /pricing/resolve-preview` with `startAt` returned `deadlinePreview.mode = CALCULATED`, `dueLocalDate = 2026-08-04`, `calculatedDueAt = 2026-08-04T14:00:00.000Z`.
- Architecture decisions:
  - API deadline types stay local to avoid pulling `packages/shared/src` into the API `rootDir`; shared types remain the public contract surface.
  - Calendar holidays are versioned in code for deterministic local development and tests.
  - 001A only previews deadlines; 001B owns persistence and visible work-order deadline states.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Lint remains unconfigured.
  - Calendar coverage intentionally ends at 2030 and returns `UNSUPPORTED_CALENDAR_YEAR` outside that range.

### PRICING-002 - Company-specific pricing and agreements

- Status: COMPLETED.
- Started: 2026-07-29T07:39:38Z.
- Completed: 2026-07-29T08:20:27Z.
- Summary:
  - Added company-scoped price catalog models, execution-time rules and clinic/doctor commercial agreements.
  - Added deterministic migrations `20260729074000_company_pricing_agreements` and `20260729081500_company_pricing_agreements`.
  - Preserved `WorkType.basePriceMinor` as legacy base pricing and did not change existing WorkOrder pricing snapshots.
  - Added `PricingModule` REST endpoints for catalog, execution rules, agreements, agreement rules, archive/restore and resolver preview.
  - Added resolver priority `doctor applicable rule > clinic applicable rule > standard company catalog`.
  - Added manager-only RBAC permissions `pricing.archive`, `pricing.resolve_preview`, `pricing.agreements.read` and `pricing.agreements.manage`.
  - Added `/pricing` UI workspace with catalog, agreements, preview, termene and source/history tabs.
  - Added deterministic demo pricing seed for both `NC` and `NG`, plus demo commercial agreements.
  - Added `PRICING-ASSET-AUDIT.md`.
- Files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260729074000_company_pricing_agreements/migration.sql`
  - `apps/api/prisma/migrations/20260729081500_company_pricing_agreements/migration.sql`
  - `apps/api/prisma/catalog/real-pricing-catalog.ts`
  - `apps/api/prisma/demo/demo-seed.ts`
  - `apps/api/prisma/demo/demo-reset.ts`
  - `apps/api/src/modules/pricing/*`
  - `apps/api/src/modules/rbac/permission-registry.ts`
  - `apps/web/src/features/pricing/*`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/route-registry.tsx`
  - `packages/shared/src/pricing.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
  - `PRICING-ASSET-AUDIT.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name company_pricing_agreements` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Manual verification:
  - Existing API on `http://localhost:3010` returned `GET /health` 200.
  - Manager demo login succeeded.
  - `GET /pricing/catalog` returned 35 active catalog items.
  - `GET /pricing/agreements` returned active demo agreements.
  - `POST /pricing/resolve-preview` returned a calculated preview with source and totals.
  - Reception demo login received 403 on `GET /pricing/catalog`.
  - Frontend started on `http://localhost:3001` because local port `3000` was already occupied by another process; `GET /pricing` returned 200.
- Architecture decisions:
  - Price catalog items are scoped by active legal entity from session; no legal entity is accepted from body/query/header.
  - Work types remain common across companies; company-specific price lives in `PriceCatalogItem`.
  - Execution-time rules are stored with price catalog items for later deadline calculation, but WorkOrder snapshot logic is unchanged.
  - Demo pricing source was manually transcribed only where unambiguous.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Some source price-list rows are ambiguous and are marked in seed notes for client validation.
  - `/pricing` direct browser smoke used port `3001` because port `3000` was occupied by an existing non-Vite process.
  - Linting remains unconfigured.
  - `assets/` remains intentionally untracked.

### PATIENTS-001 - Patient records and patient work history

- Added a dedicated Patient model with first name, last name, optional birth date, sex and limited notes only; no patient code, CNP, contact or address fields were introduced.
- Added deterministic migration `20260729053300_patient_registry` with nullable `work_orders.patient_id`, foreign key, indexes and non-destructive backfill from existing `patient_name` snapshots.
- Preserved `work_orders.patient_name` as immutable snapshot/legacy display data and kept `WorkOrder.code` as the only operational identifier.
- Added `PatientsModule` with `GET /patients`, `GET /patients/options`, patient detail, patient works, create, update, archive and restore endpoints.
- Added server-side RBAC permissions `patients.read`, `patients.create`, `patients.update`, `patients.archive` and `patients.documents.read`.
- Added patient audit entries for create/update/archive/restore without logging names, notes or full payloads.
- Integrated works creation/update with `patientId` validation through `PatientsService`; archived or missing patients are rejected server-side.
- Updated `/works` UI to use the application-styled patient selector and quick patient creation modal, without free-text patient entry.
- Added `/patients` UI with registry filters, detail drawer and tabs for overview, works, doctor/clinic history, documents and timeline.
- Updated demo reset/seed so demo patients are deterministic and linked to demo works; idempotency was verified twice.
- Preserved `assets/` as untracked local client material for future tasks; no asset file was processed, committed or used as source data.
- Updated `README.md`, `REAL-LAB-WORKFLOW.md`, `MVP-IMPLEMENTATION-PLAN.md`, `DEMO.md` and `DEMO-SCRIPT.md`.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260729053300_patient_registry/migration.sql`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/api/prisma/demo/demo-reset.ts`
- `apps/api/src/modules/patients/*`
- `apps/api/src/modules/works/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/web/src/features/patients/*`
- `apps/web/src/features/works/*`
- `packages/shared/src/patients.ts`
- `packages/shared/src/works.ts`
- `README.md`
- `REAL-LAB-WORKFLOW.md`
- `MVP-IMPLEMENTATION-PLAN.md`
- `DEMO.md`
- `DEMO-SCRIPT.md`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency.
- `pnpm typecheck` passed.
- `pnpm test` passed: API 40 files / 151 tests, web 15 files / 39 tests, shared 11 files / 37 tests, UI 3 files / 27 tests.
- `pnpm build` passed.
- Manual API smoke passed for manager demo login, patient registry/search, patient options without notes, patient detail and creating a work linked by `patientId` with `patientName` snapshot.
- Manual DB checks confirmed 10 demo patients, zero work orders without patient and zero forbidden patient columns.
- Manual web smoke returned `200` for `/patients` and `/works`.

Technical debt introduced:

- None.

Remaining risks:

- Patient document rows currently expose existing generated document/proof references only; dedicated file/document ingestion remains in `DOCUMENTS-001` and related future tasks.
- Patient matching is intentionally explicit by selected `patientId`; no merge/deduplication workflow was introduced.
- Client files in `assets/` remain local-only and must not be committed until a dedicated document/template ingestion task defines exactly how to use them.
- Linting remains unconfigured.
- Backend shutdown can still show the existing `pg` deprecation warning, without request failures.

### ORG-DATA-MIGRATION-001 - Company-aware local data migration

- Added contextual `LegalEntitySettings` as a deterministic, non-destructive migration with one settings row per active legal entity.
- Backfilled NC and NG settings from the legacy singleton where needed and kept `laboratory_settings` intact for billing, print and legacy consumers.
- Kept works, work types, billing documents and payments unsegmented; no `legal_entity_id` was added to those tables.
- Updated `/settings` to resolve and update only the authenticated session's active legal entity context.
- Rejected spoofed context fields in the settings payload and kept server-side validation for all editable company settings.
- Added settings audit entries with changed field names and legal entity code only, without full fiscal data or IBAN payloads.
- Updated base and demo seeds to create deterministic NC/NG settings with fictive default/demo data and optional local env overrides.
- Updated the settings UI to show active firm context, legal/banking fields and a dirty-form guard before switching NC/NG.
- Preserved `assets/` as untracked local client material for future tasks; no asset file was processed, committed or used as source data.
- Updated `README.md`, `REAL-LAB-WORKFLOW.md`, `MVP-IMPLEMENTATION-PLAN.md`, `DEMO.md` and `DEMO-SCRIPT.md`.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260729033135_company_aware_legal_entity_settings/migration.sql`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/api/src/modules/settings/*`
- `apps/api/src/modules/organization-context/organization-context.service.ts`
- `apps/web/src/features/settings/*`
- `apps/web/src/features/organization-context/*`
- `packages/shared/src/settings.ts`
- `README.md`
- `REAL-LAB-WORKFLOW.md`
- `MVP-IMPLEMENTATION-PLAN.md`
- `DEMO.md`
- `DEMO-SCRIPT.md`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- Manual API smoke passed for manager demo login, organization context switch NC to NG, contextual settings read/update/restore, CSRF rejection and spoofed context rejection.
- Manual DB checks confirmed one settings row for NC, one for NG, one legacy settings row and zero forbidden company columns on works, work types, billing documents and payments.
- Manual web smoke returned `200` for `/` and `/settings`.

Technical debt introduced:

- None.

Remaining risks:

- Billing, document rendering, pricing and payment modules intentionally remain legacy/singleton until their dedicated realignment tasks.
- Client files in `assets/` remain local-only and must not be committed until a dedicated document/template ingestion task defines exactly how to use them.
- Linting remains unconfigured.
- Backend shutdown can still show the existing `pg` deprecation warning, without request failures.

### ORG-CONTEXT-001 - Global NC/NG company context

- Added the minimal `LegalEntity` registry for `NC` - Nicolaie Cristina and `NG` - Nicolaie Gabriel, plus nullable `Session.activeLegalEntityId` for per-session server-side context.
- Added deterministic migration `20260729025902_legal_entity_context` without destructive changes and without adding company fields to works, billing, payments, work types or settings.
- Added idempotent base seed entries for `NC` and `NG`; demo seed remains idempotent and unchanged in scope.
- Added RBAC permissions `organization_context.read` and `organization_context.switch`; managers receive both, operational roles do not receive switch access.
- Added `OrganizationContextModule` with `GET /organization-context` and CSRF-protected `PUT /organization-context`.
- Context switching updates only the current session, does not change identity, roles, logout state or permissions, and writes audit action `organization_context.switched`.
- Added reusable shared contracts for legal entity codes and organization context display data.
- Added an authenticated shell selector: desktop segmented control and mobile drawer select, Romanian wording, permission-aware visibility, no full reload and no global query invalidation.
- Added guard/decorator utilities for future endpoints that will require an active legal entity context.
- Updated `REAL-LAB-WORKFLOW.md`, `MVP-IMPLEMENTATION-PLAN.md`, `README.md`, `DEMO.md` and `DEMO-SCRIPT.md` to keep implementation and architecture aligned.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260729025902_legal_entity_context/migration.sql`
- `apps/api/prisma/seed.ts`
- `apps/api/src/modules/organization-context/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/web/src/features/organization-context/*`
- `apps/web/src/app/authenticated-app-shell.tsx`
- `apps/web/src/app/app-shell.css`
- `packages/shared/src/organization-context.ts`
- `REAL-LAB-WORKFLOW.md`
- `MVP-IMPLEMENTATION-PLAN.md`
- `README.md`
- `DEMO.md`
- `DEMO-SCRIPT.md`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev` passed against local `localhost:55439/dental_lab_dev`.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice; idempotency confirmed.
- `pnpm typecheck` passed.
- `pnpm test` passed: API 39 files / 144 tests, web 15 files / 37 tests, shared 11 files / 36 tests, UI 3 files / 27 tests.
- `pnpm build` passed.

Manual verification:

- API smoke ran on `http://localhost:3011` because `3010` was already occupied.
- Web smoke ran on `http://localhost:3002` with `VITE_API_BASE_URL=http://localhost:3011`.
- Manager demo login returned context `NC`, switched to `NG` with CSRF, preserved the session and kept `/works`, `/technician/workbench`, `/logistics/center`, `/deliveries`, `/billing/overview` and `/settings` reachable.
- A second manager session defaulted independently to `NC`.
- Missing CSRF returned `403`, unauthenticated read returned `401`, operational role access returned `403`, invalid code returned `400`.
- Audit table contained the `organization_context.switched` event.

Architecture decisions:

- This is a global legal/financial context, not tenant isolation.
- The active company context is stored server-side on the session.
- `NC` is the default context for managers when no active session context exists.
- Existing business data remains compatible and unsegmented until `ORG-DATA-MIGRATION-001` and later pricing/billing/document tasks.
- Initial context selection is not audited; explicit context switches are audited.

Technical debt introduced:

- None.

Remaining risks:

- Settings, billing, work orders and pricing are not yet company-separated by design; that belongs to future roadmap tasks.
- Automated Playwright visual verification was not run because Playwright is not installed in the workspace.
- API shutdown still shows the existing PostgreSQL client warning in development, without request failures.
- Local `assets/` files are unrelated and intentionally excluded from this task.

### ROADMAP-REALIGN-002 - Realign product roadmap to validated laboratory workflow

- Realigned the product roadmap to the validated real laboratory workflow with one shared operational laboratory and two legal/financial contexts: `NC` - Nicolaie Cristina and `NG` - Nicolaie Gabriel.
- Added `REAL-LAB-WORKFLOW.md` as the architectural source of truth for global company context, manager visibility, technician self-claim, operational status, patients, pricing, deadlines, work cycles, billing, payments, documents, collaboration terms and offline mode.
- Updated `MVP-IMPLEMENTATION-PLAN.md` with the new active roadmap order and explicit future task definitions.
- Marked the current demo documentation as prior-flow/single-company until `DEMO-REAL-DATA-001`.
- No implementation code, schema, migration, seed, endpoint, frontend page, package manifest or lockfile was changed.

Main files modified:

- `REAL-LAB-WORKFLOW.md`
- `MVP-IMPLEMENTATION-PLAN.md`
- `IMPLEMENTATION_STATUS.md`
- `README.md`
- `DEMO.md`
- `DEMO-SCRIPT.md`

Verification:

- Docs-only scope checked with `git diff --name-only`.
- Formatting checked with `git diff --check`.
- Automated app tests were not run because this task changes documentation only.

Manual verification:

- Reviewed the current Prisma schema, backend module assumptions, frontend route assumptions and demo seed assumptions during preflight.

Architecture decisions:

- One shared operational app and database, not multi-tenant SaaS.
- Two legal/financial contexts, `NC` and `NG`, selected globally in the shell in future `ORG-CONTEXT-001`.
- Both managers see both contexts.
- Reception creates operational work without choosing company.
- Technician selects company at first technical self-claim; company belongs to the work.
- Existing demo remains prior-flow documentation until `DEMO-REAL-DATA-001`.

Technical debt introduced:

- None; documentation-only change.

Remaining risks:

- Current implementation still reflects the old single-company, assignment-driven workflow until the new roadmap tasks are implemented.

### SIGNATURES-001 - Delivery signature capture and proof of handover

- Implemented dedicated `DeliveryProof` persistence with deterministic migration `20260727013000_delivery_signature_proof`.
- Added `DeliveryProofModule` with strict signature validation, SHA-256 canonical hash, proof read endpoint and proof print-view endpoint.
- Updated `POST /deliveries/:id/complete` so deliveries in transit require a valid recipient signature or manager override with explicit reason and confirmation.
- Added proof-related delivery events and audit actions without storing raw strokes, recipient notes or sensitive payloads in audit metadata.
- Added RBAC permissions `delivery.signature.capture`, `delivery.signature.read`, `delivery.signature.override` and `delivery.proof.print`.
- Added `SignaturePad` and `SignatureDisplay` UI components with normalized coordinate capture and no PNG/base64 export.
- Updated `/deliveries` with handover modal, works summary, signature canvas, confirmation checkbox, manager override modal, proof summary and proof print link.
- Added `/deliveries/:id/proof/print` with A4 print CSS and the disclaimer that the document is internal operational evidence, not a qualified electronic signature.
- Updated scan wording so in-transit courier delivery scans lead users to “Confirmă predarea”.
- Extended demo seed with two signed delivered proofs, one manager override proof and one in-transit delivery ready for live signing.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260727013000_delivery_signature_proof/migration.sql`
- `apps/api/src/modules/delivery-proof/*`
- `apps/api/src/modules/delivery/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/api/prisma/demo/demo-seed.ts`
- `apps/web/src/features/deliveries/*`
- `apps/web/src/features/works/work-scan-page.tsx`
- `apps/web/src/app/app.tsx`
- `packages/shared/src/delivery.ts`
- `packages/ui/src/components/signature-pad.tsx`
- `packages/ui/src/styles.css`
- `README.md`
- `MVP-IMPLEMENTATION-PLAN.md`
- `DEMO.md`
- `DEMO-SCRIPT.md`
- `IMPLEMENTATION_STATUS.md`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and applied `20260727013000_delivery_signature_proof` on `localhost:55439/dental_lab_dev`.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency and once more after smoke reset.
- `pnpm typecheck` passed.
- `pnpm test` passed after updating RBAC expected permission keys.
- `pnpm build` passed.

Manual verification:

- Temporary API started on `http://localhost:3011` because `3010` was already occupied.
- Temporary frontend started on `http://localhost:3002`; Vite reported `3000` occupied during the first start attempt.
- API compiled in watch mode with 0 errors.
- `GET /health` returned `200`.
- Demo manager login with CSRF returned `200`.
- `GET /deliveries?filter=DELIVERED` returned delivered proof summaries.
- `GET /deliveries/demo_delivery_delivered_1/proof` returned `200`.
- `GET /deliveries/demo_delivery_delivered_1/proof/print-view` returned `200`.
- `GET http://localhost:3002/deliveries` returned `200`.
- Demo courier login returned `200`.
- Completing `demo_delivery_in_transit_1` without signature returned `400`.
- Completing `demo_delivery_in_transit_1` with valid signature returned `201`.
- Reading the newly created proof returned `200`.
- Demo seed was rerun after smoke to restore the deterministic in-transit signing scenario.

Architecture decisions:

- `DeliveryProof` is the canonical proof source for deliveries completed after SIGNATURES-001; existing delivery recipient fields remain compatibility snapshots.
- Proof storage is dedicated to delivery handover and does not use FILES-001 or generic file upload.
- Stroke payloads are normalized numeric JSON with max 50 strokes, max 5000 points, max 200 KB payload and min 8 points.
- Signature hash is SHA-256 over canonical normalized JSON.
- Override is manager-only through `delivery.signature.override` and requires allowlisted reason plus explicit confirmation.
- Proof read/print access is permissioned server-side; lists and audit metadata avoid raw proof payloads.

Legal/security positioning:

- UI wording uses “Confirmare internă de primire”.
- Print disclaimer: “Document de confirmare operațională internă a predării. Nu reprezintă o semnătură electronică calificată.”
- No eIDAS, qualified/advanced electronic signature, biometrics, GPS, photos, POS, money processing or fiscal receipt claims.

Technical debt introduced:

- No Playwright browser automation for drawing on the canvas yet.
- Existing local dev port conflicts remain possible when another API/Vite process already runs on `3010`/`3000`.
- Linting remains unconfigured.

Remaining risks:

- Physical phone signature capture and physical print output still need real-device validation.
- Backend shutdown still shows the existing `pg` deprecation warning, without request failures.

### DELIVERY-001 - Courier planning and delivery execution

- Implemented `Delivery` and `DeliveryEvent` with deterministic migration `20260726101000_delivery_planning_execution`.
- Added `DeliveryModule` with delivery list/detail, create from READY group, update plan, assign/unassign, cancel, pickup, start transit, complete, fail, reschedule and courier options endpoints.
- Added RBAC permissions for delivery planning and execution, with courier `OWN_DELIVERY` enforcement and server-side ownership checks.
- Added `/deliveries` mobile-first UI with filters, cards, detail drawer, action controls and READY group conversion.
- Integrated logistics group summaries with active delivery context and scan results with “Deschide livrarea” for courier-owned active deliveries.
- Extended demo seed/reset with 10 deterministic deliveries across planned, assigned, picked up, in transit, delivered, failed and unassigned states.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260726101000_delivery_planning_execution/migration.sql`
- `apps/api/src/modules/delivery/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/api/src/modules/logistics/logistics.view.ts`
- `apps/api/src/modules/scan/scan.service.ts`
- `apps/api/prisma/demo/*`
- `apps/web/src/features/deliveries/*`
- `apps/web/src/features/works/work-scan-page.tsx`
- `apps/web/src/app/app.tsx`
- `apps/web/src/app/route-registry.tsx`
- `packages/shared/src/delivery.ts`
- `README.md`
- `MVP-IMPLEMENTATION-PLAN.md`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev --name delivery_planning_execution` passed against `localhost:55439/dental_lab_dev`.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `pnpm --filter @dental-lab/api prisma:db:reset-demo` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Manual verification:

- API code compiled in watch mode with 0 errors.
- `/health` returned 200.
- `/deliveries` HTML returned 200 from Vite.
- Demo courier login succeeded.
- Courier `GET /deliveries?page=1&pageSize=5` returned 7 own deliveries.
- Demo manager `GET /deliveries?page=1&pageSize=20` returned 10 deliveries.
- Demo manager `GET /deliveries?filter=FAILED` returned 1 failed delivery.
- READY preparation groups include active delivery summaries and are hidden from create list in `/deliveries`.
- Courier `POST /scan/resolve` for `WO-2026-900018` returned delivery `DLV-2026-DEMO-03`.

Architecture decisions:

- A delivery belongs to exactly one READY preparation group and one clinic.
- `DeliveryEvent` is append-only and stores safe metadata only.
- `Delivery.isActive` protects preparation-group reuse while allowing cancelled pre-pickup deliveries to release the group.
- Delivery execution changes `WorkLogisticsState`; signed proof is now covered by completed `SIGNATURES-001`.

Known technical debt:

- No Playwright/mobile browser automation yet; verification was API/UI smoke.
- Local port 3000/3010 were already occupied during smoke, so Vite used 3001 and a separate API smoke instance used 3011.
- `pg` emitted an existing shutdown deprecation warning when stopping the temporary API process.

Remaining risks:

- Physical courier phone scan and real-world delivery handoff still need device validation.
- Signed proof of delivery is covered by completed `SIGNATURES-001`.

### LOGISTICS-001 - Laboratory operational center, intake and internal logistics

- Implemented `WorkLogisticsState`, `LogisticsEvent`, `DeliveryPreparationGroup` and `DeliveryPreparationItem` with deterministic migration `20260726092000_logistics_operational_center`.
- Added `LogisticsModule` with center, summary, work detail, location, block/unblock, ready-for-packing, packing, and internal preparation group endpoints.
- Added RBAC permissions: `logistics.center.read`, `logistics.update_location`, `logistics.block_work`, `logistics.unblock_work`, `logistics.prepare_work`, `logistics.manage_groups`.
- Added `/logistics` mobile-first UI with summary cards, quick filters, status/location drawer, packing actions, and preparation groups.
- Extended scan context with logistics status, physical location, block reason and active preparation group.
- Extended demo seed/reset with logistics states and three deterministic delivery preparation groups.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260726092000_logistics_operational_center/migration.sql`
- `apps/api/src/modules/logistics/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/api/src/modules/scan/scan.service.ts`
- `apps/api/prisma/demo/*`
- `apps/web/src/features/logistics/*`
- `apps/web/src/features/works/work-scan-page.tsx`
- `apps/web/src/app/app.tsx`
- `apps/web/src/app/route-registry.tsx`
- `packages/shared/src/logistics.ts`

Verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev` passed against `localhost:55439/dental_lab_dev`.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Manual verification:

- API build started on `http://127.0.0.1:3012`.
- Demo manager login succeeded.
- `/health` returned `ok`.
- `/logistics/center` returned 48 demo works.
- `/logistics/center/summary` returned blocked/ready counts.
- `/works/demo_work_018/logistics` returned `READY_FOR_DELIVERY` and active group `PG-2026-DEMO-DRAFT_1`.
- `/delivery-preparation-groups` returned 3 demo groups.
- `/scan/resolve` for `WO-2026-900018` returned logistics status and group context.
- Frontend dev served `/logistics` with 200 HTML on `http://localhost:3001` because local port 3000 was already in use.

Architecture decisions:

- Logistics state is independent from `WorkOrder.status` and workflow execution.
- `RECEIVED`/`IN_PRODUCTION` can be derived for legacy rows, while block/packing/ready-for-delivery states are persisted.
- Billing is visible as a non-blocking label only; logistics responses do not expose prices or totals.
- Delivery preparation groups are internal clinic-based preparation groups, not routes, handoffs, courier delivery or signatures.
- A work can be in one active preparation group through a partial unique index on active delivery preparation items.

Technical debt introduced:

- None.

Remaining risks:

- Browser visual verification was limited to HTTP smoke and component tests in this terminal environment.
- Frontend smoke used port 3001 because port 3000 was occupied.
- Linting remains unconfigured.

### SCAN-002 - Operational QR scan actions and physical work handoff

- Implemented authenticated operational scan context at `POST /scan/resolve`, read-only, CSRF-free, rate-limited, and protected by `scan.resolve`.
- Added `scan.use` and `scan.resolve` permissions; `/scan` navigation and route access now use `scan.use`.
- Added server-computed scan actions: `OPEN_WORK`, `START_STAGE`, `COMPLETE_STAGE`, `ASSIGN_STAGE`, `REASSIGN_STAGE`.
- Kept mutations on existing workflow and assignment endpoints; scan actions add `source: "scan"` and require explicit UI confirmation plus CSRF.
- Added scan audit actions for QR resolve, work open, stage start, stage complete and stage assignment with safe metadata only.
- Hardened QR metadata so `GET /works/:id/qr` no longer exposes the raw `dl-work:<opaque-token>` payload; the token is only encoded server-side in the PNG image.
- Updated QR image loading in the frontend to fetch authenticated PNG as a Blob object URL with cleanup, content-type validation and retry.
- Reworked `/scan` into an operational workspace with camera/manual scan, duplicate suppression, result context, current stage/responsible/progress and action confirmation modal.
- Added dashboard shortcut wording `Scanează lucrare`.

Main files modified:

- `apps/api/src/modules/scan/*`
- `apps/api/src/modules/rbac/permission-registry.ts`
- `apps/api/src/modules/qr/*`
- `apps/api/src/modules/workflow-execution/*`
- `apps/api/src/modules/technician-assignments/*`
- `apps/web/src/features/works/work-scan-page.tsx`
- `apps/web/src/features/works/scan-api.ts`
- `apps/web/src/features/works/work-qr-modal.tsx`
- `apps/web/src/app/route-registry.tsx`
- `packages/shared/src/scan.ts`
- `packages/shared/src/works.ts`
- `packages/shared/src/workflow-execution.ts`
- `packages/shared/src/technician-assignments.ts`

Tests and verification:

- Prisma migration: none.
- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice; idempotency confirmed with 48 demo works both times.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- Manual API smoke on current code via `http://localhost:3011` passed: `/health`, demo login, `/scan/resolve`, `/works/:id/qr`, `/works/:id/qr-image`, workflow stage start, workflow stage complete, technician assignment.
- Manual QR image verification passed: `GET /works/:id/qr-image` returned `200`, `image/png`, PNG magic bytes `137 80 78 71`.
- Manual QR metadata verification passed: `GET /works/:id/qr` returned only `label`, `workCode`, `workId`, with no payload/token field.
- Manual frontend route smoke on current code via `http://localhost:3001` passed for `/scan`, `/works`, `/workbench` with `200 text/html`.

Architecture decisions:

- Operational scan context is separate from legacy QR lookup: `/scan/resolve` returns only permitted operational context and server-computed actions.
- QR metadata never exposes the opaque payload; PNG generation creates the payload inside the backend service only.
- Stage transitions and assignments remain owned by existing workflow/assignment services; scan adds source-aware audit and UI confirmation.
- `scan.use` controls route/navigation visibility, while `scan.resolve` controls backend scan context.

Technical debt introduced: None.

Remaining risks:

- Physical phone scan remains pending.
- Physical/real print verification remains pending.
- Ports `3000` and `3010` were already occupied by older local processes during smoke checks; current-code runtime verification used isolated ports `3001` and `3011`.
- Lint remains unconfigured.
- The existing `pg` deprecation warning can appear when stopping the API, without request failures.

### TECH-001 - Technician assignments and personal workbench

- Implemented current-stage technician assignment with one primary assigned technician per current stage.
- Added `assignedUserId`, `assignedAt`, `assignedByUserId`, assignment relations, indexes and assignment event types to workflow stage executions.
- Added assignment endpoints for assign, reassign and unassign with optimistic locking, RBAC, CSRF and audit events.
- Added `/technician/workbench`, `/technician/workload` and `/technicians/options`.
- Added `/workbench` mobile-first UI for “Lucrările mele”, filters, queue categories, workload and stage start/complete actions.
- Added current-stage assignment controls in the work detail workflow panel.
- Updated workflow execution authorization so technicians can start/complete only their assigned current stage, while manager `ALL` scope can override.
- Updated demo seed with assigned, unassigned, pending, in-progress, overdue and urgent current stages.

Main files modified:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260726031000_technician_stage_assignments/migration.sql`
- `apps/api/src/modules/technician-assignments/*`
- `apps/api/src/modules/workflow-execution/*`
- `apps/web/src/features/technician-workbench/*`
- `apps/web/src/features/works/work-workflow-section.tsx`
- `packages/shared/src/technician-assignments.ts`

Tests and verification:

- `pnpm --filter @dental-lab/api prisma:validate` passed.
- `pnpm --filter @dental-lab/api prisma:generate` passed.
- `pnpm --filter @dental-lab/api prisma:migrate:dev --name technician_stage_assignments` passed, already in sync after cleanup.
- `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- Manual API smoke: `/health`, `/technician/workbench`, `/technician/workload`, `/technicians/options` passed.
- Manual frontend smoke: `/workbench` returned 200 from Vite on `http://localhost:3000`.
- Manual role smoke: manager sees current-stage workshop queue and workload; technician demo sees only own assigned item.

Architecture decisions:

- Assignment belongs to the current workflow stage, not the whole work order.
- Only one primary technician can be assigned to the current stage.
- When workflow advances, the next stage remains unassigned.
- Managers with `ALL` scope can execute or reassign current stages as an override; technicians require assignment.
- Workbench and workload count only active current stages, not future pending stages.

Technical debt introduced: None.

Remaining risks:

- Lint remains unconfigured.
- A `pg` deprecation warning can appear when stopping the API, but requests and tests pass.

## Known Technical Debt

None.

## Architecture Decisions

- ROADMAP-REALIGN-002 makes `REAL-LAB-WORKFLOW.md` the source of truth for the validated real laboratory workflow.
- Keep one shared operational application and one shared database; do not convert the product into multi-tenant SaaS.
- Support two legal/financial contexts: `NC` - Nicolaie Cristina and `NG` - Nicolaie Gabriel.
- Both managers must be able to see and operate both `NC` and `NG`; do not create automatic single-company manager isolation.
- Add a future global shell context switch for `NC`/`NG`; it affects financial/company records, documents, pricing and reports, but not identity or shared operational visibility.
- Reception registers work operationally without selecting a company.
- Technician self-claim becomes the target production model; the technician selects `NC`/`NG` at first technical claim and the company is attached to the work.
- Existing assignment-driven technician screens are prior-flow implementation until `TECH-CLAIM-001`.
- Patient data is modeled through PATIENTS-001; work orders use `patientId` plus `patientName` snapshot, and the work code remains the operational identifier.
- Current demo remains prior-flow/single-company until `DEMO-REAL-DATA-001`.
- Use a pnpm workspace monorepo with `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, and `packages/config`.
- Use TypeScript strict mode everywhere.
- Use React + Vite for the frontend.
- Use NestJS for the backend.
- Keep shared constants and pure functions in `packages/shared`.
- Keep reusable React UI primitives in `packages/ui`.
- Keep reusable TypeScript configuration in `packages/config`.
- Resolve frontend workspace packages to source files in Vite and Vitest during development.
- Keep the API independent from shared frontend contracts until real cross-package API contracts are introduced.
- Keep API deadline implementation types local while exporting shared deadline response contracts from `packages/shared`.
- Use a deterministic Romanian business-day calendar in code for 2026-2030; do not call external calendar services during deadline calculation.
- Calculate deadlines by local calendar dates in `Europe/Bucharest` and convert only the final due date/time to ISO UTC.
- Keep deadline preview side-effect free until `WORK-DEADLINES-001B` persists snapshots on work orders.
- Use Docker Compose for local PostgreSQL development.
- Use host port `55439` for local PostgreSQL to avoid common conflicts with existing local databases.
- Validate backend runtime environment with Zod before starting the NestJS app.
- Load local API environment from `.env` in either the API working directory or the monorepo root.
- Keep database connectivity health in a dedicated NestJS database module.
- Use Prisma Client as the backend database access layer.
- Configure Prisma 7 through `apps/api/prisma.config.ts`.
- Store backend sessions server-side and send only httpOnly cookie tokens to the browser.
- Store only SHA-256 hashes of session tokens in PostgreSQL.
- Use Argon2id for password hashing and verification.
- Protect cookie-backed state-changing auth requests with CSRF tokens.
- Keep AUTH-001 rate limiting in memory until a shared store is introduced.
- Use a central RBAC authorization service for permission checks.
- Keep permissions out of cookies and sessions.
- Keep FORMS-001 limited to common form UX patterns; dynamic work form templates are tracked separately as WORKFORMS-001.
- Keep backend DTO validation and RBAC as the source of truth; frontend Zod validation is for immediate UX feedback only.
- Use `@dental-lab/ui` form pattern primitives for layout, sections, error summaries, form actions, and confirmation modals.
- Normalize frontend API errors in `apps/web/src/lib/api-client.ts` and map them to React Hook Form through `apps/web/src/lib/form-utils.tsx`.
- Protect dirty forms with route blocking where React Router data-router context exists, plus `beforeunload` and modal/drawer close guards.
- Reprioritize billing before dynamic work forms because the operational pain is month-end reconciliation across works, proformas, invoices, receipts and separate spreadsheets.
- Keep BILLING-001 as an internal operational billing workspace; printable/legal-grade documents and clinic statements are deferred to BILLING-002.
- Store billing money as integer minor units only and derive paid/balance from active payments.
- Use `WorkOrder.invoicedDocumentId` as the active invoice relation instead of a billing boolean.
- Keep patient names out of billing audit metadata; document line snapshots may contain patient names for internal annex/search views.
- Keep existing Payment models/endpoints as optional manual evidence only; the MVP does not process money, cards, POS transactions, cash register flows or bank reconciliation.
- Superseded by ROADMAP-REALIGN-002: the previous post-BILLING-001 roadmap order was completed through SIGNATURES-001 and is no longer the active next-task sequence.
- Workflow templates are linear and versioned per WorkType; initial/final stages are derived from order, and the database enforces at most one ACTIVE workflow template per WorkType.
- Evaluate RBAC from the database so access changes take effect without relogin.
- Treat `ALL` as the only broad scope; ownership scopes remain distinct.
- Use plain CSS custom properties in `packages/ui/src/styles.css` as the design token source of truth.
- Keep UI-001 limited to base styles, tokens, native element defaults, layout utilities, and an internal style preview.
- Avoid introducing a CSS framework for UI-001 because the existing CSS mechanism is sufficient.
- Keep UI-002 components framework-free and token-driven inside `packages/ui`.
- Use native controls for select, checkbox, radio, switch, file input, and table semantics where possible.
- Use internal portal/focus management for Modal and Drawer instead of adding an overlay dependency.
- Use finite toast durations by default, cap visible toast count, and clear auth-scoped toasts on logout, expired session, and authenticated identity change.
- Keep Modal and Drawer as shared `@dental-lab/ui` overlays with body lock, focus management, escape close, scrollable body, stable footer, and mobile `100dvh` behavior.
- Keep Romanian deployment defaults constrained to `ro-RO`, `Europe/Bucharest`, `RON`, and `RO` for laboratory settings.
- Export CSV files with UTF-8 BOM, CRLF, semicolon delimiter, formula neutralization, Romanian date formatting, and explicit currency columns.
- Keep QRScanner and SignaturePad out of UI-002 because they depend on device/browser functional flows; QR scan now exists as a feature-specific `/scan` route from QR-001.
- Store work orders in `work_orders` with a generated stable `WO-YYYY-NNNNNN` code backed by `work_order_code_seq`.
- WORKS-001 creates work orders directly as `REGISTERED`; draft and workflow status transitions remain deferred.
- Keep patient identity minimal in WORKS-001 with `patientName` and optional `patientReference`; no patient model is introduced.
- Snapshot work order pricing from `WorkType.basePriceMinor` and `LaboratorySettings.currency` at create time.
- Hide work order price fields from readers without `pricing.read`; reception can still select active work types through a price-free `/works/work-type-options` endpoint.
- Treat `works.read_assigned` as deny-safe until an assignment relationship exists; WORKS-001 list/detail require `works.read_all`.
- Store QR payloads as `dl-work:<opaque-token>` and keep work codes, patient data, pricing, clinic details, and internal database IDs out of QR content.
- Generate QR tokens server-side with cryptographic randomness for new work orders inside the work-order create transaction.
- Keep legacy QR resolve behind cookie authentication, CSRF, `works.read_all`, and server-side rate limiting.
- Keep operational scan resolve behind cookie authentication, `scan.resolve`, no CSRF because it is read-only, and server-side rate limiting.
- Implement browser camera scan in the works feature route `/scan` with native `BarcodeDetector` feature detection, duplicate suppression and manual fallback; do not add a frontend scanner dependency until browser support requires it.
- Keep QR metadata responses free of raw QR payload/token fields; encode `dl-work:<opaque-token>` only inside backend PNG generation and scan input handling.
- Keep QR-001 limited to traceability lookup and label printing; SCAN-002 adds workflow/assignment actions, while QC, delivery, files, notifications, logistics and public/anonymous portals remain deferred.
- Keep authenticated frontend routes behind a shared app shell that reads `/auth/me` and `/auth/permissions` through TanStack Query.
- Treat frontend route guards and permission-aware navigation as UX only; backend RBAC remains the enforcement source of truth.
- Centralize frontend API calls through `apps/web/src/lib/api-client.ts` so cookie credentials, error parsing, and expired-session handling are consistent.
- Reject external `returnTo` values on login and only redirect to safe relative app paths.
- Store stage assignment on `WorkStageExecution`; assignment is current-stage scoped and is cleared by progression because the next stage starts unassigned.
- Count technician workbench/workload from active workflow current stages only, never from future pending stages.

## Planned Task Definitions

### SHELL-001 - Authenticated application shell and navigation

- Status: COMPLETED.
- Obiectiv: experienta unitara pentru utilizatorii autentificati, cu layout, navigare si protectie vizibila a rutelor.
- Scope: app shell responsive, top bar/mobile nav, desktop sidebar, linkuri catre paginile existente, user menu, logout, stari loading/unauthorized si redirect login.
- Non-goals: dashboard operational, redesign pagini existente, permisiuni noi, business logic nou.
- Dependente: AUTH-001, RBAC-001, UI-002, QR-001.
- Acceptance criteria: utilizatorul autentificat navigheaza intre `/works`, `/scan`, `/clinics`, `/work-types`, `/users`, `/settings`; utilizatorul neautentificat este trimis la `/login`; linkurile nepermise nu sunt promovate in navigatie.
- Backend: fara endpointuri noi estimate; reutilizeaza `/auth/me`, `/auth/permissions`, `/auth/logout`.
- Frontend: layout shell, route protection, navigation responsive, logout flow, login polish.
- Securitate: route protection este doar UX; backend RBAC ramane sursa de adevar.
- Audit: fara audit nou; logout ramane comportamentul AUTH-001.
- Testare: component/route tests pentru auth loading, unauthorized redirect, permission-aware nav si logout.

### DASHBOARD-001 - Operational dashboard

- Status: SUPERSEDED BY DASHBOARD-002.
- Obiectiv: ecran initial cu indicatori operationali pentru utilizatori autentificati.
- Scope: sumar lucrari, urgente, termene apropiate, linkuri rapide si stari goale.
- Non-goals: rapoarte financiare, grafice complexe, exporturi, notificari realtime.
- Dependente: SHELL-001, WORKS-001, RBAC-001.
- Acceptance criteria: dashboardul afiseaza doar date permise si ramane utilizabil pe mobile.
- Backend: endpoint sumar dashboard sau compunere din endpointuri existente, fara date financiare fara `pricing.read`.
- Frontend: ruta dashboard in shell, carduri responsive, loading/error states.
- Securitate: respecta RBAC server-side si mascare pricing.
- Audit: fara audit nou pentru citire.
- Testare: API/unit unde exista agregari, frontend permission states si responsive smoke.

### FORMS-001 - Form patterns and validation UX

- Status: COMPLETED.
- Obiectiv: standardizare formulare pentru utilizatori atehnici.
- Scope: patternuri pentru erori, required markers, field groups, submit states, reset/cancel si validare Zod/RHF coerenta.
- Non-goals: schimbarea regulilor business, wizard complex, autosave, template builder dinamic, snapshot valori formular pe lucrare.
- Dependente: UI-002, SHELL-001.
- Acceptance criteria: formularele principale au erori clare, stari de saving consistente si layout mobile-first.
- Backend: fara endpointuri noi.
- Frontend: helperi/componente compuse peste UI primitives si aplicare pe formularele existente prioritare.
- Securitate: nu inlocuieste validarea server-side.
- Audit: fara audit nou.
- Testare: component tests pentru erori, disabled states si submit.
- Implementare: adaugate patternuri comune de formular, mapare erori API, error summary accesibil, focus management, dirty guards si confirmari modal aplicate pe formularele existente.

### WORKFORMS-001 - Work form template builder

- Status: COMPLETED.
- Started: 2026-07-24T20:47:38Z.
- Completed: 2026-07-24T21:03:26Z.
- Commit message: `WORKFORMS-001: add work form template builder`.
- Pre-flight audit:
  - Branch `main` confirmed.
  - Working tree clean before WORKFORMS-001 changes.
  - Last commit before task: `fd5c95e DOCS: expand demo presentation guide`.
  - Task definition, `MVP-IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION_STATUS.md`, `README.md`, Prisma schema and existing migrations were reviewed.
  - Existing WorkType, WorkTypesModule, FORMS-001 form patterns, `packages/ui`, React Query/API patterns, permission registry, role matrix, AuthorizationService and audit patterns were reviewed.
  - No premature WorkForm template models or `forms.*` permissions existed.
  - Plan confirms versioning and keeps submission/snapshot in a separate task.
  - Approved field types are TEXT, TEXTAREA, NUMBER, DATE, CHECKBOX, RADIO, SELECT, MULTISELECT, TOOTH and SHADE.
  - Linting remains unconfigured.
- Obiectiv: configurarea formularelor dinamice per tip de lucrare fara salvarea valorilor pe WorkOrder.
- Scope: template activ per WorkType, field definitions, field types MVP, versiuni, preview, activare si arhivare.
- Non-goals: upload fisiere, scripting, HTML custom, conditional rules engine complex, autosave, completare/snapshot valori pe lucrare.
- Dependente: FORMS-001, WORKTYPES-001, RBAC-001.
- Acceptance criteria: managerii pot defini si publica un template versionat pentru un tip de lucrare, iar utilizatorii fara permisiuni de modificare il vad read-only.
- Backend: modele si endpointuri pentru template-uri si field definitions, validate server-side, fara modificare retroactiva a versiunilor publicate.
- Frontend: ruta de administrare template pentru WorkType, lista campuri, add/edit, ordonare simpla, preview si stari de activare/arhivare.
- Securitate: RBAC server-side pentru citire/modificare/arhivare, validare stricta a optiunilor JSON si a tipurilor de camp.
- Audit: audit pentru create/update/activate/archive template.
- Testare: unit si integration pentru servicii/controllere, teste frontend pentru builder, preview, read-only si validare.
- Summary:
  - Added `WorkFormTemplate` and `WorkFormFieldDefinition` Prisma models.
  - Added deterministic migration `20260724204700_work_form_template_builder`.
  - Added enum statuses `DRAFT`, `ACTIVE`, `ARCHIVED` and field types `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `CHECKBOX`, `RADIO`, `SELECT`, `MULTISELECT`, `TOOTH`, `SHADE`.
  - Added unique `(workTypeId, version)`, unique `(templateId, key)`, useful indexes and PostgreSQL partial unique index for one active template per WorkType.
  - Added `WorkFormsModule` with list/detail/active/create/update/replace fields/activate/archive/clone endpoints.
  - Added strict server-side schema validation for field keys, reserved keys, options, default values and validation rules.
  - Added transaction-safe version allocation using `pg_advisory_xact_lock(hashtext(workTypeId))`.
  - Added transactional activation that validates fields, archives previous active template and activates the draft.
  - Added safe audit events for create/update/fields replaced/activate/archive/clone.
  - Added `forms.read`, `forms.create`, `forms.update`, `forms.archive` permissions and role matrix grants.
  - Added shared contracts and pure helpers for key validation, option validation, order normalization and compatibility checks.
  - Added `/work-types/:workTypeId/form` builder route, lazy-loaded frontend page and “Configureaza formularul” action in WorkType detail.
  - Added version list, draft metadata editing, field editor, options editor, move up/down ordering, live preview, read-only mode and archived WorkType restrictions.
- Non-goals:
  - No WorkOrder model changes.
  - No work form submission model.
  - No saved values, immutable snapshot, workflow, files, QC, logistics, delivery, notifications or dashboard changes.
  - No FILE/IMAGE/SIGNATURE/HTML/RICH_TEXT/SCRIPT/FORMULA/GROUP/REPEATER/conditional fields.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260724204700_work_form_template_builder/migration.sql`
  - `apps/api/src/modules/work-forms/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/api/src/modules/rbac/permission-registry.ts`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/work-forms/*`
  - `apps/web/src/features/work-types/work-types-page.tsx`
  - `packages/shared/src/work-forms.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name work_form_template_builder` passed and applied `20260724204700_work_form_template_builder`.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Tests added:
  - Shared work form helper tests for keys, options, order normalization and compatibility.
  - Backend validation service tests for normalization and invalid schemas.
  - Frontend builder page test for read-only route, version list and preview.
  - RBAC registry test updates for `forms.*` permissions.
- Manual verification:
  - API started on `http://localhost:3010`.
  - `GET /health` returned `ok`.
  - Manager login with CSRF succeeded.
  - `POST /work-types/:workTypeId/form-templates` created a `DRAFT` smoke template.
  - `PUT /work-form-templates/:id/fields` replaced 2 fields.
  - `POST /work-form-templates/:id/activate` returned `ACTIVE`.
  - `GET /work-types/:workTypeId/form-templates`, `GET /work-types/:workTypeId/form-template` and `GET /work-form-templates/:id` returned expected data.
  - Frontend started on `http://127.0.0.1:5182`.
  - `/work-types/:workTypeId/form`, `/work-types`, `/works` and `/billing` returned `200`.
  - Search confirmed no `WorkFormSubmission` implementation and no WorkOrder form completion/snapshot.
- Architecture decisions:
  - API owns runtime validation and Prisma persistence; shared package owns frontend contracts and pure compatibility helpers.
  - Version allocation uses a transaction-level advisory lock and max version inside the lock, avoiding unsafe `count + 1`.
  - Manual archive is limited to drafts; previous active templates are archived only during activation of a new draft.
  - JSON columns remain typed by DTO/service validation; arbitrary unchecked JSON is not accepted.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Real-device responsive checks at 360px/768px/1280px, zoom 150%, keyboard-only navigation and browser console inspection were only partially covered by tests/HTTP smoke in this terminal environment.
  - Linting remains unconfigured.

### WORKFORMS-002 - Work form completion and immutable snapshot

- Status: COMPLETED.
- Started: 2026-07-26T00:37:00+03:00.
- Completed: 2026-07-26T01:01:00+03:00.
- Commit message: `WORKFORMS-002: add work form submissions`.
- Obiectiv: completarea formularelor dinamice pe lucrare si salvarea unui snapshot imutabil al template-ului folosit.
- Scope: completare valori pentru WorkOrder pe baza template-ului activ, validare, snapshot versiune/campuri/raspunsuri, afisare read-only in detalii, demo seed cu submission-uri si login demo rapid.
- Non-goals: editare template, fisiere, workflow execution, conditional rules engine complex, asignare tehnicieni, logistica, livrare, QC, notificari, portal extern medic, procesare plati.
- Dependente: WORKFORMS-001, WORKS-001, RBAC-001.
- Summary:
  - Added `WorkFormSubmission` as optional 1:1 relation from `WorkOrder`, with immutable `schemaSnapshot`, values JSON, template reference/name/version snapshots and actor timestamps.
  - Added deterministic migration `20260726004000_work_form_submission_snapshot`.
  - Added `WorkFormSubmissionValidationService` for active-template lookup, stale template 409, backend-owned snapshot construction, strict values validation, forbidden key/payload checks, FDI TOOTH allowlist and audit metadata without values.
  - Extended `POST /works`, `PATCH /works/:id` and `GET /works/:id` for form submissions while keeping WorkOrder and submission changes transactional.
  - Added shared contracts/helpers for snapshot fields, values, display formatting, FDI codes and changed key detection.
  - Added dynamic work form UI in `/works`, field renderers, FDI tooth selector, multiselect, read-only snapshot display and template loading/error/empty states.
  - Added demo templates and submissions for Coroană zirconiu, Proteză totală and Bont personalizat implant.
  - Added `/auth/demo-login` guarded by `DEMO_MODE=true` and frontend quick-access demo buttons visible in Vite development or with `VITE_DEMO_MODE=true`.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260726004000_work_form_submission_snapshot/migration.sql`
  - `apps/api/src/modules/work-forms/work-form-submission-validation.service.ts`
  - `apps/api/src/modules/works/*`
  - `apps/api/src/modules/auth/*`
  - `apps/api/prisma/demo/*`
  - `apps/web/src/features/works/*`
  - `apps/web/src/features/auth/*`
  - `packages/shared/src/work-forms.ts`
  - `packages/shared/src/works.ts`
- Tests executed:
  - `pnpm --filter @dental-lab/api prisma:validate` - passed.
  - `pnpm --filter @dental-lab/api prisma:generate` - passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name work_form_submission_snapshot` - passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed:demo` - passed after reset was updated to remove all templates for demo work types.
  - `pnpm typecheck` - passed.
  - `pnpm test` - passed.
  - `pnpm build` - passed.
- Manual verification:
  - API started on `http://127.0.0.1:3011` with `DEMO_MODE=true`.
  - Frontend started on `http://127.0.0.1:5181` with `VITE_DEMO_MODE=true`.
  - `GET /health` returned `200`.
  - `POST /auth/demo-login` with role `MANAGER` returned `200` and created a normal session cookie.
  - `GET /work-types/demo_wt_zirconiu/form-template` returned `Formular coroană zirconiu`.
  - `POST /works` with zirconia work form values returned `201` and `workForm` snapshot with template name/version, fields and values.
  - `/login` and `/works` frontend routes returned HTML from Vite.
- Architecture decisions:
  - API keeps local runtime validation types to preserve the existing API rootDir boundary; shared owns public/frontend contracts and pure helpers.
  - Billing snapshots remain independent; work form changes do not alter issued financial documents.
  - Demo quick login uses backend session creation and CSRF; no demo password is exposed to React.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Browser-level visual/manual testing of dynamic fields was limited to HTTP smoke and component tests in this terminal environment.
  - Linting remains unconfigured.

### FILES-001 - Private file upload

- Status: NOT STARTED.
- Obiectiv: atasamente private pentru lucrari.
- Scope: upload foto/document/STL, metadata, private download si validari.
- Non-goals: preview avansat, OCR, storage productie final, fisiere publice.
- Dependente: WORKS-001, RBAC-001.
- Acceptance criteria: fisierele pot fi uploadate si accesate doar conform permisiunilor.
- Backend: FilesModule, DTO validation, storage abstraction, metadata persistence.
- Frontend: FileUpload flow pe lucrare, stari loading/error.
- Securitate: storage privat, RBAC server-side, validare tip/marime.
- Audit: audit upload/delete/archive unde exista actiuni critice.
- Testare: API permissions, upload validation, UI states.

### FILES-002 - File preview and lifecycle controls

- Status: NOT STARTED.
- Obiectiv: previzualizare si control operational pentru fisierele private.
- Scope: listare atasamente, preview pentru tipuri suportate, rename/replace/archive unde este permis.
- Non-goals: editor fisiere, OCR, procesare STL avansata, storage productie final.
- Dependente: FILES-001, SHELL-001.
- Acceptance criteria: fisierele raman private si pot fi inspectate/gestionate conform permisiunilor.
- Backend: endpointuri metadata si lifecycle cu validare DTO si RBAC.
- Frontend: preview drawer/modal, stari de incarcare si erori clare.
- Securitate: download/preview prin endpoint autorizat, fara URL public permanent.
- Audit: audit pentru archive/replace si actiuni critice.
- Testare: API permissions, file metadata lifecycle si UI states.

### LABELS-001 - Printable labels and document templates

- Status: NOT STARTED.
- Obiectiv: etichete si documente printabile consistente pentru lucrari.
- Scope: template eticheta QR, format print, date minime operationale, optiuni de print.
- Non-goals: facturi PDF, rapoarte, editor vizual template.
- Dependente: QR-001, SHELL-001.
- Acceptance criteria: etichetele se printeaza lizibil si nu includ date interzise.
- Backend: endpointuri de date printabile daca este necesar; reutilizeaza QR metadata unde e suficient.
- Frontend: UI print labels si CSS print stabil.
- Securitate: fara date pacient sensibile peste minimul aprobat; fara preturi.
- Audit: audit print unde exista actiuni critice.
- Testare: unit/component pentru render, manual print preview.

### WORKFLOW-001 - Workflow templates

- Status: COMPLETED.
- Started: 2026-07-26T02:10:00+03:00.
- Completed: 2026-07-26T02:23:34+03:00.
- Commit message: `WORKFLOW-001: add workflow templates and stages`.
- Obiectiv: configurare fluxuri tehnologice liniare, versionate, per tip de lucrare.
- Scope: template-uri workflow, versiuni, etape ordonate, roluri permise pe etapa, durata estimata, activare/arhivare/clonare si seed demo.
- Non-goals: executie workflow pe lucrare, snapshot pe WorkOrder, asignari, tranzitii, drag-and-drop, ramificari, etape paralele, checklist runtime, technician UI, QC, logistica si livrare.
- Dependente: WORKTYPES-001, RBAC-001, SHELL-001.
- Summary:
  - Added `WorkflowTemplate` and `WorkflowStageDefinition` Prisma models with deterministic migration `20260726021000_workflow_template_builder`.
  - Added a partial unique PostgreSQL index so only one `ACTIVE` workflow template can exist per WorkType.
  - Added `WorkflowTemplatesModule` with list/detail/active/create/update/replace stages/activate/archive/clone endpoints.
  - Added DTO validation, service-level validation, transaction use and advisory lock for version allocation and activation.
  - Added RBAC permissions `workflow.create`, `workflow.update` and `workflow.archive`; read uses existing `workflow.read`.
  - Added safe audit events for create, update, stage replacement, activation, archive and clone.
  - Added shared workflow contracts and pure helpers for stage keys, role validation, ordering, durations and changed stage keys.
  - Added `/work-types/:workTypeId/workflow` frontend builder and “Configurează fluxul” link in the work type drawer.
  - Added demo workflow templates for zirconia crowns, total prosthesis and implant abutments.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260726021000_workflow_template_builder/migration.sql`
  - `apps/api/src/modules/workflow-templates/*`
  - `apps/api/src/modules/rbac/permission-registry.ts`
  - `apps/api/prisma/demo/*`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/workflow-templates/*`
  - `apps/web/src/features/work-types/work-types-page.tsx`
  - `packages/shared/src/workflow-templates.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
  - `DEMO.md`
  - `DEMO-SCRIPT.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and applied `20260726021000_workflow_template_builder`.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency, then passed again after smoke reset.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Tests added:
  - Shared workflow helper tests.
  - Backend workflow validation service tests.
  - Backend workflow templates service tests.
  - Frontend workflow builder route test.
  - RBAC registry test updates for new `workflow.*` configuration permissions.
- Manual verification:
  - Existing API dev server on `http://localhost:3010` was used; port was already occupied by `node`.
  - Existing frontend dev server on `http://localhost:3000` was used; port was already occupied by `node`.
  - Manager demo login through CSRF and `/auth/demo-login` returned `manager@demo.local`.
  - `GET /work-types/demo_wt_zirconiu/workflow-templates` returned `200`, one template and active ID `demo_workflow_template_zirconiu_v1`.
  - `GET /work-types/demo_wt_zirconiu/workflow-template` returned `200`, `Flux coroană zirconiu`, 9 stages, first `receptie`, last `pregatire_livrare`.
  - Smoke create draft returned `201`, replace stages returned `200`, archive returned `201` with `ARCHIVED` and 2 stages.
  - `GET http://localhost:3000/work-types/demo_wt_zirconiu/workflow` returned `200` HTML.
  - Demo seed was rerun after smoke to remove temporary workflow data.
- Architecture decisions:
  - Keep WORKFLOW-001 limited to template configuration; runtime execution/snapshots remain in WORKFLOW-002.
  - Keep workflows linear for MVP; initial/final stages are derived from order instead of stored as user-editable business rules.
  - Use JSON for allowed role codes, guarded by DTO/service/shared validation.
  - Keep version allocation and activation inside transactions with advisory locks and database uniqueness.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Browser-level visual review and real mobile/tablet inspection were limited to HTTP/component smoke in this terminal environment.
  - Linting remains unconfigured.

### WORKFLOW-002 - Workflow execution snapshot

- Status: COMPLETED.
- Started: 2026-07-26T02:33:51+03:00.
- Completed: 2026-07-26T02:59:06+03:00.
- Obiectiv: instantiere flux pe lucrare fara dependenta de editari ulterioare ale templateului.
- Scope implemented:
  - `WorkWorkflowExecution`, `WorkStageExecution` and `WorkStageEvent` Prisma models with deterministic migration.
  - Snapshot immutable from the active workflow template when a work order is created.
  - Linear current-stage execution with PENDING -> IN_PROGRESS -> COMPLETED transitions.
  - Dedicated workflow endpoint on work detail, plus start/complete endpoints with optimistic version checks.
  - Workflow indicators and timeline/actions in the `/works` drawer.
  - Demo seed workflow executions for realistic demo works.
- Non-goals kept out: technician workbench, assignments, pause/resume, skip/back/reopen, QC, delivery, logistics, notifications, files, dashboard and QR repair.
- Dependente: WORKFLOW-001, WORKS-001.
- Acceptance criteria:
  - Active workflow template is copied as snapshot at work creation.
  - Works without active template remain creatable and show an empty workflow state.
  - Work order status remains general; production state is stored separately in workflow execution.
  - Start is allowed only for current PENDING stage.
  - Complete is allowed only for current IN_PROGRESS stage.
  - Completing a non-final stage advances the current stage.
  - Completing the final stage marks workflow COMPLETED.
  - Stale expected workflow/stage versions return conflict.
  - `workflow.start_stage` and `workflow.complete_stage` are enforced server-side.
- Backend files:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260726023500_workflow_execution_snapshot/migration.sql`
  - `apps/api/src/modules/workflow-execution/*`
  - `apps/api/src/modules/works/*`
  - `apps/api/prisma/demo/demo-seed.ts`
  - `apps/api/prisma/demo/demo-reset.ts`
- Frontend/shared files:
  - `packages/shared/src/workflow-execution.ts`
  - `packages/shared/src/works.ts`
  - `apps/web/src/features/works/work-workflow-section.tsx`
  - `apps/web/src/features/works/works-api.ts`
  - `apps/web/src/features/works/works-page.tsx`
  - `apps/web/src/features/works/works-page.css`
- Security:
  - Transition endpoints require authentication, CSRF and RBAC permissions.
  - Allowed stage roles are evaluated against immutable stage snapshots.
  - Manager override is represented by `ALL` scope and audit metadata.
- Audit:
  - `workflow.execution_created`, `workflow.stage_started`, `workflow.stage_completed`, and `workflow.execution_completed` audit entries.
  - Append-only `WorkStageEvent` timeline entries.
- Tests executed:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="Confirm resetarea bazei locale de dezvoltare pentru verificările WORKFLOW-002." pnpm --filter @dental-lab/api exec dotenv -e ../../.env -- prisma migrate reset --force` passed against local `localhost:55439/dental_lab_dev`.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name workflow_execution_snapshot` passed with schema already in sync.
  - `pnpm --filter @dental-lab/api seed:demo` passed twice sequentially for demo idempotency.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Manual verification:
  - Existing API on `http://localhost:3010` returned `/health` 200 with database ok.
  - API dev server could not bind because `3010` was already in use; existing local API instance was used.
  - Frontend dev server started on `http://localhost:3002` because 3000 and 3001 were already in use.
  - Demo manager login through CSRF and `/auth/demo-login` succeeded.
  - `GET /works` returned 48 demo works with workflow summaries.
  - `GET /works/demo_work_034/workflow` returned ACTIVE workflow.
  - `POST /works/demo_work_034/workflow/stages/:stageId/start` changed current stage to IN_PROGRESS.
  - `POST /works/demo_work_034/workflow/stages/:stageId/complete` completed Recepție and advanced current stage to Model.
  - `GET http://localhost:3002/works` returned 200 HTML.
- Architecture decisions:
  - Use separate relational execution/event models, not opaque JSON, for workflow runtime.
  - Snapshot template name, version, stage names, descriptions, order, duration and allowed role codes.
  - Keep work order status unchanged in WORKFLOW-002; workflow status is independent.
  - Keep runtime workflow linear until later approved tasks.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Browser visual verification was limited to component tests and HTTP smoke in this terminal environment.
  - Real multi-user concurrency was covered by version/row-locking implementation, but not by a parallel live smoke scenario.
  - Linting remains unconfigured.

### SCAN-002 - Scan actions and operational handoffs

- Status: NOT STARTED.
- Obiectiv: folosirea scanarii QR pentru actiuni operationale controlate.
- Scope: resolve scan plus actiuni permise contextual, precum handoff sau deschidere etapa, fara automatism periculos.
- Non-goals: camera library noua daca `BarcodeDetector` este suficient, logistica, delivery, QC, fisiere, notificari, public/anonymous scan.
- Dependente: QR-001, WORKFLOW-002, TECH-001.
- Acceptance criteria: scanarea nu schimba status fara confirmare si permisiune explicita; contextul scanarii afiseaza actiunile permise de server.
- Backend: `POST /scan/resolve`, audit scan, RBAC scan si reutilizare endpointuri workflow/asignare pentru mutatii.
- Frontend: UI scan operational, confirmari clare, fallback manual, camera pornita explicit.
- Securitate: RBAC server-side si token opac; fara acces anonim.
- Audit: audit pentru fiecare actiune declansata din scan.
- Testare: API permissions/state transitions, frontend camera/manual action states.

### LOGISTICS-001 - Laboratory operational center, intake and internal logistics

- Status: COMPLETED.
- Obiectiv: centru operational pentru receptie/logistica, locatie fizica, blocari, ambalare si pregatiri interne pentru livrare.
- Scope: `/logistics`, stari logistice, evenimente, filtre operationale, scan context logistic, pregatiri interne pe clinica.
- Non-goals: delivery efectiv, rute curier, GPS, semnaturi, QC formal, fisiere/upload, notificari, portal medic, procesare plati.
- Dependente: WORKFLOW-002, TECH-001, SCAN-002, USERS-001, RBAC-001.
- Acceptance criteria: lucrarile pot fi urmarite pana la `READY_FOR_DELIVERY`; billing nu blocheaza operational; pricing nu este expus in logistica.
- Backend: `LogisticsModule` cu endpointuri REST, RBAC, validari de stare, optimistic locking si audit.
- Frontend: centru operational responsive, summary cards, quick filters, drawer de lucrare, pregatiri pentru livrare.
- Securitate: RBAC server-side, CSRF pentru mutatii, token QR opac, fara date financiare detaliate.
- Audit: audit pentru location/block/unblock/packing/group actions si `LogisticsEvent` append-only.
- Testare: Prisma validate/generate/migrate, seed base/demo idempotent, typecheck, test, build si smoke manual API/UI.

### QC-001 - Quality control

- Status: NOT STARTED.
- Obiectiv: approve/reject/rework.
- Scope: checklist QC, reject reason, rework stage.
- Non-goals: delivery, payments.
- Dependente: TECH-001.
- Acceptance criteria: reject cere motiv si toate tranzitiile sunt validate.
- Backend: QualityModule cu state transitions tranzactionale.
- Frontend: QC review UI responsive.
- Securitate: RBAC server-side pentru QC.
- Audit: audit approve/reject/rework.
- Testare: state transitions, API permissions si UI approve/reject.

### DELIVERY-001 - Courier planning and delivery execution

- Status: COMPLETED.
- Obiectiv: livrari operationale pornite din grupuri READY, planificate si executate de curier.
- Scope: Delivery/DeliveryEvent, atribuire curier, pickup, tranzit, finalizare, nereusita, replanificare, anulare, UI `/deliveries`, integrare scan si seed demo.
- Non-goals: semnatura, dovada foto, GPS, harti, optimizare ruta, tracking public, plata la livrare.
- Dependente: LOGISTICS-001, SCAN-002, RBAC-001.
- Acceptance criteria: curierul vede doar livrari proprii si nu vede financiar; logistica/managerul planifica; statusurile lucrarilor se sincronizeaza la pickup/delivered.
- Backend: DeliveryModule cu DTO validation, RBAC, tranzactii si audit.
- Frontend: courier/mobile-first UI cu filtre si actiuni.
- Securitate: `OWN_DELIVERY` server-side, CSRF pe mutatii, fara pricing in raspunsuri courier.
- Audit: DeliveryEvent append-only plus AuditLog.
- Testare: suite automata completa si smoke manual API/UI.

### SIGNATURES-001 - Delivery signatures and proof capture

- Status: COMPLETED.
- Obiectiv: dovada interna de predare prin semnatura capturata in browser sau manager override explicit.
- Scope: `DeliveryProof` dedicat, stroke JSON normalizat, hash SHA-256, finalizare livrare cu semnatura obligatorie, override manager auditat, proof read/print si seed demo.
- Non-goals: fotografie, FILES-001, upload generic, verificare identitate avansata, GPS, biometrie/pressure, semnatura electronica avansata/calificata, eIDAS, fiscalizare.
- Dependente: DELIVERY-001.
- Acceptance criteria: dovada este privata, unica per livrare, legata de livrare, imuabila dupa finalizare si vizibila doar autorizat.
- Backend: `DeliveryProofModule`, `GET /deliveries/:id/proof`, `GET /deliveries/:id/proof/print-view`, `POST /deliveries/:id/complete` cu semnatura sau override.
- Frontend: `SignaturePad`, `SignatureDisplay`, modal confirmare predare, modal override manager, pagina `/deliveries/:id/proof/print`.
- Securitate: RBAC server-side, `OWN_DELIVERY`, payload strict, fara base64 PNG/raw SVG/HTML/date biometrice/date financiare in proof.
- Audit: `delivery.signature_captured`, `delivery.completed_without_signature`, `delivery.proof_viewed`, `delivery.proof_printed`.
- Testare: validator semnatura, component tests, permission registry, typecheck, test, build si smoke API/UI.

### NOTIFICATIONS-001 - Operational notifications

- Status: NOT STARTED.
- Obiectiv: notificari operationale pentru evenimente importante.
- Scope: notificari in-app si/sau email localizate pentru statusuri relevante.
- Non-goals: realtime complex, SMS, push mobile nativ, marketing.
- Dependente: SHELL-001, WORKFLOW-002, DELIVERY-001.
- Acceptance criteria: utilizatorii primesc doar notificari permise si utile.
- Backend: model notificari, service emitere, preferinte minime daca sunt definite.
- Frontend: centru notificari in shell si stari unread/read.
- Securitate: filtrare per utilizator/rol, fara date financiare nepermise.
- Audit: audit pentru notificari critice trimise sau esuate.
- Testare: unit service, API permissions, UI unread/read.

### REPORTS-001 - Operational and financial reports

- Status: NOT STARTED.
- Obiectiv: KPI operationali si financiari MVP.
- Scope: endpoints agregare, filtre, pagini raport.
- Non-goals: dashboard decorativ, BI avansat, export contabil complet.
- Dependente: WORKS-001, TECH-001, PAYMENTS-001.
- Acceptance criteria: rapoartele sunt rapide si permissioned.
- Backend: ReportsModule cu query-uri justificate si mascare date.
- Frontend: pagini raport responsive cu filtre clare.
- Securitate: RBAC server-side si `pricing.read` pentru date financiare.
- Audit: fara audit pentru citire standard; audit export daca va exista.
- Testare: integration pentru agregari si permission tests.

### AUDIT-UI-001 - Audit viewer UI

- Status: NOT STARTED.
- Obiectiv: vizualizare audit autorizata.
- Scope: filters, resource view, actor view.
- Non-goals: modificare audit writes existente, export avansat.
- Dependente: RBAC-001.
- Acceptance criteria: managerul vede auditul, alte roluri doar cu permisiune.
- Backend: AuditModule read endpoints cu filtre si paginare.
- Frontend: audit viewer UI cu cautare si stari goale.
- Securitate: RBAC server-side, fara expunere date sensibile peste metadata existenta.
- Audit: fara audit nou pentru citire standard.
- Testare: API permission si UI filter states.

## Completed Tasks

### FOUNDATION-001 - Initialize monorepo

- Completed: 2026-07-22.
- Commit message: `FOUNDATION-001: initialize monorepo`.
- Automated verification:
  - `pnpm install` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Manual verification:
  - Frontend dev server responded with `200 OK` at `http://localhost:5173/`.
  - Backend dev server responded at `GET /health` with `{"applicationName":"Dental Lab Management","status":"ok"}`.

### FOUNDATION-002 - Docker Compose development

- Status: COMPLETED.
- Started: 2026-07-22 15:59:53 CEST.
- Completed: 2026-07-22 16:09:09 CEST.
- Commit message: `FOUNDATION-002: add Docker Compose development database`.
- Summary:
  - Added Docker Compose PostgreSQL service for local development.
  - Added `.env.example` with deterministic local database configuration.
  - Added backend environment validation with Zod.
  - Added a NestJS database module with PostgreSQL connectivity health check.
  - Extended `GET /health` to include database connectivity status.
- Main files modified:
  - `.env.example`
  - `docker-compose.yml`
  - `README.md`
  - `apps/api/package.json`
  - `apps/api/src/config/environment.ts`
  - `apps/api/src/modules/database/*`
  - `apps/api/src/modules/health/*`
  - `pnpm-lock.yaml`
- Dependencies added:
  - `pg`: direct PostgreSQL connectivity for the FOUNDATION-002 health check.
  - `zod`: runtime environment validation.
  - `dotenv`: local `.env` loading for development.
  - `@types/pg`: strong TypeScript types for `pg`.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Manual verification:
  - `docker compose up -d postgres` started PostgreSQL.
  - `docker compose ps` reported PostgreSQL as healthy.
  - `GET http://localhost:3000/health` returned `{"applicationName":"Dental Lab Management","database":"ok","status":"ok"}`.
  - Frontend dev server responded with `200 OK` at `http://localhost:5173/`.
  - `docker compose down` stopped and removed the local development container and network.
- Technical debt introduced:
  - None.
- Remaining risks:
  - The chosen host port `55439` may still conflict on another machine; developers can override `POSTGRES_PORT` and `DATABASE_URL` in their local `.env`.

### UI-001 - Design tokens and base styles

- Status: COMPLETED.
- Started: 2026-07-22 16:45:12 CEST.
- Completed: 2026-07-22 16:52:35 CEST.
- Commit message: `UI-001: add design tokens and base styles`.
- Summary:
  - Expanded CSS design tokens for colors, semantic states, operational statuses, typography, spacing, layout, radii, borders, shadows, breakpoints, motion, and z-index.
  - Added base styles for document, typography, links, native controls, tables, media, focus-visible, disabled, placeholder, invalid, selection, and reduced motion.
  - Added minimal layout utilities: page, container, section, stack, grid, and visually hidden.
  - Replaced the foundation home screen with an internal style preview at `/` and `/style-preview`.
  - Added automated tests for token availability and style preview rendering.
- Main files modified:
  - `packages/ui/src/styles.css`
  - `packages/ui/src/styles.test.ts`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/style-preview/*`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm lint` is not configured as a project script; the command resolves to an external environment executable and fails with a JDK 17 requirement.
- Manual verification:
  - Frontend dev server responded with `200 OK` at `/` and `/style-preview`.
  - Chrome headless CDP check passed at 360px, 768px, and 1280px widths.
  - No page console errors were reported by CDP.
  - No horizontal overflow at tested widths.
  - Keyboard Tab focus reached the native action button.
  - Touch target minimum for the primary native button resolved to `44px`.
  - Browser zoom simulation at 150% did not introduce horizontal overflow.
  - `prefers-reduced-motion: reduce` was emulated during responsive checks.
  - Native invalid input used semantic danger styling.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured in project scripts and should be addressed in a future tooling task.

### UI-002 - Core UI components

- Status: COMPLETED.
- Started: 2026-07-22 17:17:42 CEST.
- Completed: 2026-07-22 17:34:26 CEST.
- Commit message: `UI-002: add core UI components`.
- Summary:
  - Added reusable UI components for primitives, form controls, selection controls, cards, badges, overlays, toast, tooltip, feedback states, disclosure/navigation, composition, file upload, and data table.
  - Exported stable public component APIs from `@dental-lab/ui`.
  - Extended `/style-preview` to demonstrate all UI-002 components.
  - Added component tests for render, native props, className, ref forwarding, labels, invalid/error states, keyboard interactions, overlays, toast timers, file selection, table states, sorting, and pagination.
- Main files modified:
  - `packages/ui/src/components/*`
  - `packages/ui/src/utils/*`
  - `packages/ui/src/index.ts`
  - `packages/ui/src/styles.css`
  - `packages/ui/src/components/components.test.tsx`
  - `apps/web/src/features/style-preview/*`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Public exports:
  - Button, IconButton
  - TextInput, Textarea, NumberInput, DateInput, Select
  - Checkbox, RadioGroup, Switch
  - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
  - StatusBadge, PriorityBadge
  - Modal, Drawer
  - ToastProvider, useToast
  - Tooltip
  - LoadingState, EmptyState, ErrorState
  - Accordion, Tabs
  - SearchInput, FilterBar
  - Timeline, Stepper
  - FileUpload
  - DataTable
- Explicitly not implemented:
  - QRScanner.
  - SignaturePad.
  - Reason: both require browser/device capability integration and belong in their functional tasks.
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - Project lint script is still not configured; `package.json` has no `lint` script.
- Manual verification:
  - Frontend dev server responded with `200 OK` at `/` and `/style-preview`.
  - Chrome headless CDP check passed at 360px, 768px, and 1280px widths.
  - Browser console reported no page runtime errors through CDP.
  - No uncontrolled horizontal overflow at tested widths.
  - Focus-visible styling was present on a focused button.
  - Minimum primary button touch target resolved to `44px`.
  - Browser zoom simulation at 150% did not introduce horizontal overflow.
  - `prefers-reduced-motion: reduce` was emulated during responsive checks.
  - Modal/Drawer Escape and focus return behavior are covered by automated component tests.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured in project scripts and should be addressed in a future tooling task.

### UX-HARDENING-001 - Romanian UX, modal, sidebar, toast, QR and export hardening

- Status: COMPLETED.
- Started: 2026-07-25T20:54:23Z.
- Completed: 2026-07-25T21:15:48Z.
- Commit message: `UX-HARDENING-001: harden Romanian UX and exports`.
- Summary:
  - Hardened toast lifecycle with finite default durations, `createdAt`, max visible toasts, manual close, cleanup timers, `clearToasts()`, and auth-scoped clearing on logout, expired session, anonymous login state, and identity change.
  - Hardened shared Modal/Drawer behavior with size variants, scrollable body, stable footer, focus return, Escape handling, body lock, `100dvh`, and safe-area responsive layout.
  - Stabilized authenticated shell/sidebar scrolling and localized navigation, route states, login, dashboard, works, scan, QR, clinics, work types, users, settings, billing and work form builder wording with Romanian diacritics.
  - Restricted laboratory settings country/locale/timezone/currency to Romania defaults: `RO`, `ro-RO`, `Europe/Bucharest`, and `RON`.
  - Hardened QR scan UI with an explicit stopped-camera placeholder, localized camera states, QR modal retry action, and no raw QR token display in the label.
  - Hardened billing CSV exports with UTF-8 BOM, CRLF, semicolon delimiter, quoting, formula neutralization, Romanian dates, localized headers/statuses/payment methods, and explicit currency fields.
- Main files modified:
  - `packages/ui/src/components/toast.tsx`
  - `packages/ui/src/components/overlay.tsx`
  - `packages/ui/src/components/data-table.tsx`
  - `packages/ui/src/components/composition.tsx`
  - `packages/ui/src/styles.css`
  - `apps/web/src/app/*`
  - `apps/web/src/features/auth/*`
  - `apps/web/src/features/billing/*`
  - `apps/web/src/features/clinics/*`
  - `apps/web/src/features/settings/*`
  - `apps/web/src/features/users/*`
  - `apps/web/src/features/work-forms/*`
  - `apps/web/src/features/work-types/*`
  - `apps/web/src/features/works/*`
  - `apps/api/src/modules/billing/*`
  - `apps/api/src/modules/settings/*`
  - `packages/shared/src/settings.ts`
- Tests executed:
  - `pnpm typecheck` - passed.
  - `pnpm test` - passed.
  - `pnpm build` - passed.
- Manual verification:
  - API smoke on `http://127.0.0.1:3011/health` returned `200 OK`.
  - Frontend route smoke on `http://127.0.0.1:5181/scan` and `/works` returned `200 OK` HTML.
  - Authenticated login with the demo manager succeeded and `/settings` returned `countryCode: RO`, `currency: RON`, `locale: ro-RO`, and `timezone: Europe/Bucharest`.
  - Billing registry CSV export returned `200 OK`, `Content-Type: text/csv; charset=utf-8`, filename `registru-lunar-facturare.csv`, UTF-8 BOM, semicolon delimiters, CRLF rows, Romanian headers, and localized status labels.
- Dependencies added:
  - None.
- Architecture decisions:
  - Keep overlay behavior in `@dental-lab/ui` instead of adding a dependency.
  - Keep toast state in the UI provider and clear it from auth lifecycle hooks.
  - Keep Romanian locale/currency/timezone/country as constrained settings values until multi-country requirements are explicitly approved.
  - Keep CSV export plain and deterministic for Romanian spreadsheet workflows.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Physical phone QR scan and physical/real print verification remain accepted pending checks from QR-001.
  - Some internal test fixture strings and shared enum constants intentionally remain raw because they are contracts, not user-facing labels.

### AUTH-001 - Auth backend

- Status: COMPLETED.
- Started: 2026-07-22 18:34:44 CEST.
- Completed: 2026-07-22 18:49:47 CEST.
- Commit message: `AUTH-001: add secure backend authentication`.
- Summary:
  - Added backend-only authentication module with login, me, logout, and CSRF endpoints.
  - Added Prisma 7 configuration, schema, deterministic migration, and development seed.
  - Added minimal `User`, `Session`, and `AuditLog` persistence.
  - Replaced direct `pg` health connectivity with Prisma-based database health.
  - Added Argon2id password hashing, server-side sessions, httpOnly auth cookie, CSRF cookie/header validation, in-memory login rate limiting, and audit events.
- Dependencies verified:
  - FOUNDATION-001 monorepo baseline exists.
  - FOUNDATION-002 Docker Compose PostgreSQL setup exists.
  - UI tasks are completed and unrelated to this backend-only task.
- Pre-flight audit:
  - Current branch: `main`.
  - Working tree: clean before AUTH-001 changes.
  - AUTH-001 definition and dependencies were read from the attached task file and existing project documentation.
- Main files modified:
  - `.env.example`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `apps/api/prisma.config.ts`
  - `apps/api/prisma/*`
  - `apps/api/src/config/environment.ts`
  - `apps/api/src/main.ts`
  - `apps/api/src/modules/auth/*`
  - `apps/api/src/modules/database/*`
  - `apps/api/package.json`
  - `pnpm-lock.yaml`
- Prisma models introduced:
  - `User`
  - `Session`
  - `AuditLog`
- Migration created:
  - `apps/api/prisma/migrations/20260722183500_auth_backend/migration.sql`
- Dependencies added:
  - `@prisma/client`, `prisma`, `@prisma/adapter-pg`: Prisma ORM, migrations, PostgreSQL adapter for Prisma 7.
  - `@node-rs/argon2`: native Argon2id password hashing without fragile local source builds on the current platform.
  - `cookie-parser`: cookie parsing for NestJS/Express requests.
  - `helmet`: security headers.
  - `class-validator`, `class-transformer`: NestJS DTO validation.
  - `dotenv-cli`: load monorepo root `.env` for Prisma CLI commands.
  - `supertest`, `@types/supertest`: API-level auth tests.
  - `@types/cookie-parser`, `@types/express`: request/cookie typing.
  - `tsx`: TypeScript runner for Prisma seed with NodeNext imports.
- Dependencies removed:
  - `pg`, `@types/pg`: replaced by Prisma Client plus Prisma PostgreSQL adapter.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and reported the database in sync.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- Unit and API tests:
  - Password hashing and verification.
  - Explicit Argon2id parameters.
  - Session creation, token hashing, active session resolution, inactive user rejection.
  - CSRF token creation and validation.
  - Login rate limit behavior.
  - Auth controller API behavior for CSRF, login cookie, `/auth/me`, invalid CSRF logout, and valid logout.
- Manual verification:
  - `docker compose up -d postgres` started PostgreSQL.
  - `docker compose ps` reported PostgreSQL as healthy.
  - `GET /health` returned `{"applicationName":"Dental Lab Management","database":"ok","status":"ok"}`.
  - `GET /auth/csrf` set `dl_csrf` and returned a CSRF token.
  - Valid login returned `200` and set `dl_session` with `HttpOnly` and `SameSite=Lax`.
  - `GET /auth/me` returned the current seeded user.
  - Logout with invalid CSRF returned `403`.
  - Logout with valid CSRF returned `204` and cleared the session cookie.
  - After logout, `/auth/me` returned `401`.
  - Repeated invalid login attempts returned `429`.
  - Existing session for a deactivated user returned `401`.
  - Login for a deactivated user returned generic `401`.
- Audit events implemented:
  - `auth.csrf_issued`
  - `auth.login_succeeded`
  - `auth.login_failed`
  - `auth.logout_succeeded`
- Architecture decisions:
  - Prisma is the backend database access layer from AUTH-001 onward.
  - Session tokens are random browser tokens; only token hashes are stored.
  - CSRF is implemented with a double-submit cookie for the current cookie-auth endpoints.
  - Login rate limiting remains in-memory for MVP local development.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured in project scripts.
  - The in-memory login rate limiter is not suitable for multi-instance deployment.
  - CSRF protection must be applied to future cookie-backed state-changing endpoints as they are introduced.

## Manual Testing Checklist

### FOUNDATION-001

- [x] Install dependencies with `pnpm install`.
- [x] Run type checks with `pnpm typecheck`.
- [x] Run automated tests with `pnpm test`.
- [x] Run production builds with `pnpm build`.
- [x] Start the frontend dev server with `pnpm --filter @dental-lab/web dev`.
- [x] Start the backend dev server with `pnpm --filter @dental-lab/api start:dev`.

### FOUNDATION-002

- [x] Create local `.env` from `.env.example`.
- [x] Start PostgreSQL with `docker compose up -d postgres`.
- [x] Confirm PostgreSQL health with `docker compose ps`.
- [x] Start the backend dev server with `pnpm --filter @dental-lab/api start:dev`.
- [x] Confirm `GET /health` returns `database: "ok"`.
- [x] Start the frontend dev server with `pnpm --filter @dental-lab/web dev`.
- [x] Confirm the frontend responds with `200 OK`.

### UI-001

- [x] Verify current styling mechanism.
- [x] Define semantic design tokens.
- [x] Define base styles.
- [x] Add internal style preview.
- [x] Verify 360px viewport.
- [x] Verify 768px viewport.
- [x] Verify 1280px viewport.
- [x] Verify keyboard focus.
- [x] Verify browser zoom at 150%.
- [x] Verify reduced motion emulation.
- [x] Verify no horizontal overflow.
- [x] Verify text remains legible.
- [x] Verify native disabled/focus/invalid states.

### UI-002

- [x] Audit existing `packages/ui` files and exports.
- [x] Verify React test infrastructure.
- [x] Implement Group A primitives.
- [x] Implement Group B feedback and overlay components.
- [x] Implement Group C composition and navigation components.
- [x] Implement Group D FileUpload and DataTable MVP versions.
- [x] Export public components from `@dental-lab/ui`.
- [x] Extend `/style-preview`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Confirm no project `lint` script exists.
- [x] Verify `/` responds HTTP 200.
- [x] Verify `/style-preview` responds HTTP 200.
- [x] Verify 360px viewport.
- [x] Verify 768px viewport.
- [x] Verify 1280px viewport.
- [x] Verify keyboard/focus behavior.
- [x] Verify zoom at 150%.
- [x] Verify reduced motion emulation.
- [x] Verify browser console through CDP.

### AUTH-001

- [x] Confirm branch is `main`.
- [x] Confirm working tree is clean before implementation.
- [x] Read AUTH-001 definition and dependencies.
- [x] Verify FOUNDATION-001 result.
- [x] Verify FOUNDATION-002 result.
- [x] Update status to IN PROGRESS with start timestamp.
- [x] Implement Prisma schema and migration.
- [x] Implement development seed.
- [x] Implement auth endpoints.
- [x] Implement server-side sessions.
- [x] Implement Argon2id password verification.
- [x] Implement CSRF protection for logout.
- [x] Implement in-memory login rate limiting.
- [x] Implement auth audit events.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Run Prisma validate/generate/migrate/seed.
- [x] Start PostgreSQL with Docker Compose.
- [x] Start backend API.
- [x] Verify `GET /health`.
- [x] Verify `GET /auth/csrf`.
- [x] Verify valid login sets cookie.
- [x] Verify `/auth/me`.
- [x] Verify invalid CSRF blocks logout.
- [x] Verify valid logout revokes session.
- [x] Verify `/auth/me` returns 401 after logout.
- [x] Verify invalid login response is generic.
- [x] Verify inactive user cannot keep using a session.
- [x] Verify inactive user cannot log in.
- [x] Verify rate limit returns 429.

### RBAC-001 - Permission model

- Status: COMPLETED.
- Started: 2026-07-22 20:37:30 CEST.
- Completed: 2026-07-22 20:52:30 CEST.
- Commit message: `RBAC-001: add granular permission model`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before implementation.
  - The attached incremental compilation error was stale; `pnpm --filter @dental-lab/api typecheck` passed before RBAC changes.
  - `User` had only identity/auth fields before RBAC.
  - `AuthGuard` attaches a minimal authenticated identity to `request.auth`.
  - `CurrentUser` returns identity only, not a Prisma object.
  - Existing sessions check `user.isActive` on every protected request.
  - Seed created only the development manager before RBAC.
  - No `role ===`, `isAdmin`, JWT/localStorage, or existing RBAC shortcuts were found.
  - No permission cache existed; RBAC keeps DB evaluation per request.
  - Lint remains unconfigured.
- Summary:
  - Added RBAC Prisma models, enums, indexes, foreign keys, and migrations.
  - Added typed MVP permission registry and seeded role-permission matrix.
  - Added `AuthorizationService`, `PermissionsGuard`, `@RequirePermission`, and internal `RbacManagementService`.
  - Added authenticated permission snapshot endpoint and read-only RBAC endpoints.
  - Updated seed to create all permissions, roles, role grants, and assign `MANAGER` to the development user.
- Prisma models added:
  - `Role`
  - `Permission`
  - `UserRole`
  - `RolePermission`
  - `UserPermissionOverride`
- Migrations created:
  - `apps/api/prisma/migrations/20260722204000_rbac_permission_model/migration.sql`
  - `apps/api/prisma/migrations/20260722204800_align_rbac_override_index/migration.sql`
- Roles seeded:
  - `MANAGER`
  - `LOGISTICA`
  - `RECEPTIE`
  - `TEHNICIAN`
  - `CURIER`
  - `MEDIC`
- Permissions seeded:
  - 62 MVP permissions from the permission matrix.
- Scope model:
  - `ALL`
  - `ASSIGNED`
  - `OWN_CLINIC`
  - `OWN_DELIVERY`
  - `OWN_STAGE`
- Evaluation order:
  - User must exist and be active.
  - Active role grants are aggregated.
  - `ALLOW` overrides add scopes.
  - `DENY` overrides remove scopes and have priority.
  - `ALL` satisfies any required scope.
  - Distinct ownership scopes do not satisfy each other.
  - Missing permissions are denied by default.
- Endpoints added:
  - `GET /auth/permissions`
  - `GET /rbac/roles`
  - `GET /rbac/permissions`
- Audit events supported by internal RBAC infrastructure:
  - `rbac.role_assigned`
  - `rbac.role_removed`
  - `rbac.permission_override_created`
  - `rbac.permission_override_updated`
  - `rbac.permission_override_removed`
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- Unit and API tests:
  - Permission registry uniqueness and completeness.
  - Representative matrix grants and override-only exclusions.
  - Scope comparison rules.
  - AuthorizationService allow/deny behavior.
  - `DENY` override priority.
  - `ALLOW` override grants.
  - Inactive user and inactive role denial.
  - PermissionsGuard 401/403 delegation behavior.
  - Decorator metadata.
  - Auth permissions endpoint.
  - RBAC read endpoint guard integration.
  - RBAC management audit hooks.
- Manual verification:
  - `docker compose up -d postgres` confirmed PostgreSQL running.
  - API started on `http://localhost:3001` because port `3000` was already occupied by an older local node process.
  - `GET /health` returned `{"applicationName":"Dental Lab Management","database":"ok","status":"ok"}`.
  - Manager login returned `200`; cookies did not contain role or permission data.
  - `GET /auth/me` returned `200`.
  - Manager `GET /auth/permissions` returned 62 permissions and `users.create` with `ALL`.
  - Manager `GET /rbac/roles` returned `200` and 6 roles.
  - Manager `GET /rbac/permissions` returned `200` and 62 permissions.
  - User without role received `403` for `/rbac/roles`.
  - User without role had 0 effective permissions.
  - Assigning `TEHNICIAN` directly in DB gave `workflow.complete_stage` with `OWN_STAGE` without relogin.
  - Removing that role removed permissions without relogin.
  - `ALLOW roles.read ALL` override allowed `/rbac/roles` without relogin.
  - `DENY roles.read ALL` override blocked `/rbac/roles` without relogin.
  - Deactivating `MANAGER` role blocked manager access without relogin.
  - Deactivating the user blocked `/auth/permissions` with `401`.
  - Logout returned `204`; `/auth/me` returned `401` after logout.
- Dependencies added:
  - None.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Ownership checks for non-`ALL` scopes must be implemented inside future business modules when those resources exist.
  - Full role and permission editors remain deferred to future tasks.

### USERS-001 - User management

- Status: COMPLETED.
- Started: 2026-07-22 21:09:31 CEST.
- Completed: 2026-07-22 21:23:31 CEST.
- Commit message: `USERS-001: add internal user management`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before USERS-001 changes.
  - USERS-001 definition and dependencies were read from the attached task file and existing project documentation.
  - AUTH-001, RBAC-001, UI-001, and UI-002 were completed before this task.
  - Existing RBAC code had no `role ===`, `isAdmin`, JWT/localStorage, or permission cache shortcuts.
- Summary:
  - Added internal user management backend module.
  - Added `mustChangePassword` to `User`.
  - Added user list, details, create, update, enable, disable, replace roles, and reset password endpoints.
  - Added session revocation/counting helpers for user management flows.
  - Added `/users` frontend page with filters, table, role selector, create modal, detail drawer, edit form, role assignment, enable/disable, reset password, loading/error/empty states, and permission-aware actions.
  - Added tests for service behavior, session invalidation helpers, auth response shape, and the user management UI.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260722211000_user_management_fields/migration.sql`
  - `apps/api/prisma/seed.ts`
  - `apps/api/src/modules/users/*`
  - `apps/api/src/modules/auth/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/web/src/features/users/*`
  - `apps/web/src/app/app.tsx`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Endpoints added:
  - `GET /users`
  - `GET /users/:id`
  - `POST /users`
  - `PATCH /users/:id`
  - `POST /users/:id/disable`
  - `POST /users/:id/enable`
  - `PUT /users/:id/roles`
  - `POST /users/:id/reset-password`
- Security and authorization:
  - All USERS endpoints require cookie authentication.
  - All USERS endpoints enforce server-side RBAC through `@RequirePermission`.
  - State-changing USERS endpoints require CSRF validation.
  - Responses omit `passwordHash`, raw session tokens, and temporary passwords.
  - The last active administrator protection uses effective permissions, not role keys.
- Audit events implemented:
  - `users.created`
  - `users.updated`
  - `users.disabled`
  - `users.enabled`
  - `users.roles_updated`
  - `users.password_reset`
  - `users.sessions_revoked`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and reported the database in sync.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- Unit and UI tests:
  - User list response does not expose password hashes.
  - Duplicate email update throws conflict.
  - Last active administrator cannot be disabled.
  - Password reset hashes the password, revokes sessions, audits safely, and does not leak temporary password.
  - Session service revokes all sessions for a user.
  - Session service counts active non-expired sessions.
  - Auth responses include `mustChangePassword`.
  - `/users` UI renders list/filter/role data.
  - `/users` UI hides create action without `users.create`.
- Manual verification:
  - PostgreSQL was running through Docker Compose.
  - API started on `http://localhost:3010` because lower local ports were already occupied.
  - Frontend started on `http://127.0.0.1:5175`.
  - `GET /auth/csrf` returned `200`.
  - Manager login returned `200`.
  - `GET /users` returned `200`.
  - `GET /rbac/roles` returned `200`.
  - `POST /users` returned `201` with CSRF and did not leak password material.
  - `GET /users/:id` returned `200` and did not leak password material.
  - `PUT /users/:id/roles` returned `200` with CSRF.
  - `POST /users/:id/reset-password` returned `201` with CSRF and did not leak password material.
  - `POST /users/:id/disable` returned `201` with CSRF.
  - `POST /users/:id/enable` returned `201` with CSRF.
  - `POST /users/:id/disable` without CSRF returned `403`.
  - Audit table contained `users.created`, `users.disabled`, `users.enabled`, `users.password_reset`, and `users.roles_updated`.
  - `GET /users` frontend route returned `200`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Last administrator protection is enforced in service logic using current effective permissions. A future security hardening task can add stronger transaction-level locking if concurrent admin changes become a practical risk.

### SETTINGS-001 - Laboratory settings

- Status: COMPLETED.
- Started: 2026-07-22 21:34:23 CEST.
- Completed: 2026-07-22 21:45:42 CEST.
- Commit message: `SETTINGS-001: add laboratory settings`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before SETTINGS-001 changes.
  - SETTINGS-001 definition and dependencies were read from the attached task file and existing project documentation.
  - AUTH-001, RBAC-001, USERS-001, UI-001, and UI-002 were completed before this task.
  - Existing hardcoded app/lab naming was found in health, HTML title, auth UI, docs, and shared constants.
  - No Prisma settings model existed.
  - No private storage/upload foundation existed.
  - `FileUpload` exists only as a local UI selection component.
  - No `role ===`, `isAdmin`, tenant model, or generic settings key-value model was introduced.
  - Lint remains unconfigured.
- Summary:
  - Added singleton `LaboratorySettings` Prisma model and deterministic migration.
  - Added idempotent seed defaults for the single laboratory instance.
  - Added `SettingsModule` with `GET /settings` and `PATCH /settings`.
  - Added strict DTO validation and explicit response view.
  - Added `settings.updated` audit event.
  - Added shared settings contracts and formatting helpers for frontend use.
  - Added `/settings` frontend page with read-only mode, editable form, validation, reset, save loading, and toast feedback.
- Singleton strategy:
  - `LaboratorySettings.key` is unique.
  - The only supported key is `default`.
  - `GET` and `PATCH` use controlled upsert/update and do not expose create-many behavior.
- Default values:
  - `laboratoryName`: `Dental Lab Management`
  - `countryCode`: `RO`
  - `timezone`: `Europe/Bucharest`
  - `locale`: `ro-RO`
  - `currency`: `RON`
  - `primaryColor`: `#0f766e`
  - `documentFooter`: `Multumim pentru colaborare.`
- Fields:
  - Identity: `laboratoryName`, `legalName`, `companyRegistrationNumber`, `taxId`
  - Contact: `email`, `phone`, `website`
  - Address: `addressLine1`, `addressLine2`, `city`, `countyOrRegion`, `postalCode`, `countryCode`
  - Localization: `timezone`, `locale`, `currency`
  - Branding: `logoFileKey`, `primaryColor`, `documentFooter`
  - Metadata: `createdAt`, `updatedAt`, `updatedByUserId`
- Endpoints added:
  - `GET /settings`
  - `PATCH /settings`
- Permissions:
  - `settings.read` for `GET /settings`
  - `settings.update` for `PATCH /settings`
- Validation:
  - Required trimmed laboratory name.
  - Normalized lowercase email.
  - Permissive controlled phone pattern.
  - `http`/`https` website URLs only.
  - ISO alpha-2 uppercase country code.
  - Supported locales: `ro-RO`, `en-US`, `fr-FR`.
  - Supported currencies: `RON`, `EUR`.
  - Supported timezones: `Europe/Bucharest`, `Europe/Paris`, `UTC`.
  - Hex-only `primaryColor`.
- Branding:
  - Implemented `primaryColor` and `documentFooter`.
  - Logo upload is deferred until `FILES-001`; `logoFileKey` is nullable and no file content is stored in PostgreSQL.
- Frontend:
  - Route: `/settings`
  - Sections: profile, contact, address, localization, branding.
  - Read-only users can view but cannot edit or save.
  - `settings.update` users can edit and save.
  - Uses React Query cache invalidation after update.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260722213500_laboratory_settings/migration.sql`
  - `apps/api/prisma/seed.ts`
  - `apps/api/src/modules/settings/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/web/src/features/settings/*`
  - `apps/web/src/app/app.tsx`
  - `packages/shared/src/settings.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and applied `20260722213500_laboratory_settings`.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- Backend tests:
  - Settings singleton default upsert.
  - Partial update preserves omitted fields.
  - Empty update rejected.
  - Audit metadata written with actor id.
  - DTO rejects invalid country, currency, locale, timezone, and website.
  - DTO normalizes country, email, primary color, and website.
  - Controller returns 401 without auth.
  - Controller returns 403 without `settings.read`.
  - Controller allows `settings.read`.
  - Controller rejects mutation without CSRF.
  - Controller allows `settings.update` with CSRF.
- Frontend tests:
  - `/settings` renders existing values.
  - Read-only mode disables save without `settings.update`.
  - Missing `settings.read` renders access error.
  - Shared helpers validate supported settings and format representative date/currency values.
- Manual verification:
  - `GET /health` returned `200`.
  - Manager login returned `200`.
  - `GET /settings` returned `200`.
  - `PATCH /settings` without CSRF returned `403`.
  - `PATCH /settings` with CSRF returned `200`.
  - Re-reading settings returned the updated values.
  - User with `settings.read` override could read settings.
  - User with only `settings.read` could not update settings.
  - User without `settings.read` received `403`.
  - `settings.updated` audit row exists.
  - `laboratory_settings` row count remained `1`.
  - `GET /users` still returned `200`.
  - Frontend `/settings` returned `200`.
  - Frontend `/users` still returned `200`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Logo upload is intentionally deferred until private file storage exists.
  - Health and HTML title still use static application naming; there is no authenticated app shell yet where laboratory settings can be globally displayed without broader routing work.

### CLINICS-001 - Clinics and doctors

- Status: COMPLETED.
- Started: 2026-07-22 22:06:41 CEST.
- Completed: 2026-07-22 22:27:00 CEST.
- Commit message: `CLINICS-001: add clinics and doctors management`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before CLINICS-001 changes.
  - CLINICS-001 definition, dependencies, and approved option 2 were read from the attached task files and existing project documentation.
  - FOUNDATION-001, FOUNDATION-002, UI-001, UI-002, AUTH-001, RBAC-001, USERS-001, and SETTINGS-001 were completed before this task.
  - Existing RBAC registry did not include clinic or doctor permissions.
  - Existing Prisma schema did not include `Clinic` or `Doctor`.
  - Existing frontend routing did not include `/clinics`.
  - No doctor portal, doctor auth, app user linkage, or future work order behavior was introduced.
- Summary:
  - Added `Clinic` and `Doctor` Prisma models with deterministic migration.
  - Added generated internal clinic codes backed by a PostgreSQL sequence.
  - Added RBAC permissions for clinic and doctor read/create/update/archive.
  - Granted `RECEPTIE` only `clinics.read` and `doctors.read`; `MANAGER` receives all registry permissions through the existing matrix.
  - Added `ClinicsModule` with REST endpoints for clinic list/detail/options/create/update/archive/restore.
  - Added doctor REST endpoints for list/detail/options/create/update/archive/restore.
  - Added audit events for clinic and doctor create/update/archive/restore.
  - Added shared frontend contracts for clinic and doctor summaries, details, inputs, options, list params, and paginated responses.
  - Added `/clinics` frontend page with filters, paginated clinic table, detail/edit drawer, doctor section, create/edit modals, archive/restore actions, and functional clinic-doctor selector.
- Endpoints added:
  - `GET /clinics`
  - `GET /clinics/options`
  - `GET /clinics/:id`
  - `POST /clinics`
  - `PATCH /clinics/:id`
  - `POST /clinics/:id/archive`
  - `POST /clinics/:id/restore`
  - `GET /doctors`
  - `GET /doctors/options`
  - `GET /doctors/:id`
  - `POST /doctors`
  - `PATCH /doctors/:id`
  - `POST /doctors/:id/archive`
  - `POST /doctors/:id/restore`
- Permissions:
  - `clinics.read`
  - `clinics.create`
  - `clinics.update`
  - `clinics.archive`
  - `doctors.read`
  - `doctors.create`
  - `doctors.update`
  - `doctors.archive`
- Architecture decisions:
  - `Doctor` represents an external dentist linked to one clinic, not an internal `User`.
  - `displayName` is server-derived from first and last name.
  - Clinic codes are generated server-side as `CL-0001`, `CL-0002`, etc.
  - Archived clinics and doctors are excluded from option endpoints.
  - Creating or restoring a doctor requires an active clinic.
  - Archived clinics and doctors are read-only until restored.
  - Archiving a clinic does not hard-delete or auto-archive doctors.
  - The frontend uses shared UI components only; the selector remains in the application style.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260722221500_clinic_management/migration.sql`
  - `apps/api/src/modules/rbac/permission-registry.ts`
  - `apps/api/src/modules/clinics/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/web/src/features/clinics/*`
  - `apps/web/src/app/app.tsx`
  - `packages/shared/src/clinics.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` applied `20260722221500_clinic_management`; the interactive follow-up prompt was cancelled without creating a new migration.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
- Backend tests:
  - RBAC registry includes clinic and doctor permissions.
  - Reception receives only read permissions for clinics and doctors.
  - Clinic creation generates a code and writes audit metadata.
  - Doctor creation is rejected for archived clinics.
- Frontend tests:
  - `/clinics` renders clinic management for a user with read permissions.
  - The clinic-doctor selector resets selected doctor when clinic changes.
  - Missing `clinics.read` renders an access error.
- Manual verification:
  - API started on `http://localhost:3010`.
  - Frontend started on `http://localhost:5175` because ports 5173 and 5174 were occupied.
  - Runtime route map included all `/clinics` and `/doctors` endpoints.
  - `GET /health` returned `200`.
  - `GET /auth/csrf` returned `200`.
  - Manager login returned `200`.
  - `POST /clinics` with CSRF returned a generated clinic code.
  - `POST /doctors` with CSRF returned `Dr. Ana Popescu`.
  - `GET /clinics/options` included the active clinic.
  - `GET /doctors/options?clinicId=...` included the active doctor.
  - After doctor archive, doctor options excluded that doctor.
  - After clinic archive, clinic options excluded that clinic.
  - Frontend `/clinics` returned `200 text/html`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - `@dental-lab/api` start script still points at `dist/main.js`, while the current Nest build emits `dist/src/main.js`; this was pre-existing and manual verification used the generated entrypoint directly.

### WORKTYPES-001 - Work types and pricing base

- Status: COMPLETED.
- Started: 2026-07-22 22:40:21 CEST.
- Completed: 2026-07-22 22:55:00 CEST.
- Commit message: `WORKTYPES-001: add work types and base pricing`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before WORKTYPES-001 changes.
  - Last commit: `c382bbc CLINICS-001: add clinics and doctors management`.
  - WORKTYPES-001 definition and dependencies were read from the attached task file and existing documentation.
  - Existing schema had no premature work type, price catalog, work order, clinic pricing, or category models.
  - RBAC already had `pricing.read`, `pricing.create`, and `pricing.update`.
  - Matrix grants pricing permissions only to `MANAGER`.
  - Plan does not explicitly require categories, duration, materials, default stages, clinic-specific prices, or price history.
  - Existing linting remains unconfigured as a project script.
  - `clinics-page.tsx`, `clinics.service.ts`, and `doctors.service.ts` were not modified.
  - API `start` script pointed at `dist/main.js`, while build output is `dist/src/main.js`.
- Start script fix:
  - Updated `@dental-lab/api` `start` script to `node dist/src/main.js`.
  - Verified `pnpm --filter @dental-lab/api build` followed by `PORT=3010 pnpm --filter @dental-lab/api start` launches Nest successfully.
- Summary:
  - Added `WorkType` Prisma model and deterministic migrations.
  - Added generated stable work type codes using `work_type_code_seq`.
  - Added `WorkTypesModule` with list, options, detail, create, update, archive, and restore endpoints.
  - Stored base pricing as `basePriceMinor` integer minor units.
  - Kept currency global through `LaboratorySettings.currency`; no currency is stored per work type.
  - Added minimal `WorkTypeUnit` enum with `UNIT`.
  - Added audit events for create, update, price update, archive, and restore.
  - Added shared work type contracts and money helpers.
  - Added `/work-types` frontend route with catalog, filters, sorting, pagination, active-only selector, create/edit drawer, archive/restore, read-only mode, and toast feedback.
  - Added a migration to align prior `updated_at` defaults with Prisma `@updatedAt`.
- Models:
  - `WorkType`: `id`, `code`, `name`, `description`, `basePriceMinor`, `unit`, `isActive`, `archivedAt`, actor IDs, timestamps, `version`.
  - `WorkTypeUnit`: `UNIT`.
- Categories:
  - Not implemented. The plan does not explicitly require categories for WORKTYPES-001.
- Price catalog strategy:
  - Implemented as the current base price on `WorkType`.
  - No separate `PriceHistory`, price book, valid-from period, clinic-specific price, discount, VAT, quote, or invoice model was added.
- Code strategy:
  - Server-generated sequential code, formatted `WT-0001`.
  - No `count + 1`.
  - Code is immutable after creation.
- Money strategy:
  - `basePriceMinor` integer only.
  - API accepts `basePriceMinor`, not float.
  - Shared helpers convert decimal strings deterministically.
- Endpoints added:
  - `GET /work-types`
  - `GET /work-types/options`
  - `GET /work-types/:id`
  - `POST /work-types`
  - `PATCH /work-types/:id`
  - `POST /work-types/:id/archive`
  - `POST /work-types/:id/restore`
- Permissions:
  - `pricing.read`: list/detail/options.
  - `pricing.create`: create.
  - `pricing.update`: update/archive/restore.
- Search/filter/sort/page:
  - Search: `code`, `name`, `description`.
  - Filter: `isActive`.
  - Sort allowlist: `code`, `name`, `basePriceMinor`, `createdAt`, `updatedAt`.
  - Pagination: `page`, `pageSize`.
- Archive/restore:
  - Soft archive only.
  - Archived work types are excluded from `/work-types/options`.
  - Archived work types are read-only until restored.
- Audit:
  - `work_types.created`
  - `work_types.updated`
  - `work_types.price_updated`
  - `work_types.archived`
  - `work_types.restored`
- Main files modified:
  - `apps/api/package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260722224500_work_types_base_pricing/migration.sql`
  - `apps/api/prisma/migrations/20260722224600_align_updated_at_defaults/migration.sql`
  - `apps/api/src/modules/work-types/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/api/src/modules/rbac/permission-registry.test.ts`
  - `apps/web/src/features/work-types/*`
  - `apps/web/src/app/app.tsx`
  - `packages/shared/src/work-types.ts`
  - `packages/shared/src/work-types.test.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev` passed and applied `20260722224500_work_types_base_pricing` plus `20260722224600_align_updated_at_defaults`.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed with a Vite chunk-size warning only.
  - `PORT=3010 pnpm --filter @dental-lab/api start` launched the built API successfully.
- Backend tests:
  - Generated code create flow.
  - No float `basePrice` payload.
  - Price update audit with old/new minor values.
  - Options active-only.
  - Archived work type edit rejection.
  - DTO rejects negative and non-integer minor prices.
  - Controller 401 without auth.
  - Controller 403 without `pricing.read`.
  - Controller rejects create without CSRF.
  - Controller allows `pricing.create` with CSRF.
- RBAC tests:
  - Pricing permissions remain unique in registry.
  - `MANAGER` has `pricing.read`.
  - `LOGISTICA` and `RECEPTIE` do not have `pricing.read`.
- Frontend tests:
  - `/work-types` renders manager catalog and active options.
  - Read-only copy appears without `pricing.update`.
  - Missing `pricing.read` renders access error.
- Shared tests:
  - `minorToDecimalString`.
  - `decimalStringToMinor`.
  - invalid, negative, and over-precise money input rejection.
- Manual verification:
  - API started through the fixed `start` script on `http://localhost:3010`.
  - Runtime route map included all `/work-types` endpoints.
  - Frontend started on `http://localhost:5175` because lower Vite ports were occupied.
  - `GET /health` returned `200`.
  - `GET /auth/csrf` returned `200`.
  - Manager login returned `200`.
  - `POST /work-types` without CSRF returned `403`.
  - `POST /work-types` with CSRF returned `201` and generated `WT-0001`.
  - `GET /work-types` included the created item.
  - `GET /work-types/:id` returned matching detail.
  - `PATCH /work-types/:id` updated name and `basePriceMinor`.
  - `GET /work-types/options` included active work type before archive.
  - `POST /work-types/:id/archive` returned `201`.
  - `GET /work-types/options` excluded archived work type.
  - Archived filter included archived work type.
  - `POST /work-types/:id/restore` returned `201`.
  - `GET /users`, `GET /settings`, and `GET /clinics` returned `200`.
  - Audit table contained `work_types.created`, `work_types.price_updated`, `work_types.archived`, and `work_types.restored`.
  - Frontend `/work-types` returned `200 text/html`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Vite production build now warns that one JS chunk is slightly over 500 kB; build still passes. Code splitting can be handled in a future frontend performance task.

### WORKS-001 - Work order creation

- Status: COMPLETED.
- Started: 2026-07-22 23:04:42 CEST.
- Completed: 2026-07-22 23:26:46 CEST.
- Commit message: `WORKS-001: add work order creation`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before WORKS-001 changes.
  - Last completed commit: `34eb24b WORKTYPES-001: add work types and base pricing`.
  - WORKS-001 definition and dependencies were read from the attached task file and existing documentation.
  - Dependencies `CLINICS-001`, `WORKTYPES-001`, and `UI-002` were present.
  - RBAC already had `works.create`, `works.read_all`, `works.read_assigned`, `works.update`, `works.assign`, `works.change_status`, and `works.archive`.
  - Existing schema had no premature `WorkOrder`, work, case, QR, barcode, or patient model.
- Summary:
  - Added `WorkOrder` Prisma model, `WorkStatus`, `WorkPriority`, deterministic migration, foreign keys, justified lookup/sort indexes, and optimistic `version`.
  - Added `WorksModule` with list, detail, active work type options for reception, create, and update endpoints.
  - Added server-side validation for active clinic, active doctor belonging to selected clinic, active work type, delivery date, quantity, and immutable price snapshot fields.
  - Added generated work order codes through PostgreSQL sequence `work_order_code_seq`, formatted `WO-YYYY-NNNNNN`.
  - Added audit events for work order create and update without patient names or clinical notes in metadata.
  - Added shared work order contracts.
  - Added `/works` frontend route with mobile-first register, filters, create modal, detail/edit drawer, styled selectors, badges, toasts, and price masking.
  - Updated settings query hook to support permission-gated fetching.
- Models:
  - `WorkOrder`: `id`, `code`, `clinicId`, `doctorId`, `workTypeId`, patient fields, `quantity`, pricing snapshot, `priority`, `status`, delivery date, notes, actor IDs, timestamps, `version`.
  - `WorkStatus`: `REGISTERED`.
  - `WorkPriority`: `NORMAL`, `URGENT`.
- Endpoints added:
  - `GET /works`
  - `GET /works/work-type-options`
  - `GET /works/:id`
  - `POST /works`
  - `PATCH /works/:id`
- Permissions:
  - `works.read_all`: list/detail.
  - `works.create`: create and price-free form work type options.
  - `works.update`: update intake fields.
  - `pricing.read`: optional price visibility in list/detail.
- Non-goals:
  - No workflow execution.
  - No QR/barcode generation or scan.
  - No files or private storage.
  - No assignments.
  - No patient model.
  - No archive endpoint for work orders.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260722230500_work_order_creation/migration.sql`
  - `apps/api/src/modules/works/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/web/src/features/works/*`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/settings/settings-api.ts`
  - `packages/shared/src/works.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name work_order_creation` passed and applied `20260722230500_work_order_creation`.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed with the existing Vite chunk-size warning only.
- Backend tests:
  - Work order create snapshots price, generates code, sets `REGISTERED`, and writes audit.
  - Doctor from another clinic is rejected.
  - Archived work type is rejected on create.
  - Pricing is masked for readers without `pricing.read`.
  - Quantity update keeps the original base unit price snapshot.
  - DTO rejects missing/invalid intake fields.
  - Controller 401 without auth.
  - Controller 403 without `works.read_all`.
  - Controller checks optional `pricing.read` for list responses.
  - Controller rejects create without CSRF.
  - Controller allows `works.create` with CSRF.
- Frontend tests:
  - `/works` renders the reception register without pricing access.
  - Reception flow uses `/works/work-type-options` instead of `/work-types/options`.
  - Create form resets doctor selection when clinic changes.
  - Missing `works.read_all` renders access error.
- Manual verification:
  - API started on `http://localhost:3010` because lower local ports were occupied.
  - Runtime route map included `WorksController` routes.
  - Frontend started on `http://127.0.0.1:5180` with `VITE_API_BASE_URL=http://localhost:3010`.
  - `GET /works` required auth and responded after manager login.
  - `GET /works/work-type-options` returned active work type selector data without prices.
  - `POST /works` with CSRF created `WO-2026-000001`.
  - Created work status was `REGISTERED`.
  - `GET /works?search=SMK-001` returned the created `REGISTERED` work.
  - Frontend `/works` returned `200 text/html`.
  - UI form behavior was verified through RTL at form level; Playwright is not installed in the project.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Vite production build still warns that one JS chunk is slightly over 500 kB; build passes.
  - A `pg` deprecation warning appeared during API shutdown after smoke testing; no request failed.

### QR-001 - QR generation and scan

- Status: COMPLETED.
- Started: 2026-07-23 08:27:42 CEST.
- Completed: 2026-07-23 08:44:12 CEST.
- Commit message: `QR-001: add QR generation and scan`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before QR-001 changes.
  - Last completed commit: `5de4d03 WORKS-001: add work order creation`.
  - QR-001 definition and dependencies were read from the attached task file and existing documentation.
  - Dependency `WORKS-001` was present and committed.
  - Existing work order endpoints, RBAC guards, audit conventions, shared contracts, frontend works route, Vite routing, and test strategy were reviewed.
- Summary:
  - Added `qrToken` and `qrCreatedAt` fields to `WorkOrder` with a unique token index and QR creation timestamp index.
  - Added QR migration `20260723083000_work_order_qr`.
  - Added `QrModule` with QR metadata, PNG image generation, authorized QR resolve, print audit, in-memory resolve rate limiting, and token generation.
  - Added QR token generation to work order creation inside the existing create transaction.
  - Added shared QR contracts and payload helpers.
  - Added `/scan` lazy-loaded frontend route with native `BarcodeDetector` camera scanning, explicit camera start, stream cleanup, duplicate detection lock, and manual fallback.
  - Added QR label modal to the work detail drawer, including minimal printable label and print audit trigger.
  - Added work detail deep-open support through `/works?workId=...` for scan results.
- Endpoints added:
  - `GET /works/:id/qr`
  - `GET /works/:id/qr-image`
  - `POST /works/resolve-qr`
  - `POST /works/:id/qr/print`
- Permissions:
  - `works.read_all`: QR metadata, image, resolve, and print.
  - `pricing.read`: optional price visibility on resolved work details.
- Security:
  - QR payload format is `dl-work:<opaque-token>`.
  - QR payload does not include work code, patient data, pricing, clinic details, notes, or internal database IDs.
  - Resolve and print endpoints require cookie auth, RBAC, and CSRF for state-changing requests.
  - QR image response is marked `Cache-Control: private, no-store`.
  - Resolve attempts are rate-limited per authenticated user and IP in memory.
  - QR audit metadata records safe work code and source only, not raw token payload.
- Audit events:
  - `works.qr_viewed`
  - `works.qr_resolved`
  - `works.qr_printed`
- Non-goals:
  - No workflow execution or stage changes.
  - No QR-triggered assignment.
  - No quality control.
  - No delivery or signature capture.
  - No files or attachments.
  - No notifications.
  - No public, anonymous, or portal QR access.
  - No barcode implementation.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260723083000_work_order_qr/migration.sql`
  - `apps/api/src/modules/qr/*`
  - `apps/api/src/modules/works/works.service.ts`
  - `apps/api/src/modules/works/works.module.ts`
  - `apps/api/src/modules/app.module.ts`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/works/*`
  - `packages/shared/src/works.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - `qrcode`: backend-only PNG QR generation; no frontend bundle impact.
  - `@types/qrcode`: TypeScript types for `qrcode`.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name work_order_qr` passed and applied `20260723083000_work_order_qr`.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed with the existing Vite chunk-size warning only.
- Backend tests:
  - QR payload and patient display helpers keep QR opaque.
  - QR lookup accepts `dl-work:<token>` and work-code manual fallback.
  - Malformed payloads return uniform not-found behavior.
  - Resolve rate limiting rejects excessive attempts.
  - QR service resolves through backend lookup, masks pricing without `pricing.read`, and audits without token leakage.
  - QR token generation creates URL-safe high-entropy tokens and retries collisions.
  - QR controller covers unauthenticated, unauthorized, metadata, PNG image, CSRF rejection, resolve, and print routes.
  - Works service tests verify create now stores generated `qrToken`.
- Frontend tests:
  - Camera scanner does not request camera access before explicit user start.
  - Camera scanner stops media tracks after detection.
  - Camera scanner shows fallback guidance when `BarcodeDetector` is unavailable.
  - `/scan` resolves a manual work code through CSRF-protected backend call.
  - `/scan` denies access without `works.read_all`.
  - `/works` opens QR details from the work drawer and does not render the raw QR token text.
- Manual verification:
  - API started on `http://localhost:3010`.
  - Frontend started on `http://127.0.0.1:5180`.
  - `GET http://localhost:3010/health` returned `200` with database `ok`.
  - `GET http://127.0.0.1:5180/works` returned `200 text/html`.
  - `GET http://127.0.0.1:5180/scan` returned `200 text/html`.
  - Manager login with CSRF returned `200`.
  - `GET /works?page=1&pageSize=1&sortBy=createdAt&sortDirection=desc` returned existing work `WO-2026-000001`.
  - `GET /works/:id/qr` returned `200`; payload started with `dl-work:` and did not include the work code.
  - `GET /works/:id/qr-image` returned `200 image/png` with valid PNG header.
  - `POST /works/resolve-qr` with CSRF resolved the QR payload to `WO-2026-000001`.
  - `POST /works/:id/qr/print` with CSRF returned `200` and recorded print intent.
  - Physical mobile camera scan and real printer preview were not verified in this environment; camera behavior is covered by browser-unit tests with mocked media streams.
- Remaining acceptance checks:
  - Physical phone scan: pending.
  - Physical/real print verification: pending.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Vite production build still warns that the main JS chunk is over 500 kB; `/scan` itself is emitted as a separate lazy chunk.
  - In-memory QR resolve rate limiting is process-local and should move to shared storage before multi-instance deployment.

### SHELL-001 - Authenticated application shell and navigation

- Status: COMPLETED.
- Started: 2026-07-23 09:35:00 CEST.
- Completed: 2026-07-23 09:45:37 CEST.
- Commit message: `SHELL-001: add authenticated app shell and navigation`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before SHELL-001 changes.
  - Last completed task commit before SHELL-001: `cb7f86b PLAN-001: update task roadmap`.
  - SHELL-001 definition and dependencies were read from the attached task file and existing documentation.
  - Dependencies `AUTH-001`, `RBAC-001`, `UI-002`, and `QR-001` were present and committed.
  - Existing routes `/works`, `/scan`, `/clinics`, `/work-types`, `/users`, and `/settings` were reviewed.
- Summary:
  - Added an authenticated React app shell with desktop sidebar, mobile topbar, drawer navigation, skip link, breadcrumbs, user summary, logout flow, branded fallback state, and route error boundary.
  - Added route registry helpers for labels, permission checks, navigation filtering, default authorized route selection, and safe `returnTo` validation.
  - Added route guards for authenticated-only routes, public-only login, permission-gated pages, 403, 404, and loading/error states.
  - Added a lightweight dashboard landing route as a shell home, without operational dashboard metrics.
  - Polished `/login` into the public entry page with empty credentials, safe return redirect, active-session redirect, failed-login password clear, and expired-session messaging.
  - Centralized frontend API behavior through `apps/web/src/lib/api-client.ts`.
  - Updated existing frontend feature API clients to use the central client for cookie credentials, API base URL, response parsing, and expired-session handling.
- Non-goals:
  - No backend endpoints added.
  - No new permissions or RBAC rules.
  - No operational dashboard implementation.
  - No redesign or business logic changes in existing feature pages.
  - No notifications center.
  - No FILES-001 or FORMS-001 work.
- Main files modified:
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/authenticated-app-shell.tsx`
  - `apps/web/src/app/app-shell.css`
  - `apps/web/src/app/auth-state.ts`
  - `apps/web/src/app/route-registry.tsx`
  - `apps/web/src/app/route-guards.tsx`
  - `apps/web/src/app/dashboard-page.tsx`
  - `apps/web/src/app/error-pages.tsx`
  - `apps/web/src/lib/api-client.ts`
  - `apps/web/src/features/auth/auth-api.ts`
  - `apps/web/src/features/auth/login-page.tsx`
  - `apps/web/src/features/*/*-api.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Frontend tests:
  - Route registry filters navigation by permissions.
  - `works.read_all` and `works.read_assigned` are treated as any-of route access for works and scan.
  - Unsafe external `returnTo` values are rejected.
  - Authenticated shell renders permission-aware navigation and active route state.
  - Mobile navigation drawer opens and closes with Escape.
  - Missing permission routes redirect to 403 without logging out.
  - Login form renders for anonymous sessions.
  - Failed login clears password while preserving email.
  - Active sessions are redirected away from login.
- Manual verification:
  - API started on `http://localhost:3010`.
  - Frontend started on `http://localhost:5175` because lower Vite ports were occupied.
  - `GET http://localhost:3010/health` returned `200`.
  - `GET http://localhost:5175/login` returned `200 text/html`.
  - `GET http://localhost:5175/dashboard` returned `200 text/html`.
  - `GET http://localhost:5175/works` returned `200 text/html`.
  - Anonymous `GET /auth/me` returned `401`.
  - `GET /auth/csrf` returned a CSRF token.
  - Manager login with CSRF returned `200`.
  - Authenticated `GET /auth/me` returned `200`.
  - Authenticated `GET /auth/permissions` returned `200` with 70 permission snapshots.
  - `POST /auth/logout` with CSRF returned `204`.
  - `GET /auth/me` after logout returned `401`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Runtime route smoke depends on a seeded local manager account and local PostgreSQL being available.

### FORMS-001 - Form patterns and validation UX

- Status: COMPLETED.
- Started: 2026-07-23 22:25:00 CEST.
- Completed: 2026-07-23 22:41:39 CEST.
- Commit message: `FORMS-001: standardize form patterns and validation UX`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before FORMS-001 changes.
  - Last completed task commit before FORMS-001: `ece038d SHELL-001: add authenticated app shell and navigation`.
  - FORMS-001 definition was read from the attached task file, `MVP-IMPLEMENTATION-PLAN.md`, and `IMPLEMENTATION_STATUS.md`.
  - Scope resolved as Scope A: existing form patterns and validation UX. Dynamic work form templates were separated into `WORKFORMS-001`.
  - Existing forms audited: login, user create/edit/reset/roles/disable, settings, clinic create/edit, doctor create/edit/archive/restore, work type create/edit/archive/restore, work create/edit, and manual QR scan.
  - Existing frontend validation audited: React Hook Form, Zod, and `@hookform/resolvers` were already installed and reused.
  - Existing backend DTO validation audited across auth, users, settings, clinics/doctors, work types, works, and QR scan flows.
  - CSRF flow remains centralized through existing auth helpers and API clients.
  - Linting remains unconfigured.
- Summary:
  - Added reusable form pattern primitives in `@dental-lab/ui`: form layout, sections, responsive grids, error summary, actions, and confirmation modal.
  - Added frontend form utilities for API error normalization, field-error mapping, error-summary items, focus management, dirty route blocking, refresh prompts, and close guards.
  - Extended the API client error type so frontend forms can consume field errors, error codes, and normalized fallback messages without showing raw objects.
  - Migrated form UX patterns across login, users, settings, clinics/doctors, work types, works, and manual QR scan.
  - Reorganized the Work form into operational sections: clinic and doctor, patient, work, deadline and priority, and notes.
  - Standardized modal confirmation UX for archive/restore/disable flows through reusable UI instead of native confirms.
  - Disabled or hid false save actions where forms are read-only or unchanged, where appropriate.
  - Updated plan/status documentation to track `WORKFORMS-001` separately before `WORKFORMS-002`.
- Non-goals:
  - No Prisma schema or migration changes.
  - No backend endpoints or permissions added.
  - No dynamic work form template builder.
  - No work form submission/snapshot storage.
  - No files, workflow, QC, logistics, delivery, dashboard metrics, autosave, or localStorage draft storage.
- Main files modified:
  - `packages/ui/src/components/form-patterns.tsx`
  - `packages/ui/src/components/field.tsx`
  - `packages/ui/src/styles.css`
  - `packages/ui/src/index.ts`
  - `packages/ui/src/components/components.test.tsx`
  - `apps/web/src/lib/api-client.ts`
  - `apps/web/src/lib/form-utils.tsx`
  - `apps/web/src/features/auth/login-page.tsx`
  - `apps/web/src/features/users/users-page.tsx`
  - `apps/web/src/features/settings/settings-page.tsx`
  - `apps/web/src/features/settings/settings-page.test.tsx`
  - `apps/web/src/features/clinics/clinics-page.tsx`
  - `apps/web/src/features/work-types/work-type-form.tsx`
  - `apps/web/src/features/work-types/work-types-page.tsx`
  - `apps/web/src/features/works/work-form.tsx`
  - `apps/web/src/features/works/works-page.tsx`
  - `apps/web/src/features/works/manual-scan-form.tsx`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed with no Vite chunk-size warning.
- Frontend tests:
  - UI component tests cover field labels, descriptions, required state, errors, select/textarea/card/table/modal/toast primitives, form sections, error summaries, actions, and confirmation modal behavior.
  - Feature tests cover login error semantics, users list/forms, settings read-only behavior, clinics doctor reset dependency, work types, works pricing visibility and clinic-doctor reset, scan manual fallback, route shell behavior, and camera scanner behavior.
- Manual verification:
  - API started on `http://localhost:3010`.
  - Frontend started on `http://127.0.0.1:5181`.
  - `GET http://127.0.0.1:5181/login` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/dashboard` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/works` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/clinics` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/work-types` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/users` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/settings` returned `200 text/html`.
  - `GET http://127.0.0.1:5181/scan` returned `200 text/html`.
  - `GET http://localhost:3010/health` returned `200` with database `ok`.
  - `GET http://localhost:3010/auth/csrf` returned `200`.
  - Manager login with CSRF returned `200`.
  - Authenticated `GET http://localhost:3010/auth/me` returned `200`.
  - Authenticated `GET http://localhost:3010/auth/permissions` returned `200`.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Linting remains unconfigured.
  - Physical responsive checks at 360px, 390px, 768px, 1024px, 1280px, zoom 150/200%, screen reader behavior, and real mobile keyboard behavior were not fully verified in this terminal-only environment.
  - `UnsavedChangesPrompt` uses React Router blocking only when data-router context exists, with `beforeunload` and close guards as fallback paths.

### BILLING-001 - Billing workspace, proformas, invoices and month-end registry

- Status: COMPLETED.
- Started: 2026-07-23 23:15:08 CEST.
- Completed: 2026-07-23 23:34:04 CEST.
- Commit message: `BILLING-001: add billing workspace and month-end registry`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before BILLING-001 changes.
  - Last completed task commit before BILLING-001: `5751125 FORMS-001: standardize form patterns and validation UX`.
  - BILLING-001 definition was read from the attached task file and existing documentation.
  - `MVP-IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION_STATUS.md`, `README.md`, Prisma schema, migrations, seed, WorkOrder, WorkType, Clinic, Doctor, LaboratorySettings, permission registry, AuditService, money helpers, shell and route registry were reviewed.
  - Existing permissions confirmed: `finance.read`, `finance.record_payment`, `finance.refund`, `finance.read_reports`, `invoice.create`, `invoice.read`, `invoice.download`, `invoice.cancel`, `invoice.configure_series`.
  - No premature invoice/payment models existed.
  - Currency source confirmed as singleton LaboratorySettings with `RON` fallback.
  - WorkOrder already had patient name, clinic, doctor, quantity, price snapshot, currency, createdAt, requested delivery date and work code; `invoicedDocumentId` was added for active invoice relation.
  - Linting remains unconfigured.
- Reprioritization:
  - `WORKFORMS-001` and `WORKFORMS-002` remain NOT STARTED, but are no longer next.
  - Next recommended task is `BILLING-002 - Printable billing documents and clinic statements`.
- Summary:
  - Added billing Prisma models for documents, lines, payments and numbering series.
  - Added deterministic migration `20260723231500_billing_documents_and_payments`.
  - Added idempotent development seed for `PF-2026` and `FACT-2026` series.
  - Added `BillingModule` with overview, billable works, document list/detail, proforma/invoice creation, draft update, line replacement, issue, convert proforma, cancel document, payment record/cancel, search and series endpoints.
  - Added transactional numbering by incrementing `BillingSeries.currentNumber` during issue/convert; no `count + 1`.
  - Added active invoice relation on WorkOrder and `/works` billing status display.
  - Added shared billing contracts in `packages/shared`.
  - Added lazy `/billing` frontend route, navigation item, month filters, overview cards, billable work selection, documents, payments, month close grouping, series view, CSV export and print preview.
  - Added audit events with safe metadata excluding patient names.
- Non-goals:
  - No RO e-Factura or SPV.
  - No legal/fiscal final PDF.
  - No accounting engine, TVA engine, credit notes, bank reconciliation, email/SMS, multi-currency conversion, workflow or dynamic forms.
  - No hard deletes for financial documents/payments.
- Prisma models:
  - `BillingDocument`
  - `BillingDocumentLine`
  - `Payment`
  - `BillingSeries`
  - `WorkOrder.invoicedDocumentId`
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260723231500_billing_documents_and_payments/migration.sql`
  - `apps/api/prisma/seed.ts`
  - `apps/api/src/modules/billing/*`
  - `apps/api/src/modules/app.module.ts`
  - `apps/api/src/modules/works/works.view.ts`
  - `apps/api/src/modules/works/works.controller.test.ts`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/route-registry.tsx`
  - `apps/web/src/features/billing/*`
  - `apps/web/src/features/works/works-page.tsx`
  - `apps/web/src/features/works/works-page.test.tsx`
  - `packages/shared/src/billing.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name billing_documents_and_payments` passed and applied `20260723231500_billing_documents_and_payments`.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed with no Vite chunk-size warning.
- Backend tests:
  - Billing amount helper derives unpaid, partially paid and paid states from active payments and ignores cancelled payments.
  - Existing controller/service suites remained green after WorkOrder billing relation.
- Frontend tests:
  - Route registry exposes Facturare for finance permissions.
  - Billing page renders month-end cards, billable works and document actions.
  - Works page tests cover the updated WorkOrder contract.
- Manual integration verification:
  - API built app started on `http://localhost:3010`.
  - Frontend started on `http://127.0.0.1:5181`.
  - Manager login with CSRF succeeded.
  - `GET /health` returned `ok`.
  - Created two clinics, two doctors, one work type and three work orders.
  - `GET /billing/overview` returned `200`.
  - `GET /billing/billable-works` returned `200` and found 3 smoke works.
  - Created proforma from two compatible works.
  - Issued proforma `PF-2026-000001`.
  - Converted proforma to invoice `FACT-2026-000001`.
  - Recorded a partial cash payment with receipt number; invoice status became `PARTIALLY_PAID`.
  - Recorded remaining bank transfer; invoice status became `PAID` and balance became `0`.
  - Attempted invoice creation with works from two clinics; API rejected with `400`.
  - `GET /billing-documents` found the invoice by number.
  - `GET /payments` returned the recorded payments.
  - `GET /billing-series` returned 2 seeded series.
  - `GET http://127.0.0.1:5181/billing` returned `200`.
  - `GET http://127.0.0.1:5181/works` returned `200`.
- Remaining manual checks not fully verified in this terminal environment:
  - Real browser responsive checks at 360px, 768px, 1280px, zoom 150%.
  - Browser console inspection.
  - Real print dialog output.
- Technical debt introduced:
  - Billing document detail UI is intentionally compact in BILLING-001; full printable layouts/statements are deferred to BILLING-002.
- Remaining risks:
  - Billing status filtering by derived payment status is done after page fetch for document list; large datasets may need DB-level paid/balance projections later.
  - `finance.refund` is currently used for payment cancellation because no separate payment cancellation permission exists.
  - Internal invoice preview is not a legal/fiscal final invoice and must not be treated as RO e-Factura compliant.
  - Linting remains unconfigured.

### BILLING-002 - Printable billing documents and clinic statements

- Status: COMPLETED.
- Started: 2026-07-23 23:54:04 CEST.
- Completed: 2026-07-24 00:06:00 CEST.
- Commit message: `BILLING-002: add printable billing documents and clinic statements`.
- Summary:
  - Added a deterministic non-destructive migration `20260723235400_billing_line_work_created_at_snapshot` for `BillingDocumentLine.workCreatedAtSnapshot`.
  - Added printable document and attachment endpoints for billing documents.
  - Added clinic statement, doctor statement, month registry and audited registry CSV endpoints.
  - Added CSV formula neutralization for billing exports.
  - Extended billing document filters/search for derived manual collection status, patient, receipt number, payment reference and amount range.
  - Added `/billing/documents/:id/print` frontend route with document/anexa views and print CSS.
  - Updated billing UI wording to “Evidenta incasari”, “Inregistreaza incasare”, “Suma incasata” and “Sold restant”.
  - Added manual collection form for amount, date, method, receipt number/date, bank reference and notes.
  - Linked invoiced works to the printable billing document route when `invoice.download` is available.
- Non-goals:
  - No RO e-Factura, SPV, legal fiscal receipt, POS integration, card processing, checkout, bank integration or automated reconciliation.
  - No private archived PDF storage; FILES-001 remains deferred.
- Main files modified:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260723235400_billing_line_work_created_at_snapshot/migration.sql`
  - `apps/api/src/modules/billing/*`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/features/billing/*`
  - `apps/web/src/features/works/works-page.tsx`
  - `packages/shared/src/billing.ts`
  - `packages/shared/src/index.ts`
  - `README.md`
  - `MVP-IMPLEMENTATION-PLAN.md`
  - `IMPLEMENTATION_STATUS.md`
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:migrate:dev --name billing_line_work_created_at_snapshot` passed and applied `20260723235400_billing_line_work_created_at_snapshot`.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm --filter @dental-lab/api test` passed.
  - `pnpm build` passed.
- Manual integration verification:
  - API started on `http://localhost:3010`.
  - Frontend started on `http://127.0.0.1:5173`.
  - `GET /health` returned `200`.
  - Manager login with CSRF succeeded.
  - `GET /billing-documents?page=1&pageSize=1` returned an existing invoice.
  - `GET /billing-documents/:id/print-view` returned `200` with document title, lines and compliance notice.
  - `GET /billing-documents/:id/attachment` returned `200` with attachment title, lines and total.
  - `GET /billing/month-registry` returned `200` with rows and reconciled paid/total values.
  - `GET /billing/exports/registry.csv` returned `200 text/csv` with safe CSV headers and values.
  - `GET /billing/statements/clinic` returned `200`.
  - `GET /billing/statements/doctor` returned `200`.
  - `GET http://127.0.0.1:5173/billing` returned `200`.
  - `GET http://127.0.0.1:5173/works` returned `200`.
  - `GET http://127.0.0.1:5173/billing/documents/:id/print` returned `200`.
- Acceptance checks from the payment clarification:
  - Partial/full payment status rules are covered by existing BILLING-001 runtime checks and preserved by tests.
  - Overpayment and zero/negative amounts are refused server-side by service checks and DTO validation.
  - Cancelled invoices reject new payments.
  - Cancelling a payment recalculates status/balance through existing payment status recomputation.
  - Monthly statement totals use active payments only.
- Remaining manual checks not fully verified in this terminal environment:
  - Physical printer output.
  - Browser print dialog/PDF visual inspection.
  - Physical phone/tablet responsive verification.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Derived payment filters are calculated in the service after fetching matching documents; large datasets may need persisted/payment aggregate projections later.
  - Linting remains unconfigured.
  - Backend shutdown still shows the existing `pg` deprecation warning, without request failures.

### DEMO-SEED-001 - Realistic demonstration dataset

- Status: COMPLETED.
- Started: 2026-07-24 23:23:46 EEST.
- Completed: 2026-07-24 23:30:27 EEST.
- Commit message: `DEMO-SEED-001: add realistic demonstration dataset`.
- Pre-flight audit:
  - Branch: `main`.
  - Working tree: clean before DEMO-SEED-001 changes.
  - Last commit: `d436349 BILLING-002: add printable billing documents and clinic statements`.
  - Read task attachment, `MVP-IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION_STATUS.md`, `README.md`, Prisma schema, base seed, package scripts and RBAC role definitions.
  - Reviewed User, Role, Clinic, Doctor, WorkType, WorkOrder, BillingDocument, BillingDocumentLine, Payment, BillingSeries and LaboratorySettings models.
  - Existing base seed is idempotent and remains limited to permissions, roles, development manager, settings and billing series.
  - Demo accounts did not exist before the new demo seed.
  - Existing local smoke data exists but is not deleted by demo reset.
  - Linting remains unconfigured.
- Seed architecture:
  - Base seed remains `apps/api/prisma/seed.ts`.
  - Demo seed entrypoint: `apps/api/prisma/seed-demo.ts`.
  - Demo reset entrypoint: `apps/api/prisma/reset-demo.ts`.
  - Demo modules live in `apps/api/prisma/demo/*`.
  - Dataset builder is deterministic and tested without database access.
- Base seed versus demo seed:
  - Base seed stays small and required for roles/permissions.
  - Demo seed creates users, settings, clinics, doctors, work types, works, billing documents and manual payments.
- Production guard:
  - `ALLOW_DEMO_SEED=true` is required.
  - `NODE_ENV=production` is refused.
  - Negative production guard check returned the expected error.
- Reset strategy:
  - Deletes only `@demo.local` users, `demo_` IDs and demo billing series `PFD`/`FACTD`.
  - Does not truncate tables.
  - Does not delete non-demo users or local smoke data.
  - Restores settings only when the current settings name is `Laborator Dentar Demo`.
- Laboratory settings:
  - `Laborator Dentar Demo`, `Dental Lab Demo SRL`, fictive fiscal data, Bucuresti, RO, `ro-RO`, `RON`, `Europe/Bucharest`.
- Demo users and roles:
  - `manager@demo.local` MANAGER.
  - `receptie@demo.local` RECEPTIE.
  - `logistica@demo.local` LOGISTICA.
  - `tehnician1@demo.local` TEHNICIAN.
  - `tehnician2@demo.local` TEHNICIAN.
  - `curier@demo.local` CURIER.
  - `medic@demo.local` MEDIC.
- Clinics and doctors:
  - 4 fictive clinics in Bucuresti, Brasov and Cluj-Napoca.
  - 9 fictive doctors distributed across clinics.
- Work types and works:
  - 12 work types, one archived.
  - 48 work orders over current month, previous month and two months ago.
  - Work codes use `WO-<year>-900001` and onward.
  - QR tokens are deterministic demo tokens, not auth/session tokens.
- Billing:
  - 4 proformas: 2 draft, 2 issued.
  - 8 invoices: unpaid, partial, paid, cancelled and converted-proforma scenarios.
  - 6 manual payment records with cash, bank transfer, card and other methods.
- Required financial scenarios:
  - Unpaid overdue invoice: `FACT-<year>-000001`.
  - Partial invoice: `FACT-<year>-000002`, total 1,000 RON, paid 400 RON, balance 600 RON.
  - Paid invoices: `FACT-<year>-000004`, `FACT-<year>-000005`, `FACT-<year>-000006`.
  - Converted proforma: `PF-<year>-000001` and `FACT-<year>-000008`.
  - Cancelled invoice: `FACT-<year>-000007`.
- Search fixtures:
  - `Maria Dumitrescu`, `Clinica Dentară Aurora`, `Dr. Ana Popescu`, `WO-<year>-900001`, `PF-<year>-000001`, `FACT-<year>-000001`, `CH-2026-001`, `OP-DEMO-001`.
- Documentation:
  - Added `DEMO.md`.
  - Added `DEMO-SCRIPT.md`.
  - Updated `README.md`.
  - Updated `MVP-IMPLEMENTATION-PLAN.md`.
- Dependencies added:
  - None.
- Automated verification:
  - `pnpm --filter @dental-lab/api prisma:validate` passed.
  - `pnpm --filter @dental-lab/api prisma:generate` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed` passed.
  - `pnpm --filter @dental-lab/api prisma:db:seed:demo` passed twice for idempotency, then passed again after reset.
  - `pnpm --filter @dental-lab/api prisma:db:reset-demo` passed.
  - `NODE_ENV=production ... tsx prisma/seed-demo.ts` refused as expected.
  - DB consistency smoke confirmed 7 demo users, 4 clinics, 9 doctors, 12 work types, 48 works, 12 billing documents and 6 payments.
  - Partial scenario confirmed total 100000, paid 40000, balance 60000.
  - `pnpm typecheck` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Manual verification:
  - API build started on `http://localhost:3010`.
  - Demo manager login succeeded with `mustChangePassword=false`.
  - `GET /health` returned `200`.
  - `GET /works?search=Maria%20Dumitrescu` returned demo works.
  - `GET /billing/overview` returned `200`.
  - `GET /billing-documents?search=CH-2026-001` returned `FACT-2026-000002` as `PARTIALLY_PAID` with 600 RON balance.
  - `GET /payments` returned demo receipt `CH-2026-001`.
- Manual checks not fully verified in this terminal environment:
  - Browser menu screenshots for each demo role.
  - QR visual scan.
  - Real browser print preview.
  - CSV download through browser UI.
- Technical debt introduced:
  - None.
- Remaining risks:
  - Demo document display numbers use the current seed year; docs use `<year>` placeholders except the 2026 local smoke values.
  - Local non-demo smoke data can still appear in broad financial totals until a clean DB or reset of non-demo smoke data is used.
  - Linting remains unconfigured.
  - Backend shutdown still shows the existing `pg` deprecation warning, without request failures.
