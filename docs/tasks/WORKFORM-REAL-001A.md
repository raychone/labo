# WORKFORM-REAL-001A - Real laboratory work sheet schema and template foundation

## Status

APPROVED

Blocked by explicit business confirmation of the `WORKFORM-REAL-DISCOVERY-001` findings before implementation.

## Objective

Define and implement in this task the real laboratory work-sheet foundation used from reception through technician execution, based on validated laboratory requirements.

The task must establish a canonical, versioned work-sheet schema that can later be completed per cycle without losing historical data.

## Dependencies

- WORKFORMS-001
- WORKFORMS-002
- WORKS-001
- WORKFLOW-002
- TECH-CLAIM-001A
- WORK-CYCLES-001A
- WORK-CYCLES-001B
- PATIENTS-001
- CLINICS-001
- WORKTYPES-001

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
- [../modules/patients.md](../modules/patients.md)
- [../modules/clinics-doctors.md](../modules/clinics-doctors.md)
- [../modules/work-types.md](../modules/work-types.md)
- [../UI_GUIDELINES.md](../UI_GUIDELINES.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)
- [../../REAL-LAB-WORKFLOW.md](../../REAL-LAB-WORKFLOW.md)

## Business Context

- Reception registers the work.
- The doctor does not need an application account.
- Patient is identified by first name and last name, not an internal visible code.
- Clinic and doctor are selected from registries.
- One `WorkOrder` can contain multiple cycles.
- Every cycle may have its own work-sheet values.
- Previous cycle data must remain immutable.
- Technicians may complete technological details during execution.
- Price information must remain manager-only.
- The work sheet must not expose billing or financial data to operational roles.

## Scope

### Existing form infrastructure inventory

- Inventory current `WorkFormTemplate`, `WorkFormFieldDefinition`, and `WorkFormSubmission` capabilities.
- Document which current concepts already cover real work sheets.
- Reuse existing form-template foundation wherever possible.
- Prefer model extension over duplicate form models.
- Add new model concepts only where reuse cannot safely represent cycle-owned real work sheets.

### Real work-sheet structure

Define a canonical schema with logical sections such as:

- `Identificare lucrare`
- `Pacient`
- `Clinică și medic`
- `Tip lucrare`
- `Elemente dentare`
- `Material`
- `Culoare`
- `Tip restaurare`
- `Etape tehnologice`
- `Observații medic`
- `Observații recepție`
- `Observații tehnician`
- `Termen`
- `Prioritate`
- `Probă / ajustare / finisare`
- `Instrucțiuni speciale`
- `Date ciclu`
- `Confirmări operaționale`

Do not assume every section is required for every work type.

### Field types

Use existing supported field types where possible:

- text
- textarea
- number
- date
- checkbox
- radio
- select
- multiselect
- tooth selector
- shade selector

Only add new field types if the real sheet cannot be represented safely with existing types.

### Template assignment and lifecycle

- One active real work-sheet template per `WorkType`.
- Versioned templates.
- Draft, active, and archived lifecycle.
- Existing active templates remain immutable for existing submissions.
- New versions apply only to new cycles/works.
- No destructive overwrite of historical templates.
- Define a real-template classification or equivalent discriminator so generic/dynamic forms and real work sheets remain distinguishable.

### Cycle behavior

- The real work sheet belongs to a `WorkCycle`.
- Cycle 1 has its own submission.
- Cycle 2 creates a new submission/snapshot.
- Previous cycle submissions remain read-only.
- Values may be copied selectively from the previous cycle only through an explicit future action.
- Do not silently clone previous answers.

### Role ownership

Use permissions, not role-name checks.

Reception may complete:

- patient;
- clinic;
- doctor;
- work type;
- priority;
- promised/requested date;
- doctor instructions;
- initial observations.

Technician may complete:

- technological values;
- material;
- tooth/teeth;
- shade;
- execution observations;
- stage-specific technical information.

Manager may:

- configure templates;
- read all allowed fields;
- manage versioning;
- not silently modify historical submissions.

Courier:

- no form editing.

Doctor users, if they exist:

- no internal technical form editing by default.

### Sensitive and financial isolation

The real work sheet must not contain:

- prices;
- discounts;
- invoice status;
- payments;
- internal financial agreements;
- private manager-only financial notes.

Financial data remains in pricing/billing modules and must be masked server-side for unauthorized roles.

### Validation

Define and implement server-side validation for:

- required fields;
- conditional fields;
- allowed options;
- min/max;
- tooth validation;
- shade validation;
- maximum payload size;
- prevention of unknown and reserved keys;
- stale template/version conflict behavior.

Frontend validation may improve UX, but backend validation remains authoritative.

### Backend foundation

The implementation may extend existing:

- `WorkFormTemplate`
- `WorkFormFieldDefinition`
- `WorkFormSubmission`

Required backend outcome:

- real-template classification or equivalent;
- `WorkCycle` association;
- immutable submission snapshot per cycle;
- read API;
- template management API updates only where necessary;
- validation;
- RBAC;
- audit;
- deterministic migration;
- safe backfill strategy.

### Frontend foundation

- Adapt manager template builder for real work sheets.
- Support logical sections.
- Use accordion/tabs where useful.
- Provide preview.
- Use Romanian labels.
- Keep mobile-first layout.
- Render read-only historical cycle sheets.
- Do not use generic JSON display.
- Do not expose financial data.

### Tests

Include coverage for:

- template lifecycle;
- one active template per work type;
- cycle association;
- immutable previous-cycle submission;
- reception field access;
- technician field access;
- manager template configuration;
- unauthorized roles rejected;
- stale version conflict;
- tooth and shade validation;
- no financial leakage;
- migration/backfill;
- seed idempotency if seed changes;
- frontend builder/read-only rendering;
- regression for existing forms and works.

### Documentation

- Update this task document.
- Update [../MASTER_PLAN.md](../MASTER_PLAN.md).
- Update [../AI_CONTEXT.md](../AI_CONTEXT.md) if current context changes.
- Update [../modules/forms.md](../modules/forms.md).
- Update affected module docs only where implementation changes behavior.
- One implementation commit.
- Do not start `WORKFORM-REAL-001B`.

## Out of Scope

- Filling the complete runtime form during technician execution, except what is required to prove the schema.
- Autosave/offline.
- Generic file uploads.
- STL/PDF/images.
- Document printing.
- Billing.
- Payments.
- Inventory.
- Materials consumption.
- Notifications.
- OCR.
- Public doctor portal.
- `WORKFORM-REAL-001B`.
- Next task.

## Open Decisions

These must be resolved with the laboratory client before implementation and not silently invented:

- Confirmed exact fields from the paper laboratory sheet, including whether `Fișa laborator nr` is exactly the application work code.
- Meaning of `Faza 1` through `Faza 4`.
- Whether `Observații` is one field or split into doctor, reception, and technician notes.
- Which fields are common versus work-type-specific.
- Which fields reception can edit after technician claim.
- Which fields technicians can edit and which fields lock after stage completion.
- Whether previous-cycle values may be copied, and whether copy behavior is never, always, user-selected, or field-specific.
- Whether signatures belong in the work sheet or delivery proof.
- Whether tooth-level values need repeating groups.
- Whether shade/material can differ by tooth.

Discovery output:

- [../discovery/WORKFORM-REAL-FIELD-AUDIT.md](../discovery/WORKFORM-REAL-FIELD-AUDIT.md)
- [../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md](../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md)

## Acceptance Criteria

1. Existing form infrastructure is inventoried.
2. Reuse versus extension decisions are documented.
3. `WorkCycle` ownership is explicit.
4. Historical submissions are immutable.
5. Role-based editing boundaries are explicit.
6. Financial isolation is explicit.
7. Template versioning is explicit.
8. Validation requirements are explicit.
9. Backend scope is defined.
10. Frontend scope is defined.
11. Migration/backfill strategy is defined.
12. Open business decisions remain marked.
13. `WORKFORM-REAL-001B` remains unstarted.
14. No application code changes outside this documentation-only definition task.
15. Required checks pass.
16. One implementation commit.
17. Working tree clean.

## Verification

For this documentation-only definition task:

- Inspect changed documentation.
- Run `git diff --check`.
- Verify no application code changed.

For the implementation task, run the standard checks from [../TESTING.md](../TESTING.md), plus migration and seed checks if schema or seed changes.

## Commit

`WORKFORM-REAL-001A: add real work sheet foundation`

## Documentation-only definition commit

`DOCS: define WORKFORM-REAL-001A real work sheet foundation`

## Next Task

`WORKFORM-REAL-001B` is PLANNED only and must not be started.
