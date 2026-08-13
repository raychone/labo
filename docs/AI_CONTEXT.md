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
- patients with optional clinic/doctor referral metadata on the record;
- work types;
- work orders with QR, forms, deadlines, claim ownership, execution snapshots;
- work form templates and runtime submissions;
- real laboratory sheet templates, cycle-scoped sheet submissions, operational draft/complete/final states, finalization, and work-detail/workbench/scan/status integrations;
- workflow templates and stage execution;
- technician workbench and workload, including technician color preferences surfaced as badges in `/status`;
- technician execution lifecycle with execution-first work drawer ordering, stage action labeling, and search-based workbench narrowing;
- pricing catalog, execution rules, clinic/doctor agreements, preview resolver;
- real Creative Dental price list reconciliation and asset-backed printable document alignment;
- logistics center and delivery preparation groups;
- deliveries and internal proof/signature rendering;
- deliveries and internal proof/signature rendering with cycle-aware delivery item history;
- billing documents, payments, statements, exports, and company-aware billing series/print views;
- manager dashboard is KPI-only and keeps billing entry points company-scoped;
- billing filters stay collapsed by default and expand on demand;
- billing overview cards are clickable shortcuts into the related tabs, and the note de plată print view can be scoped to selected documents from the current clinic or doctor statement;
- reception work creation uses searchable patient/work-type pickers, quick patient creation, keyboard navigation, and controlled dynamic checkbox/radio fields;
- operational status read-model API and frontend `/status` workspace;
- dedicated `/status/tv` fullscreen operational status mode for a physical laboratory display, authenticated and read-only, with polling-based refresh and no shell/navigation chrome;
- the TV mode is a presentation layer over the same read model, with compact operational slices, larger typography, and automatic page rotation for wall displays;
- backend work-cycle model, active-cycle lifecycle APIs, cycle-scoped workflow/logistics/delivery history, and returned-work registration UI;
- demo seed.

Planned or partial:

- materials and inventory;
- dashboard/status evolution beyond the implemented `/status` workspace and role-composed `/dashboard` panels;
- search;
- reports;
- audit UI;
- security hardening, performance, E2E, deployment.

## Current Status

Last completed functional task: `TECH-EXECUTION-001`, which surfaces the live technician execution context first in the work drawer, narrows workbench search results to the best match, and keeps current stage actions aligned to live runtime state.

Last completed documentation task: `WORKFORM-REAL-DISCOVERY-001`, which audited the real paper work sheet and produced [discovery/WORKFORM-REAL-FIELD-AUDIT.md](discovery/WORKFORM-REAL-FIELD-AUDIT.md) and [discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md](discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md). `DOCS-TOKEN-001` created the permanent token-efficient documentation system under `docs/`.

`ASSETS-DOCS-001` is in progress and is documenting the real client assets under `assets/`, reconciling the Creative Dental price list against the seeded catalog, and aligning the printable payment-note / invoice templates with the existing company-aware document stack.

`TECH-CLAIM-001C` is deferred and does not block the operational MVP. No automatic claim timeout or background reassignment exists; manual manager release/reassign remains the current recovery mechanism and execution snapshots remain immutable. Technicians can select a personal color that is surfaced as a badge in operational status and workbench views; status filters stay collapsed by default; patient dossiers can carry clinic/doctor referral metadata; manager-only financial tabs stay hidden from non-managers; role navigation is intentionally scoped so technicians stay focused on their own work queue and managers see only manager-facing navigation plus status.

`RECEPTION-TO-DELIVERY-001` is in progress and hardens cycle-scoped history across delivery and proof rendering for repeated returns. `STATUS-TV-001` is completed and adds a dedicated authenticated fullscreen TV mode for the operational status read model; it remains read-only, shows no financial data, and uses polling only. `STATUS-TV-001B` is completed and polishes that TV mode into compact operational slices with automatic page rotation on wall displays. `BILLING-REALIGN-001C` is deferred; ambiguous legacy billing remains read-only until explicitly resumed. `DEMO-POLISH-002` is planned only and must not be started unless explicitly approved.

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
