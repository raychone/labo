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

Full document-center management for all assets/templates outside the billing print stack.

## Open Decisions

Final legal document templates require business/legal confirmation.

## Printable Documents

- Billing print views use the issuing company settings as legal data.
- The note de plată print stack defaults to the A4 Creative Dental template and can render the A5 variant when requested explicitly.
- The invoice print stack uses the same active legal entity settings and does not allow cross-company overrides from the UI.

## Related Documents

[organizations.md](organizations.md), [billing.md](billing.md).
