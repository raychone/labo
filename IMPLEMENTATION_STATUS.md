# Implementation Status

## Overall Progress

50%

## FOUNDATION

- [x] FOUNDATION-001 - Initialize monorepo
- [x] FOUNDATION-002 - Docker Compose development

## UI

- [x] UI-001 - Design tokens and base styles
- [x] UI-002 - Core UI components

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

## QR

- [x] QR-001 - QR generation and scan

## SHELL

- [x] SHELL-001 - Authenticated application shell and navigation

## DASHBOARD

- [ ] DASHBOARD-001 - Operational dashboard (NOT STARTED)

## FORMS

- [x] FORMS-001 - Form patterns and validation UX
- [ ] WORKFORMS-001 - Work form template builder (NOT STARTED)
- [ ] FORMS-002 - Work form completion and immutable snapshot (NOT STARTED)

## FILES

- [ ] FILES-001 - Private file upload (NOT STARTED)
- [ ] FILES-002 - File preview and lifecycle controls (NOT STARTED)

## LABELS

- [ ] LABELS-001 - Printable labels and document templates (NOT STARTED)

## WORKFLOW

- [ ] WORKFLOW-001 - Workflow templates (NOT STARTED)
- [ ] WORKFLOW-002 - Workflow execution snapshot (NOT STARTED)

## SCAN

- [ ] SCAN-002 - Scan actions and operational handoffs (NOT STARTED)

## LOGISTICS

- [ ] LOGISTICS-001 - Planning and assignment (NOT STARTED)

## TECHNICIAN

- [ ] TECH-001 - Technician workbench

## QUALITY

- [ ] QC-001 - Quality control (NOT STARTED)

## DELIVERY

- [ ] DELIVERY-001 - Delivery routes and courier mobile UI (NOT STARTED)

## SIGNATURES

- [ ] SIGNATURES-001 - Delivery signatures and proof capture (NOT STARTED)

## NOTIFICATIONS

- [ ] NOTIFICATIONS-001 - Operational notifications (NOT STARTED)

## PAYMENTS

- [ ] PAYMENTS-001 - Payments and balances

## INVOICE

- [ ] INVOICE-001 - Invoice PDF and numbering

## REPORTS

- [ ] REPORTS-001 - Operational and financial reports (NOT STARTED)

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

## Next Recommended Task

WORKFORMS-001 - Work form template builder

## Known Technical Debt

None.

## Architecture Decisions

- Use a pnpm workspace monorepo with `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, and `packages/config`.
- Use TypeScript strict mode everywhere.
- Use React + Vite for the frontend.
- Use NestJS for the backend.
- Keep shared constants and pure functions in `packages/shared`.
- Keep reusable React UI primitives in `packages/ui`.
- Keep reusable TypeScript configuration in `packages/config`.
- Resolve frontend workspace packages to source files in Vite and Vitest during development.
- Keep the API independent from shared frontend contracts until real cross-package API contracts are introduced.
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
- Evaluate RBAC from the database so access changes take effect without relogin.
- Treat `ALL` as the only broad scope; ownership scopes remain distinct.
- Use plain CSS custom properties in `packages/ui/src/styles.css` as the design token source of truth.
- Keep UI-001 limited to base styles, tokens, native element defaults, layout utilities, and an internal style preview.
- Avoid introducing a CSS framework for UI-001 because the existing CSS mechanism is sufficient.
- Keep UI-002 components framework-free and token-driven inside `packages/ui`.
- Use native controls for select, checkbox, radio, switch, file input, and table semantics where possible.
- Use internal portal/focus management for Modal and Drawer instead of adding an overlay dependency.
- Keep QRScanner and SignaturePad out of UI-002 because they depend on device/browser functional flows; QR scan now exists as a feature-specific `/scan` route from QR-001.
- Store work orders in `work_orders` with a generated stable `WO-YYYY-NNNNNN` code backed by `work_order_code_seq`.
- WORKS-001 creates work orders directly as `REGISTERED`; draft and workflow status transitions remain deferred.
- Keep patient identity minimal in WORKS-001 with `patientName` and optional `patientReference`; no patient model is introduced.
- Snapshot work order pricing from `WorkType.basePriceMinor` and `LaboratorySettings.currency` at create time.
- Hide work order price fields from readers without `pricing.read`; reception can still select active work types through a price-free `/works/work-type-options` endpoint.
- Treat `works.read_assigned` as deny-safe until an assignment relationship exists; WORKS-001 list/detail require `works.read_all`.
- Store QR payloads as `dl-work:<opaque-token>` and keep work codes, patient data, pricing, clinic details, and internal database IDs out of QR content.
- Generate QR tokens server-side with cryptographic randomness for new work orders inside the work-order create transaction.
- Keep QR resolve behind cookie authentication, CSRF, `works.read_all`, and server-side rate limiting.
- Implement browser camera scan in the works feature route `/scan` with native `BarcodeDetector` feature detection and manual fallback; do not add a frontend scanner dependency until browser support requires it.
- Keep QR-001 limited to traceability lookup and label printing; workflow transitions, assignments, QC, delivery, files, notifications, and public/anonymous portals remain deferred.
- Keep authenticated frontend routes behind a shared app shell that reads `/auth/me` and `/auth/permissions` through TanStack Query.
- Treat frontend route guards and permission-aware navigation as UX only; backend RBAC remains the enforcement source of truth.
- Centralize frontend API calls through `apps/web/src/lib/api-client.ts` so cookie credentials, error parsing, and expired-session handling are consistent.
- Reject external `returnTo` values on login and only redirect to safe relative app paths.

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

- Status: NOT STARTED.
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

- Status: NOT STARTED.
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

### FORMS-002 - Work form completion and immutable snapshot

- Status: NOT STARTED.
- Obiectiv: completarea formularelor dinamice pe lucrare si salvarea unui snapshot imutabil al template-ului folosit.
- Scope: completare valori pentru WorkOrder pe baza template-ului activ, validare, snapshot versiune/campuri/raspunsuri si afisare read-only in detalii.
- Non-goals: editare template, fisiere, workflow execution, conditional rules engine complex.
- Dependente: WORKFORMS-001, WORKS-001, RBAC-001.
- Acceptance criteria: o lucrare noua poate salva raspunsurile cerute de template, iar lucrarile existente pastreaza snapshotul chiar daca template-ul se modifica ulterior.
- Backend: modele/contract pentru raspunsuri si snapshot, validare server-side impotriva snapshotului, tranzactii unde este necesar.
- Frontend: completare in create/edit Work, erori pe campuri dinamice, summary, read-only snapshot in detalii.
- Securitate: RBAC pentru citire/modificare lucrari, fara expunere date peste permisiuni.
- Audit: audit pentru create/update raspunsuri formular pe lucrare.
- Testare: unit/integration pentru snapshot si validare, frontend pentru completare, erori si compatibilitate cu FORMS-001 patterns.

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

- Status: NOT STARTED.
- Obiectiv: configurare fluxuri tehnologice versionate.
- Scope: template, versiuni, stages si checklist.
- Non-goals: execution pe lucrare, technician UI.
- Dependente: WORKTYPES-001, RBAC-001.
- Acceptance criteria: managerul configureaza fluxuri fara sa modifice istoricul lucrarilor.
- Backend: WorkflowTemplatesModule cu DTO validation si versioning.
- Frontend: UI manager pentru template/stages/checklist.
- Securitate: RBAC server-side pentru configurare.
- Audit: audit create/update/version.
- Testare: API unit/integration si UI form tests.

### WORKFLOW-002 - Workflow execution snapshot

- Status: NOT STARTED.
- Obiectiv: instantiere flux pe lucrare fara dependenta de editari ulterioare ale templateului.
- Scope: assign template, create stage snapshots, status operational initial.
- Non-goals: technician UI, QC, delivery.
- Dependente: WORKFLOW-001, WORKS-001.
- Acceptance criteria: modificarea templateului nu schimba lucrarile deja instantiate.
- Backend: WorkflowExecutionModule cu tranzactii pentru snapshot.
- Frontend: actiune clara de alocare template pe lucrare.
- Securitate: RBAC server-side si validare stare.
- Audit: audit assign/snapshot.
- Testare: integration pentru snapshot si regresii template.

### SCAN-002 - Scan actions and operational handoffs

- Status: NOT STARTED.
- Obiectiv: folosirea scanarii QR pentru actiuni operationale controlate.
- Scope: resolve scan plus actiuni permise contextual, precum handoff sau deschidere etapa, fara automatism periculos.
- Non-goals: camera library noua daca `BarcodeDetector` este suficient, workflow complet daca nu exista dependentele.
- Dependente: QR-001, WORKFLOW-002, LOGISTICS-001.
- Acceptance criteria: scanarea nu schimba status fara confirmare si permisiune explicita.
- Backend: endpointuri action-by-scan autorizate, DTO validate, tranzactii unde se schimba stare.
- Frontend: UI scan action sheet, confirmari clare, fallback manual.
- Securitate: RBAC server-side si token opac; fara acces anonim.
- Audit: audit pentru fiecare actiune declansata din scan.
- Testare: API permissions/state transitions, frontend camera/manual action states.

### LOGISTICS-001 - Planning and assignment

- Status: NOT STARTED.
- Obiectiv: planificare si alocare tehnicieni.
- Scope: board, filters, assign stage/user, priority.
- Non-goals: invoices, QC, delivery.
- Dependente: WORKFLOW-002, USERS-001.
- Acceptance criteria: logistica aloca lucrari fara date financiare.
- Backend: LogisticsModule cu RBAC si validari de stare.
- Frontend: board responsive si filtre operationale.
- Securitate: acces fara pricing pentru roluri non-financiare.
- Audit: audit assignment/reassignment.
- Testare: API permissions si UI board states.

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

### DELIVERY-001 - Delivery routes and courier mobile UI

- Status: NOT STARTED.
- Obiectiv: ridicari/livrari mobile-first.
- Scope: route, stops, scan, confirm, fail, courier UI.
- Non-goals: GPS obligatoriu, semnatura avansata, facturare.
- Dependente: QC-001, QR-001.
- Acceptance criteria: curierul confirma livrari fara acces financiar.
- Backend: DeliveriesModule cu validari si RBAC.
- Frontend: courier mobile UI.
- Securitate: `OWN_DELIVERY` server-side, fara pricing.
- Audit: audit confirm/fail/handoff.
- Testare: API + mobile UI tests.

### SIGNATURES-001 - Delivery signatures and proof capture

- Status: NOT STARTED.
- Obiectiv: dovada livrarii prin semnatura si/sau fotografie.
- Scope: capturare semnatura, dovada foto optionala, atasare la livrare, audit.
- Non-goals: verificare identitate avansata, GPS obligatoriu, semnatura calificata.
- Dependente: DELIVERY-001, FILES-001.
- Acceptance criteria: dovada este privata, legata de livrare si vizibila doar autorizat.
- Backend: endpointuri private pentru proof metadata si upload/legare fisiere.
- Frontend: canvas/signature pad sau input compatibil mobil, confirmare explicita.
- Securitate: storage privat, RBAC, validare server-side.
- Audit: audit capture/update/delete proof.
- Testare: component tests pentru semnatura, API permissions si manual mobile.

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
  - Updated plan/status documentation to track `WORKFORMS-001` separately before `FORMS-002`.
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
