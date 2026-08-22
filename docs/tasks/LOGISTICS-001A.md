# LOGISTICS-001A - Logistics Work Creation With Attachments

## Status

COMPLETED

## Objective

Allow Logistics to create `Lucrare noua` using the canonical intake flow plus validated attachments.

## Scope

- Reused the shared Work intake form, DTO conversion and dynamic form validation.
- Kept clinic and doctor optional through the existing work creation service.
- Added a logistics multipart endpoint that delegates work creation to `WorksService.createWork`.
- Added `WorkAttachment` persistence for uploaded images/PDFs with uploader, timestamp and file metadata.
- Added drag/drop and file picker attachment UI in the Logistics page.
- Preserved the single `Culoare` field from the shared Work form.

## Acceptance

- Logistics-created works follow the same automatic claimability behavior as Reception-created works.
- Work Type selection uses long name primary display from the shared Work form.
- Adult FDI tooth selection remains handled by the existing dynamic Work form renderer.
- Attachments validate file count, size, MIME type and file name server-side.
- Attachment upload attempts create audit entries.

## Validation

- `pnpm --filter @dental-lab/api test -- logistics.service.test.ts`
- `pnpm --filter @dental-lab/web test -- logistics-page.test.tsx`
- `pnpm --filter @dental-lab/shared typecheck`
- `pnpm --filter @dental-lab/api typecheck`
- `pnpm --filter @dental-lab/web typecheck`
