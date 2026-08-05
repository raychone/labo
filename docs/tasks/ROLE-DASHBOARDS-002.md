# ROLE-DASHBOARDS-002 - Complete core operational dashboards

## Status

COMPLETED

## Objective

Create distinct permission-composed dashboard experiences on the existing protected `/dashboard` route for Manager, Recepție and Tehnician, with useful operational lists, clear actions, no financial leakage, and improved operational-center presentation without changing business rules.

## Dependencies

- CORE-ROLE-UX-001
- STATUS-001B
- WORKFORM-REAL-001B
- TECH-CLAIM-001B
- BILLING-REALIGN-001B

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../modules/works.md](../modules/works.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/billing.md](../modules/billing.md)
- [../modules/qr.md](../modules/qr.md)
- [CORE-ROLE-UX-001.md](CORE-ROLE-UX-001.md)

## Scope

- Build Manager, Recepție and Tehnician dashboard compositions on `/dashboard`.
- Add shared dashboard widgets where useful.
- Reuse existing works, status, technician workbench, claim, billing and logistics read APIs where safe.
- Improve technician dashboard so it is never blank for valid technician permissions.
- Focus reception dashboard on work intake, sheets, returned works and scan/create actions.
- Focus manager dashboard on operational attention, activity and company-scoped finance where permitted.
- Improve overloaded operational-center presentation: wrapping tabs/chips, clear filter bar, row/card spacing and responsive behavior.

## Out of scope

- New core business modules.
- Separate dashboard routes.
- Courier dashboard.
- Doctor dashboard.
- Billing, logistics or workflow rule changes.
- Offline, notifications, materials, inventory, printable documents, manager correction flow, global rebrand, DEMO-POLISH-002 or any other task.

## Business decisions

- Confirmed: Dashboard access/composition is permission-based, not role-name based.
- Confirmed: `NC`/`NG` financial data is visible only with existing finance/invoice permissions.
- Confirmed: Technician `NC`/`NG` selection remains inside the existing claim flow.
- Requires business confirmation: any new mutation, recovery flow, correction flow, notification, polling, WebSocket or KPI definition.

## Data model changes

- None expected.

## API changes

- Prefer existing APIs. Add only minimal read-model fields/endpoints if a required metric cannot be derived safely from existing permission-scoped data.

## UI changes

- Shared dashboard widgets and distinct role compositions on `/dashboard`.
- Operational-center layout improvements.
- Loading, partial-error and empty states per dashboard section.

## Security and RBAC

- Backend RBAC remains canonical.
- No financial data for non-financial permissions.
- No role-name checks for authorization.

## Audit

- No new audit events expected; this task is read-only UI composition over existing audited actions.

## Task-specific tests

- Technician dashboard populated/empty/finance-masked states.
- Reception actions and finance/courier masking.
- Manager company and finance-permission widgets.
- Permission-driven dashboard composition and action links.
- Loading/partial error states.
- Operational-center tab/row layout regression.
- Existing `/dashboard` route regression.

## Acceptance criteria

- Technician dashboard answers available/mine/in-progress/urgent/overdue/incomplete/returned/next-action questions.
- Reception dashboard is focused and excludes irrelevant finance/courier/technician responsibilities.
- Manager dashboard summarizes operational and financial attention instead of showing a wall of links.
- Operational center filters and rows do not visually concatenate or collide.
- Existing business rules and routes remain unchanged.
- Tests, typecheck and build pass.
- Documentation is updated.
- Exactly one logical implementation commit is created.
- Tracked working tree is clean.
- `DEMO-POLISH-002` remains planned and unstarted.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- affected module docs only where necessary
- [../../DEMO-SCRIPT.md](../../DEMO-SCRIPT.md) if entry flow changes
- this task document

## Commit

`ROLE-DASHBOARDS-002: complete core operational dashboards`

## Next task

`DEMO-POLISH-002` remains planned. Stop after this task.
