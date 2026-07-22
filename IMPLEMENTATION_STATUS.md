# Implementation Status

## Overall Progress

24%

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

- [ ] USERS-001 - User management

## SETTINGS

- [ ] SETTINGS-001 - Laboratory settings

## CLINICS

- [ ] CLINICS-001 - Clinics and doctors

## WORK TYPES

- [ ] WORKTYPES-001 - Work types and pricing base

## WORKS

- [ ] WORKS-001 - Work order creation

## QR

- [ ] QR-001 - QR generation and scan

## FILES

- [ ] FILES-001 - Private file upload

## WORKFLOW

- [ ] WORKFLOW-001 - Workflow templates
- [ ] WORKFLOW-002 - Workflow execution snapshot

## LOGISTICS

- [ ] LOGISTICS-001 - Planning and assignment

## TECHNICIAN

- [ ] TECH-001 - Technician workbench

## QUALITY

- [ ] QC-001 - Quality control

## COURIER

- [ ] COURIER-001 - Delivery routes and courier mobile UI

## PAYMENTS

- [ ] PAYMENTS-001 - Payments and balances

## INVOICE

- [ ] INVOICE-001 - Invoice PDF and numbering

## REPORTS

- [ ] REPORTS-001 - Operational and financial reports

## AUDIT

- [ ] AUDIT-001 - Audit viewer

## SECURITY

- [ ] SECURITY-001 - Security hardening

## E2E

- [ ] E2E-001 - End-to-end critical flows

## DEPLOY

- [ ] DEPLOY-001 - Staging deployment

## Current Task

NONE / AWAITING APPROVAL

## Next Task

USERS-001

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
- Evaluate RBAC from the database so access changes take effect without relogin.
- Treat `ALL` as the only broad scope; ownership scopes remain distinct.
- Use plain CSS custom properties in `packages/ui/src/styles.css` as the design token source of truth.
- Keep UI-001 limited to base styles, tokens, native element defaults, layout utilities, and an internal style preview.
- Avoid introducing a CSS framework for UI-001 because the existing CSS mechanism is sufficient.
- Keep UI-002 components framework-free and token-driven inside `packages/ui`.
- Use native controls for select, checkbox, radio, switch, file input, and table semantics where possible.
- Use internal portal/focus management for Modal and Drawer instead of adding an overlay dependency.
- Keep QRScanner and SignaturePad out of UI-002 because they depend on device/browser functional flows.

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
  - Public role/user management is intentionally deferred to `USERS-001`.
