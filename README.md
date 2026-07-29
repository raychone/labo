# Dental Lab Management

Custom management application for a Romanian dental laboratory.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod.
- Backend: NestJS, TypeScript, REST API.
- Database: PostgreSQL with Prisma.
- Package manager: pnpm workspace.

## Real Lab Workflow

`ROADMAP-REALIGN-002` realigns the product to the validated laboratory workflow. The architectural source of truth is [REAL-LAB-WORKFLOW.md](REAL-LAB-WORKFLOW.md).

The target model is one shared operational laboratory with two legal/financial contexts:

- `NC` - Nicolaie Cristina.
- `NG` - Nicolaie Gabriel.

Both managers can see and operate both contexts. The future shell context switch changes company settings, legal data, document headers, document series, invoices, proformas, payments, pricing and financial reports. It does not change the authenticated user and does not split the operational workflow into tenants.

Reception registers work operationally without choosing the company. The technician chooses `NC` or `NG` at the first technical self-claim; from that point the company belongs to the work and later correction is manager-only, reasoned and audited.

The current demo data still shows the already implemented prior flow: single-company settings and assignment-driven technician work. It remains useful for presenting completed modules, but the validated NC/NG self-claim workflow will be represented by `ORG-CONTEXT-001` and later roadmap tasks.

`ORG-CONTEXT-001` adds the first implementation slice for this model:

- `LegalEntity` registry entries for `NC` and `NG`.
- `Session.activeLegalEntityId` as the server-side source of truth for the active context.
- `GET /organization-context` for the current context and available active options.
- `PUT /organization-context` for CSRF-protected context switching.
- RBAC permissions `organization_context.read` and `organization_context.switch`.
- A shell selector labelled “Firmă activă”.

`ORG-DATA-MIGRATION-001` adds company-aware legal settings:

- `LegalEntitySettings` stores one settings row per `LegalEntity`.
- `GET /settings` and `PATCH /settings` use the active server-side session context.
- The request body cannot choose or spoof another company.
- The legacy `laboratory_settings` table is preserved for compatibility.
- Billing and existing print views still use the legacy singleton until `BILLING-REALIGN-001`.
- Work orders, pricing, billing documents and payments are intentionally not linked to `NC`/`NG` in this task.

Temporary compatibility limits remain intentional: billing documents and series are not yet separated by company, work orders do not yet store a company, and existing issued document headers do not change when a manager switches the active context. Those changes belong to later approved roadmap tasks.

## Workspace

```text
apps/
  api/
  web/
packages/
  config/
  shared/
  ui/
```

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm seed:demo
pnpm dev
pnpm dev:web
pnpm dev:api
```

Prisma commands are scoped to the API workspace:

```bash
pnpm --filter @dental-lab/api prisma:validate
pnpm --filter @dental-lab/api prisma:generate
pnpm --filter @dental-lab/api prisma:migrate:dev
pnpm --filter @dental-lab/api prisma:db:seed
```

## Local Environment

Create a local `.env` from the example before starting services:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
docker compose ps
```

Start the API after PostgreSQL is healthy:

```bash
pnpm seed:demo
pnpm dev:api
curl http://localhost:3010/health
```

The health response includes `database: "ok"` when the API can connect to PostgreSQL.

The default host PostgreSQL port is `55439` to avoid conflicts with an existing local PostgreSQL installation. Inside Docker, PostgreSQL still listens on `5432`.

Prisma configuration lives in `apps/api/prisma.config.ts`, the schema lives in `apps/api/prisma/schema.prisma`, and migrations are versioned under `apps/api/prisma/migrations`.

## Backend Authentication

AUTH-001 adds backend-only cookie authentication:

- `GET /auth/csrf` sets a readable CSRF cookie and returns the token for clients to send in `x-csrf-token`.
- `POST /auth/login` validates credentials server-side and sets an httpOnly session cookie.
- `GET /auth/me` returns the current authenticated user.
- `POST /auth/logout` requires a valid CSRF token, revokes the server-side session, and clears the session cookie.

The development seed creates a local-only manager account from `.env`:

```text
AUTH_SEED_EMAIL=manager.dev@example.test
AUTH_SEED_PASSWORD=ChangeMe-Dev-Only-12345
```

Do not use these credentials outside local development.

Sessions are stored server-side in PostgreSQL. Only a random session token is sent to the browser; the database stores a SHA-256 token hash. Password hashes use Argon2id with explicit memory, time, parallelism, and output length parameters.

Cookie defaults for development:

- Session cookie: `dl_session`, httpOnly, SameSite=Lax, 8 hour TTL.
- CSRF cookie: `dl_csrf`, readable by the browser, SameSite=Lax, 8 hour TTL.
- Cookies become `secure` automatically when `NODE_ENV=production`.

Login rate limiting is currently in-memory and keyed by IP address plus normalized email. This is acceptable for local MVP development but must move to shared storage before multi-instance deployment.

The automated API tests use service fakes for database-facing auth tests. Real database verification for AUTH-001 is covered by running Docker PostgreSQL, Prisma migrate/seed, and manual API requests against the running backend.

## RBAC

RBAC-001 adds centralized backend authorization. The Prisma models are:

- `Role`
- `Permission`
- `UserRole`
- `RolePermission`
- `UserPermissionOverride`

The typed permission registry lives in `apps/api/src/modules/rbac/permission-registry.ts` and contains the full MVP permission matrix. Seed data creates six system roles: `MANAGER`, `LOGISTICA`, `RECEPTIE`, `TEHNICIAN`, `CURIER`, and `MEDIC`.

Matrix meaning:

- `A`: granted by seeded `RolePermission`.
- `O`: not granted by default; can be granted later with `UserPermissionOverride(ALLOW)`.
- `-`: not granted.

Implemented scopes are `ALL`, `ASSIGNED`, `OWN_CLINIC`, `OWN_DELIVERY`, and `OWN_STAGE`. `ALL` satisfies any required scope. Other ownership scopes are distinct and do not imply each other; future business modules must still verify concrete resource ownership.

Evaluation order:

1. User must exist and be active.
2. Permission must exist in effective grants.
3. Explicit `DENY` override removes matching access and has priority.
4. Explicit `ALLOW` override can add access.
5. Active role permissions are aggregated.
6. Required scope is checked.
7. Default is deny.

Use `@RequirePermission("permission.key", "SCOPE")` together with `AuthGuard` and `PermissionsGuard` on protected backend routes. Permissions are never stored in cookies or sessions; changes are read from the database and take effect without relogin.

Current RBAC endpoints:

- `GET /auth/permissions`: authenticated user permission snapshot.
- `GET /rbac/roles`: protected with `roles.read`.
- `GET /rbac/permissions`: protected with `permissions.read`.

RBAC role and override changes should go through `RbacManagementService` so audit events are written. User management endpoints are implemented separately in `UsersModule`.

## User Management

USERS-001 adds internal user administration for authenticated users with the required permissions.

Backend endpoints:

- `GET /users`: list users with pagination, search, status filter, role filter, and safe sorting.
- `GET /users/:id`: user details with roles, permission overrides, active session count, timestamps, and `mustChangePassword`.
- `POST /users`: create an internal user with a temporary password and roles.
- `PATCH /users/:id`: update display name and email.
- `POST /users/:id/disable`: soft-disable a user and revoke sessions.
- `POST /users/:id/enable`: reactivate a user without creating a session.
- `PUT /users/:id/roles`: replace active roles.
- `POST /users/:id/reset-password`: set a temporary password, mark `mustChangePassword`, and revoke sessions.

State-changing user endpoints require cookie authentication, RBAC permissions, and CSRF validation. The frontend sends the `x-csrf-token` header automatically.

Permissions used:

- `users.create`
- `users.read`
- `users.update`
- `users.disable`
- `users.assign_roles`
- `roles.read`
- `permissions.read`

The backend never returns `passwordHash`, raw session tokens, or temporary passwords. Disabling users preserves historical audit, roles, and overrides. The service protects the last active administrator by checking effective permissions, not role keys.

The user management UI is available at:

```text
http://localhost:3000/users
```

The page is mobile-first and uses the shared UI components for controls, table, drawer, modal, badges, and toasts.

## Laboratory Settings

`SETTINGS-001` originally added a global singleton settings record for the single laboratory instance. `ORG-DATA-MIGRATION-001` keeps that legacy `LaboratorySettings` table for billing/print compatibility, but moves the `/settings` API and UI to company-aware `LegalEntitySettings`.

`LegalEntitySettings` has a required 1:1 relationship with `LegalEntity`, enforced by a unique `legalEntityId` foreign key. The migration backfills missing `NC` and `NG` settings from `laboratory_settings.key = "default"` for local development compatibility without overwriting existing company settings and without dropping legacy data.

Backend endpoints:

- `GET /settings`: protected with `settings.read`, requires an active legal entity context and returns the settings for the active session context.
- `PATCH /settings`: protected with `settings.update`, CSRF and active context; updates only the active company settings.

The response includes `legalEntityCode` and `legalEntityDisplayName` and does not expose internal Prisma IDs. The request body cannot send `legalEntityCode`, `legalEntityId`, `activeLegalEntityId` or `code`; company switching remains exclusively `PUT /organization-context`.

Company settings are Romania-only for the current MVP:

Default development values:

- `countryCode`: `RO`
- `timezone`: `Europe/Bucharest`
- `locale`: `ro-RO`
- `currency`: `RON`
- `primaryColor`: `#0f766e`

The `/settings` frontend route displays “Setări firmă”, the active company, legal identity, contact, address, bank fields, regional read-only values and branding. Users with only `settings.read` get read-only access. Dirty forms block company switching until the user confirms that unsaved changes will be lost. Logo upload is intentionally deferred until private file storage is implemented; `logoFileKey` remains nullable.

Settings updates write `settings.updated` audit events with `legalEntityCode`, changed field names and previous `updatedAt`. Audit metadata does not include full IBAN, fiscal values or full settings payloads.

Optional local-only seed overrides are documented in `.env.example` with prefixes `NC_` and `NG_`. Do not put real client fiscal or bank data in Git. Local `assets/` files are reserved for future document work and are not imported by seed.

## Clinic And Doctor Management

CLINICS-001 adds partner dental clinic management and minimal external doctor management.

Backend endpoints:

- `GET /clinics`: list clinics with pagination, search, status filter, city filter, and safe sorting.
- `GET /clinics/options`: active clinic options for selectors.
- `GET /clinics/:id`: clinic detail.
- `POST /clinics`: create a clinic with a generated internal code.
- `PATCH /clinics/:id`: update an active clinic.
- `POST /clinics/:id/archive`: soft-archive a clinic.
- `POST /clinics/:id/restore`: restore an archived clinic.
- `GET /doctors`: list external doctors with pagination, clinic filter, search, status filter, and safe sorting.
- `GET /doctors/options?clinicId=...`: active doctor options, optionally scoped to one active clinic.
- `GET /doctors/:id`: doctor detail.
- `POST /doctors`: create an external doctor for an active clinic.
- `PATCH /doctors/:id`: update an active doctor.
- `POST /doctors/:id/archive`: soft-archive a doctor.
- `POST /doctors/:id/restore`: restore a doctor if its clinic is active.

Permissions used:

- `clinics.read`
- `clinics.create`
- `clinics.update`
- `clinics.archive`
- `doctors.read`
- `doctors.create`
- `doctors.update`
- `doctors.archive`

The `RECEPTIE` role receives only `clinics.read` and `doctors.read` so reception can select clinic/doctor in future intake flows. Create, update, archive, and restore remain manager-level through the seeded `MANAGER` matrix.

Clinic codes are generated server-side from the deterministic PostgreSQL sequence `clinic_code_seq` and formatted as `CL-0001`, `CL-0002`, etc. Doctors are external dentists, not internal app users; they do not have sessions, passwords, roles, or portal access. Doctor `displayName` is derived server-side from first and last name.

Archived clinics and doctors remain in history but are excluded from option endpoints. Archived records are read-only until restored. Archiving a clinic does not hard-delete or automatically archive its doctors.

The clinic management UI is available at:

```text
http://localhost:3000/clinics
```

The page is mobile-first and uses shared UI components for filters, styled selectors, tables, drawer, modals, badges, forms, and toasts.

## Work Types And Base Pricing

WORKTYPES-001 adds the manager-only base pricing catalog for dental work types.

Backend endpoints:

- `GET /work-types`: list work types with pagination, search, status filter, and safe sorting.
- `GET /work-types/options`: active work type options for future work order selectors.
- `GET /work-types/:id`: work type detail.
- `POST /work-types`: create a work type with a generated stable internal code.
- `PATCH /work-types/:id`: update an active work type.
- `POST /work-types/:id/archive`: soft-archive a work type.
- `POST /work-types/:id/restore`: restore an archived work type.

Permissions used:

- `pricing.read`
- `pricing.create`
- `pricing.update`

The seeded MVP matrix grants pricing permissions only to `MANAGER`. Non-finance operational roles do not receive `pricing.read`, so they cannot see the pricing catalog or base prices.

Money is stored as integer minor units in `WorkType.basePriceMinor`; the database never stores prices as `Float`. Frontend helpers convert deterministic decimal input to minor units:

- `35000` renders as `350.00`
- `350.00` saves as `35000`
- `350.5` saves as `35050`
- more than two decimal places are rejected

Currency is not duplicated per work type. The UI reads `LaboratorySettings.currency` and formats prices with the global laboratory currency. `WorkType.unit` is currently the minimal enum value `UNIT` because the plan does not define a broader unit model yet.

Work type codes are generated server-side from `work_type_code_seq` and formatted as `WT-0001`, `WT-0002`, etc. Codes are immutable after creation.

Archived work types remain available for future historical references but are excluded from `/work-types/options`. There is no hard delete and no work order behavior in this task.

Audit events:

- `work_types.created`
- `work_types.updated`
- `work_types.price_updated`
- `work_types.archived`
- `work_types.restored`

The frontend route is:

```text
http://localhost:3000/work-types
```

Categories, clinic-specific pricing, discounts, VAT, invoices, quotations, price books, and price history tables are intentionally not implemented in WORKTYPES-001.

## Company Pricing And Agreements

PRICING-002 adds company-specific pricing for the active legal entity context (`NC` or `NG`).

Backend endpoints:

- `GET /pricing/catalog`: list active/archived price catalog items for the active company.
- `GET /pricing/catalog/:id`: catalog item detail with execution-time rules.
- `POST /pricing/catalog`: create a company-specific price item.
- `PATCH /pricing/catalog/:id`: update a company-specific price item.
- `POST /pricing/catalog/:id/archive`: archive a price item.
- `POST /pricing/catalog/:id/restore`: restore a price item.
- `PUT /pricing/catalog/:id/execution-rules`: replace execution-time rules.
- `GET /pricing/agreements`: list clinic/doctor commercial agreements.
- `GET /pricing/agreements/:id`: agreement detail.
- `POST /pricing/agreements`: create an agreement.
- `PATCH /pricing/agreements/:id`: update an agreement.
- `PUT /pricing/agreements/:id/rules`: replace agreement rules.
- `POST /pricing/agreements/:id/archive`: archive an agreement.
- `POST /pricing/agreements/:id/restore`: restore an agreement.
- `POST /pricing/resolve-preview`: preview resolved price and execution rule without changing a work order. When `startAt` is provided as an ISO date-time with timezone offset, the response also includes `deadlinePreview`.

Permissions used:

- `pricing.read`
- `pricing.create`
- `pricing.update`
- `pricing.archive`
- `pricing.resolve_preview`
- `pricing.agreements.read`
- `pricing.agreements.manage`

Pricing data is always resolved from the active company stored in the authenticated session. The API does not accept legal entity identifiers from request body, query or headers for pricing operations.

`WorkType` remains common across companies. Company-specific money lives in `PriceCatalogItem`, while `WorkType.basePriceMinor` remains as a legacy/base field for existing workflows. Existing `WorkOrder` price snapshots are unchanged by PRICING-002.

Resolver order:

1. active catalog item for active company and work type;
2. applicable doctor agreement rule;
3. applicable clinic agreement rule;
4. standard company catalog price.

Money is stored as integer minor units. Percentage adjustments are stored as basis points. Execution-time rules are linked to catalog items and are available for deadline calculation.

`WORK-DEADLINES-001A` adds deadline calculation infrastructure:

- `DeadlinesModule` contains a Romanian business-day calendar, a pure execution-rule selector and `DeadlineEngineService`.
- The deterministic MVP calendar covers 2026-2030, excludes weekends and Romanian legal holidays, and does not shift holidays to Monday.
- The default operational due time is `17:00` in `Europe/Bucharest`; calculations use local calendar dates so DST does not change the intended local due hour.
- `includeStartDay` is explicit. Manual rules return `MANUAL`; missing or ambiguous rules return `UNRESOLVED` with a controlled reason such as `NO_EXECUTION_RULE` or `AMBIGUOUS_EXECUTION_RULES`.

`WORK-DEADLINES-001B` persists deadline snapshots on work orders:

- `effectiveDueAt` is the canonical operational deadline. `requestedDeliveryDate` remains available as the requested/legacy delivery date and is used by the migration backfill.
- New work orders resolve a deadline snapshot at creation. Manual execution rules without a supplied manual date are persisted as `UNRESOLVED`.
- Updates that change cabinet, doctor, work type or quantity require `expectedDeadlineRevision` and recalculate only when the existing deadline is not manually locked.
- Managers can recalculate or set a manual deadline explicitly; manual deadlines are locked and audited.
- `POST /works/deadline-preview` is side-effect free and does not expose prices, agreement IDs or internal rule IDs to non-financial roles.

`WORK-DEADLINES-001C` adds operational deadline visibility:

- The work registry uses only `effectiveDueAt` for operational deadline sorting, filtering, badges, countdowns and overdue detection.
- Deadline visual states are resolved with `Europe/Bucharest` local calendar semantics: unknown, unresolved, on time, due today, due tomorrow, warning, late and manual.
- Registry filters include today, tomorrow, late, manual, without deadline and next 7 days. The dashboard shows read-only deadline totals for the current registry scope.
- Work detail shows the effective deadline card, snapshot revision and timeline-oriented labels without exposing pricing internals.
- Notifications, cron jobs, reports and technical-claim start integration are deferred to later tasks.

The frontend route is:

```text
http://localhost:3000/pricing
```

The page includes catalog, agreements, preview calculation, execution terms and source/history tabs. Non-financial roles do not see the route and receive server-side `403` on pricing API access.

Demo seed includes a manually transcribed Creative Dental price list for both `NC` and `NG`; ambiguous source rows are documented in `PRICING-ASSET-AUDIT.md`.

## Work Order Creation

WORKS-001 adds the first work order intake flow for reception.

Backend endpoints:

- `GET /works`: list work orders with pagination, search, filters, and safe sorting.
- `GET /works/work-type-options`: active work type options without pricing for reception forms.
- `GET /works/:id`: work order detail.
- `POST /works`: create a work order directly in `REGISTERED`.
- `PATCH /works/:id`: update intake fields without workflow transitions.

Permissions used:

- `works.read_all`
- `works.create`
- `works.update`
- `pricing.read` only controls whether pricing fields are visible in work order responses.

Reception can create work orders without receiving price data from `/work-types/options`. The dedicated `/works/work-type-options` endpoint returns only `id`, `code`, `name`, and `unit`.

Work order codes are generated server-side from `work_order_code_seq` and formatted as `WO-YYYY-NNNNNN`. Codes are immutable after creation.

The minimum persisted intake fields for `REGISTERED` are clinic, doctor, work type, patient name, promised delivery date, quantity, and priority. The backend validates that the clinic is active, the doctor is active and belongs to the selected clinic, and the selected work type is active.

Pricing is snapshotted on the work order from `WorkType.basePriceMinor` and `LaboratorySettings.currency`. Later catalog price changes do not rewrite existing work order snapshots. Readers without `pricing.read` receive `null` for price fields.

Audit events:

- `work_orders.created`
- `work_orders.updated`
- `works.qr_viewed`
- `works.qr_resolved`
- `works.qr_printed`

The frontend route is:

```text
http://localhost:3000/works
```

Barcode, files, assignments, archive behavior, and a dedicated patient model are intentionally deferred to later tasks. Workflow execution snapshots are implemented separately in WORKFLOW-002.

## QR And Scan

QR-001 adds authenticated QR traceability for work orders. SCAN-002 turns `/scan` into an authenticated operational workspace for explicit workflow actions after a QR or work-code lookup.

Backend endpoints:

- `GET /works/:id/qr`: returns QR metadata and a minimal printable label view without the raw QR payload/token.
- `GET /works/:id/qr-image`: returns a private, non-cached PNG QR image.
- `POST /works/resolve-qr`: resolves a QR payload or work code through authenticated, CSRF-protected backend lookup.
- `POST /works/:id/qr/print`: records label print intent before browser print.
- `POST /scan/resolve`: resolves a QR payload or work code into operational context, read-only, authenticated, rate-limited, and CSRF-free.
- `POST /scan/work-opened`: records explicit work-open intent from the scanner.

Permissions used:

- `works.read_all` for QR view, image, legacy resolve, print audit, and opening full work details.
- `scan.use` for `/scan` route/navigation visibility.
- `scan.resolve` for operational scan context.
- `workflow.start_stage`, `workflow.complete_stage`, `workflow.assign_stage`, and `workflow.reassign_stage` for explicit scan actions.
- `pricing.read` only controls whether resolved work detail includes pricing fields.

QR payloads use the `dl-work:<opaque-token>` format. They do not contain work codes, patient names, pricing, clinic details, or internal database IDs. Existing work orders are backfilled with QR tokens by the QR migration; newly created work orders receive a token in the create transaction. The raw payload is encoded only server-side in the PNG image and accepted as scan input; metadata responses do not expose it.

The frontend shows QR actions inside the work detail drawer and opens a printable label modal. The QR image is fetched as an authenticated PNG Blob and displayed through an object URL. The `/scan` route is lazy-loaded and mobile-first. Camera scanning uses the native browser `BarcodeDetector` API only after the user presses the camera start button; manual work-code or QR-payload entry remains available for desktop, unsupported browsers, denied camera permission, and damaged labels.

Operational scan actions are computed server-side and require explicit user confirmation before any mutation. Start stage, complete stage and stage assignment reuse the existing workflow/assignment endpoints with CSRF and optimistic locking, while scan-specific audit records the source action without raw token, patient, pricing or form values.

Browser access points:

```text
http://localhost:3000/works
http://localhost:3000/scan
```

## Authenticated App Shell

SHELL-001 adds the authenticated frontend shell around the existing product routes.

Routes under the shell:

- `/dashboard`
- `/works`
- `/scan`
- `/clinics`
- `/work-types`
- `/users`
- `/settings`

The shell uses `/auth/me` and `/auth/permissions` through a central frontend API client with cookie credentials. Unauthenticated users are redirected to `/login`, and missing-permission routes render a `403` page without logging out. Navigation items are filtered from the current permission snapshot, but backend RBAC remains the security source of truth.

The login page is now the public entry point. It accepts an optional safe relative `returnTo` parameter, rejects external redirects, clears only the password after failed login, and redirects authenticated users to the first route they can access.

The layout is mobile-first: mobile gets a top bar and drawer navigation; desktop gets a persistent sidebar. Laboratory name and primary color are read from `/settings` only for users with `settings.read`, with a safe fallback when settings are unavailable.

## Design Foundation

Design tokens and base styles live in `packages/ui/src/styles.css` and are imported by the web app through `@dental-lab/ui/styles.css`.

The internal style preview is available at:

```text
http://localhost:3000/style-preview
```

The preview demonstrates semantic colors, operational status colors, typography, spacing, native control states, focus behavior, and elevation tokens. It is not the reusable component library; that is reserved for `UI-002`.

## UI Components

Reusable UI components are exported from `@dental-lab/ui`:

```ts
import {
  Button,
  TextInput,
  Modal,
  DataTable,
} from "@dental-lab/ui";
```

Component styles use the design tokens in `packages/ui/src/styles.css`. Components are generic, accessible where implemented, and contain no business logic.

The internal preview at `http://localhost:3000/style-preview` now demonstrates the core UI components.

Current UI-002 limits:

- QR scanning is implemented as a feature-specific `/scan` route in QR-001, not as a generic `packages/ui` primitive.
- `SignaturePad` is not implemented yet because it belongs to delivery/signature capture work.
- `DataTable` uses controlled sorting/pagination and horizontal scroll on small screens; it does not implement querying, virtualization, resizing, editing, or export.
- `FileUpload` only handles local selection/removal; it does not upload files.

## UX Hardening

`UX-HARDENING-001` hardens the existing Romanian application experience without adding new business features.

The shared UI package provides toast lifecycle controls with finite default durations, max visible toasts, manual close, timer cleanup and `clearToasts()`. The authenticated shell clears stale toasts on logout, expired session and authenticated identity changes.

`Modal` and `Drawer` remain dependency-free in `@dental-lab/ui`, but now use size variants, body lock, focus return, Escape handling, scrollable bodies, stable footers, safe-area padding and mobile `100dvh` sizing. The desktop shell keeps the sidebar fixed to the viewport while navigation and main content scroll independently.

Laboratory settings are Romania-only for the current MVP: `RO`, `ro-RO`, `Europe/Bucharest` and `RON`. Frontend controls show these values as fixed settings, while backend DTO validation rejects unsupported values.

Billing CSV exports are spreadsheet-friendly for Romanian workflows: UTF-8 BOM, CRLF line endings, semicolon delimiter, quoting, formula neutralization, Romanian dates, localized headers/statuses/payment methods and explicit currency columns.

QR scan/print UX shows a stopped-camera placeholder before camera access, keeps QR resolution behind the authenticated backend, avoids exposing raw QR tokens in the label, and provides loading/error/retry states in the QR modal.

## Form Patterns

FORMS-001 standardizes existing frontend form UX without adding new backend business models.

Reusable form layout primitives live in `@dental-lab/ui`:

```ts
import {
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
} from "@dental-lab/ui";
```

Feature forms still own their domain schemas and submit handlers. Shared frontend form behavior lives in `apps/web/src/lib/form-utils.tsx`:

- `normalizeApiError` and `applyApiErrorsToForm` map backend and network errors into field-level or form-level React Hook Form errors.
- `getFormErrorSummaryItems` builds accessible error summary links from form errors.
- `useErrorSummaryFocus` and `focusFirstInvalidField` move focus after invalid submit.
- `useBeforeUnloadPrompt`, `UnsavedChangesPrompt`, and `useCloseGuard` protect dirty forms on refresh, internal navigation, and modal/drawer close.

Validation rules remain split deliberately:

- Simple UX validation stays in frontend Zod schemas.
- Backend DTO validation and RBAC remain the source of truth.
- Business conflicts are shown as form-level errors instead of stack traces or raw objects.

FORMS-001 migrated the current forms for login, users, settings, clinics/doctors, work types, works, and manual QR scan. Work order forms are organized into operational sections: clinic and doctor, patient, work, deadline and priority, and notes. The clinic to doctor dependency resets stale doctors on clinic change.

Read-only users see values without false submit actions where the page is not editable. Save actions are disabled when there are no relevant dirty changes where appropriate. Confirmation dialogs use reusable modal-based actions instead of native `window.confirm`.

Dynamic work form templates are not part of FORMS-001. They are tracked separately as `WORKFORMS-001`, followed by immutable work form completion/snapshot work in `WORKFORMS-002`.

## Work Form Template Builder

`WORKFORMS-001` adds versioned dynamic form templates per work type without changing work orders or saving form answers.

New persisted models:

- `WorkFormTemplate`
- `WorkFormFieldDefinition`

Template statuses are `DRAFT`, `ACTIVE`, and `ARCHIVED`. Only draft templates are editable. Activating a draft is transactional: the API validates the work type, validates the field schema, archives the previous active template for that work type, and activates the new version. PostgreSQL enforces one active template per work type with a partial unique index. Template versions are unique per work type and are allocated under a transaction-level advisory lock instead of `count + 1`.

Supported field types are `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `CHECKBOX`, `RADIO`, `SELECT`, `MULTISELECT`, `TOOTH`, and `SHADE`. Field keys must match `^[a-z][a-z0-9_]{1,63}$`, must be unique per template, and must not use reserved work/order/patient keys. Options are accepted only for option-based fields, must be plain text, must be ordered, and cannot contain duplicate values. Validation is typed to text length, numeric bounds/step, and date bounds only; no regex, scripts, formulas, HTML, file fields, nested groups, repeaters, or conditional logic are supported in this task.

The backend exposes:

- `GET /work-types/:workTypeId/form-templates`
- `GET /work-types/:workTypeId/form-template`
- `GET /work-form-templates/:id`
- `POST /work-types/:workTypeId/form-templates`
- `PATCH /work-form-templates/:id`
- `PUT /work-form-templates/:id/fields`
- `POST /work-form-templates/:id/activate`
- `POST /work-form-templates/:id/archive`
- `POST /work-form-templates/:id/clone`

Read access uses `forms.read`. State-changing endpoints require CSRF and use `forms.create`, `forms.update`, or `forms.archive`. Manager receives all form permissions; Receptie and Tehnician receive read-only access. Audit events are recorded for create, update, replace fields, activate, archive, and clone with safe metadata only.

The frontend builder route is `/work-types/:workTypeId/form`. The work type detail drawer links to it with “Configurează formularul” when `forms.read` is available. The builder shows version history, draft name/description editing, add/edit/remove fields, move up/down ordering, option editing, typed validation controls, live preview using shared form components, read-only mode, and archived WorkType restrictions.

`WORKFORMS-002` adds completed work form submissions on WorkOrders. `POST /works` accepts `workFormSubmission` with `templateId`, `templateVersion` and `values`; the backend loads the active template, validates values, builds the immutable schema snapshot and saves WorkOrder plus submission in one transaction. `PATCH /works/:id` validates edits against the saved snapshot for the same WorkType. `GET /works/:id` returns `workForm` with the saved template name/version, ordered fields and values; the UI renders readable values instead of raw JSON.

Demo/development login can expose `/auth/demo-login` only when `DEMO_MODE=true` and not in production. The frontend renders “Acces rapid pentru demonstrație” in Vite development or when `VITE_DEMO_MODE=true`; no demo password is sent to or bundled in React. Use `pnpm seed:demo` once to prepare the demo data, then `pnpm dev` to run API and web in demo mode.

Open the demo UI at `http://localhost:3000`. Keeping the frontend and API on the same local hostname family avoids CSRF cookie mismatches between `127.0.0.1` and `localhost`.

## Workflow Templates

`WORKFLOW-001` adds versioned production workflow templates per work type. New persisted models are `WorkflowTemplate` and `WorkflowStageDefinition`.

The backend exposes:

- `GET /work-types/:workTypeId/workflow-templates`
- `GET /work-types/:workTypeId/workflow-template`
- `GET /workflow-templates/:id`
- `POST /work-types/:workTypeId/workflow-templates`
- `PATCH /workflow-templates/:id`
- `PUT /workflow-templates/:id/stages`
- `POST /workflow-templates/:id/activate`
- `POST /workflow-templates/:id/archive`
- `POST /workflow-templates/:id/clone`

Workflow templates are versioned per work type. Draft templates can be edited, activated, archived, or cloned. Active and archived templates are read-only. PostgreSQL enforces at most one `ACTIVE` workflow template per work type with a partial unique index, and the service also uses a transaction-level advisory lock during version allocation and activation.

Stages are linear and ordered. The first saved stage is derived as initial, and the last saved stage is derived as final. Each stage has a stable key, name, optional description, optional estimated duration in minutes, and allowed role codes.

Read access uses `workflow.read`. State-changing endpoints require CSRF and use `workflow.create`, `workflow.update`, or `workflow.archive`. Manager receives workflow configuration permissions; Receptie, Logistica and Tehnician keep read access according to RBAC scope. Audit events are recorded for create, update, replace stages, activate, archive and clone with safe metadata only.

The frontend builder route is `/work-types/:workTypeId/workflow`. The work type detail drawer links to it with “Configurează fluxul” when `workflow.read` is available. The builder shows version history, draft metadata editing, add/edit/remove stages, move up/down ordering, allowed role checkboxes, a linear preview, read-only mode and archived WorkType restrictions.

`WORKFLOW-001` does not instantiate workflows on work orders. Runtime workflow snapshots and linear stage transitions are implemented in `WORKFLOW-002`; technician execution UI, assignments, drag-and-drop, branching, parallel stages, QC, logistics and delivery remain in later workflow/operations tasks.

## Workflow Execution

`WORKFLOW-002` adds immutable workflow execution snapshots for work orders.

Backend endpoints:

- `GET /works/:workId/workflow`: current workflow execution, stages, timeline and allowed actions.
- `POST /works/:workId/workflow/stages/:stageExecutionId/start`: starts the current `PENDING` stage.
- `POST /works/:workId/workflow/stages/:stageExecutionId/complete`: completes the current `IN_PROGRESS` stage and advances to the next stage.

When a work order is created, the API copies the active workflow template for its work type into `WorkWorkflowExecution` and `WorkStageExecution`. If no active template exists, the work order is still created and the UI shows an empty workflow state. Later template edits do not rewrite existing work execution snapshots.

Workflow execution state is separate from `WorkOrder.status`. WORKFLOW-002 keeps work orders in their general registered state and stores production progress on the workflow execution records.

Transition endpoints require authentication, CSRF, `workflow.start_stage` or `workflow.complete_stage`, and a role allowed by the current stage snapshot. `ALL` scope acts as manager override and is stored in audit metadata. Optimistic version checks reject stale requests with a conflict message.

The `/works` UI shows workflow progress in the register and a mobile-first workflow section in the work detail drawer with current stage, progress, stage list, timeline, and start/complete actions.

## Patient Registry

PATIENTS-001 adds reusable patient records without introducing internal patient codes. A patient stores first name, last name, optional birth date, sex and limited notes only. The system intentionally does not store CNP, CI, address, phone, email, permanent clinic or permanent doctor on the patient record.

Backend endpoints:

- `GET /patients`
- `GET /patients/options`
- `GET /patients/:id`
- `GET /patients/:id/works`
- `POST /patients`
- `PATCH /patients/:id`
- `POST /patients/:id/archive`
- `POST /patients/:id/restore`

Work orders now have nullable `patientId` plus the existing `patientName` snapshot. Existing data is backfilled deterministically from `patientName`, and `WorkOrder.code` remains the operational identifier. New work creation validates an active `patientId` server-side and snapshots the current patient display name onto the work order.

RBAC adds `patients.read`, `patients.create`, `patients.update`, `patients.archive` and `patients.documents.read`. Patient selector responses are intentionally minimal and do not include notes or document information. Archive/restore and mutations require CSRF where applicable.

The frontend adds `/patients` with registry filters, detail drawer and tabs for Prezentare, Lucrari, Medici si clinici, Documente and Istoric. The `/works` create/edit flow now uses the application-styled patient selector and quick patient creation instead of free-text patient entry.

## Technician Assignments And Workbench

TECH-001 adds current-stage technician assignment and the personal work queue.

Backend endpoints:

- `GET /technicians/options`
- `POST /works/:workId/workflow/stages/:stageExecutionId/assign`
- `POST /works/:workId/workflow/stages/:stageExecutionId/unassign`
- `GET /technician/workbench`
- `GET /technician/workload`

Assignment is stored on `WorkStageExecution`, not on the whole work order. Only the current workflow stage can have one primary assigned technician. When a workflow advances, the next stage starts unassigned.

Technicians can start or complete only their assigned current stage. Managers with broad `ALL` scope can execute or reassign as an override. Reassigning or unassigning an `IN_PROGRESS` stage requires explicit confirmation and writes assignment timeline/audit events.

The `/workbench` UI is mobile-first and shows “Lucrările mele”, queue categories, filters, workload counts for managers, and start/complete actions. The work detail workflow section also includes a “Responsabil” assignment control for users with assignment permissions.

TECH-001 does not implement logistics handoffs, courier delivery, QC, files, notifications, time tracking, payroll, or SCAN-002 actions.

## Technician Claim And Work Ownership

TECH-CLAIM-001A adds active responsibility on the whole work order.

Backend endpoints:

- `GET /works/available-for-claim`
- `GET /works/my-claimed`
- `POST /works/:id/claim`
- `POST /works/:id/release`
- `POST /works/:id/reassign`
- `GET /works/:id/assignment-history`

Technicians can claim available works from `/workbench` and must select the execution company as `NC` or `NG`. The public payload uses the company code, not an internal legal entity ID. Claims are atomic through `claimRevision`; concurrent stale claims return `409`.

Releasing a work removes the active technician and execution company for this task version. Managers can assign or reassign with a required reason. Every claim/release/assign/reassign writes append-only `WorkAssignmentEvent` history and work-order audit entries.

The `/works` registry shows responsibility, technician, execution company and filters for claim status, company and technician. The work drawer includes a `Responsabilitate` card and timeline.

TECH-CLAIM-001B adds the final execution snapshot.

At the first valid claim or manager assignment, the API creates one locked `WorkExecutionSnapshot` in the same transaction as the claim update, assignment event and audit entries. The snapshot stores version `1`, execution company, original technician, pricing resolution, deadline resolution and a small versioned context JSON. The frontend never sends price, total, deadline or source fields in the claim payload.

Pricing is resolved server-side through the canonical pricing resolver with the existing precedence: doctor agreement, clinic agreement, then company catalog. Money is stored only as integer minor units. If no price is available for the selected company and work type, the claim is rejected with `409` and no snapshot/assignment is committed.

For automatic deadlines, execution start is the successful claim timestamp and the deadline snapshot is recalculated once with source `FUTURE_TECH_CLAIM`. Manual deadlines are preserved and captured as manual in the execution snapshot. Unresolved deadlines are allowed and represented explicitly as `UNRESOLVED`; managers see the warning and technicians see that there is no final due date.

Release clears the active technician and execution company on the work order, but never deletes or mutates the execution snapshot. Reclaim must use the same fixed company. Reassign changes only the current technician; company, pricing, original technician and deadline snapshot remain unchanged. Changing the fixed company requires a future controlled administrative repair task.

Financial fields from the execution snapshot are masked server-side unless the user has pricing access. The `/works` registry returns only summary fields; detail view returns the read-only `Context de execuție` card. Assignment history includes snapshot version/status references without duplicating the full snapshot JSON.

TECH-CLAIM-001A/001B do not implement material cycles, time tracking, billing changes, files, notifications, reports, offline or administrative snapshot repair.

## Laboratory Operations

LOGISTICS-001 adds the authenticated operational center at `/logistics`.

The backend module exposes:

- `GET /logistics/center`
- `GET /logistics/center/summary`
- `GET /works/:workId/logistics`
- `POST /works/:workId/logistics/location`
- `POST /works/:workId/logistics/block`
- `POST /works/:workId/logistics/unblock`
- `POST /works/:workId/logistics/ready-for-packing`
- `POST /works/:workId/logistics/start-packing`
- `POST /works/:workId/logistics/complete-packing`
- `GET /delivery-preparation-groups`
- `GET /delivery-preparation-groups/:id`
- `POST /delivery-preparation-groups`
- `PATCH /delivery-preparation-groups/:id`
- `POST /delivery-preparation-groups/:id/works`
- `POST /delivery-preparation-groups/:id/works/remove`
- `POST /delivery-preparation-groups/:id/mark-ready`
- `POST /delivery-preparation-groups/:id/cancel`

Logistics state is stored separately from `WorkOrder.status` and workflow execution. `WorkLogisticsState` tracks the physical location, operational blocking, packing readiness and ready-for-delivery state. `LogisticsEvent` is append-only and stores safe operational metadata only. `DeliveryPreparationGroup` and `DeliveryPreparationItem` represent internal preparation groups by clinic; they are not courier routes and do not confirm delivery.

Billing is visible in logistics only as a document/payment status label. It does not block packing or internal preparation. Prices and financial totals are not exposed in the logistics center response.

`/scan` now includes logistics context after resolving a QR or work code: logistics status, physical location, block reason and active preparation group. Scan still does not mutate logistics automatically.

The demo seed includes representative logistics states and three internal preparation groups. Running the demo seed repeatedly resets and recreates those records deterministically.

## Delivery Planning And Courier Execution

DELIVERY-001 adds the authenticated delivery workspace at `/deliveries`.

The backend module exposes:

- `GET /deliveries`
- `GET /deliveries/:id`
- `GET /couriers/options`
- `POST /delivery-preparation-groups/:groupId/delivery`
- `PATCH /deliveries/:id`
- `POST /deliveries/:id/assign`
- `POST /deliveries/:id/unassign`
- `POST /deliveries/:id/cancel`
- `POST /deliveries/:id/pickup`
- `POST /deliveries/:id/start-transit`
- `POST /deliveries/:id/complete`
- `POST /deliveries/:id/fail`
- `POST /deliveries/:id/reschedule`

Deliveries are created only from READY preparation groups. One active delivery is allowed per preparation group. Pickup changes included works to `HANDED_TO_DELIVERY`; completion changes them to `DELIVERED`. Failed deliveries can be replanned; cancelled pre-pickup deliveries release the preparation group.

Courier access is enforced server-side through `OWN_DELIVERY`. The courier UI and API responses do not expose pricing, payments or invoice totals. Completion now requires a strict internal handover proof: either normalized browser-drawn signature strokes from the recipient or an explicit manager override.

`SIGNATURES-001` adds a dedicated `DeliveryProof` model and private proof endpoints:

- `GET /deliveries/:id/proof`
- `GET /deliveries/:id/proof/print-view`

The proof stores normalized stroke JSON and a SHA-256 hash of the canonical representation. It does not store PNG/base64, photos, GPS, biometric pressure data, raw SVG/HTML, or generic file uploads. The wording is intentionally operational: “Confirmare internă de primire”. It is not a qualified or advanced electronic signature and does not claim legal/fiscal receipt behavior.

The frontend adds a mobile-first signature modal in `/deliveries`, read-only proof display, manager-only “Finalizează fără semnătură” override flow, and `/deliveries/:id/proof/print` with A4 print CSS and the required disclaimer.

`/scan` includes delivery context when a scanned work belongs to the authenticated courier's active delivery and shows a “Deschide livrarea” action in the UI.

The demo seed now includes deterministic deliveries across planned, assigned, picked up, in transit, delivered, failed and unassigned states, including signed proof examples, an override example, and one in-transit delivery ready for live signing.

## Billing Workspace

BILLING-001 adds the first financial workspace at `/billing`.

The backend module exposes:

- `GET /billing/overview`
- `GET /billing/billable-works`
- `GET /billing/search`
- `GET /billing-documents`
- `GET /billing-documents/:id`
- `POST /billing-documents/proformas`
- `POST /billing-documents/invoices`
- `PATCH /billing-documents/:id`
- `PUT /billing-documents/:id/lines`
- `POST /billing-documents/:id/issue`
- `POST /billing-documents/:id/convert-to-invoice`
- `POST /billing-documents/:id/cancel`
- `GET /payments`
- `POST /billing-documents/:id/payments`
- `POST /payments/:id/cancel`
- `GET /billing-series`
- `POST /billing-series`
- `PATCH /billing-series/:id`

New persisted models are `BillingDocument`, `BillingDocumentLine`, `Payment`, and `BillingSeries`.

Money is stored only as integer minor units. Billing totals are line snapshots and issued documents are financially immutable. `paidMinor` and `balanceMinor` are derived from active payments instead of persisted separately. Work orders point to the active invoice through `invoicedDocumentId`; proformas remain historical through document lines and do not block later invoice creation.

Numbering is series-based. Issuing a document increments `BillingSeries.currentNumber` inside the same transaction and formats numbers like `PF-2026-000001` or `FACT-2026-000001`. The database enforces uniqueness on document type, series, and number.

The UI includes month filters, billable works selection, document lists, quick issue/convert/payment actions, month-end grouping, series visibility, CSV export, and HTML print preview. BILLING-001 does not claim legal/fiscal PDF compliance and does not implement RO e-Factura, SPV, VAT engines, accounting, bank reconciliation, email, or SMS.

RBAC uses existing permissions: `finance.read`, `finance.record_payment`, `finance.refund`, `finance.read_reports`, `invoice.create`, `invoice.read`, `invoice.download`, `invoice.cancel`, and `invoice.configure_series`. State-changing billing endpoints require CSRF.

`BILLING-002` adds printable proforma/invoice views, printable billing attachments, clinic/doctor statements, month registry export, CSV formula neutralization, and richer manual collection tracking. The print route is `/billing/documents/:id/print`; print/download/export access is guarded by `invoice.download`, while statements use `finance.read_reports`.

Billing document lines now store `workCreatedAtSnapshot` so printable attachments can show the work entry date from immutable billing snapshots.

## Active Roadmap

After `ROADMAP-REALIGN-002`, the approved order is:

1. `ORG-CONTEXT-001`, then `ORG-DATA-MIGRATION-001`.
2. `PATIENTS-001`, `PRICING-002`, `WORK-DEADLINES-001`.
3. `TECH-CLAIM-001`, `STATUS-001`, `WORK-CYCLES-001`, `WORKFORM-REAL-001`.
4. `BILLING-REALIGN-001`, `PAYMENTS-002`, `DOCUMENTS-001`, `COLLABORATION-TERMS-001`.
5. `OFFLINE-001`, `DASHBOARD-002`, `SEARCH-001`, `REPORTS-001`, `AUDIT-UI-001`, `DEMO-REAL-DATA-001`, `E2E-001`, `SECURITY-001`, `DEPLOY-001`.

Deferred legacy tasks remain documented until revalidated: `FILES-001`, `FILES-002`, `QC-001`, `NOTIFICATIONS-001`, and `DEMO-POLISH-001`.

Payments in the current MVP are manual evidence only. Users can record partial or full collections, receipt numbers, receipt dates, bank references and notes, and the app derives `UNPAID`, `PARTIALLY_PAID` and `PAID` from active records. The application does not process cards, POS transactions, cash register flows, checkout, bank reconciliation, legal fiscal receipts, or automated receipt fiscalization.

## Demo Dataset

`DEMO-SEED-001` adds a development-only realistic dataset. It keeps the base seed small and separate.

```bash
pnpm seed:demo
pnpm --filter @dental-lab/api prisma:db:reset-demo
```

The demo scripts require an explicit guard and refuse `NODE_ENV=production`. Demo accounts, stable search values and the presentation flow are documented in `DEMO.md` and `DEMO-SCRIPT.md`.

## Current Task

See `IMPLEMENTATION_STATUS.md` for task progress and manual testing checklists.
