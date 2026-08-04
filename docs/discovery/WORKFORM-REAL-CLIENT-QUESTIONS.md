# WORKFORM-REAL Confirmed Decisions And Future Questions

## Status

Laboratory validation completed. `WORKFORM-REAL-001A` is ready for implementation.

This document now keeps only genuinely unresolved future enhancements. The MVP decisions below are confirmed and should not be asked again.

## Confirmed MVP Decisions

- The real paper laboratory sheet is the MVP baseline.
- Do not invent additional operational fields in `WORKFORM-REAL-001A`.
- One common laboratory sheet is used for all work types in MVP.
- The laboratory sheet is primarily exchanged between the laboratory and clinic/doctor.
- The same sheet is used when a work leaves the laboratory and when it returns.
- Doctors do not need application accounts.
- Returns are registered by reception when the physical work arrives back in the laboratory.
- The paper layout currently contains two identical copies of the same laboratory sheet on one page.
- `WORKFORM-REAL-001A` builds the data model and data-entry UI only, not the printable document.
- Reception and technicians may both complete observations and technical data required by the work.
- The sheet becomes immutable only when finalized for that cycle.
- Historical cycle sheets are never edited.
- Corrections require a new cycle, not editing the previous cycle.
- A new cycle keeps the same `WorkOrder` and patient.
- A new cycle defaults clinic and doctor from the previous cycle for confirmation only; reception confirms or changes them before creating the cycle.
- Editable technical values are not copied automatically to a new cycle.
- Per-tooth repeating details are out of MVP; the existing tooth selector is sufficient.
- Shade/material per tooth is out of MVP; one shade/material value per cycle is enough and exceptions go into observations.
- Doctor instructions and observations are stored per cycle.
- Clinic/doctor corrections after technician claim happen only when reception registers a returned work before the new cycle is created.
- Signatures belong only to delivery/invoice documents, not the laboratory sheet in MVP.
- Printing is not part of `WORKFORM-REAL-001A`.
- Printable A4/A5 documents matching current paper forms will be handled later in the Documents module.
- No manager-only/internal fields are part of the laboratory sheet MVP.

## Open Future Enhancements

These do not block `WORKFORM-REAL-001A`.

### 1. Configurable Field Extensions

**Question:** Which additional operational fields should be added after MVP through configurable fields?

- Why it matters: The sheet may grow later without changing the MVP baseline.
- Options:
  - Add fields per work type.
  - Add optional common fields.
  - Keep the sheet unchanged.
- Recommended default: Keep the MVP sheet unchanged until the laboratory validates concrete extra fields.
- Technical impact: Future template configuration/versioning only.
- Blocks implementation: No.

### 2. Different Sheets Per Work Type

**Question:** Should some work types get their own sheet variants after MVP?

- Why it matters: MVP uses one common sheet, but specialized workflows may need extra fields later.
- Options:
  - Keep one common sheet.
  - Add work-type-specific versions later.
- Recommended default: Keep one common sheet until real use proves a need.
- Technical impact: Future work-type template variants.
- Blocks implementation: No.

### 3. Per-Tooth Repeating Details

**Question:** Should each tooth have its own detailed sub-form in a future version?

- Why it matters: MVP only needs the tooth selector.
- Options:
  - Keep one tooth selector.
  - Add per-tooth details later.
- Recommended default: Keep one tooth selector.
- Technical impact: Possible future grouped/repeating field model.
- Blocks implementation: No.

### 4. Shade/Material Per Tooth

**Question:** Should shade or material be captured separately per tooth in a future version?

- Why it matters: MVP uses one shade/material value per cycle and observations for exceptions.
- Options:
  - Keep one value per cycle.
  - Add per-tooth shade/material later.
- Recommended default: Keep one value per cycle.
- Technical impact: Possible future tooth-level data model and UI.
- Blocks implementation: No.

### 5. Printable Documents

**Question:** When should the Documents module generate A4/A5 printable laboratory sheets matching the paper forms?

- Why it matters: Printing is explicitly outside `WORKFORM-REAL-001A`.
- Options:
  - Implement later in Documents.
  - Keep digital-only.
- Recommended default: Implement later in Documents after data-entry workflow is stable.
- Technical impact: Future document generation, layout, and company/brand handling.
- Blocks implementation: No.

### 6. Attachments For Shade Details

**Question:** Should photos/files be attached later for color and clinical details?

- Why it matters: Collaboration terms mention color photos, but file storage is outside this task.
- Options:
  - Add attachments later.
  - Keep observations only.
- Recommended default: Defer until file storage/documents are approved.
- Technical impact: Future file storage and permissions.
- Blocks implementation: No.
