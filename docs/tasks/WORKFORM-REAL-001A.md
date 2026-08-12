# WORKFORM-REAL-001A - Real laboratory work sheet schema and template foundation

## Status

COMPLETED

Business confirmation completed after the real laboratory visit. Implemented as a cycle-scoped real laboratory sheet foundation.

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

Implemented the confirmed MVP paper-sheet baseline only:

- `Fișa laborator nr.`
- `Doctor`
- `Pacient`
- `Vârsta`
- `Sex`
- `Tip lucrare`
- `Culoare`
- `dinți`
- `Faza 1 + termen`
- `Faza 2 + termen`
- `Faza 3 + termen`
- `Faza 4 + termen`
- `Observații`

No material field, signatures, printing fields, billing fields, manager-only fields, or unvalidated operational fields were added.

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
- Do not copy editable technical values automatically to a new cycle.
- Keep the same `WorkOrder` and patient across cycles.
- Default clinic and doctor from the previous cycle for reception confirmation only.
- Reception confirms or changes clinic and doctor before creating the new cycle.

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
- initial observations;
- technical sheet values when needed.

Technician may complete:

- technological values;
- material;
- tooth/teeth;
- shade;
- execution observations;
- stage-specific technical information.

Reception and technicians collaborate on the same operational sheet. The sheet becomes immutable once finalized for that cycle. Historical cycles are never edited; corrections require a new cycle.

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

- Reuse existing dynamic field renderer.
- Use Romanian labels.
- Keep mobile-first layout.
- Render read-only historical cycle sheets.
- Render the active cycle as editable only when permissions and lifecycle allow it.
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
- Printable A4/A5 laboratory documents matching current paper forms; these belong to a future Documents task.
- Billing.
- Payments.
- Inventory.
- Materials consumption.
- Notifications.
- OCR.
- Public doctor portal.
- `WORKFORM-REAL-001B`.
- Next task.

## Confirmed Laboratory Decisions

Validated after the real laboratory visit:

- The real paper laboratory sheet is the MVP baseline.
- Do not invent additional operational fields in this task.
- One common laboratory sheet is used for all work types in MVP.
- The laboratory sheet is primarily exchanged between the laboratory and clinic/doctor.
- Doctors do not need application accounts.
- Reception registers returns when the physical work arrives back in the laboratory.
- Reception and technician may both complete the laboratory sheet.
- The sheet becomes immutable once finalized for that cycle.
- Historical cycles are never edited.
- Corrections require a new cycle, not editing the previous cycle.
- A new cycle keeps the same `WorkOrder` and patient.
- A new cycle defaults clinic and doctor from the previous cycle for reception confirmation only.
- Editable technical values are not copied automatically into a new cycle.
- Existing tooth selector is sufficient for MVP; no per-tooth repeating details.
- One canonical `shade` value per cycle is enough for this MVP; the UI may show it as `Culoare` and older templates/tests may still use `Nuanță` for the same field. Material capture is not a standalone implemented field in `WORKFORM-REAL-001A`.
- Every cycle keeps its own doctor instructions and observations.
- Clinic/doctor correction after technician claim happens when reception registers a returned work before the new cycle is created.
- Signatures belong only to delivery/invoice documents, not the laboratory sheet in MVP.
- Printing is not part of `WORKFORM-REAL-001A`; printable A4/A5 documents belong to the future Documents module.
- No manager-only/internal fields are part of the laboratory sheet MVP.

## Future Enhancements

These do not block `WORKFORM-REAL-001A`:

- additional configurable operational fields;
- different sheet variants per work type;
- per-tooth repeating details;
- shade/material per tooth;
- printable A4/A5 laboratory documents in the Documents module;
- attachments/photos for shade details after file storage is approved.

Discovery output:

- [../discovery/WORKFORM-REAL-FIELD-AUDIT.md](../discovery/WORKFORM-REAL-FIELD-AUDIT.md)
- [../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md](../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md)
- [../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md](../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md)

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
12. Confirmed laboratory decisions are implemented without inventing additional MVP fields.
13. `WORKFORM-REAL-001B` remains unstarted.
14. Application code changes are limited to the approved implementation scope.
15. Required checks pass.
16. One implementation commit.
17. Working tree clean.

## Implemented

- Added `REAL_LAB_SHEET` template classification while preserving existing `GENERIC` work forms.
- Added field lifecycle/source metadata for versioned real-sheet snapshots.
- Added `WorkFormSubmission.workCycleId`, `templateKind`, `finalizedAt`, and `finalizedByUserId`.
- Added non-destructive migration `20260804170000_real_lab_sheet_foundation`.
- Backfilled existing generic submissions to the active cycle where unambiguous without deleting data.
- Added real laboratory sheet read/save/finalize APIs under work cycle routes.
- Added server-side validation through the existing work-form validator.
- Added RBAC permissions for real-sheet read/history/update/finalize/manage-template behavior.
- Added work-detail UI for active-cycle entry, cycle selection, finalization, and historical read-only sheets.
- Updated demo seed with common real-sheet templates for all work types and initial cycle demo submissions.

## Verification

Run the standard checks from [../TESTING.md](../TESTING.md), plus migration and seed checks because schema and demo seed changed.

## Commit

`WORKFORM-REAL-001A: add real work sheet foundation`

## Documentation-only definition commit

`DOCS: define WORKFORM-REAL-001A real work sheet foundation`

## Next Task

`WORKFORM-REAL-001B` is PLANNED only and must not be started.
