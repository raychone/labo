# Forms

## Status

Implemented foundation, templates, and work submissions. Real laboratory work-sheet discovery and business validation are complete. The real laboratory work-sheet foundation is approved for implementation.

## Purpose

Collect structured work-specific data without hardcoding every work type.

## Roles And Permissions

`forms.read`, `forms.create`, `forms.update`, `forms.archive`.

## Domain Concepts

Template, version, field definition, runtime submission, immutable response snapshot, planned real work-sheet schema, real paper-sheet field audit.

## Business Rules

Templates are versioned. Runtime submissions validate against field definitions and preserve submitted data. The real laboratory work sheet must remain versioned, cycle-owned, immutable historically, and financially isolated.

## Data Model

`WorkFormTemplate`, `WorkFormFieldDefinition`, `WorkFormSubmission`.

## API

Template endpoints under `/work-types/:workTypeId/form-templates`, `/work-form-templates/:id`, fields replace, activate/archive/clone. Work submission is integrated with work flows.

## UI

`/work-types/:workTypeId/form` builder and dynamic work forms.

## Audit

Template create/update/activate/archive/clone; submission changes where implemented.

## Security

Server-side validation; no trust in client schema.

## Edge Cases

Archived templates, cloned templates, invalid field option, older submission version.

## Implemented Tasks

FORMS-001, WORKFORMS-001, WORKFORMS-002.

## Planned Tasks

WORKFORM-REAL-DISCOVERY-001 is complete. WORKFORM-REAL-001A is approved for real laboratory work-sheet schema/template foundation. WORKFORM-REAL-001B is planned and must not be started yet.

## Deferred

Attachments depend on file storage.

## Confirmed Decisions

The MVP uses the real paper laboratory sheet as the baseline, one common sheet for all work types, collaborative reception/technician editing, cycle-level finalization/immutability, per-cycle doctor instructions and observations, no automatic copying of editable technical values to new cycles, no per-tooth repeating details, one shade/material value per cycle, no work-sheet signatures, no printing in `WORKFORM-REAL-001A`, and no manager-only fields. Future enhancements are tracked in [../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md](../discovery/WORKFORM-REAL-CLIENT-QUESTIONS.md).

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
