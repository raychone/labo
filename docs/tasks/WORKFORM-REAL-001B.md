# WORKFORM-REAL-001B - Operational laboratory sheet completion and workflow integration

## Status

APPROVED

Documentation-only definition created. Do not start implementation until explicitly requested.

## Objective

Make the real laboratory sheet practical for daily use by Reception and Technicians across the active work cycle, using the foundation implemented in `WORKFORM-REAL-001A`.

## Dependencies

- WORKFORM-REAL-001A
- WORK-CYCLES-001A
- WORK-CYCLES-001B
- WORKS-001
- WORKFLOW-002
- TECH-CLAIM-001A
- STATUS-001A
- STATUS-001B
- QR-001
- SCAN-002
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/qr.md](../modules/qr.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)
- [../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md](../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md)

## Scope

### Operational sheet states

Define and expose clear states with stable backend values:

- `NECOMPLETATĂ`
- `ÎN LUCRU`
- `COMPLETĂ`
- `FINALIZATĂ`

Rules:

- a new active cycle starts with no completed sheet;
- saving partial values moves the sheet to `IN_PROGRESS`;
- a sheet may be marked complete only when required fields pass validation;
- finalization makes the cycle sheet immutable;
- historical cycle sheets remain read-only;
- no automatic finalization.

### Draft saving

- Add explicit `Salvează schița` behavior.
- Prevent silent data loss.
- Warn on dirty close/navigation where practical.
- Handle stale revision conflicts.
- Prevent double submit.
- Validate partial versus complete/final submissions server-side.
- Do not add offline persistence.
- Do not implement background autosave unless a later approved task explicitly approves it.

### Reception workflow

Reception can:

- open the active cycle sheet;
- complete any sheet field;
- save a draft;
- return later;
- see validation errors;
- see who last modified the sheet;
- finalize the sheet if permitted.

Reception must not:

- edit historical finalized sheets;
- modify financial information;
- modify immutable previous-cycle snapshots.

### Technician workflow

Technician can:

- open the sheet from `/workbench`;
- open it after QR scan;
- complete any approved laboratory-sheet field;
- save a draft;
- see previous cycle sheets read-only;
- finalize when permitted.

Technician access must respect current work visibility, claim/ownership rules, and server-side permissions. Do not rely only on hidden UI buttons.

### Work detail integration

In the existing work detail flow:

- show a clear `Fișă laborator` card or tab;
- show current sheet state;
- show cycle number;
- show last modified by and timestamp;
- show finalized by and timestamp;
- allow opening the active sheet;
- allow viewing historical cycle sheets;
- visually distinguish editable and read-only sheets.

Do not duplicate the works page or work detail implementation.

### Workbench integration

In `/workbench`:

- show a sheet status badge;
- add `Completează fișa` or `Continuă fișa` action;
- show `Fișă finalizată` when finalized;
- expose no financial data;
- do not duplicate the workbench page.

### QR and scan integration

In `/scan`:

- show current cycle sheet status;
- add an action to open the sheet when authorized;
- do not add new scan mutation endpoints unless required;
- reuse existing authenticated work-detail and sheet APIs.

### Status page integration

In `/status`:

- show compact sheet status;
- allow filtering by:
  - `necompletată`;
  - `în lucru`;
  - `completă/finalizată`;
- add this only if the existing STATUS API can support it cleanly;
- otherwise implement the smallest safe read-model extension;
- expose no financial data;
- add no sheet mutations from `/status`.

### Validation UX

Required-field validation must:

- identify the section;
- identify the field;
- focus or scroll to the first invalid field;
- show Romanian messages;
- preserve valid draft values;
- prevent finalization with missing required fields.

Respect existing dynamic field validation for text, textarea, number, date, checkbox, radio, select, multiselect, tooth, and shade fields.

### Finalization

Finalization must:

- require explicit confirmation;
- verify expected revision;
- validate all required fields server-side;
- persist `finalizedAt` and `finalizedBy`;
- create audit;
- make the submission immutable;
- return `409` for stale revisions;
- reject second finalization safely.

No unlock or administrative repair is included in this task.

### Audit and history

Audit according to existing audit policy:

- draft saved;
- sheet completed;
- sheet finalized;
- stale conflict;
- unauthorized access.

Operational metadata must include created by, last modified by, last modified at, finalized by, finalized at, and cycle number.

Do not log full patient or form payloads unnecessarily.

### RBAC

Reuse or refine:

- `work_forms.real.read`
- `work_forms.real.update`
- `work_forms.real.finalize`
- `work_forms.real.history.read`

Recommended permission behavior:

- manager: read, update, finalize, history;
- reception: read, update, finalize, history;
- technician: read, update, finalize, history for visible or owned works;
- logistics: limited read only if needed;
- courier: no edit;
- doctor users: no internal sheet edit.

Use permissions and resource checks, not role-name checks.

### Tests

Include coverage for:

- empty sheet state;
- partial draft;
- complete but not finalized;
- finalization;
- immutable finalized sheet;
- historical cycle read-only;
- stale revision conflict;
- double finalization;
- required-field validation;
- reception access;
- technician ownership/resource access;
- unauthorized role rejection;
- workbench badge/action;
- scan integration;
- work detail integration;
- status indicator/filter where supported;
- no financial leakage;
- query invalidation;
- mobile layout;
- regression for `WORKFORM-REAL-001A` and cycle history.

### Documentation

- Update this task document.
- Update [../MASTER_PLAN.md](../MASTER_PLAN.md).
- Update [../AI_CONTEXT.md](../AI_CONTEXT.md) if current context changes.
- Update [../modules/forms.md](../modules/forms.md) and affected module docs.
- One implementation commit.
- Do not start the next task.

## Out of scope

- Printable A4/A5 sheet.
- PDF/document generation.
- Background autosave.
- Offline sync.
- Files/images/STL.
- Signatures.
- Manager unlock/repair.
- Billing.
- Payments.
- Inventory.
- Material consumption.
- Notifications.
- Doctor portal.
- `WORKFORM-REAL-001C`.
- Next task.

## Security and RBAC

- Backend RBAC remains authoritative.
- Frontend action visibility is only UX.
- Mutating requests require CSRF.
- Resource authorization must be enforced server-side.
- Financial fields must never be exposed through sheet, workbench, scan, or status UI.
- Patient-sensitive and form-payload data must not be logged unnecessarily.

## Data model and migration expectations

Use the existing `WORKFORM-REAL-001A` read/write foundation where possible.

If a schema change is required for stable operational states or revision metadata, it must be deterministic, non-destructive, and forward-only. Do not edit already-applied migrations.

## Acceptance criteria

1. Active-cycle sheets expose a clear operational state.
2. Reception can save partial drafts.
3. Authorized technicians can save partial drafts.
4. Required fields are enforced only for completion/finalization.
5. Draft values are preserved.
6. Finalization requires explicit confirmation.
7. Finalization is server-side validated.
8. Finalized sheets are immutable.
9. Historical cycle sheets are read-only.
10. Stale revision conflicts return `409`.
11. Work detail exposes sheet status and history.
12. Workbench exposes sheet status and action.
13. Scan exposes sheet status and open action.
14. Status integration is added only through a safe read-model extension.
15. RBAC and resource authorization are server-side.
16. Financial data is never exposed.
17. Audit metadata exists.
18. Loading, empty, error and validation states exist.
19. Tests pass.
20. Typecheck passes.
21. Build passes.
22. Migration is non-destructive if required.
23. Seed remains idempotent if changed.
24. Documentation is updated.
25. One implementation commit.
26. Working tree is clean.
27. No next task is started.

## Verification

Run the standard checks from [../TESTING.md](../TESTING.md). Run migrations only if the implementation changes Prisma schema. Run demo seed twice only if seed/demo behavior changes.

## Commit

`WORKFORM-REAL-001B: add operational sheet completion`

## Documentation-only definition commit

`DOCS: define WORKFORM-REAL-001B operational completion`

## Next task

No next task is approved. `WORKFORM-REAL-001C` must not be started.
