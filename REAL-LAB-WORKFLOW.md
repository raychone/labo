# Real Lab Workflow

Status: approved product realignment for future tasks.

This document is the source of truth introduced by `ROADMAP-REALIGN-002`. It realigns the existing MVP with the validated laboratory workflow. It is documentation-only and does not introduce schema, API, frontend, seed, or migration changes.

## Non-Goals For ROADMAP-REALIGN-002

- No Prisma model changes.
- No migrations.
- No backend endpoints.
- No frontend routes or components.
- No seed changes.
- No pricing, patient, offline, status, or company-context implementation.
- No change to the current demo runtime.

## Validated Operating Model

The application serves one shared operational dental laboratory with two legal and financial contexts:

- `NC` - Nicolaie Cristina.
- `NG` - Nicolaie Gabriel.

The laboratory team is shared:

- two managers;
- three technicians;
- one logistics user;
- one reception user;
- one courier;
- doctors;
- clinics/cabinets;
- patients;
- common work orders.

There is one application, one database, and one shared operational workflow. This is not multi-tenant SaaS, and users are not duplicated per company.

## Manager Visibility

Both managers can see and operate both `NC` and `NG`.

This is mandatory. The system must not assume that a manager is limited to only one company by default. Financial context affects company-specific records and documents, not the manager's identity.

## Global Company Context

The shell must provide a visible global context switch:

- `NC`
- `NG`

The selected context affects:

- company settings;
- legal data;
- document headers;
- document series;
- invoices;
- proformas;
- attachments;
- payments;
- pricing;
- commercial agreements;
- financial reports;
- company documents.

The context switch must not:

- log out the user;
- change the authenticated identity;
- hide shared operational workflow data;
- turn the application into separate tenants.

The selected context must be explicit and visible whenever it affects a screen, action, document, export, or report.

## Work Creation And Company Selection

Reception does not select `NC` or `NG` when registering a new work order.

A work order is registered operationally first. The legal/financial company is selected later by the technician at the first technical claim/pickup.

The selected firm belongs to the work order, not to an individual stage. After first selection, it must not be freely changed.

Allowed correction:

- manager-only;
- explicit reason required;
- audited;
- may be blocked by already-issued financial documents;
- detailed blocking rules are deferred to the implementation task.

## Technician Flow

The real technician flow is self-claim:

1. Work enters the laboratory.
2. The current stage becomes available.
3. A technician chooses a work.
4. If this is the first technical stage, the technician selects `NC` or `NG` with radio buttons.
5. The technician claims the stage.
6. The technician works.
7. The technician completes the stage.
8. The next stage becomes available.
9. The same or another technician may claim the next stage.

MVP must not add unnecessary handoff complexity:

- no mandatory manager assignment;
- no "renunta la etapa" flow;
- no transfer/handoff feature unless later validated;
- manager retains exceptional correction/release/audit rights.

## Stage Audit Requirements

Per-stage audit must show:

- work;
- work code;
- workflow;
- stage;
- technician;
- `NC` or `NG`;
- claimed at;
- started at;
- completed at;
- duration;
- corrections;
- correction actor.

## Operational Status Page

Future task `STATUS-001` introduces `/status`.

The page is visible to internal users with permission masking. It shows operational data for all active work, without exposing financials to users who cannot see financial data.

Required tabs:

- Astazi;
- In lucru;
- Disponibile;
- Intarziate;
- Plecate la medic;
- Revenite;
- Finalizate.

Required fields:

- all active work;
- today's work;
- workflow progress, for example `1/4` or `4/5`;
- current stage;
- current technician;
- `NC` or `NG`;
- deadline;
- time remaining;
- status;
- delays;
- returned-from-clinic state;
- current cycle.

Required filters:

- Toate / NC / NG;
- technician;
- stage;
- clinic;
- doctor;
- work type;
- due/deadline;
- priority;
- status;
- patient;
- work code.

All internal users may see operational status. Only managers may see financial data.

## Patient Model

`PATIENTS-001` introduces a real patient model.

The patient has no internal patient code. The operational identifier remains the work code.

Minimum patient fields:

- first name;
- last name.

Optional patient fields:

- sex;
- age or birth date;
- limited notes.

Relationships:

- one patient can have many work orders;
- each work order may have a different doctor and clinic;
- no permanent doctor is required.

Patient page tabs:

- Prezentare;
- Lucrari;
- Medici si clinici;
- Documente;
- Istoric.

Patient documents must support:

- open in new tab;
- print;
- download;
- filter by type, work, and date.

## Pricing And Agreements

Future task `PRICING-002` is manager-only.

Reception, technicians, logistics, and courier users must not receive pricing data from the API.

Pricing requirements:

- separate standard price lists for `NC` and `NG`;
- standard price;
- negotiated price per clinic or doctor;
- general, service, or category discount;
- valid period;
- history.

Resolution priority:

1. doctor-specific agreement;
2. clinic-specific agreement;
3. company standard price.

Allowed adjustment types:

- `FIXED_AMOUNT`;
- `PERCENTAGE`;
- `OVERRIDE_PRICE`.

Each work must keep a financial snapshot:

- firm;
- standard price;
- applied agreement;
- discount type;
- discount value;
- final unit price;
- quantity;
- total;
- deadline rule;
- execution time.

## Deadlines

`WORK-DEADLINES-001A` adds the reusable calculation layer for execution deadlines. It does not persist a work deadline and does not change the operational claim flow.

Managers configure execution time in the pricing page.

Example rules:

- 1-3 elements: 3 days;
- 4-7 elements: 4 days;
- 8-12 elements: 5 days;
- more than 12 elements: manual;
- special rules per service.

At first technical claim:

1. technician selects `NC` or `NG`;
2. the application resolves the price;
3. the application resolves the deadline rule;
4. the application saves the snapshot;
5. the application sets `executionStartedAt`;
6. the application sets `calculatedDueAt`;
7. the UI displays the deadline alert.

Implemented in `WORK-DEADLINES-001A`:

- Romanian business-day calendar for 2026-2030, using fixed and Orthodox mobile legal holidays without Monday shifting.
- Weekend exclusion with working weekdays `1-5` (`Monday-Friday`).
- Explicit `includeStartDay` convention.
- Default due time `17:00` in `Europe/Bucharest`, calculated by local calendar date so DST does not shift the intended local due hour.
- Controlled modes: `CALCULATED`, `MANUAL`, `UNRESOLVED`.
- Controlled unresolved reason `AMBIGUOUS_EXECUTION_RULES` when active matching rules are not uniquely resolved by priority.
- Optional manager-only deadline preview through `POST /pricing/resolve-preview` when `startAt` is provided.

Deferred to `WORK-DEADLINES-001B`:

- WorkOrder deadline persistence.
- First-claim deadline snapshot.
- Deadline alerts and work registry filters.
- Deadline correction audit.

Required deadline colors:

- green: in time;
- yellow: near due;
- orange: due today;
- red: overdue;
- grey: completed or delivered.

## Real Work Form

Future task `WORKFORM-REAL-001` adapts work forms to the real laboratory form.

Required form fields include:

- lab form number;
- doctor;
- patient;
- age;
- sex;
- work type;
- shade;
- FDI teeth;
- phases;
- phase deadlines;
- notes.

Digital phases come from the workflow, not from a hardcoded list of four steps.

The form must be printable in the current laboratory format, include the QR code, and keep an immutable snapshot.

The UI must use accordions, tabs, radio buttons, selectors, and reusable form controls.

## Work Cycles

Future task `WORK-CYCLES-001` models repeated clinic/laboratory cycles.

Works can be:

- sent to doctor;
- returned by doctor;
- resent;
- completed through multiple cycles.

Return types:

- Proba;
- Finisare;
- Ajustare;
- Reparatie;
- Refacere;
- Clarificare.

Previous workflow history must not be overwritten. Each return creates or continues a distinct cycle, and the status page shows the current cycle.

## Billing Realignment

Future task `BILLING-REALIGN-001` separates billing by selected company context.

Manager switches context globally. The billing workspace uses the active context for:

- finalized works;
- proformas;
- invoices;
- annexes;
- payments;
- overdue status.

Required filters:

- firm;
- clinic;
- doctor;
- patient;
- interval;
- work code;
- invoice number;
- proforma number;
- paid, unpaid, partial;
- delivered, undelivered;
- work type.

An invoice may aggregate lines as `Lucrari protetice`, with an annex that lists the underlying works.

## Payments

Future task `PAYMENTS-002` continues the manual evidence model. The application records that payment happened outside the application; it does not process money.

Methods:

- `CASH` - Numerar;
- `CARD` - Card;
- `BANK_TRANSFER` - Transfer bancar;
- `OTHER` - Alta metoda.

Stored fields:

- invoice;
- amount;
- date;
- method;
- optional reference;
- notes;
- user;
- resulting balance.

Multiple payments per invoice are allowed. Partial payments are allowed. Balance and status are recalculated after every payment or cancellation.

Statuses:

- unpaid;
- partial;
- paid.

The application must not provide POS, checkout, bank reconciliation, or payment processing.

## Documents

Future task `DOCUMENTS-001` introduces company-aware printable documents.

Target documents:

- lab form;
- proforma;
- invoice;
- annex;
- payment note;
- delivery proof;
- collaboration terms.

Documents must support:

- `NC` / `NG` context;
- company-specific header;
- open in new tab;
- print;
- download;
- link to patient and work;
- immutable snapshot;
- A4 or A5 format where necessary.

## Collaboration Terms

Future task `COLLABORATION-TERMS-001` introduces versioned collaboration terms per company.

Terms include:

- impression details;
- shade rules;
- try-in rules;
- deadlines;
- remake conditions;
- extra costs;
- version date;
- issuing firm.

This must not be a hardcoded static page.

## Offline Mode

Future task `OFFLINE-001` introduces essential offline operation.

Required UI states:

- Online;
- Offline;
- modificari nesincronizate;
- Se sincronizeaza;
- Sincronizare reusita;
- Sincronizare esuata;
- Sincronizeaza acum;
- Reincearca;
- Vezi detalii.

Initial offline-capable operations:

- create work;
- complete form;
- claim stage;
- start stage;
- complete stage;
- notes;
- operational status.

Initially online-only operations:

- pricing;
- discounts;
- invoices;
- proformas;
- payments;
- document series;
- company settings;
- changing company after it is established on a work.

Architecture direction:

- IndexedDB;
- pending mutations queue;
- `clientMutationId`;
- idempotency server-side;
- optimistic locking;
- `409` conflict handling;
- automatic and manual sync.

## Current Implementation Impact Matrix

| Area | Current state | Realignment impact | Main files/modules | Main models |
|---|---|---|---|---|
| AUTH | Keep | No major adaptation | `apps/api/src/modules/auth/*`, `apps/web/src/features/auth/*` | `User`, `Session`, `AuditLog` |
| RBAC | Keep | Add context-aware permissions where needed | `apps/api/src/modules/rbac/*` | `Role`, `UserRole`, `Permission`, `RolePermission`, `UserPermissionOverride` |
| USERS | Keep | Shared workforce, two managers, no duplicated users | `apps/api/src/modules/users/*`, `apps/web/src/features/users/*` | `User`, `UserRole` |
| SETTINGS | Partial | Move singleton settings to company-aware settings | `apps/api/src/modules/settings/*`, `apps/web/src/features/settings/*` | `LaboratorySettings` |
| CLINICS/DOCTORS | Keep | Add pricing agreement relationships later | `apps/api/src/modules/clinics/*`, `apps/web/src/features/clinics/*` | `Clinic`, `Doctor` |
| WORK TYPES | Partial | Per-company catalog/pricing and deadline rules later | `apps/api/src/modules/work-types/*`, `apps/web/src/features/work-types/*` | `WorkType` |
| WORKS | Partial | Add patient relation, company, cycles, deadlines, financial snapshot | `apps/api/src/modules/works/*`, `apps/web/src/features/works/*` | `WorkOrder`, `WorkFormSubmission`, `WorkWorkflowExecution`, `WorkLogisticsState` |
| WORKFORMS | Keep | Adapt to real lab form and printable snapshot | `apps/api/src/modules/work-forms/*`, `apps/web/src/features/work-forms/*` | `WorkFormTemplate`, `WorkFormSubmission` |
| WORKFLOW | Partial | Move from assignment-first to self-claim and cycles | `apps/api/src/modules/workflow-templates/*`, `apps/api/src/modules/workflow-execution/*`, workflow frontend files | `WorkflowTemplate`, `WorkWorkflowExecution`, `WorkStageExecution` |
| TECH | Partial | Replace manager assignment as default with technician self-claim | `apps/api/src/modules/technician-assignments/*`, `apps/web/src/features/technician-workbench/*` | `WorkStageExecution` |
| QR/SCAN | Keep | Continue for operational resolution and future offline scan actions | `QrModule`, `ScanModule`, frontend scan files | `WorkOrder.qrToken` |
| LOGISTICS | Keep | Add return cycles and company visibility | `apps/api/src/modules/logistics/*`, logistics frontend files | `WorkLogisticsState`, `LogisticsEvent`, `DeliveryPreparationGroup`, `DeliveryPreparationItem` |
| DELIVERY | Keep | Add returns/cycles integration later | `apps/api/src/modules/delivery/*`, delivery frontend files | `Delivery`, `DeliveryEvent` |
| SIGNATURES | Keep | Integrate with company-aware documents later | `apps/api/src/modules/delivery-proof/*`, `packages/ui` signature components | `DeliveryProof` |
| BILLING | Partial | Separate by NC/NG context and use work financial snapshots | `apps/api/src/modules/billing/*`, billing frontend files | `BillingDocument`, `BillingDocumentLine`, `BillingSeries` |
| PAYMENTS | Partial | Keep manual evidence, recalc by company-aware invoice | `BillingService`, payment DTOs/views | `Payment` |
| DEMO | Partial | Current demo becomes prior-flow demo until `DEMO-REAL-DATA-001` | `apps/api/prisma/demo/*`, `DEMO.md`, `DEMO-SCRIPT.md` | demo records |

## Technical Audit

### Prisma

- `LaboratorySettings` is currently singleton-style with `key = default`; future work must make settings company-aware.
- `User`, `Role`, and `UserRole` can support shared users; future work must model manager access to both `NC` and `NG` without duplicate users.
- `WorkOrder` currently stores patient text fields and pricing snapshots but has no `Patient`, legal company, work cycle, `executionStartedAt`, or calculated due fields.
- `WorkType` currently has global base pricing; future pricing requires per-company standards, agreements, and deadline rules.
- `WorkFormSubmission` already supports immutable snapshot data and can be adapted to the real lab form.
- Workflow execution currently stores stage snapshots and assignment fields; future work must add self-claim semantics and company selection at first technical claim.
- There is no `TechnicianAssignment` Prisma model; assignment is currently represented on `WorkStageExecution`.
- Billing and payment models are operationally useful but currently lack company context.
- Logistics, delivery, and proof models are reusable but must become cycle-aware for returned works.

### Backend

- Settings, billing, print, and proof services currently rely on singleton laboratory settings.
- Work creation currently snapshots price from global work type settings and does not ask for `NC`/`NG`.
- Technician workflow is assignment-driven through the technician assignment module.
- Delivery completion currently moves included works to delivered; future cycles must separate delivery to doctor from final closure.
- Pricing masking exists, but future API contracts must prevent non-financial roles from receiving price fields at all.

### Frontend

- The shell has no global company context switch.
- Settings and billing pages assume one financial context.
- Works UI still stores patient as text and exposes current pricing only to authorized users.
- Workbench and workflow UI are assignment-driven, not self-claim-driven.
- Logistics and delivery pages are useful but not return-cycle-aware.
- Dashboard exists as an operational entry point; `/status` remains a separate future page.

### Demo

- Current demo data demonstrates the prior single-company, assignment-driven flow.
- It remains useful for showing completed modules.
- `DEMO-REAL-DATA-001` must replace it with validated `NC`/`NG`, two-manager, three-technician, patient, pricing, deadline, self-claim, cycle, billing, document, and offline-ready scenarios.

## Active Roadmap

### Faza 1 - Realiniere structurala

1. `ROADMAP-REALIGN-002` - Realign product roadmap to validated laboratory workflow.
2. `ORG-CONTEXT-001` - Global NC/NG company context.
3. `ORG-DATA-MIGRATION-001` - Local deterministic data migration for company-aware development data.

### Faza 2 - Datele reale

4. `PATIENTS-001` - Patient records and patient work history.
5. `PRICING-002` - Company-specific pricing and commercial agreements.
6. `WORK-DEADLINES-001` - Deadline rules from pricing and work complexity.

### Faza 3 - Atelierul real

7. `TECH-CLAIM-001` - Technician self-claim, company selection, and stage ownership.
8. `STATUS-001` - Operational status page.
9. `WORK-CYCLES-001` - Clinic return cycles and repeated handoffs.
10. `WORKFORM-REAL-001` - Real laboratory work form.

### Faza 4 - Financiar si documente

11. `BILLING-REALIGN-001` - Company-aware billing workspace.
12. `PAYMENTS-002` - Manual payment evidence realignment.
13. `DOCUMENTS-001` - Company-aware printable document center.
14. `COLLABORATION-TERMS-001` - Versioned collaboration terms.

### Faza 5 - Rezilienta si finalizare

15. `OFFLINE-001` - Essential offline operation and synchronization.
16. `DASHBOARD-002` - Dashboard aligned to the real workflow.
17. `SEARCH-001` - Global operational search.
18. `REPORTS-001` - Operational and financial reports.
19. `AUDIT-UI-001` - Audit viewer UI.
20. `DEMO-REAL-DATA-001` - Realistic demo dataset for the validated workflow.
21. `E2E-001` - End-to-end critical flows.
22. `SECURITY-001` - Security hardening.
23. `DEPLOY-001` - Staging deployment.

## Future Task Definitions

### ORG-CONTEXT-001 - Global NC/NG company context

- Status: COMPLETED.
- Objective: introduce explicit global company context for `NC` and `NG` in shell and backend request context.
- Scope: company registry/config, context switch UX, context persistence, request header/cookie strategy, permission-aware access, and documentation.
- Non-goals: pricing implementation, billing rewrite, patient model, work claim flow, data migration of existing records.
- Dependencies: ROADMAP-REALIGN-002, SHELL-001, SETTINGS-001, RBAC-001.
- Acceptance criteria: managers can switch `NC`/`NG`; current context is visible; backend validates allowed contexts; shared operational routes still show shared data; company-aware screens can require context.
- Backend: company context validation middleware/guard/helper and company-aware settings surface where required.
- Frontend: shell context switch using existing UI components, responsive and non-generic.
- Security: no context spoofing; server validates every context-sensitive mutation/read.
- Audit: audit context-sensitive critical mutations with selected company.
- Testing: typecheck, unit tests for context validation, frontend tests for switch visibility and persistence, build.
- Implementation: `LegalEntity` registry with public codes `NC`/`NG`, `Session.activeLegalEntityId`, `OrganizationContextModule`, `GET /organization-context`, `PUT /organization-context`, `LegalEntityContextGuard`, `RequireLegalEntityContext`, `CurrentLegalEntity` and shell selector.
- Audit decision: manual switch writes `organization_context.switched`; deterministic first-read initialization to NC is not audited to avoid noisy login/read audit events.
- Compatibility: `LaboratorySettings`, billing documents, series, payments, work orders, pricing and demo works remain unmodified until their dedicated roadmap tasks.

### ORG-DATA-MIGRATION-001 - Company-aware local data migration

- Status: COMPLETED.
- Objective: migrate development/demo settings data to the new NC/NG-aware legal settings structure after ORG-CONTEXT-001.
- Scope: deterministic local migration, `LegalEntitySettings`, settings API/UI context alignment and seed compatibility for company records.
- Non-goals: production destructive migration, pricing rules, billing realignment, company on work orders, document center.
- Dependencies: ORG-CONTEXT-001.
- Acceptance criteria: `NC` and `NG` each have exactly one settings row, `/settings` reads and writes only the active session context, legacy singleton data is preserved, and existing smoke/demo flows remain understandable.
- Backend: `LegalEntitySettings` model, nondestructive migration/backfill, context-enforced SettingsModule, safe audit metadata and idempotent base/demo seed.
- Frontend: `/settings` shows "Setări firmă", active company, company-specific values, read-only mode and dirty-form confirmation before context switch.
- Security: refuse production destructive operations.
- Audit: `settings.updated` includes `legalEntityCode` and changed field names without full IBAN or full fiscal payloads.
- Testing: Prisma validate/generate/migrate, seed, demo seed idempotency, typecheck, test, build.
- Implementation: `legal_entity_settings` keeps a required 1:1 `LegalEntity` relation; `laboratory_settings` remains legacy for billing/print compatibility until `BILLING-REALIGN-001`.
- Compatibility: billing, print views, works, pricing, payments and document series remain unmodified and are not driven by the current manager context.

### PATIENTS-001 - Patient records and history

- Status: COMPLETED.
- Objective: replace patient text-only workflow with reusable patient records and history.
- Scope: patient CRUD, work history, doctor/clinic history, existing document references and work creation integration.
- Non-goals: public patient portal, medical record system, permanent doctor requirement, patient code/number, CNP, CI, address, phone, email, import from `assets/`.
- Dependencies: ORG-CONTEXT-001, WORKS-001, CLINICS-001.
- Acceptance criteria: patient has first/last name, optional demographic fields, many works, no internal code, and work code remains operational identifier; work creation uses `patientId` while preserving `patientName` snapshots.
- Backend: Patient model, DTO validation, deterministic `patientName` backfill, server-side permission checks and work integration through PatientsService.
- Frontend: `/patients` registry/detail tabs, application-styled selector in work forms and quick patient creation.
- Security: restrict patient reads/writes by role, never expose patient notes in selector responses and reject archived patients for new works.
- Audit: audit create/update/archive/restore without logging names, notes or full payloads.
- Testing: Prisma validate/generate/migrate, seed, demo seed idempotency, unit tests, full test suite, build and smoke checks.

### PRICING-002 - Company-specific pricing and agreements

- Status: NOT STARTED.
- Objective: implement manager-only pricing by `NC`/`NG`, clinic, doctor, category, and valid period.
- Scope: standard company price lists, negotiated agreements, discount rules, history, price resolution.
- Non-goals: payment processing, accounting, e-Factura, reception/technician pricing visibility.
- Dependencies: ORG-CONTEXT-001, WORKTYPES-001, CLINICS-001.
- Acceptance criteria: manager can configure and resolve prices by priority; non-financial roles do not receive pricing fields.
- Backend: pricing models, resolution service, DTO validation, transactions where required.
- Frontend: manager pricing workspace with filters and history.
- Security: enforce `pricing.*` and financial masking server-side.
- Audit: audit pricing/agreement changes.
- Testing: resolution priority unit tests, API permission tests, UI tests.

### WORK-DEADLINES-001 - Deadline rules

- Status: NOT STARTED.
- Objective: calculate execution deadlines from company pricing/deadline rules and work complexity.
- Scope: rule configuration, first-claim deadline snapshot, visible alerts.
- Non-goals: calendar optimization, courier routing, SLA penalties.
- Dependencies: PRICING-002, TECH-CLAIM-001.
- Acceptance criteria: claim sets execution start/due timestamps and deadline color state is derived consistently.
- Backend: deterministic deadline resolver and snapshot persistence.
- Frontend: deadline alerts and filters.
- Security: non-financial roles can see operational deadline data but not price internals.
- Audit: audit deadline snapshot and corrections.
- Testing: resolver unit tests, API integration, UI state tests.

### TECH-CLAIM-001 - Technician self-claim

- Status: NOT STARTED.
- Objective: replace default manager assignment with technician self-claim and first technical company selection.
- Scope: available stage queue, claim/start/complete flow, NC/NG radio selection, manager release/correction.
- Non-goals: transfer workflow, payroll, mandatory manager scheduling.
- Dependencies: ORG-CONTEXT-001, WORKFLOW-002, TECH-001, PRICING-002.
- Acceptance criteria: technician claims available stage, selects firm on first technical claim, stage audit records claim/start/complete, manager corrections require reason.
- Backend: claim endpoints, concurrency checks, company lock rules.
- Frontend: workbench claim actions and company radio selector.
- Security: ownership scopes and RBAC enforced server-side.
- Audit: claim, release, correction, start, complete.
- Testing: conflict tests, permission tests, mobile UI tests.

### STATUS-001 - Operational status page

- Status: NOT STARTED.
- Objective: provide a real-time-style operational status page for internal users.
- Scope: `/status`, tabs, filters, progress, current stage/technician/company/deadline/cycle.
- Non-goals: financial dashboard, charts-heavy reporting, public display board.
- Dependencies: ORG-CONTEXT-001, TECH-CLAIM-001, WORK-DEADLINES-001, WORK-CYCLES-001.
- Acceptance criteria: internal users see operational status with permission masking; only managers see financial data.
- Backend: status aggregation endpoint with RBAC filtering.
- Frontend: responsive tabbed status page.
- Security: no financial data leakage.
- Audit: no audit for ordinary reads unless required later.
- Testing: aggregation tests, permission tests, UI filter tests.

### WORK-CYCLES-001 - Clinic return cycles

- Status: NOT STARTED.
- Objective: model work sent to doctor, returned, adjusted, and resent without overwriting history.
- Scope: cycle model, return types, cycle timeline, integration with logistics/delivery/status.
- Non-goals: QC rewrite, doctor portal, file upload.
- Dependencies: DELIVERY-001, LOGISTICS-001, STATUS-001.
- Acceptance criteria: each return keeps prior history, current cycle is visible, delivery to doctor does not automatically mean final closure.
- Backend: cycle state transitions with optimistic locking.
- Frontend: return/cycle actions and timeline.
- Security: role-scoped cycle actions.
- Audit: return and resend events.
- Testing: state transition tests, UI tests.

### WORKFORM-REAL-001 - Real laboratory work form

- Status: NOT STARTED.
- Objective: adapt work forms to the validated physical laboratory form.
- Scope: lab form number, doctor, patient, age, sex, work type, shade, FDI teeth, phases, phase deadlines, notes, QR print.
- Non-goals: custom scripting, generic file storage, hardcoded four-phase workflow.
- Dependencies: PATIENTS-001, WORKFORMS-002, WORKFLOW-002, WORK-DEADLINES-001.
- Acceptance criteria: printable form matches required operational format and snapshot remains immutable.
- Backend: validated form snapshot extensions.
- Frontend: accordion/tab/radio/select UI using reusable components.
- Security: patient and work data permission checks.
- Audit: form create/update snapshot events.
- Testing: validator, print, frontend form tests.

### BILLING-REALIGN-001 - Company-aware billing

- Status: NOT STARTED.
- Objective: align billing with global `NC`/`NG` context and financial snapshots.
- Scope: finalized works, proformas, invoices, annexes, payments, overdue lists and filters by active company.
- Non-goals: e-Factura, SPV, payment processing, accounting ledger.
- Dependencies: ORG-CONTEXT-001, PRICING-002, WORK-DEADLINES-001, BILLING-002.
- Acceptance criteria: billing documents are company-specific and cannot mix NC/NG works accidentally.
- Backend: context-aware billing queries, series, document generation and validation.
- Frontend: billing workspace reflects active company context.
- Security: finance permissions and context validation server-side.
- Audit: company included in billing audit metadata.
- Testing: document grouping, filters, permission tests, print smoke.

### PAYMENTS-002 - Manual payment evidence realignment

- Status: NOT STARTED.
- Objective: keep full manual evidence of payments per company-aware invoice.
- Scope: multiple partial payments, methods, references, notes, cancellation and balance recalculation.
- Non-goals: POS, card processing, bank sync, fiscal receipt issuance.
- Dependencies: BILLING-REALIGN-001.
- Acceptance criteria: unpaid/partial/paid status and balance are recalculated after each payment/cancellation.
- Backend: strict overpayment/zero/negative/cancelled-invoice validation.
- Frontend: "Inregistreaza incasare" and payment history UI.
- Security: finance permissions only.
- Audit: payment record/cancel events.
- Testing: status and balance tests, search/filter tests.

### DOCUMENTS-001 - Company-aware document center

- Status: NOT STARTED.
- Objective: generate and access company-aware operational and financial documents.
- Scope: lab form, proforma, invoice, annex, payment note, delivery proof, collaboration terms.
- Non-goals: e-Factura XML, qualified electronic signature, public file links.
- Dependencies: ORG-CONTEXT-001, BILLING-REALIGN-001, WORKFORM-REAL-001.
- Acceptance criteria: documents open in new tab, print, download, link patient/work, keep snapshot and correct company header.
- Backend: document rendering and access endpoints.
- Frontend: document actions and patient/work document tabs.
- Security: private authorized access.
- Audit: print/download critical documents.
- Testing: render snapshots, permissions, print smoke.

### COLLABORATION-TERMS-001 - Versioned collaboration terms

- Status: NOT STARTED.
- Objective: manage versioned collaboration terms per company.
- Scope: terms editor, versioning, effective date, company header, print/download.
- Non-goals: legal automation, client signature workflow, static hardcoded page.
- Dependencies: DOCUMENTS-001.
- Acceptance criteria: managers can version terms and documents show the selected/effective version.
- Backend: terms model, validation, immutable versions.
- Frontend: management and document view.
- Security: manager-only writes, authorized reads.
- Audit: create/publish/archive terms.
- Testing: versioning and permission tests.

### OFFLINE-001 - Essential offline operation

- Status: NOT STARTED.
- Objective: allow essential operational work to continue offline and sync later.
- Scope: IndexedDB queue, pending mutations, manual/auto sync, conflict handling and UI states.
- Non-goals: offline pricing, billing, payments, company settings or document series.
- Dependencies: TECH-CLAIM-001, STATUS-001, WORKFORM-REAL-001.
- Acceptance criteria: users can create work, complete forms, claim/start/complete stages and add notes offline, then sync safely.
- Backend: idempotent mutation handling using `clientMutationId` and optimistic locking.
- Frontend: offline queue, sync status and conflict UI.
- Security: no sensitive data beyond authorized cached operational data.
- Audit: audit synced actions with original client timestamp where safe.
- Testing: sync unit tests, conflict tests, browser offline smoke.

### DASHBOARD-002 - Real workflow dashboard

- Status: NOT STARTED.
- Objective: align dashboard with the real status, deadlines, cycles and company context.
- Scope: operational summaries and manager-only financial summaries by context.
- Non-goals: replacing `/status`, advanced analytics.
- Dependencies: STATUS-001, BILLING-REALIGN-001.
- Acceptance criteria: dashboard summaries match status and billing data.
- Backend: summary endpoints with permissions.
- Frontend: responsive dashboard cards using existing shell.
- Security: financial widgets manager-only.
- Audit: no audit for regular reads.
- Testing: aggregation and UI tests.

### SEARCH-001 - Global operational search

- Status: NOT STARTED.
- Objective: search works, patients, clinics, doctors, documents and permitted financial references.
- Scope: shell search, grouped results, permission-aware links.
- Non-goals: external search engine unless justified.
- Dependencies: PATIENTS-001, DOCUMENTS-001, BILLING-REALIGN-001.
- Acceptance criteria: users can find permitted records by work code, patient, doctor, clinic, document number or payment reference.
- Backend: permission-aware search endpoint.
- Frontend: global search UI.
- Security: server-side result filtering.
- Audit: no audit for ordinary search unless later required.
- Testing: result and permission tests.

### REPORTS-001 - Operational and financial reports

- Status: NOT STARTED.
- Objective: provide validated operational and financial reports.
- Scope: status, delays, productivity, balances by company/clinic/doctor/month.
- Non-goals: accounting export, BI warehouse.
- Dependencies: STATUS-001, BILLING-REALIGN-001, PAYMENTS-002.
- Acceptance criteria: reports reconcile with billing and status pages.
- Backend: report aggregation endpoints.
- Frontend: filters, tables, CSV where needed.
- Security: manager-only financial reports.
- Audit: audit exports.
- Testing: aggregation and permission tests.

### AUDIT-UI-001 - Audit viewer UI

- Status: NOT STARTED.
- Objective: let authorized users inspect critical audit events.
- Scope: filters by actor, resource, company, work, patient, document and date.
- Non-goals: changing existing audit events.
- Dependencies: ORG-CONTEXT-001, TECH-CLAIM-001, BILLING-REALIGN-001.
- Acceptance criteria: managers can trace critical actions and corrections.
- Backend: filtered audit read endpoint.
- Frontend: audit viewer with clear details.
- Security: audit reads are permissioned and avoid exposing secrets.
- Audit: audit read/export if required.
- Testing: permission and filter tests.

### DEMO-REAL-DATA-001 - Validated workflow demo dataset

- Status: NOT STARTED.
- Objective: replace the prior-flow demo with data that demonstrates the validated NC/NG workflow.
- Scope: two managers, three technicians, shared users, NC/NG contexts, patients, pricing, deadlines, self-claim, cycles, billing, documents.
- Non-goals: real client data, production seed.
- Dependencies: DOCUMENTS-001, PAYMENTS-002, STATUS-001.
- Acceptance criteria: demo script can present the real validated workflow end to end.
- Backend: idempotent demo seed guarded from production.
- Frontend: demo script and quick access where useful.
- Security: fictive data only.
- Audit: no audit for local seed.
- Testing: seed idempotency, typecheck, test, build and demo smoke.

### E2E-001 - End-to-end critical flows

- Status: NOT STARTED.
- Objective: cover the real workflow with automated browser/API smoke flows.
- Scope: login, context switch, create work, patient, claim, deadline, cycle, billing, payment, document, delivery proof.
- Non-goals: exhaustive browser coverage.
- Dependencies: DEMO-REAL-DATA-001.
- Acceptance criteria: critical demo path passes reliably.
- Backend: test fixtures/support only where necessary.
- Frontend: Playwright flows.
- Security: include negative permission checks.
- Audit: verify critical audit events.
- Testing: E2E suite.

### SECURITY-001 - Security hardening

- Status: NOT STARTED.
- Objective: harden authentication, authorization, data exposure and deployment defaults.
- Scope: CORS, cookies, headers, rate limits, dependency audit, permission tests, sensitive data review.
- Non-goals: external penetration test.
- Dependencies: E2E-001.
- Acceptance criteria: security checklist passes and no known high-risk data exposure remains.
- Backend: guards, validation, security headers.
- Frontend: no secret exposure and safe error handling.
- Security: primary task focus.
- Audit: audit critical admin/security actions.
- Testing: negative tests and dependency audit.

### DEPLOY-001 - Staging deployment

- Status: NOT STARTED.
- Objective: provide a stable client-testable staging environment.
- Scope: deployment config, environment validation, migrations, backups, smoke checks.
- Non-goals: production launch and e-Factura integration.
- Dependencies: SECURITY-001.
- Acceptance criteria: staging URL works with seeded demo data and documented operations.
- Backend: deployment runtime and migration strategy.
- Frontend: production build/deploy.
- Security: secure envs, cookies and CORS.
- Audit: deployment checklist.
- Testing: production build and smoke.
