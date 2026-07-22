# Implementation Status

## Overall Progress

12%

## FOUNDATION

- [x] FOUNDATION-001 - Initialize monorepo
- [x] FOUNDATION-002 - Docker Compose development

## UI

- [x] UI-001 - Design tokens and base styles
- [ ] UI-002 - Core UI components

## AUTH

- [ ] AUTH-001 - Auth backend

## RBAC

- [ ] RBAC-001 - Permission model

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

UI-002

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
- Use plain CSS custom properties in `packages/ui/src/styles.css` as the design token source of truth.
- Keep UI-001 limited to base styles, tokens, native element defaults, layout utilities, and an internal style preview.
- Avoid introducing a CSS framework for UI-001 because the existing CSS mechanism is sufficient.

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
