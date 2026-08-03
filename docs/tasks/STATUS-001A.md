# STATUS-001A - Operational status read model and API

## Status

APPROVED.

## Objective

Create the backend/read-model foundation for the operational status page. The task must aggregate active work state in a permission-aware way so a later frontend task can build `/status` without redefining backend contracts.

## Dependencies

- TECH-CLAIM-001B
- WORKFLOW-002
- LOGISTICS-001
- DELIVERY-001
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../modules/works.md](../modules/works.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/dashboard.md](../modules/dashboard.md)

## Scope

- Permission-aware operational status aggregation.
- Include all active works that the current user is allowed to see.
- Provide tabs/counts for:
  - `Astăzi`
  - `În lucru`
  - `Disponibile`
  - `Întârziate`
  - `Plecate la medic`
  - `Revenite`
  - `Finalizate`
- Return row fields:
  - work code;
  - patient;
  - clinic;
  - doctor;
  - work type;
  - `NC`/`NG` execution company;
  - current workflow stage;
  - workflow progress such as `1/4` or `4/5`;
  - current work owner;
  - current stage technician;
  - effective deadline;
  - deadline visual state;
  - priority;
  - logistics state;
  - delivery state;
  - current cycle only when cycle data exists.
- Server-side financial masking.
- Define filters and sorting contracts.
- Use pagination or another bounded result strategy.
- Provide summary counters.
- Enforce RBAC and resource visibility server-side.
- Add tests for aggregation, permission masking, filters/sort, pagination/bounds, and representative tab counters.

## Out of scope

- Final `/status` frontend page.
- Charts.
- Polling or WebSockets.
- Notifications.
- Work cycles implementation.
- Financial totals.
- Offline behavior.
- Modifying works.
- Starting or completing workflow stages.
- STATUS-001B.

## Business decisions

- Confirmed: status read model must be operational, permission-aware, and non-financial.
- Confirmed: no automatic claim expiration or automatic reassignment is part of this task.
- Confirmed: if current cycle data does not exist, omit or return `null` for cycle fields without inventing cycles.
- TBD: exact frontend layout belongs to STATUS-001B.
- Requires business confirmation: final work-cycle semantics.

## Data model changes

No required data model changes are expected. If implementation discovers a necessary schema change, stop and document the reason before adding a migration.

## API changes

Define backend read endpoints for operational status. Endpoint names should follow existing REST conventions and must be documented after implementation.

## UI changes

None, except updating generated/shared contracts if the frontend needs typed API contracts. Do not build the final `/status` page in this task.

## Security and RBAC

- Use existing auth, CSRF rules where applicable, and RBAC guards.
- Read access must follow `works.read_all`, `works.read_assigned`, and relevant ownership/resource visibility.
- Do not expose pricing, billing, payments, financial totals, agreement data, or internal rule IDs.
- Company context is shown as operational execution company only when already locked/available in the work data.

## Audit

Read-only aggregation does not require audit events.

## Task-specific tests

- Unit tests for read-model mapping and tab classification.
- Service tests for RBAC/resource visibility and financial masking.
- API/controller tests for auth/RBAC and query validation.
- Tests for filters, sorting, bounded result strategy, and summary counters.
- Regression tests for unavailable current cycle data.

## Acceptance criteria

- API returns permission-aware operational status rows for active works.
- API returns summary counters for all required tabs.
- Rows include required operational fields and no financial fields.
- Filters and sorting contracts are documented and tested.
- Results are paginated or otherwise bounded.
- Users without financial permissions cannot infer prices, billing totals, payments, or agreements.
- Works without cycle data do not fabricate cycle state.
- Existing claim snapshot immutability is unchanged.
- No frontend `/status` page is implemented.
- Standard verification from [../TESTING.md](../TESTING.md) passes.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../modules/dashboard.md](../modules/dashboard.md)
- [../modules/works.md](../modules/works.md) if response contracts touch work read models
- this task document
- [../AI_CONTEXT.md](../AI_CONTEXT.md) only if global context changes

## Commit

`STATUS-001A: add operational status read model`

## Next task

STATUS-001B, if approved. Stop after STATUS-001A.
