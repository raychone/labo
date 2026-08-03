# Master Plan

This is the canonical source of truth for task order and status.

Allowed statuses: `COMPLETED`, `IN PROGRESS`, `APPROVED`, `AWAITING APPROVAL`, `PLANNED`, `BLOCKED`, `DEFERRED`, `ON HOLD`, `CANCELLED`.

## Current

| Field | Value |
|---|---|
| Current task | NONE / AWAITING APPROVAL |
| Status | AWAITING APPROVAL |
| Last completed task | DOCS-TOKEN-001 |
| Last completed functional task | TECH-CLAIM-001B |
| Last completed functional commit | `ccba29a TECH-CLAIM-001B: lock execution pricing and deadline snapshot` |
| Next approved task | STATUS-001A |

## Roadmap

| Phase | Task | Status | Dependencies | Result | Task doc |
|---|---|---|---|---|---|
| foundation | FOUNDATION-001 | COMPLETED | none | monorepo initialized | historical root docs |
| foundation | FOUNDATION-002 | COMPLETED | FOUNDATION-001 | Docker/dev foundation | historical root docs |
| UI foundation | UI-001 | COMPLETED | FOUNDATION-001 | design tokens/base styles | historical root docs |
| UI foundation | UI-002 | COMPLETED | UI-001 | core UI components | historical root docs |
| authentication | AUTH-001 | COMPLETED | FOUNDATION-002 | secure backend auth | historical root docs |
| RBAC | RBAC-001 | COMPLETED | AUTH-001 | permission model | [modules/rbac.md](modules/rbac.md) |
| users | USERS-001 | COMPLETED | RBAC-001 | user management | [modules/users.md](modules/users.md) |
| settings | SETTINGS-001 | COMPLETED | RBAC-001 | lab settings | [modules/settings.md](modules/settings.md) |
| organizations | ORG-CONTEXT-001 | COMPLETED | SHELL-001 | NC/NG context | [modules/organizations.md](modules/organizations.md) |
| organizations | ORG-DATA-MIGRATION-001 | COMPLETED | ORG-CONTEXT-001 | company-aware settings/data | [modules/organizations.md](modules/organizations.md) |
| clinics/doctors | CLINICS-001 | COMPLETED | RBAC-001 | clinic and doctor registry | [modules/clinics-doctors.md](modules/clinics-doctors.md) |
| patients | PATIENTS-001 | COMPLETED | CLINICS-001 | patient registry | [modules/patients.md](modules/patients.md) |
| work types | WORKTYPES-001 | COMPLETED | RBAC-001 | work type registry | [modules/work-types.md](modules/work-types.md) |
| works | WORKS-001 | COMPLETED | WORKTYPES-001, CLINICS-001 | work order creation | [modules/works.md](modules/works.md) |
| QR | QR-001 | COMPLETED | WORKS-001 | QR generation/scan base | [modules/qr.md](modules/qr.md) |
| shell | SHELL-001 | COMPLETED | AUTH-001, RBAC-001 | authenticated navigation | [ARCHITECTURE.md](ARCHITECTURE.md) |
| forms | FORMS-001 | COMPLETED | UI-002 | form UX patterns | [modules/forms.md](modules/forms.md) |
| forms | WORKFORMS-001 | COMPLETED | FORMS-001, WORKTYPES-001 | work form template builder | [modules/forms.md](modules/forms.md) |
| forms | WORKFORMS-002 | COMPLETED | WORKFORMS-001, WORKS-001 | work form submissions/snapshots | [modules/forms.md](modules/forms.md) |
| pricing | PRICING-002 | COMPLETED | ORG-DATA-MIGRATION-001, WORKTYPES-001 | company pricing and agreements | [modules/pricing.md](modules/pricing.md) |
| deadlines | WORK-DEADLINES-001A | COMPLETED | PRICING-002 | deadline engine/calendar | [modules/deadlines.md](modules/deadlines.md) |
| deadlines | WORK-DEADLINES-001B | COMPLETED | WORK-DEADLINES-001A | persisted deadlines | [modules/deadlines.md](modules/deadlines.md) |
| deadlines | WORK-DEADLINES-001C | COMPLETED | WORK-DEADLINES-001B | operational deadline UI | [modules/deadlines.md](modules/deadlines.md) |
| technician claim | TECH-CLAIM-001A | COMPLETED | WORKFLOW-002, TECH-001 | claim/release/reassign ownership | [tasks/TECH-CLAIM-001A.md](tasks/TECH-CLAIM-001A.md) |
| technician claim | TECH-CLAIM-001B | COMPLETED | TECH-CLAIM-001A, PRICING-002, WORK-DEADLINES-001C | locked execution snapshot | [tasks/TECH-CLAIM-001B.md](tasks/TECH-CLAIM-001B.md) |
| documentation | DOCS-TOKEN-001 | COMPLETED | TECH-CLAIM-001B | token-efficient permanent docs | [tasks/DOCS-TOKEN-001.md](tasks/DOCS-TOKEN-001.md) |
| technician claim | TECH-CLAIM-001C | DEFERRED | TECH-CLAIM-001B | lifecycle recovery hardening, not required for current MVP | [tasks/TECH-CLAIM-001C.md](tasks/TECH-CLAIM-001C.md) |
| workflow | WORKFLOW-001 | COMPLETED | WORKTYPES-001 | workflow templates | [modules/workflow.md](modules/workflow.md) |
| workflow | WORKFLOW-002 | COMPLETED | WORKFLOW-001, WORKS-001 | workflow execution | [modules/workflow.md](modules/workflow.md) |
| technician execution | TECH-001 | COMPLETED | WORKFLOW-002 | assignment/workbench base | [modules/technician-execution.md](modules/technician-execution.md) |
| scan | SCAN-002 | COMPLETED | QR-001, WORKFLOW-002 | operational scan actions | [modules/qr.md](modules/qr.md) |
| logistics | LOGISTICS-001 | COMPLETED | WORKS-001, WORKFLOW-002 | operational logistics center | [modules/logistics.md](modules/logistics.md) |
| delivery | DELIVERY-001 | COMPLETED | LOGISTICS-001 | courier planning/execution | [modules/delivery.md](modules/delivery.md) |
| signatures | SIGNATURES-001 | COMPLETED | DELIVERY-001 | internal delivery proof | [modules/signatures.md](modules/signatures.md) |
| billing | BILLING-001 | COMPLETED | WORKS-001, PRICING-002 | billing workspace/payments | [modules/billing.md](modules/billing.md) |
| billing | BILLING-002 | COMPLETED | BILLING-001 | printable docs/statements | [modules/billing.md](modules/billing.md) |
| status | STATUS-001A | APPROVED | TECH-CLAIM-001B, WORKFLOW-002, LOGISTICS-001, DELIVERY-001 | operational status read model and API | [tasks/STATUS-001A.md](tasks/STATUS-001A.md) |
| materials | MATERIALS-001 | PLANNED | STATUS-001A | material catalog/selection | [modules/materials.md](modules/materials.md) |
| inventory | INVENTORY-001 | PLANNED | MATERIALS-001 | stock, NIR, consumption | [modules/inventory.md](modules/inventory.md) |
| dashboard | DASHBOARD-001 | DEFERRED | SHELL-001 | legacy operational dashboard | [modules/dashboard.md](modules/dashboard.md) |
| dashboard | DASHBOARD-002 | PLANNED | STATUS-001 | real workflow dashboard | [modules/dashboard.md](modules/dashboard.md) |
| search | SEARCH-001 | PLANNED | core modules | global search | [modules/search.md](modules/search.md) |
| reports | REPORTS-001 | PLANNED | billing, workflow, delivery | reports | [modules/reports.md](modules/reports.md) |
| audit | AUDIT-UI-001 | PLANNED | audit logs | audit viewer UI | [modules/audit.md](modules/audit.md) |
| demo | DEMO-SEED-001 | COMPLETED | core modules | realistic demo dataset | [modules/demo.md](modules/demo.md) |
| demo | DEMO-REAL-DATA-001 | PLANNED | real workflow tasks | validated NC/NG demo dataset | [modules/demo.md](modules/demo.md) |
| security | SECURITY-001 | PLANNED | MVP core | security hardening | [SECURITY.md](SECURITY.md) |
| performance | PERFORMANCE-001 | PLANNED | MVP core | performance pass | [ARCHITECTURE.md](ARCHITECTURE.md) |
| E2E | E2E-001 | PLANNED | MVP critical flows | end-to-end coverage | [TESTING.md](TESTING.md) |
| deployment | DEPLOY-001 | PLANNED | E2E-001, SECURITY-001 | staging deployment | [ARCHITECTURE.md](ARCHITECTURE.md) |

## Deferred Or On Hold

- `FILES-001`, `FILES-002`: private file storage and lifecycle are deferred.
- `QC-001`: quality control is deferred.
- `NOTIFICATIONS-001`: operational notifications are deferred.
- `PAYMENTS-002`: manual payment evidence realignment is planned but not started.
- `TECH-CLAIM-001C`: deferred because TECH-CLAIM-001A/B cover current MVP claim needs and stale-claim recovery lacks validated business rules.
- `DOCUMENTS-001`, `COLLABORATION-TERMS-001`, `OFFLINE-001`, `STATUS-001`, `WORK-CYCLES-001`, `WORKFORM-REAL-001`: planned future work; details require task-specific confirmation.
