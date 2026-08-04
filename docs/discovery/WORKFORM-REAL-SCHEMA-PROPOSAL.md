# WORKFORM-REAL Schema Proposal

## Status

WORKFORM-REAL-DISCOVERY-001: COMPLETED.

This is a proposal only. It does not implement schema, API, Prisma, migrations, seed, or frontend behavior.

## Design Principles

- Build on the existing `WorkFormTemplate`, `WorkFormFieldDefinition`, and `WorkFormSubmission` infrastructure.
- Store real work-sheet submissions per `WorkCycle`, not per whole `WorkOrder`.
- Keep historical cycle submissions immutable.
- Reference registries for patient, clinic, doctor, and work type, while preserving cycle snapshots for historical display.
- Keep financial fields outside the operational work sheet.
- Use existing field types unless client confirmation proves they cannot represent the paper sheet.

## Proposed Canonical Fields

| Stable key | Romanian label | Type | Section | Required | Role ownership | Editable lifecycle | Common or specific | Scope | Options | Validation | Conditional visibility | Copied to new cycle | Immutable after claim/stage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `work_code` | Fișa laborator nr | TEXT | Identificare lucrare | required | reception | read-only derived | common | work-scoped | none | existing work code | always visible | always, as same WorkOrder code | immutable immediately |
| `cycle_number` | Ciclu | NUMBER | Date ciclu | required | system | read-only derived | common | cycle-scoped | none | positive integer | visible when cycles exist | never copied, system creates | immutable immediately |
| `clinic_id` | Clinică | SELECT | Clinică și medic | required | reception | editable until confirmed claim rule | common | cycle-scoped | existing active clinics | must reference active clinic | always visible | default from previous cycle, user confirms | lock timing requires confirmation |
| `doctor_id` | Doctor | SELECT | Clinică și medic | required | reception | editable until confirmed claim rule | common | cycle-scoped | doctors filtered by clinic | active doctor in selected clinic | always visible | default from previous cycle, user confirms | lock timing requires confirmation |
| `patient_display_name` | Pacient | TEXT | Pacient | required | reception | read-only derived after patient selection | common | work-scoped with cycle snapshot | none | first and last name required | always visible | always as same patient | immutable after intake except patient correction flow |
| `patient_age` | Vârsta | NUMBER | Pacient | optional until confirmed | reception | editable until confirmed claim rule | common | cycle-scoped snapshot | none | integer, sensible range TBD | visible if client wants age | field-specific | lock timing requires confirmation |
| `patient_sex` | Sex | SELECT | Pacient | optional until confirmed | reception | editable until confirmed claim rule | common | patient/work snapshot | values TBD | allowed option | visible if client wants sex | field-specific | lock timing requires confirmation |
| `work_type_id` | Tip lucrare | SELECT | Tip lucrare | required | reception | editable before claim only unless manager repair | common | work-scoped with cycle snapshot | existing active work types | active work type | always visible | default from work | immutable after claim |
| `teeth` | Dinți | TOOTH | Elemente dentare | optional until confirmed | reception / technician | editable until confirmed lock point | common | cycle-scoped | FDI tooth codes | valid FDI list | always visible | field-specific | lock timing requires confirmation |
| `shade` | Culoare | SHADE | Culoare | optional until confirmed | reception / technician | editable until confirmed lock point | common | cycle-scoped | shade system TBD | allowed option or extension if free text needed | visible when relevant to work type | field-specific | lock timing requires confirmation |
| `shade_notes` | Detalii culoare | TEXTAREA | Culoare | optional | reception / technician | editable until confirmed lock point | work-type-specific likely | cycle-scoped | none | max length | visible when shade detail needed | field-specific | lock timing requires confirmation |
| `phase_1_name` | Faza 1 | TEXT | Etape / faze | optional until confirmed | reception | editable until confirmed lock point | common or work-type-specific TBD | cycle-scoped | none | max length | visible if phases are retained | field-specific | lock timing requires confirmation |
| `phase_1_due_date` | Termen faza 1 | DATE | Etape / faze | optional | reception | editable until deadline lock | common or work-type-specific TBD | cycle-scoped | none | date-only | visible with Faza 1 | field-specific | immutable after deadline snapshot if used |
| `phase_2_name` | Faza 2 | TEXT | Etape / faze | optional | reception | editable until confirmed lock point | common or work-type-specific TBD | cycle-scoped | none | max length | visible if phases are retained | field-specific | lock timing requires confirmation |
| `phase_2_due_date` | Termen faza 2 | DATE | Etape / faze | optional | reception | editable until deadline lock | common or work-type-specific TBD | cycle-scoped | none | date-only | visible with Faza 2 | field-specific | immutable after deadline snapshot if used |
| `phase_3_name` | Faza 3 | TEXT | Etape / faze | optional | reception | editable until confirmed lock point | common or work-type-specific TBD | cycle-scoped | none | max length | visible if phases are retained | field-specific | lock timing requires confirmation |
| `phase_3_due_date` | Termen faza 3 | DATE | Etape / faze | optional | reception | editable until deadline lock | common or work-type-specific TBD | cycle-scoped | none | date-only | visible with Faza 3 | field-specific | immutable after deadline snapshot if used |
| `phase_4_name` | Faza 4 | TEXT | Etape / faze | optional | reception | editable until confirmed lock point | common or work-type-specific TBD | cycle-scoped | none | max length | visible if phases are retained | field-specific | lock timing requires confirmation |
| `phase_4_due_date` | Termen faza 4 | DATE | Etape / faze | optional | reception | editable until deadline lock | common or work-type-specific TBD | cycle-scoped | none | date-only | visible with Faza 4 | field-specific | immutable after deadline snapshot if used |
| `doctor_instructions` | Observații medic | TEXTAREA | Observații | optional | reception records doctor outside app | editable until confirmed lock point | common | cycle-scoped snapshot | none | max length | visible if notes are split | field-specific | lock timing requires confirmation |
| `reception_observations` | Observații recepție | TEXTAREA | Observații | optional | reception | editable until confirmed lock point | common | cycle-scoped | none | max length | visible if notes are split | field-specific | lock timing requires confirmation |
| `technician_observations` | Observații tehnician | TEXTAREA | Observații | optional | technician | editable during assigned stage only | common | cycle-scoped | none | max length | visible to technician/manager/reception unless restricted | never by default | immutable after stage completion |
| `shared_observations` | Observații | TEXTAREA | Observații | optional | reception / technician | editable until confirmed lock point | common | cycle-scoped | none | max length | fallback if notes are not split | field-specific | lock timing requires confirmation |

## Proposed Metadata Extensions

Existing field types are enough for all confirmed visible fields. No new value field type is required for the current paper sheet.

The implementation likely needs field metadata extensions:

| Metadata key | Purpose | Why existing model is insufficient |
|---|---|---|
| `sectionKey` / `sectionLabel` | Group fields into Romanian work-sheet sections. | Current fields have only flat sort order. |
| `roleOwner` | Define reception, technician, manager, system, or doctor-outside-app ownership. | Current fields do not encode edit authority. |
| `visibilityPolicy` | Hide manager-only or sensitive fields from unauthorized roles. | Financial isolation must be server-side. |
| `editableUntil` | Lock fields after intake, claim, active stage completion, cycle close, or manager repair. | Current submissions can be updated as a whole. |
| `cycleScope` | Distinguish work-scoped derived values from cycle-scoped editable values. | Current submissions are work-owned. |
| `copyToNextCyclePolicy` | Define never, always, user-selected, or field-specific copy behavior. | Cycle creation must not silently clone answers. |
| `printable` | Mark fields intended for a future printed work sheet. | Print behavior is not represented. |
| `sourceKind` | Distinguish registry-derived, system-derived, and user-entered fields. | Prevents duplicated source-of-truth values. |

Potential field type extension, only if confirmed:

| Proposed type | Status | Reason |
|---|---|---|
| Repeating tooth-level group | Not approved | Required only if client confirms shade/material/technical values can differ by tooth and cannot be represented by flat `TOOTH`, `SHADE`, `SELECT`, and `TEXTAREA` fields. |

## Template And Submission Proposal

- Add a real work-sheet classification to templates, for example `templateKind = GENERIC | REAL_WORK_SHEET`.
- Keep one active real work-sheet template per `WorkType`.
- Preserve versioned templates; activating a new version applies only to new works/cycles.
- Create one real work-sheet submission per `WorkCycle`.
- Keep existing generic submissions compatible through a non-destructive migration.
- Store registry-derived display snapshots for patient, clinic, doctor, and work type at submission/cycle time.
- Store editable form answers separately from immutable cycle/work registry facts.

## Lifecycle Proposal

| Lifecycle moment | Proposed behavior |
|---|---|
| Work intake | Reception selects patient, clinic, doctor, work type, teeth, shade, phase/deadline notes, and observations as confirmed by the client. |
| Technician claim | System locks execution, pricing, and deadline snapshots as already implemented. Field locks require confirmation before coding. |
| Stage completion | Technician-owned fields for that stage become immutable unless a future repair flow is approved. |
| Cycle close | Entire cycle work-sheet submission becomes read-only. |
| Next cycle | New cycle gets a new submission. No values are silently cloned. Copy behavior must follow confirmed field policy. |

## Permission Proposal

Use permissions, not role-name checks:

| Permission | Purpose |
|---|---|
| `work_forms.real.read` | Read real work-sheet data allowed for the user. |
| `work_forms.real.update_reception` | Edit reception-owned fields while lifecycle permits. |
| `work_forms.real.update_technical` | Edit technician-owned fields while lifecycle permits. |
| `work_forms.real.manage_templates` | Configure real work-sheet templates. |
| `work_forms.real.history.read` | Read historical cycle sheets. |

Financial data must remain outside these permissions and under pricing/billing permissions.

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
- Historical cycle submissions cannot be modified by normal update endpoints.

## Backfill Proposal

- Add new columns/tables without deleting existing `work_form_submissions`.
- Link existing submissions to the active or cycle 1 work cycle only when the relationship is unambiguous.
- Preserve existing `schemaSnapshot`, `values`, `submittedAt`, `submittedByUserId`, and audit history.
- Do not invent missing fields from assets.
- Do not migrate pricing, invoice, payment, urgency fee, or totals into operational form values.

## Open Decisions Blocking Implementation

| Decision | Why it blocks coding |
|---|---|
| Meaning of `Faza 1` through `Faza 4` | Determines whether fields are dynamic form values, workflow stages, phase records, or deadline records. |
| Observation split | Determines whether to store one shared note or actor-owned notes with separate edit locks. |
| Tooth-level repeating values | Determines whether current field types are enough or a grouped extension is required. |
| Shade/material per tooth | Determines schema shape and UI complexity. |
| Field lock rules after claim/stage completion | Determines backend authorization and immutability rules. |
| Copy behavior into new cycles | Determines lifecycle API behavior and migration tests. |

## Final Recommendation

BLOCKED - BUSINESS CONFIRMATION REQUIRED

Ask the laboratory client only these questions before implementing `WORKFORM-REAL-001A`:

1. Is `Fișa laborator nr` the same value as the application work code?
2. What exactly are `Faza 1`, `Faza 2`, `Faza 3`, and `Faza 4`?
3. Should `Observații` be one field or separate doctor/reception/technician fields?
4. Can color or material differ by individual tooth?
5. Which fields lock after technician claim and after stage completion?
6. For a returned work/new cycle, which fields should be copied from the previous cycle?
