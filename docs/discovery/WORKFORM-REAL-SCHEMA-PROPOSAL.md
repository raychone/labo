# WORKFORM-REAL Schema Proposal

## Status

Laboratory validation completed. `WORKFORM-REAL-001A` is ready for implementation.

This is a proposal only. It does not implement schema, API, Prisma, migrations, seed, or frontend behavior.

## Confirmed Design Principles

- Build on the existing `WorkFormTemplate`, `WorkFormFieldDefinition`, and `WorkFormSubmission` infrastructure.
- Store real work-sheet submissions per `WorkCycle`, not per whole `WorkOrder`.
- Use one common laboratory sheet for all work types in MVP.
- Use the visible real paper sheet as the MVP baseline.
- Do not invent additional operational fields in `WORKFORM-REAL-001A`.
- Keep historical cycle submissions immutable.
- Finalization locks the sheet for that cycle.
- Corrections require a new cycle.
- Reference registries for patient, clinic, doctor, and work type, while preserving cycle snapshots for historical display.
- Keep financial fields outside the operational work sheet.
- Keep signatures and printing outside `WORKFORM-REAL-001A`.

## Proposed Canonical Fields

| Stable key | Romanian label | Type | Section | Required | Role ownership | Editable lifecycle | Scope | Validation | Copied to new cycle | Immutable |
|---|---|---|---|---|---|---|---|---|---|---|
| `work_code` | Fișa laborator nr | TEXT | Identificare lucrare | required | system / reception | read-only derived | work-scoped | existing work code | same `WorkOrder` code is preserved | immediately |
| `cycle_number` | Ciclu | NUMBER | Date ciclu | required | system | read-only derived | cycle-scoped | positive integer | system-created | immediately |
| `clinic_id` | Clinică | SELECT | Clinică și medic | required | reception | editable until cycle finalization | cycle-scoped | active clinic | default from previous cycle for confirmation only | after finalization |
| `doctor_id` | Doctor | SELECT | Clinică și medic | required | reception | editable until cycle finalization | cycle-scoped | active doctor in selected clinic | default from previous cycle for confirmation only | after finalization |
| `patient_display_name` | Pacient | TEXT | Pacient | required | system / reception | read-only derived after patient selection | work-scoped with cycle snapshot | patient name | same patient is preserved | immediately except approved patient correction flow |
| `patient_age` | Vârsta | NUMBER | Pacient | optional | reception | editable until cycle finalization | cycle-scoped snapshot | integer | no automatic technical copy | after finalization |
| `patient_sex` | Sex | SELECT | Pacient | optional | reception | editable until cycle finalization | cycle-scoped snapshot | configured values | no automatic technical copy | after finalization |
| `work_type_id` | Tip lucrare | SELECT | Tip lucrare | required | reception | editable until lifecycle rules allow | work-scoped with cycle snapshot | active work type | no automatic technical copy | after finalization/claim rules |
| `teeth` | Dinți | TOOTH | Elemente dentare | optional | reception / technician | editable until cycle finalization | cycle-scoped | valid FDI list | no automatic technical copy | after finalization |
| `shade` | Culoare | SHADE | Culoare | optional | reception / technician | editable until cycle finalization | cycle-scoped | configured shade values | no automatic technical copy | after finalization |
| `phase_1_name` | Faza 1 | TEXT | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | max length | no automatic technical copy | after finalization |
| `phase_1_due_date` | Termen faza 1 | DATE | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | date-only | no automatic technical copy | after finalization |
| `phase_2_name` | Faza 2 | TEXT | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | max length | no automatic technical copy | after finalization |
| `phase_2_due_date` | Termen faza 2 | DATE | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | date-only | no automatic technical copy | after finalization |
| `phase_3_name` | Faza 3 | TEXT | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | max length | no automatic technical copy | after finalization |
| `phase_3_due_date` | Termen faza 3 | DATE | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | date-only | no automatic technical copy | after finalization |
| `phase_4_name` | Faza 4 | TEXT | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | max length | no automatic technical copy | after finalization |
| `phase_4_due_date` | Termen faza 4 | DATE | Etape / faze | optional | reception / technician | editable until cycle finalization | cycle-scoped | date-only | no automatic technical copy | after finalization |
| `doctor_instructions` | Observații medic | TEXTAREA | Observații | optional | reception records doctor outside app | editable until cycle finalization | cycle-scoped snapshot | max length | no automatic technical copy | after finalization |
| `shared_observations` | Observații | TEXTAREA | Observații | optional | reception / technician | editable until cycle finalization | cycle-scoped | max length | no automatic technical copy | after finalization |

## Field Type Decision

Existing field types are enough for MVP:

- `TEXT`
- `TEXTAREA`
- `NUMBER`
- `DATE`
- `SELECT`
- `TOOTH`
- `SHADE`

`WORKFORM-REAL-001A` implemented the final approved MVP baseline without a standalone `Material` field. Material-specific capture remains a future configurable-field refinement unless the laboratory approves it as a visible sheet field.

Do not add a repeating tooth-level field type in `WORKFORM-REAL-001A`. Per-tooth details and shade/material per tooth are future enhancements only.

## Proposed Metadata Extensions

The implementation likely needs field metadata extensions:

| Metadata key | Purpose |
|---|---|
| `sectionKey` / `sectionLabel` | Group fields into Romanian work-sheet sections. |
| `roleOwner` | Define reception, technician, manager, system, or doctor-outside-app ownership. |
| `editableUntil` | Represent cycle finalization as the normal lock point. |
| `cycleScope` | Distinguish work-scoped derived values from cycle-scoped editable values. |
| `copyToNextCyclePolicy` | Ensure editable technical values are not copied automatically. |
| `printable` | Mark fields for future Documents-module printing without implementing printing now. |
| `sourceKind` | Distinguish registry-derived, system-derived, and user-entered fields. |

No manager-only field visibility is required for the MVP laboratory sheet because no manager-only/internal fields are part of the validated sheet.

## Template And Submission Proposal

- Add a real work-sheet classification to templates, for example `templateKind = GENERIC | REAL_WORK_SHEET`.
- Keep one active real work-sheet template behavior for the common MVP sheet.
- Preserve versioned templates; activating a new version applies only to new works/cycles.
- Create one real work-sheet submission per `WorkCycle`.
- Keep existing generic submissions compatible through a non-destructive migration.
- Store registry-derived display snapshots for patient, clinic, doctor, and work type at submission/cycle time.
- Store editable form answers separately from immutable cycle/work registry facts.

## Lifecycle Proposal

| Lifecycle moment | Confirmed behavior |
|---|---|
| Work intake | Reception starts the cycle sheet from the real paper baseline. |
| During work | Reception and technicians may both complete observations and technical data. |
| Returned work | Reception registers the physical return and confirms or changes clinic/doctor before creating the new cycle. |
| New cycle | Same `WorkOrder` and patient are preserved. Editable technical values are not copied automatically. |
| Finalization | The sheet becomes immutable for that cycle. |
| Historical cycle | Never edited; corrections require a new cycle. |

## Permission Proposal

Use permissions, not role-name checks:

| Permission | Purpose |
|---|---|
| `work_forms.real.read` | Read real work-sheet data allowed for the user. |
| `work_forms.real.update` | Edit the active cycle sheet while lifecycle permits. |
| `work_forms.real.finalize` | Finalize the active cycle sheet. |
| `work_forms.real.manage_templates` | Configure real work-sheet templates. |
| `work_forms.real.history.read` | Read historical cycle sheets. |

Financial data remains under pricing/billing permissions and must not be part of the operational sheet.

## Validation Proposal

- Required fields per template metadata.
- Unknown/reserved keys rejected.
- Maximum payload size preserved from current validation or tightened if needed.
- FDI tooth validation through existing `TOOTH` support.
- Shade option validation through existing `SHADE` support.
- Date-only validation for phase/deadline fields.
- Doctor must belong to selected clinic when registry-derived values are editable.
- Inactive clinic/doctor/work type cannot be selected for new active cycle sheets.
- Stale template/version conflicts return a clear reload message.
- Finalized cycle submissions cannot be modified.
- Historical cycle submissions cannot be modified.

## Backfill Proposal

- Add new columns/tables without deleting existing `work_form_submissions`.
- Link existing submissions to the active or cycle 1 work cycle only when the relationship is unambiguous.
- Preserve existing `schemaSnapshot`, `values`, `submittedAt`, `submittedByUserId`, and audit history.
- Do not invent missing fields from assets.
- Do not migrate pricing, invoice, payment, urgency fee, or totals into operational form values.

## Future Enhancements

Future enhancements do not block `WORKFORM-REAL-001A`:

- Additional configurable operational fields.
- Different sheet variants per work type.
- Per-tooth repeating details.
- Material capture and shade/material per tooth.
- Printable A4/A5 laboratory documents in the Documents module.
- Attachments/photos for shade details after file storage is approved.

## Final Recommendation

READY FOR IMPLEMENTATION

No MVP business-confirmation questions remain open. Future enhancements are tracked in [WORKFORM-REAL-CLIENT-QUESTIONS.md](WORKFORM-REAL-CLIENT-QUESTIONS.md).
