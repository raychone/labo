# TECH-EXECUTION-001 - Technician execution lifecycle

## Status

COMPLETED

Implemented in the application. `TECH-CLAIM-001C` remains deferred and was not started.

Delivered scope:

- technician workbench claim/release/reclaim flow;
- claim company fixation with `NC`/`NG`;
- execution-first work drawer ordering for claimed work;
- technician-readable workflow runtime and real-sheet access for owned work;
- current-stage actions with stage start/complete semantics;
- real laboratory sheet access kept cycle-scoped and owner-aware;
- stage queue and workbench action labels aligned to live workflow state;
- status/workbench/work drawer refresh through existing query invalidation paths;
- regression tests and documentation updates.

## Objective

Complete the canonical technician execution lifecycle without creating a parallel workflow engine or changing reception handoff behavior.

## Dependencies

- TECH-001
- RECEPTION-TO-TECH-001
- WORKFORM-REAL-001B
- WORK-CYCLES-001B
- STATUS-001B

## Read First

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../TESTING.md](../TESTING.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/works.md](../modules/works.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/logistics.md](../modules/logistics.md)
- [../modules/delivery.md](../modules/delivery.md)
- [../modules/qr.md](../modules/qr.md)
- [../modules/dashboard.md](../modules/dashboard.md)

## Scope

- Preserve claim as the canonical ownership entry point.
- Keep execution company locked to the active cycle after claim.
- Surface the live technician execution context first in the work drawer.
- Allow owned technicians to read workflow runtime, execute the current stage, and work with the cycle-scoped real laboratory sheet.
- Keep previous technician and stage history intact when work is released and reclaimed.
- Ensure /status reflects the live technician and stage context.
- Keep QR identity stable across claim/release/complete/reclaim transitions.

## Out of scope

- Reception handoff changes.
- Manager, courier or doctor UI.
- Billing redesign.
- New workflow engine.
- Parallel execution models.
- TECH-CLAIM-001C recovery work.

## Tests

- Claim eligibility and conflict handling.
- Execution-company fixation.
- Technician workflow/runtime read access.
- Stage start and completion.
- Real-sheet save/finalize access.
- Release and reclaim flow.
- /status and QR regression coverage.

## Acceptance criteria

1. Technician can claim eligible work and pick `NC` or `NG`.
2. Claimed work shows the current execution context first.
3. Technician can read and act on the current workflow stage for owned work.
4. Real-sheet access works for the active cycle.
5. Release and reclaim preserve history and locked execution context.
6. /status stays in sync with workflow changes.
7. QR resolution remains stable.
8. Existing reception handoff remains unchanged.

## Verification

- `pnpm --filter @dental-lab/api prisma:validate`
- `pnpm --filter @dental-lab/api prisma:generate`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## Commit

`TECH-EXECUTION-001: complete technician execution lifecycle`

