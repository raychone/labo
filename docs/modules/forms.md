# Forms

## Status

Implemented foundation, templates, and work submissions. Real laboratory work-sheet foundation is the next approved task.

## Purpose

Collect structured work-specific data without hardcoding every work type.

## Roles And Permissions

`forms.read`, `forms.create`, `forms.update`, `forms.archive`.

## Domain Concepts

Template, version, field definition, runtime submission, immutable response snapshot, planned real work-sheet schema.

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

WORKFORM-REAL-001A approved for real laboratory work-sheet schema/template foundation. WORKFORM-REAL-001B is planned and must not be started yet.

## Deferred

Attachments depend on file storage.

## Open Decisions

Final real laboratory form fields require client confirmation. Open decisions include exact paper-sheet fields, common versus work-type-specific fields, edit authority after technician claim, previous-cycle copy behavior, signatures, and tooth-level repeating groups.

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
