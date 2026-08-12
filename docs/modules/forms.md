# Forms

## Status

Implemented foundation, templates, generic work submissions, and operational real laboratory work-sheet completion.

## Purpose

Collect structured work-specific data without hardcoding every work type.

## Roles And Permissions

`forms.read`, `forms.create`, `forms.update`, `forms.archive`.

Real laboratory sheets use dedicated permissions:

- `work_forms.real.read`
- `work_forms.real.history.read`
- `work_forms.real.update`
- `work_forms.real.finalize`
- `work_forms.real.manage_templates`

## Domain Concepts

Template, template kind, version, field definition, field lifecycle metadata, runtime submission, cycle-scoped real laboratory sheet, operational sheet status, revision, immutable response snapshot, real paper-sheet field audit.

## Business Rules

Templates are versioned. Runtime submissions validate against field definitions and preserve submitted data. Generic work forms remain work-order submissions. Real laboratory sheets are `REAL_LAB_SHEET` templates, stored per `WorkCycle`, finalized per cycle, immutable for historical cycles, and financially isolated. Active-cycle real sheets support `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`, and `FINALIZED`; draft saves allow partial values, while complete/finalize enforce required fields server-side.

The MVP real sheet uses one common field set for all work types:

- Fișa laborator nr.
- Doctor
- Pacient
- Vârsta
- Sex
- Tip lucrare
- Culoare
- dinți
- Faza 1 + termen
- Faza 2 + termen
- Faza 3 + termen
- Faza 4 + termen
- Observații

The shade concept is stored canonically as `shade`; UI and templates may surface it as `Culoare`, and legacy sheets/tests may still label the same field `Nuanță`. This is one concept, not two separate business fields.

## Data Model

`WorkFormTemplate`, `WorkFormFieldDefinition`, `WorkFormSubmission`.

`WorkFormTemplate.kind` separates `GENERIC` forms from `REAL_LAB_SHEET` templates. Field definitions include section/lifecycle/source metadata. `WorkFormSubmission` supports `workCycleId`, `templateKind`, `realLabSheetStatus`, `revision`, `finalizedAt`, and `finalizedByUserId`; existing generic submissions remain compatible.

## API

Template endpoints under `/work-types/:workTypeId/form-templates`, `/work-form-templates/:id`, fields replace, activate/archive/clone. Generic work submission is integrated with work create/update flows.

Real sheet endpoints:

- `GET /works/:id/cycles/:cycleId/real-lab-sheet`
- `PATCH /works/:id/cycles/:cycleId/real-lab-sheet`
- `POST /works/:id/cycles/:cycleId/real-lab-sheet/finalize`

## UI

`/work-types/:workTypeId/form` builder and dynamic generic work forms. Work detail includes a `Fișă laborator` section for cycle selection, editable active-cycle data entry, draft save, complete state, finalization, revision conflict handling, and read-only historical sheets. `/workbench`, `/scan`, and `/status` expose compact sheet status without financial data.

## Audit

Template create/update/activate/archive/clone; generic submission changes; real laboratory sheet create/draft save/complete/finalize/conflict events.

## Security

Server-side validation; no trust in client schema.

## Edge Cases

Archived templates, cloned templates, invalid field option, stale template/version, finalized cycle sheets, historical cycle sheets, missing active real-sheet template.

## Implemented Tasks

FORMS-001, WORKFORMS-001, WORKFORMS-002, WORKFORM-REAL-DISCOVERY-001, WORKFORM-REAL-001A, WORKFORM-REAL-001B.

## Planned Tasks

No next real-sheet task is approved.

## Deferred

Attachments depend on file storage.

## Confirmed Decisions

The MVP uses the real paper laboratory sheet as the baseline, one common sheet for all work types, collaborative reception/technician editing, cycle-level finalization/immutability, per-cycle observations, no automatic copying of editable technical values to new cycles, no per-tooth repeating details, one `Culoare` value per cycle, no standalone material field in `WORKFORM-REAL-001A`, no work-sheet signatures, no printing in `WORKFORM-REAL-001A`, and no manager-only fields. Future enhancements are tracked in [../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md](../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md).

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
