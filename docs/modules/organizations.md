# Organizations And Legal Entities

## Status

Implemented for `NC`/`NG` context and settings.

## Purpose

Represent the shared operational lab with two legal/financial contexts.

## Roles And Permissions

`organization_context.read`, `organization_context.switch`.

## Domain Concepts

`NC`, `NG`, active session context, company-aware settings/pricing/documents.

## Business Rules

Users are shared. Managers can operate both contexts. Switching context does not change identity or split operational work.

## Data Model

`LegalEntity`, `LegalEntitySettings`, `Session.activeLegalEntityId`.

## API

`GET /organization-context`, `PUT /organization-context`.

## UI

Shell context switch labelled `Firma activa`.

## Audit

Context switch is audited.

## Security

Active context is server-side. Frontend cannot spoof company through arbitrary body fields.

## Edge Cases

Inactive legal entity, user without switch permission, screens where context affects financial data.

## Implemented Tasks

ORG-CONTEXT-001, ORG-DATA-MIGRATION-001.

## Planned Tasks

Company-aware documents/payments/reporting expansion.

## Deferred

Full separation of all billing documents and series by company where not yet implemented.

## Open Decisions

Final accounting/reporting rules require business confirmation.

## Related Documents

[settings.md](settings.md), [pricing.md](pricing.md), [billing.md](billing.md).
