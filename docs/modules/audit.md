# Audit

## Status

Audit logging implemented; audit UI planned.

## Purpose

Record critical security, administrative, operational, and financial actions.

## Roles And Permissions

`audit.read` for future viewer.

## Domain Concepts

Actor, action, resource type/id, metadata, timestamp.

## Business Rules

Critical mutations should be audited. Audit records should not contain secrets.

## Data Model

`AuditLog`.

## API

No full audit UI API documented here; future task required.

## UI

Planned audit viewer.

## Audit

This module is the audit log itself.

## Security

Audit access is sensitive and manager-focused.

## Edge Cases

Failed actions that should be audited, masking metadata, deleted resources.

## Implemented Tasks

Audit support across implemented modules.

## Planned Tasks

AUDIT-UI-001.

## Deferred

External SIEM/export.

## Open Decisions

Retention and filtering requirements.

## Related Documents

[../SECURITY.md](../SECURITY.md).
