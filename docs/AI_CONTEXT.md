# AI Context

Dental Lab Management is a custom Romanian dental laboratory management application. It supports one shared operational laboratory workflow with two legal/financial contexts: `NC` (Nicolaie Cristina) and `NG` (Nicolaie Gabriel). This is not multi-tenant SaaS; users and operational work are shared, while settings, pricing, documents, payments, and financial reporting are company-aware where implemented.

## Users And Roles

Current role keys are `MANAGER`, `LOGISTICA`, `RECEPTIE`, `TEHNICIAN`, `CURIER`, and `MEDIC`. Managers administer users, settings, pricing, billing, and cross-company operational flow. Reception registers and edits works. Logistics manages physical flow and delivery preparation. Technicians use a workbench to claim and execute assigned work. Couriers operate deliveries. Medic access is limited/demo-oriented and must not be assumed as a full portal unless a task explicitly implements it.

## Architecture

The repository is a pnpm monorepo:

- `apps/api`: NestJS REST API, Prisma, PostgreSQL, cookie auth, RBAC, audit.
- `apps/web`: React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod.
- `packages/shared`: shared typed contracts and pure helpers.
- `packages/ui`: reusable mobile-first UI primitives and components.
- `packages/config`: shared TypeScript config.

Backend controllers are thin; business logic belongs in services. DTOs use class-validator/class-transformer. Prisma migrations are deterministic and versioned. Frontend features live under `apps/web/src/features`, with route protection in `apps/web/src/app`.

## Authentication, RBAC, Security

Authentication uses server-side sessions stored in PostgreSQL. The browser receives an httpOnly session cookie and a readable CSRF cookie. Mutating requests send `x-csrf-token`. Passwords use Argon2id. Login has rate limiting. Inactive users are denied. Backend RBAC is canonical; frontend route guards and hidden actions are only UX.

Financial data must be masked server-side. Never trust frontend validation or calculated values. Use minor currency units for money. Critical actions require audit events.

## Implemented Modules

Implemented or substantially implemented:

- auth, CSRF, sessions, demo login;
- RBAC roles, permissions, scopes, overrides;
- users;
- company context `NC`/`NG` and company-aware settings;
- clinics and doctors;
- patients;
- work types;
- work orders with QR, forms, deadlines, claim ownership, execution snapshots;
- work form templates and runtime submissions;
- workflow templates and stage execution;
- technician workbench and workload;
- pricing catalog, execution rules, clinic/doctor agreements, preview resolver;
- logistics center and delivery preparation groups;
- deliveries and internal proof/signature rendering;
- billing documents, payments, statements, exports;
- operational status read-model API;
- demo seed.

Planned or partial:

- materials and inventory;
- dashboard/status evolution;
- search;
- reports;
- audit UI;
- security hardening, performance, E2E, deployment.

## Current Status

Last completed functional task: `STATUS-001A`, which added the backend/read-model API foundation for operational status.

Last completed documentation task: `DOCS-TOKEN-001`, which created the permanent token-efficient documentation system under `docs/`.

`TECH-CLAIM-001C` is deferred and does not block the operational MVP. No automatic claim timeout or background reassignment exists; manual manager release/reassign remains the current recovery mechanism and execution snapshots remain immutable.

No next task is currently approved. `STATUS-001B` is the likely follow-up if the frontend operational status page is approved.

## Source Of Truth

For implementation reality, trust in order:

1. code;
2. migrations;
3. tests;
4. seed;
5. recent coherent documentation.

For status and task order, use [MASTER_PLAN.md](MASTER_PLAN.md). For module rules, use [modules/](modules/README.md). For permanent rules, use [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md).

If a future business rule is not confirmed, mark it `TBD`, `Requires business confirmation`, or `Open decision`. Do not invent it.

## Standard Verification

Normal final verification:

```bash
pnpm --filter @dental-lab/api prisma:validate
pnpm --filter @dental-lab/api prisma:generate
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Run migrations only when a task changes Prisma schema. Run demo seed only when a task changes seed/demo behavior.

## Read For Details

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DOMAIN_MODEL.md](DOMAIN_MODEL.md)
- [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md)
- [SECURITY.md](SECURITY.md)
- [TESTING.md](TESTING.md)
- [modules/README.md](modules/README.md)
- [tasks/README.md](tasks/README.md)
