# CLAIM-001A - Automatic claim eligibility

## Status

COMPLETED

## Objective

Remove any manual dispatch dependency from Reception-created works before technicians can see and claim them.

## Dependencies

- INTAKE-001B

## Scope

- Verified the current claimable-work read model is based on `claimStatus: UNCLAIMED`, not technician stage assignment.
- Added a negative acceptance regression test for a reception-created work whose current workflow stage is still assigned to reception.
- Documented that no manual `Trimite la tehnician`, `Alocă`, `Pornește`, or `Mută` step is required before `GET /works/available-for-claim` returns the work.

## Out of scope

- Claim mutation race hardening.
- Technician workbench redesign.
- State transition changes.

## Acceptance criteria

1. A newly created unclaimed work can appear in `GET /works/available-for-claim` without another mutation.
2. The claimable query does not require current workflow stage assignment to the technician.
3. The returned work exposes `claim.canCurrentUserClaim = true` when the technician has `works.claim.create`.
4. Reception workflow assignment does not block technician availability.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/api test -- works.service
```

Results:

- API typecheck passed.
- API tests passed: 54 files, 234 tests. The command was targeted with `works.service`, but current Vitest config still ran the API package suite.

## Manual checks

- Reviewed `WorksService.listAvailableForClaim` and `getVisibleWorkWhere`.
- Confirmed availability is driven by unclaimed work ownership state, not by manual workflow dispatch.

## Files changed

- `apps/api/src/modules/works/works.service.test.ts`
- `docs/modules/claim.md`
- `docs/modules/works.md`
- `docs/tasks/CLAIM-001A.md`

## Next task

`CLAIM-001B` should harden the `Preia` mutation race so exactly one simultaneous claim succeeds.
