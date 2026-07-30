# Forms

## Status

Implemented foundation, templates, and work submissions.

## Purpose

Collect structured work-specific data without hardcoding every work type.

## Roles And Permissions

`forms.read`, `forms.create`, `forms.update`, `forms.archive`.

## Domain Concepts

Template, version, field definition, runtime submission, immutable response snapshot.

## Business Rules

Templates are versioned. Runtime submissions validate against field definitions and preserve submitted data.

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

WORKFORM-REAL-001.

## Deferred

Attachments depend on file storage.

## Open Decisions

Final real laboratory form fields require client confirmation.

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
