# TECH-CLAIM-001C - Claim lifecycle finalization and recovery hardening

## Status

DEFERRED.

## Objective

Future controlled hardening for claim lifecycle edge cases around stale claims, abandoned assignments, recovery, manager actions, and advanced concurrency. This task is not required for the current operational MVP.

## Dependencies

TECH-CLAIM-001B.

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../SECURITY.md](../SECURITY.md)

## Scope

Deferred. Future task should define:

- stale claim detection;
- abandoned assignment recovery;
- manager recovery actions;
- concurrency hardening;
- lifecycle finalization rules;
- UX for exceptional cases.

## Deferral Decision

TECH-CLAIM-001C is not required for the current MVP and must not be implemented now.

Reason:

- TECH-CLAIM-001A and TECH-CLAIM-001B already provide the required work claim, `NC`/`NG` company locking, immutable execution snapshot, release, reclaim, reassign, audit and conflict handling.
- Stale-claim timeout, abandoned-claim recovery and automatic expiry do not yet have validated business rules.
- No automatic timeout or background release must be invented.
- No automatic reassignment must be invented.
- Existing manual manager release/reassign remains the current recovery mechanism.
- Execution snapshots always remain immutable.
- TECH-CLAIM-001C does not block the operational MVP.

## Out of scope

No endpoint names, schema, or final business rules are confirmed in this document. Do not implement until a future approved task provides validated business rules.

## Business decisions

- TBD: stale timeout policy.
- Requires business confirmation: who can recover abandoned work and under what reason.
- Open decision: whether recovery creates a new snapshot version or preserves existing snapshot only.

## Acceptance criteria

No implementation acceptance criteria while deferred. A future approved task must define business rules and acceptance criteria before implementation.

## Commit

`TECH-CLAIM-001C: <imperative summary>`

## Next task

STATUS-001A - Operational status read model and API.
