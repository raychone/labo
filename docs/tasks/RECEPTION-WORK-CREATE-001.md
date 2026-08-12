# RECEPTION-WORK-CREATE-001 - Reception work creation flow hardening

## Status

COMPLETED

Implemented as a single reception-facing create-work task.

## Objective

Harden the existing reception work creation modal so the registrar can reliably create a new work with searchable patient and work-type pickers, a consistent doctor selector, correct dynamic form submission, quick patient creation, and a safe atomic create flow without changing unrelated manager, technician, logistics, or billing behavior.

## Dependencies

- WORKS-001
- WORKFORMS-002
- WORKFORM-REAL-001B
- QR-001
- WORK-DEADLINES-001C
- PATIENTS-001
- CLINICS-001
- WORKTYPES-001
- RBAC-001

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../IMPLEMENTATION_RULES.md](../IMPLEMENTATION_RULES.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../SECURITY.md](../SECURITY.md)
- [../TESTING.md](../TESTING.md)
- [../modules/works.md](../modules/works.md)
- [../modules/forms.md](../modules/forms.md)
- [../modules/patients.md](../modules/patients.md)
- [../modules/clinics-doctors.md](../modules/clinics-doctors.md)
- [../modules/work-types.md](../modules/work-types.md)
- [../modules/qr.md](../modules/qr.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

- Keep the existing reception create modal; do not add a new route.
- Searchable patient picker:
  - show at most 3 suggestions on empty focus;
  - narrow suggestions as the user types;
  - support keyboard navigation;
  - clear selection cleanly when the user types again;
  - preserve the quick patient-create action.
- Searchable work-type picker:
  - same search and keyboard model as the patient picker;
  - load the selected work type into the existing create flow.
- Clinic and doctor selection:
  - keep doctor filtered by clinic;
  - clear stale doctor selection when the clinic changes;
  - keep the doctor control and validation in sync.
- Dynamic work fields:
  - submit checkbox and radio fields using the intended boolean/string contract;
  - keep generic work-form submission compatible with backend validation;
  - preserve the existing section layout and validation summary.
- Submission safety:
  - keep the existing atomic create mutation;
  - prevent duplicate submission behavior;
  - preserve the QR-safe work creation flow and created-work detail handoff.

## Out of scope

- Manager billing workspaces.
- Technician workbench changes.
- Logistics/delivery changes.
- Global navigation redesign.
- New routes.
- Prisma migrations.
- Seed/data model changes.
- Ambiguous legacy billing correction workflows.

## Business decisions

- Confirmed: the reception flow stays inside the existing `/works` create modal.
- Confirmed: patient creation can remain a quick modal that auto-selects the new patient.
- Confirmed: work creation must stay atomic and QR-safe.
- Requires business confirmation: any new reception intake workflow beyond the current modal.

## Data model changes

None.

## API changes

None. This task reuses existing work, patient, clinic, doctor, work-type, deadline, and QR APIs.

## UI changes

- Searchable create-modal pickers for patient and work type.
- Keyboard navigation for suggestion lists.
- Controlled doctor select state.
- Dynamic-field checkbox/radio rendering.
- Distinct active suggestion highlight.

## Security and RBAC

- Reuse existing `works.create`, `patients.create`, `clinics.read`, `doctors.read`, `work-types.read`, and related permissions.
- No new access model is introduced.
- Do not expose financial data.

## Audit

- Reuse the existing create-work audit trail.
- No new audit event type is required for this task.

## Task-specific tests

- Reception modal creates with searchable patient and work-type pickers.
- Empty-focus suggestion cap is 3.
- Keyboard navigation works in the searchable picker.
- Checkbox and radio dynamic fields submit correctly.
- Doctor resets when clinic changes.
- Existing QR-safe create flow still opens the created work detail.

## Acceptance criteria

- The create modal is usable without reopening or navigating away.
- Patient and work-type pickers search and narrow correctly.
- Keyboard selection works in the picker.
- Doctor selection stays aligned with the chosen clinic.
- Checkbox and radio dynamic fields submit the expected value types.
- Created works still resolve into the existing work detail and QR flow.
- Existing reception and non-reception flows remain unchanged.
- Standard verification from [../TESTING.md](../TESTING.md) passes.
- Documentation is updated.

## Documentation updates

- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/works.md](../modules/works.md)
- this task document

## Commit

`RECEPTION-WORK-CREATE-001: harden reception work creation flow`

## Next task

`DEMO-POLISH-002` remains planned and unstarted.
