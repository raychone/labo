# Works

## Status

Implemented and actively evolving.

## Purpose

Manage core dental laboratory work orders from registration through operational execution.

## Roles And Permissions

Key permissions include `works.create`, `works.read_all`, `works.read_assigned`, `works.update`, deadline permissions, claim permissions, execution snapshot permissions, cycle permissions (`cycles.read`, `cycles.history.read`, `cycles.create_next`), and real laboratory sheet permissions under `work_forms.real.*`.

## Domain Concepts

Short annual work code, optional clinic, optional doctor, patient, work type, element count, dental shade, adult permanent FDI teeth, priority, operational status, technician `Cod`, QR token, deadline, workflow, ownership, execution snapshot, work cycles, cycle-scoped real laboratory sheet.

## Business Rules

Reception creates works without selecting `NC`/`NG`. Company context is fixed per cycle by first valid technical claim or manager assignment. New visible work codes use the annual format `WO-YY-NNNN`; legacy `WO-YYYY-NNNNNN` codes remain valid and are not renumbered. Clinic and doctor are optional on work create/edit and cycles; valid combinations are clinic only, doctor only, both, or neither. When both clinic and doctor are provided, the doctor must belong to the selected clinic. `quantity` is the canonical element count in intake UI. `shade` stores the dental color/shade separately from deadline/status color tokens. Teeth are optional, adult permanent FDI only, deduped, and returned in canonical order: `18..11`, `21..28`, `31..38`, `48..41`. Delivery deadline can be created with date and optional time through the existing manual deadline field. Newly created unclaimed works are saved as `RECEPTIE` and are immediately visible in the technician available-for-claim pool, even while the initial reception workflow stage remains assigned to reception. Claim/reassign move work to `IN_LUCRU`; release returns non-final work to `RECEPTIE`; claimed works can move to `IN_ASTEPTARE`, back to `IN_LUCRU`, or from `IN_LUCRU` to `FINALIZATA`. Operational status changes store explicit timestamp/actor fields; completion stores explicit completion timestamp/actor. Technician `Cod` is stored as `technicalCodeNotes`, separate from visible work code and opaque QR token. Work updates use optimistic revision checks where implemented. A work can have multiple cycles while retaining the same work code and patient; exactly one cycle is active. Returned works are registered at reception through `Înregistrează revenirea`. The current `WorkOrder` clinic/doctor follow the active cycle, while prior cycle clinic/doctor/snapshots remain immutable history.

Each cycle can own one real laboratory sheet submission. Reception and permitted assigned technicians may edit the active cycle sheet until it is finalized. Closed cycles and finalized sheets are read-only; corrections require a new cycle. Editable sheet values are not copied automatically to a new cycle. Active-cycle sheet states are `NOT_STARTED`, `IN_PROGRESS`, `COMPLETE`, and `FINALIZED`; writes use revision checks to prevent stale draft/complete/finalize operations.

## Data Model

`WorkOrder` with `shade`, operational `status`, `statusChangedAt`, `statusChangedByUserId`, `waitingStartedAt`, `completedAt`, `completedByUserId`, `technicalCodeNotes`, `WorkCycle` with per-cycle clinic/doctor/reason/status, `WorkAssignmentEvent`, `WorkExecutionSnapshot`, cycle-aware `WorkFormSubmission`, workflow/logistics/billing relations. Billing lines reference cycles and use the cycle execution snapshot as the company/price source.

## API

`GET /works`, `GET /works/:id`, `POST /works`, `PATCH /works/:id`, `PATCH /works/:id/technician-details`, `POST /works/:id/status`, `GET /works/work-type-options`, deadline, claim, release, reassign, assignment-history endpoints, `GET /works/:id/cycles`, `POST /works/:id/cycles/next`, `GET/PATCH /works/:id/cycles/:cycleId/real-lab-sheet`, and `POST /works/:id/cycles/:cycleId/real-lab-sheet/finalize`. Read access is permission-scoped: managers can read all works, technicians can read assigned and claimable work, and the shared status/workbench surfaces only the subset the current user may see.

STATUS-001A adds `GET /status/operational` as a separate read-only aggregate over work orders, claim ownership, workflow, deadlines, logistics, and delivery. WORKFORM-REAL-001B extends that read model with compact real laboratory sheet status and filtering. It returns operational fields only and masks financial data server-side.

## UI

`/works` registry with reception-oriented deadline counters, quick filters, compact filters, create modal, detail/edit drawer, QR modal, workflow section, `Cicluri` history section, `Fișă laborator` cycle sheet section with draft/complete/finalize UX, `Înregistrează revenirea` modal, deadline and execution context cards. The reception create modal uses searchable patient and work-type pickers with capped empty-focus suggestions, keyboard navigation, quick patient creation, optional clinic/doctor, `Elemente`, `Culoare`, delivery deadline date/time, notes, four-quadrant adult FDI tooth selection, and controlled dynamic checkbox/radio fields. `/workbench` now centers on `Lucrări de preluat` with `Preia` and `Lucrările mele` with `Detalii`, `Manopere`, and `Finalizata`; `Detalii` opens the technician-editable modal for notes and `Cod`, while `Finalizata` writes the persisted operational status. `/scan` and `/status` surface sheet status and link into the existing `/works?workId=...` detail flow instead of duplicating work detail UI. `/status` keeps filters collapsed by default and shows compact rows with only the technician color badge, patient name, work type, flux/current stage, state, priority, and stacked `Detalii`/`Deschide` actions. `/status/tv` reuses the same read model in a fullscreen read-only layout for wall monitors, keeps the filters hidden by default, polls periodically, avoids shell chrome and mutation actions, and is now being refined into compact operational slices with automatic page rotation for TV readability. Returned works are registered through the receptionist flow, and the same work can reappear in the patient record after a new cycle is opened. Technicians may open visible work detail flows directly from the shared routes even when `/works` is not present in their primary navigation. The technician execution drawer now leads with the live execution summary card before the historical sections so the active stage and company context are visible immediately.

## Audit

Create/update/technician-detail/deadline/claim/release/reassign/status/snapshot actions, cycle creation, active-cycle closure, cycle conflicts.

## Security

Server-side RBAC, resource visibility, financial masking, CSRF on mutations.

## Edge Cases

Missing clinic/doctor, inactive clinic/doctor/work type, doctor outside selected clinic when both are provided, missing `OTHER` return notes, promised date constraints, pricing unresolved at claim, firm mismatch after snapshot, concurrent claim/reassign, active-cycle conflicts, clinic/doctor changes between cycles.

## Implemented Tasks

WORKS-001, QR-001, WORK-DEADLINES-001A/B/C, TECH-CLAIM-001A/B, WORKFORMS-002, WORKFORM-REAL-001A/B, WORKFLOW-002, STATUS-001A, STATUS-001B, WORK-CYCLES-001A, WORK-CYCLES-001B, CORE-ROLE-UX-001, RECEPTION-WORK-CREATE-001, WORK-ID-001A, WORK-ID-001B, INTAKE-001A, INTAKE-001B, TEETH-001A, TEETH-001B, CLAIM-001A, CLAIM-001B, STATE-001A, TECH-001A, TECH-001B.

## Planned Tasks

Materials/inventory integration.

## Deferred

Files and quality control.

## Open Decisions

Final work lifecycle closure rules and repair paths.

## Related Documents

[claim.md](claim.md), [deadlines.md](deadlines.md), [pricing.md](pricing.md), [workflow.md](workflow.md).
