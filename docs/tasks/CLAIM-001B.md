# CLAIM-001B - Atomic claim race hardening

## Status

COMPLETED

## Objective

Guarantee that exactly one `Preia` succeeds when two technicians attempt to claim the same work at the same time.

## Dependencies

- CLAIM-001A
- REALIGN-001B

## Scope

- Reviewed the existing `WorksService.claimWork` transaction.
- Confirmed the production path already uses a conditional `updateMany` on work id, `claimRevision`, and `claimStatus: UNCLAIMED`.
- Added a concurrent regression test using two simultaneous `claimWork` calls against the same initial revision.
- Verified the successful claim returns one owner and `CLAIMED` status.
- Verified the losing claim raises `ConflictException` and writes the existing claim-conflict audit action.

## Out of scope

- Stale claim recovery.
- Claim expiration.
- Technician workbench redesign.
- New database constraints beyond the existing conditional update strategy.

## Acceptance criteria

1. Two simultaneous claims for the same work produce exactly one fulfilled result.
2. The second claim receives a conflict response.
3. Only one committed owner/timestamp is produced.
4. Only one assignment event is committed.
5. Claim conflict is audited.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/api test -- works.service
```

Results:

- API typecheck passed.
- API tests passed: 54 files, 235 tests. The command was targeted with `works.service`, but current Vitest config still ran the API package suite.

## Manual checks

- Reviewed the claim transaction ordering and conflict path.
- Confirmed no production code change was needed because the existing conditional update already enforces atomic ownership.

## Files changed

- `apps/api/src/modules/works/works.service.test.ts`
- `docs/modules/claim.md`
- `docs/tasks/CLAIM-001B.md`

## Next task

`STATE-001A` should align operational work states with `RECEPTIE`, `IN_LUCRU`, `IN_ASTEPTARE`, and `FINALIZATA`.
