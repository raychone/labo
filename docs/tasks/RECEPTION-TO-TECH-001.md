# RECEPTION-TO-TECH-001 - Reception handoff to technician queue

## Status

COMPLETED

## Objective

Make a newly created reception work move through the intended domain handoff so the receptionist can complete the initial `Recepție` stage and the work becomes visible to technicians only after the workflow advances to a technician-eligible stage.

## Dependencies

- WORKS-001
- WORKFLOW-002
- TECH-001
- RECEPTION-WORK-CREATE-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../TESTING.md](../TESTING.md)
- [../modules/works.md](../modules/works.md)
- [../modules/workflow.md](../modules/workflow.md)
- [../modules/technician-execution.md](../modules/technician-execution.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/qr.md](../modules/qr.md)

## Scope

- Trace the persisted work creation flow from work order to cycle, workflow execution, current stage, claim state, and technician visibility.
- Preserve the existing workflow template and QR resolution behavior.
- Keep receptionist-created works hidden from technicians until the first reception stage is completed and the workflow advances.
- Do not expose raw `REGISTERED` works to the technician pool.
- Preserve strict server-side RBAC and audit history.

## Root Cause

The workflow execution for a new reception work was created with the first stage `Recepție` left unassigned. Reception users only had `OWN_STAGE` start/complete permissions, so they had no operational path to finish the initial stage after creating the work. As a result, the workflow stayed on the reception stage and never advanced into the technician-visible queue.

## Fix

- Auto-assign the first runtime stage to the creating user when they are eligible for that stage and are not using manager override.
- Keep the workflow stage assignment history/audit intact.
- Leave technician visibility stage-gated so only advanced, technician-eligible work reaches the technician pool.

## Tests

- Workflow snapshot creation still creates the initial runtime execution.
- Eligible non-manager creators auto-assign the first stage.
- Existing no-template and stale-template behavior stays intact.
- Full workspace verification passes.

## Acceptance Criteria

- Reception can finish the initial stage for newly created works.
- Technician availability is still controlled by workflow stage eligibility.
- QR resolution remains unchanged.
- Existing workflow and claim semantics remain strict on the server.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Commit

`RECEPTION-TO-TECH-001: auto-assign initial reception stage for handoff`

