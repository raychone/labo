# Implementation Status

## Overall Progress

4%

## FOUNDATION

- [x] FOUNDATION-001 - Initialize monorepo
- [ ] FOUNDATION-002 - Docker Compose development

## UI

- [ ] UI-001 - Design tokens and base styles
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

Waiting for approval after FOUNDATION-001

## Next Task

FOUNDATION-002

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

## Manual Testing Checklist

### FOUNDATION-001

- [x] Install dependencies with `pnpm install`.
- [x] Run type checks with `pnpm typecheck`.
- [x] Run automated tests with `pnpm test`.
- [x] Run production builds with `pnpm build`.
- [x] Start the frontend dev server with `pnpm --filter @dental-lab/web dev`.
- [x] Start the backend dev server with `pnpm --filter @dental-lab/api start:dev`.
