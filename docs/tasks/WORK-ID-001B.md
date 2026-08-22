# WORK-ID-001B - QR separation regression

## Status

COMPLETED

## Objective

Prove that the short visible work code rollout does not change opaque QR payloads and does not break legacy manual work-code fallback.

## Dependencies

- WORK-ID-001A

## Scope

- Added regression coverage that QR payload helpers use only opaque `dl-work:` token payloads.
- Added regression coverage that QR resolution looks up opaque QR scans by `qrToken`, not by visible work code.
- Added controller coverage for short work-code manual fallback `WO-YY-NNNN`.
- Preserved controller coverage for legacy manual fallback `WO-YYYY-NNNNNN`.
- Updated scan page test coverage to exercise the new short code in manual fallback.
- Updated QR modal rendering coverage to verify short-code labels while still hiding the opaque token.

## Out of scope

- QR payload redesign.
- QR token migration.
- Renumbering historical work orders.
- Physical label redesign.

## Acceptance criteria

1. QR payloads remain opaque `dl-work:<token>` values.
2. QR resolution by camera/QR token queries `qrToken`.
3. Manual fallback accepts new `WO-YY-NNNN` codes.
4. Manual fallback still accepts legacy `WO-YYYY-NNNNNN` codes.
5. QR label UI can display the short visible code without exposing the opaque token.

## Automated checks

Commands:

```sh
pnpm --filter @dental-lab/api typecheck
pnpm --filter @dental-lab/web typecheck
pnpm --filter @dental-lab/api test -- qr.service qr.controller
pnpm --filter @dental-lab/web test -- works-page.test.tsx work-scan-page.test.tsx
```

Results:

- API typecheck passed.
- Web typecheck passed.
- API tests passed: 54 files, 228 tests.
- Web tests passed: 26 files, 83 tests.

## Manual checks

- Review `/works/:id/qr-image` behavior: payload should stay `dl-work:<token>`.
- Review `/scan`: short visible code can be entered manually.
- Review legacy support: existing printed/manual codes remain accepted.

## Files changed

- `apps/api/src/modules/qr/qr.service.test.ts`
- `apps/api/src/modules/qr/qr.controller.test.ts`
- `apps/web/src/features/works/work-scan-page.test.tsx`
- `apps/web/src/features/works/works-page.test.tsx`
- `docs/modules/qr.md`
- `docs/tasks/WORK-ID-001B.md`

## Next task

`INTAKE-001A` should make clinic/doctor optional across the work data model, DTOs, services and read models.
