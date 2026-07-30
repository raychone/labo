# Search

## Status

Planned.

## Purpose

Provide global permission-aware search across operational and financial records.

## Roles And Permissions

Requires task-specific definition. Search must respect underlying module permissions.

## Domain Concepts

Query, result type, relevance, permission-filtered result.

## Business Rules

Search must not leak existence or details of forbidden records.

## Data Model

No dedicated model currently.

## API

Planned.

## UI

Planned.

## Audit

Standard search reads likely do not require audit; sensitive exports may.

## Security

Apply server-side permission filters before returning results.

## Edge Cases

Partial matches, financial masking, patient privacy, QR/work code search.

## Implemented Tasks

None.

## Planned Tasks

SEARCH-001.

## Deferred

External search engine.

## Open Decisions

Index strategy and searchable fields.

## Related Documents

[reports.md](reports.md), [works.md](works.md).
