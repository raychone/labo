# CORE-ROLE-UX-001 - Simplify and polish Manager, Reception and Technician workflows

## Status

COMPLETED

## Objective

Make the existing application clear, fast and easy to use and demonstrate for the three core roles: Manager, Recepție and Tehnician. Use existing functionality and business rules; do not add major new business modules.

The main demo flow must cover reception login and work registration, patient/clinic/doctor/work-type selection, laboratory sheet save or completion, technician login and claim with `NC`/`NG`, technician sheet/workflow continuation, manager status review, `NC`/`NG` switch, billable-work discovery, proforma/invoice issue, payment recording, and unpaid/overdue invoice discovery.

## Dependencies

- BILLING-REALIGN-001B
- STATUS-001B
- WORKFORM-REAL-001B
- WORK-CYCLES-001B
- TECH-CLAIM-001B
- ORG-CONTEXT-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../modules/works.md](../modules/works.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/patients.md](../modules/patients.md)
- [../modules/clinics-doctors.md](../modules/clinics-doctors.md)
- [../modules/qr.md](../modules/qr.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

### Role-based landing experiences

- Manager landing: operational overview, status shortcuts, overdue works, incomplete sheets, billable works, unpaid and overdue invoices, active `NC`/`NG` context.
- Reception landing: works arriving today, prominent `Lucrare nouă`, `Înregistrează revenirea`, incomplete laboratory sheets, search and QR shortcuts, status shortcut.
- Technician landing: available works, claimed works, works in progress, overdue works, incomplete sheets, QR shortcut.
- Reuse and compose existing pages and APIs. Do not build duplicate dashboard systems.

### Sidebar and navigation

- Simplify navigation per permission set using Romanian labels and logical groups.
- Recommended groups: `Operațional`, `Tehnician`, `Management`.
- Visibility must remain permission-driven with no role-name checks.
- Keep stable desktop sidebar, equivalent mobile drawer, obvious active route and no irrelevant menu entries.
- Do not delete valid routes.

### Primary actions

- Reception: `Lucrare nouă`, `Înregistrează revenirea`, `Completează fișa`, `Scanează QR`.
- Technician: `Preia lucrarea`, `Continuă fișa`, `Începe etapa`, `Finalizează etapa`.
- Manager: `Schimbă firma NC/NG`, `Vezi status`, `Emite proformă`, `Emite factură`, `Înregistrează încasare`, `Vezi restanțe`.
- Avoid multiple competing primary actions in one surface.

### Core pages

- Improve `/works` layout without changing business rules: prominent work code, grouped patient/clinic/doctor/type, cycle, stage/progress, technician, `NC`/`NG`, deadline, sheet state, manager-only billing state, compact filters, desktop table, mobile cards and reachable critical actions.
- Reorganize work detail into coherent tabs or accordions: `Prezentare`, `Fișă laborator`, `Flux tehnologic`, `Cicluri`, `Logistică`, `Livrare`, manager-only `Facturare`, `Istoric`.
- Improve existing real laboratory sheet UX: state badge, cycle selector, logical field groups, mobile layout, easy save/finalize actions, validation summary, first-invalid focus/scroll, dirty-state guard where practical, historical cycles read-only.
- Improve `/workbench`: tabs/groups for `Disponibile`, `Lucrările mele`, `În lucru`, clear claim action, `NC`/`NG` selector only during claim, stage/deadline/sheet/cycle display, workload summary, no financial data.
- Improve `/status`: readable counters, obvious tabs, compact/collapsible mobile filters, prominent stage/progress, consistent overdue colors, `NC`/`NG`, sheet state, cycle and easy work detail opening. Read-only only.
- Polish `/billing` only: clear active company header, readable counters/tabs/filters, payment-state badges, simple manual payment modal, readable responsive tables/cards and existing search. No new billing rules.

### Overlays, forms and feedback

- Audit Manager, Reception and Technician overlays for correct scrolling, 100dvh/safe-area behavior, header/footer usability, close/Escape behavior, focus return where practical, visible primary actions and no clipped content.
- Standardize affected forms: labels, helper text, required indicators, validation messages, spacing, error summaries, action placement, read-only/disabled states, mobile keyboard behavior and Romanian text with diacritics.
- Standardize feedback: finite toast duration, manual close, cleanup on logout and identity change, specific success/error messages, loading/empty states and retries where appropriate.

### Visual consistency and performance

- Improve spacing, hierarchy, card density, tables, badges, buttons, sidebar, breadcrumbs, company switch, responsive breakpoints, status colors, contrast and keyboard focus using the existing design system.
- Within affected routes, lazy-load heavy routes where practical, inspect the Vite large chunk warning, split clearly separable route chunks when justified and document the warning if it remains.

### Manual demo script

- Create or update a manual demo script covering Reception, Technician and Manager flows listed in the objective.

## Out of scope

- New business modules.
- BILLING-REALIGN-001C.
- Courier UX.
- Doctor portal.
- Notifications.
- Offline sync.
- Materials.
- Inventory.
- Printable documents.
- e-Factura.
- Payment processing.
- Manager correction of finalized sheets.
- Global rebranding.
- UI framework replacement.
- DEMO-POLISH-002.
- Any next task.

## Business decisions

- Confirmed: Keep existing business rules and APIs unless a proven integration bug requires a minimal fix.
- Confirmed: Navigation, route access and financial visibility remain permission-driven, not role-name-driven.
- Confirmed: `DEMO-POLISH-002` remains planned and unstarted.
- Requires business confirmation: any new correction workflow, offline sync, new fiscal/legal document output, or major module expansion.

## Data model changes

- None expected.

## API changes

- Prefer existing APIs. Minimal additive read APIs are allowed only if necessary for landing summaries and must preserve RBAC and masking.

## UI changes

- Role-based landing composition.
- Simplified navigation.
- Focused polish across `/works`, work detail, laboratory sheet, `/workbench`, `/status`, `/billing`, overlays, forms and feedback.

## Security and RBAC

- Server-side RBAC remains canonical.
- No financial data for users without financial permissions.
- No role-name checks for access decisions.
- Existing routes remain protected.

## Audit

- No new audit events expected unless a new critical mutation is introduced. This task should primarily compose and polish existing flows.

## Task-specific tests

- Permission-driven route/navigation visibility.
- Landing experiences and primary actions.
- Works registry and work detail organization.
- Laboratory sheet validation/finalization UX where testable.
- Workbench flows and no financial leakage.
- Status filters and responsive presentation.
- Billing tabs/payment modal.
- Modal/drawer scrolling behavior where testable.
- Toast cleanup.
- Company context switching.
- Mobile/desktop rendering.
- Regressions across existing core flows.

## Acceptance criteria

1. Manager, Reception and Technician have clear landing experiences.
2. Navigation is permission-driven and simplified.
3. Primary actions are easy to find.
4. `/works` is clearer on desktop and mobile.
5. Work detail has coherent tabs/accordions.
6. Laboratory-sheet UX is practical.
7. Technician workbench is easier to use.
8. `/status` is clear and responsive.
9. `/billing` is clear and responsive.
10. Core overlays scroll correctly.
11. Forms and validation are consistent.
12. Toast and feedback behavior is consistent.
13. Romanian labels are used throughout affected screens.
14. Financial data does not leak.
15. `NC`/`NG` context is clear and safe.
16. Existing business rules remain unchanged.
17. Heavy routes are lazy-loaded where justified.
18. Vite warning is reduced or documented.
19. Tests pass.
20. Typecheck passes.
21. Build passes.
22. Manual demo flow is documented.
23. No unrelated feature work is included.
24. Documentation is updated.
25. Exactly one logical implementation commit is created.
26. Tracked working tree is clean.
27. DEMO-POLISH-002 is not started.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../tasks/README.md](README.md)
- affected module docs
- manual demo script
- this task document

## Implementation notes

- Added permission-aware `/dashboard` Manager, Recepție and Tehnician panels using existing works deadline, billing overview and technician workbench read APIs.
- Simplified route navigation labels/groups while preserving permission-driven visibility and existing route protection.
- Added reception-oriented `/works` deadline counters and quick filters without changing work-order business rules.
- Clarified `/status` and `/workbench` role copy and primary paths into existing work detail flows.
- Moved manual payment recording in `/billing` into a modal over the existing audited mutation.
- Added regression coverage for the role-aware dashboard and kept existing works/status/billing tests passing.
- Production build still reports the existing Vite warning for `index` at about 513 kB after minification. Core route pages are already lazy-loaded; deeper vendor/manual chunking remains a future performance task.
- No schema, migration, seed, asset, e-Factura, fiscal receipt, POS/card, bank reconciliation or ambiguous-legacy correction changes were introduced.

## Commit

`CORE-ROLE-UX-001: simplify core role workflows`

## Next task

`DEMO-POLISH-002` remains planned. Stop after this task.
