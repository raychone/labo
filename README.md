# Dental Lab Management

Custom management application for a Romanian dental laboratory.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod.
- Backend: NestJS, TypeScript, REST API.
- Database: PostgreSQL with Prisma.
- Package manager: pnpm workspace.

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
pnpm dev:api
curl http://localhost:3000/health
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
http://localhost:5173/users
```

The page is mobile-first and uses the shared UI components for controls, table, drawer, modal, badges, and toasts.

## Laboratory Settings

SETTINGS-001 adds a global singleton settings record for the single laboratory instance. The Prisma model is `LaboratorySettings`, stored in `laboratory_settings`, with a unique `key = "default"` so the API cannot create arbitrary settings rows.

Default development values:

- `laboratoryName`: `Dental Lab Management`
- `countryCode`: `RO`
- `timezone`: `Europe/Bucharest`
- `locale`: `ro-RO`
- `currency`: `RON`
- `primaryColor`: `#0f766e`

Backend endpoints:

- `GET /settings`: protected with `settings.read`.
- `PATCH /settings`: protected with `settings.update` and CSRF.

Supported locale/timezone/currency values for MVP:

- Locales: `ro-RO`, `en-US`, `fr-FR`
- Timezones: `Europe/Bucharest`, `Europe/Paris`, `UTC`
- Currencies: `RON`, `EUR`

The `/settings` frontend route displays profile, fiscal identity, contact, address, localization, and minimal branding fields. Users with only `settings.read` get read-only access. Logo upload is intentionally deferred until private file storage is implemented; `logoFileKey` remains nullable.

Settings updates write `settings.updated` audit events with changed field names and safe before/after metadata.

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
http://localhost:5173/clinics
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
http://localhost:5173/work-types
```

Categories, clinic-specific pricing, discounts, VAT, invoices, quotations, price books, and price history tables are intentionally not implemented in WORKTYPES-001.

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
http://localhost:5173/works
```

Workflow execution, barcode, files, assignments, archive behavior, and a dedicated patient model are intentionally deferred to later tasks.

## QR And Scan

QR-001 adds authenticated QR traceability for work orders.

Backend endpoints:

- `GET /works/:id/qr`: returns QR metadata and a minimal printable label view.
- `GET /works/:id/qr-image`: returns a private, non-cached PNG QR image.
- `POST /works/resolve-qr`: resolves a QR payload or work code through authenticated, CSRF-protected backend lookup.
- `POST /works/:id/qr/print`: records label print intent before browser print.

Permissions used:

- `works.read_all` for QR view, image, resolve, and print audit.
- `pricing.read` only controls whether resolved work detail includes pricing fields.

QR payloads use the `dl-work:<opaque-token>` format. They do not contain work codes, patient names, pricing, clinic details, or internal database IDs. Existing work orders are backfilled with QR tokens by the QR migration; newly created work orders receive a token in the create transaction.

The frontend shows QR actions inside the work detail drawer and opens a printable label modal. The `/scan` route is lazy-loaded and mobile-first. Camera scanning uses the native browser `BarcodeDetector` API only after the user presses the camera start button; manual work-code or QR-payload entry remains available for desktop, unsupported browsers, denied camera permission, and damaged labels.

Browser access points:

```text
http://localhost:5173/works
http://localhost:5173/scan
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
http://localhost:5173/style-preview
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

The internal preview at `http://localhost:5173/style-preview` now demonstrates the core UI components.

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

Dynamic work form templates are not part of FORMS-001. They are tracked separately as `WORKFORMS-001`, followed by immutable work form completion/snapshot work in `FORMS-002`.

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

The frontend builder route is `/work-types/:workTypeId/form`. The work type detail drawer links to it with “Configureaza formularul” when `forms.read` is available. The builder shows version history, draft name/description editing, add/edit/remove fields, move up/down ordering, option editing, typed validation controls, live preview using shared form components, read-only mode, and archived WorkType restrictions. It does not submit values, create WorkOrders, render dynamic fields inside `/works`, or create a submission/snapshot model; that remains `FORMS-002`.

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

## Roadmap After Billing

After BILLING-001, the approved order is:

1. `BILLING-002` - printable billing documents and clinic statements.
2. `DEMO-SEED-001` - realistic demonstration dataset.
3. `WORKFORMS-001` - work form template builder.
4. `FORMS-002` - work form completion and immutable snapshot.
5. `WORKFLOW-001`, `WORKFLOW-002`, `TECH-001`, `SCAN-002`, `LOGISTICS-001`, `DELIVERY-001`, `SIGNATURES-001`.
6. `DASHBOARD-001`, `SEARCH-001`, `REPORTS-001`, `AUDIT-UI-001`, `DEMO-POLISH-001`, `E2E-001`, `SECURITY-001`, `DEPLOY-001`.

Deferred but preserved in the plan: `FILES-001`, `FILES-002`, `QC-001`, and `NOTIFICATIONS-001`.

Payments in the current MVP are manual evidence only. Users can record partial or full collections, receipt numbers, receipt dates, bank references and notes, and the app derives `UNPAID`, `PARTIALLY_PAID` and `PAID` from active records. The application does not process cards, POS transactions, cash register flows, checkout, bank reconciliation, legal fiscal receipts, or automated receipt fiscalization.

## Demo Dataset

`DEMO-SEED-001` adds a development-only realistic dataset. It keeps the base seed small and separate.

```bash
pnpm --filter @dental-lab/api prisma:db:seed
pnpm --filter @dental-lab/api prisma:db:seed:demo
pnpm --filter @dental-lab/api prisma:db:reset-demo
```

The demo scripts require an explicit guard and refuse `NODE_ENV=production`. Demo accounts, stable search values and the presentation flow are documented in `DEMO.md` and `DEMO-SCRIPT.md`.

## Current Task

See `IMPLEMENTATION_STATUS.md` for task progress and manual testing checklists.
