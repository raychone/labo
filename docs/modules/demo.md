# Demo

## Status

Implemented and actively maintained.

## Purpose

Provide deterministic local data and a client presentation path.

## Roles And Permissions

Demo users cover manager, reception, logistics, technician, courier, and medic roles.

## Domain Concepts

Demo seed, demo reset, local-only demo login, demo script.

## Business Rules

Seed must be deterministic and idempotent. It is local/demo data only.

## Data Model

Uses implemented production models with deterministic IDs and fictive data.

## API

`POST /auth/demo-login` in demo mode; seed commands in API package.

## UI

Demo buttons on login page and presentation scripts in root docs.

## Audit

Demo actions can create normal audit records in local DB.

## Security

Demo credentials and data must not be used in production.

## Edge Cases

Repeated seed, stale local data, demo mode disabled.

## Implemented Tasks

DEMO-SEED-001 and later demo updates.

## Planned Tasks

DEMO-POLISH-002 and DEMO-REAL-DATA-001.

## Deferred

Real customer data import.

## Open Decisions

Final presentation dataset and assets usage.

## Related Documents

[../../DEMO.md](../../DEMO.md), [../../DEMO-SCRIPT.md](../../DEMO-SCRIPT.md).
