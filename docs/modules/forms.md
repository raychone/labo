# Forms

## Status

Implemented foundation, templates, generic work submissions, and the real laboratory work-sheet foundation.

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

Template, template kind, version, field definition, field lifecycle metadata, runtime submission, cycle-scoped real laboratory sheet, immutable response snapshot, real paper-sheet field audit.

## Business Rules

Templates are versioned. Runtime submissions validate against field definitions and preserve submitted data. Generic work forms remain work-order submissions. Real laboratory sheets are `REAL_LAB_SHEET` templates, stored per `WorkCycle`, finalized per cycle, immutable for historical cycles, and financially isolated.

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

## Data Model

`WorkFormTemplate`, `WorkFormFieldDefinition`, `WorkFormSubmission`.

`WorkFormTemplate.kind` separates `GENERIC` forms from `REAL_LAB_SHEET` templates. Field definitions include section/lifecycle/source metadata. `WorkFormSubmission` now supports `workCycleId`, `templateKind`, `finalizedAt`, and `finalizedByUserId`; existing generic submissions remain compatible.

## API

Template endpoints under `/work-types/:workTypeId/form-templates`, `/work-form-templates/:id`, fields replace, activate/archive/clone. Generic work submission is integrated with work create/update flows.

Real sheet endpoints:

- `GET /works/:id/cycles/:cycleId/real-lab-sheet`
- `PATCH /works/:id/cycles/:cycleId/real-lab-sheet`
- `POST /works/:id/cycles/:cycleId/real-lab-sheet/finalize`

## UI

`/work-types/:workTypeId/form` builder and dynamic generic work forms. Work detail includes a `Fișă laborator` section for cycle selection, editable active-cycle data entry, finalization, and read-only historical sheets.

## Audit

Template create/update/activate/archive/clone; generic submission changes; real laboratory sheet create/update/finalize events.

## Security

Server-side validation; no trust in client schema.

## Edge Cases

Archived templates, cloned templates, invalid field option, stale template/version, finalized cycle sheets, historical cycle sheets, missing active real-sheet template.

## Implemented Tasks

FORMS-001, WORKFORMS-001, WORKFORMS-002, WORKFORM-REAL-DISCOVERY-001, WORKFORM-REAL-001A.

## Planned Tasks

WORKFORM-REAL-001B is planned for future refinements and must not be started yet.

## Deferred

Attachments depend on file storage.

## Confirmed Decisions

The MVP uses the real paper laboratory sheet as the baseline, one common sheet for all work types, collaborative reception/technician editing, cycle-level finalization/immutability, per-cycle observations, no automatic copying of editable technical values to new cycles, no per-tooth repeating details, one `Culoare` value per cycle, no standalone material field in `WORKFORM-REAL-001A`, no work-sheet signatures, no printing in `WORKFORM-REAL-001A`, and no manager-only fields. Future enhancements are tracked in [../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md](../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md).

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
