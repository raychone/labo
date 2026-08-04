# Forms

## Status

Implemented foundation, templates, and work submissions. Real laboratory work-sheet discovery is complete. The real laboratory work-sheet foundation remains approved but blocked by explicit business confirmation.

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

WORKFORM-REAL-DISCOVERY-001 is complete. WORKFORM-REAL-001A is approved for real laboratory work-sheet schema/template foundation after business confirmation. WORKFORM-REAL-001B is planned and must not be started yet.

## Deferred

Attachments depend on file storage.

## Open Decisions

Final real laboratory form fields require client confirmation. Open decisions include `Faza 1` through `Faza 4` semantics, observation ownership, common versus work-type-specific fields, edit authority after technician claim, stage-completion locks, previous-cycle copy behavior, signatures, tooth-level repeating groups, and whether shade/material can differ by tooth. See [../discovery/WORKFORM-REAL-FIELD-AUDIT.md](../discovery/WORKFORM-REAL-FIELD-AUDIT.md) and [../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md](../discovery/WORKFORM-REAL-SCHEMA-PROPOSAL.md).

## Related Documents

[work-types.md](work-types.md), [works.md](works.md).
