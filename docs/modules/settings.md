# Settings

## Status

Implemented with legacy compatibility.

## Purpose

Store laboratory and company-specific legal/branding settings.

## Roles And Permissions

`settings.read`, `settings.update`; company context requires organization context permissions where relevant.

## Domain Concepts

Legacy singleton settings, company-aware legal entity settings, active legal entity context.

## Business Rules

`GET /settings` and `PATCH /settings` use the active server-side legal entity context. Request bodies cannot select another company. Billing print views use the issuing document company's `LegalEntitySettings` as supplier legal data.

## Data Model

`LaboratorySettings`, `LegalEntity`, `LegalEntitySettings`.

## API

`GET /settings`, `PATCH /settings`.

## UI

`/settings`, with visible active company context.

## Audit

Settings updates are audited.

## Security

Do not trust company selection from request body.

## Edge Cases

Missing active legal entity, inactive legal entity, legacy billing/print compatibility.

## Implemented Tasks

SETTINGS-001, ORG-DATA-MIGRATION-001.

## Planned Tasks

Company-aware document center.

## Deferred

Direct use of assets headers/templates in production documents.

## Open Decisions

Final legal document templates require business/legal confirmation.

## Related Documents

[organizations.md](organizations.md), [billing.md](billing.md).
