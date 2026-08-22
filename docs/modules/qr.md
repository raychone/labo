# QR And Scan

## Status

Implemented base QR, operational scan actions, and real laboratory sheet status context.

## Purpose

Identify and open work context through opaque QR codes.

## Roles And Permissions

`scan.use`, `scan.resolve`, work read permissions, QR-related work permissions where used.

## Domain Concepts

Opaque token, QR image, print action, scan resolution, work-opened event, current cycle sheet status.

## Business Rules

QR must not expose sensitive work data directly. Resolution requires backend auth. QR payloads use the opaque `dl-work:` token; manual fallback accepts both new `WO-YY-NNNN` codes and legacy `WO-YYYY-NNNNNN` codes.

## Data Model

QR token fields on `WorkOrder` and audit/scan events where implemented.

## API

`GET /works/:id/qr`, `GET /works/:id/qr-image`, `POST /works/resolve-qr`, `POST /works/:id/qr/print`, `POST /scan/resolve`, `POST /scan/work-opened`.

## UI

`/scan`, QR modal in `/works`, camera scanner and manual scan form. Scan results show current cycle real laboratory sheet status and an action that opens the existing work detail/sheet flow when the user is authorized.

## Audit

Print/resolve/open events where implemented.

## Security

Opaque token only; permission-controlled resolution.

## Edge Cases

Invalid token, expired/replaced token, camera unavailable, manual fallback.

## Implemented Tasks

QR-001, SCAN-002, WORKFORM-REAL-001B scan integration, WORK-ID-001A compatibility, WORK-ID-001B regression coverage.

## Planned Tasks

Operational scan refinements if required.

## Deferred

Physical phone/print verification remains manual acceptance context from earlier QR task.

## Open Decisions

Final physical label format.

## Related Documents

[works.md](works.md), [logistics.md](logistics.md).
