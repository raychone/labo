# WORKFORM-REAL Field Audit

## Status

WORKFORM-REAL-DISCOVERY-001: COMPLETED.

## Objective

Audit visible fields and supporting operational rules from the real laboratory sheet and related `assets/` references before implementing `WORKFORM-REAL-001A`.

## Sources Inspected

- `assets/WhatsApp Image 2026-07-29 at 05.04.46 (1).jpeg` - blank laboratory sheet, two identical slips per page.
- `assets/WhatsApp Image 2026-07-29 at 05.04.46.jpeg` - collaboration terms.
- `assets/WhatsApp Image 2026-07-29 at 05.04.45.jpeg` - price list and execution-time notes.
- `assets/WhatsApp Image 2026-07-29 at 05.04.48.jpeg` - filled invoice/payment-like list.
- `assets/WhatsApp Image 2026-07-29 at 05.04.48 (1).jpeg` - fiscal invoice.
- `assets/Nota Plata 2026.pdf` - payment-note presentation shell.
- `assets/Nota Plata A5 2026.pdf` - A5 payment-note presentation shell.

Assets were inspected only. They were not modified, renamed, moved, optimized, converted, committed, or deleted. PDF previews were rendered only to `/tmp` for visual inspection.

## Classification Summary

The only confirmed work-sheet source is `WhatsApp Image 2026-07-29 at 05.04.46 (1).jpeg`. The two-up layout repeats the same slip and should not create two separate schemas.

The collaboration-terms image contains business guidance for impressions, color, probes, repeated phases, and deadlines. It is useful for validation and client questions but does not itself define input fields.

The price list, invoice, and payment-note files contain financial, billing, or print-only presentation information. They must not be exposed in the operational work sheet for unauthorized roles.

## Field Inventory

| Visible Romanian label | Section | Purpose | Example value | Input form | Required | Likely actor | Domain owner | Exists now | Registry or snapshot | Financial | Confidence | Client confirmation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Fișa laborator nr` | Work identification | Laboratory/work code on the paper slip | none visible | handwritten | mandatory | reception | WorkOrder | yes, as work code | WorkOrder reference plus printed snapshot | no | CONFIRMED | Confirm whether this is exactly the app work code. |
| `Doctor` | Patient and doctor fields | Treating doctor for the work/cycle | none visible | handwritten | mandatory | reception | Doctor / WorkCycle | yes | existing Doctor registry plus cycle snapshot | no | CONFIRMED | Confirm if free-text doctor is ever allowed. |
| `Pacient` | Patient and doctor fields | Patient name | none visible | handwritten | mandatory | reception | Patient / immutable snapshot | yes | Patient registry plus cycle snapshot | no | CONFIRMED | Confirm whether only first and last name are required. |
| `Vârsta` | Patient and doctor fields | Patient age at intake | none visible | handwritten | optional or mandatory unclear | reception | Patient or immutable snapshot | partial, birth date exists | snapshot preferred unless birth date is confirmed | no | CONFIRMED | Confirm whether age or birth date is captured. |
| `Sex` | Patient and doctor fields | Patient sex | none visible | handwritten | optional or mandatory unclear | reception | Patient or immutable snapshot | partial, patient sex exists | Patient registry plus cycle snapshot | no | CONFIRMED | Confirm allowed values and whether required. |
| `Tip lucrare` | Work type and restoration | Type/category of laboratory work | none visible | handwritten/free text | mandatory | reception | WorkType / immutable snapshot | yes | WorkType registry plus template/work snapshot | no | CONFIRMED | Confirm mapping to active WorkType list. |
| `Culoare` | Shade/color information | Requested shade/color | none visible | handwritten | optional or mandatory unclear | doctor outside app / reception | WorkCycle form field | yes, SHADE field type exists | snapshot per cycle | no | CONFIRMED | Confirm shade system/options and whether free text is needed. |
| `18 17 16 15 14 13 12 11` | Dental/tooth data | Upper-right FDI tooth choices | none visible | printed tooth selector | optional or mandatory unclear | doctor outside app / reception / technician | WorkCycle form field | yes, TOOTH field type exists | snapshot per cycle | no | CONFIRMED | Confirm if teeth are selected globally or by phase/material/shade. |
| `21 22 23 24 25 26 27 28` | Dental/tooth data | Upper-left FDI tooth choices | none visible | printed tooth selector | optional or mandatory unclear | doctor outside app / reception / technician | WorkCycle form field | yes, TOOTH field type exists | snapshot per cycle | no | CONFIRMED | Confirm permanent teeth only or pediatric teeth too. |
| `48 47 46 45 44 43 42 41` | Dental/tooth data | Lower-right FDI tooth choices | none visible | printed tooth selector | optional or mandatory unclear | doctor outside app / reception / technician | WorkCycle form field | yes, TOOTH field type exists | snapshot per cycle | no | CONFIRMED | Confirm whether arch-level values are also needed. |
| `31 32 33 34 35 36 37 38` | Dental/tooth data | Lower-left FDI tooth choices | none visible | printed tooth selector | optional or mandatory unclear | doctor outside app / reception / technician | WorkCycle form field | yes, TOOTH field type exists | snapshot per cycle | no | CONFIRMED | Confirm if tooth selection can be edited after claim. |
| Tooth outline drawing | Shade/color information | Visual shade map or contour notes | none visible | drawing/annotation area | optional | doctor outside app / technician | printable document only or future attachment | no | snapshot or print-only | no | LIKELY | Confirm if digital form must capture cervical/body/incisal zones. |
| `Faza 1` | Stage-specific information | First planned/clinical phase | none visible | handwritten line | optional or mandatory unclear | reception / technician | workflow stage or WorkCycle form field | partial, workflow stage exists | snapshot per cycle | no | CONFIRMED | Confirm whether phases equal workflow stages or doctor-facing phases. |
| `Termen` next to `Faza 1` | Dates and deadline information | Deadline for phase 1 | none visible | handwritten date/text | optional or mandatory unclear | reception | deadline snapshot or WorkCycle form field | partial, deadlines exist | deadline snapshot preferred | no | CONFIRMED | Confirm if each phase can have its own due date. |
| `Faza 2` | Stage-specific information | Second planned/clinical phase | none visible | handwritten line | optional | reception / technician | workflow stage or WorkCycle form field | partial | snapshot per cycle | no | CONFIRMED | Confirm phase semantics. |
| `Termen` next to `Faza 2` | Dates and deadline information | Deadline for phase 2 | none visible | handwritten date/text | optional | reception | deadline snapshot or WorkCycle form field | partial | deadline snapshot preferred | no | CONFIRMED | Confirm phase deadline rules. |
| `Faza 3` | Stage-specific information | Third planned/clinical phase | none visible | handwritten line | optional | reception / technician | workflow stage or WorkCycle form field | partial | snapshot per cycle | no | CONFIRMED | Confirm phase semantics. |
| `Termen` next to `Faza 3` | Dates and deadline information | Deadline for phase 3 | none visible | handwritten date/text | optional | reception | deadline snapshot or WorkCycle form field | partial | deadline snapshot preferred | no | CONFIRMED | Confirm phase deadline rules. |
| `Faza 4` | Stage-specific information | Fourth planned/clinical phase | none visible | handwritten line | optional | reception / technician | workflow stage or WorkCycle form field | partial | snapshot per cycle | no | CONFIRMED | Confirm maximum number of phases. |
| `Termen` next to `Faza 4` | Dates and deadline information | Deadline for phase 4 | none visible | handwritten date/text | optional | reception | deadline snapshot or WorkCycle form field | partial | deadline snapshot preferred | no | CONFIRMED | Confirm phase deadline rules. |
| `Observații` | Doctor/reception/technician observations | Free notes for instructions or lab observations | none visible | handwritten free text | optional | doctor outside app / reception / technician | WorkCycle form field | partial, notes fields exist in modules | snapshot per cycle | no | CONFIRMED | Confirm whether notes must be split by actor. |
| `www.creative-dental-art.ro` | Print-only presentation fields | Website printed on slip edge | visible as label | preprinted | not input | manager | printable document only | no | print-only setting | no | CONFIRMED | Confirm branding source when print task starts. |
| `Creative Dental Art` | Print-only presentation fields | Laboratory brand header | visible as label | preprinted | not input | manager | printable document only | no | print-only setting | no | CONFIRMED | Confirm legal branding per NC/NG before print work. |
| `Tel:0755 704704` | Print-only presentation fields | Laboratory phone header | visible as label | preprinted | not input | manager | printable document only | no | print-only setting | no | CONFIRMED | Confirm active phone number before print work. |

## Supporting Operational Rules From Collaboration Terms

These items are not raw fields but may affect validation, help text, or future workflow rules:

| Visible Romanian heading or phrase | Classification | Operational meaning | Financial | Confidence | Client confirmation |
|---|---|---|---|---|---|
| `Detalii Amprentă` | Reception observations / doctor instructions | Impression quality and occlusion registration matter before work starts. | no | CONFIRMED | Confirm whether reception records impression quality on intake. |
| `Detalii pentru culoarea lucrărilor` | Shade/color information | Color should be transmitted through high-resolution photos when possible; otherwise on lab sheet. | no | CONFIRMED | Confirm whether photo attachment is required now or deferred. |
| `Detalii pentru probele lucrărilor` | Cycle/return information | Probe/try-in returns can require new clinical/lab phases. | partly mentions charges | CONFIRMED | Confirm return reasons and whether each probe opens a new cycle. |
| `Detalii termene de realizare a lucrărilor` | Dates and deadline information | Deadlines use working days and may exclude receipt day after 15:00. | no | CONFIRMED | Confirm whether current deadline engine already covers these rules. |
| `Orice repetare a etapelor presupune timp și costuri suplimentare` | Cycle/return information | Repeated phases may be operationally significant and financially separate. | yes | CONFIRMED | Operational form must not expose costs; confirm how to flag repeated phase. |
| `Taxă urgență: + 35 - 100 % din valoarea lucrării` | Financial fields | Urgency fee is financial. | yes | CONFIRMED | Keep outside operational form unless manager-only pricing task extends it. |

## Financial And Billing Fields Excluded

The following visible fields belong to billing/payment/delivery proof, not the operational work sheet:

| Visible Romanian label | Source | Reason excluded | Confidence |
|---|---|---|---|
| `Ofertă Produse și Servicii` | price list image | price catalog, not operational work intake | CONFIRMED |
| Service names with `Ron` values | price list image | financial catalog | CONFIRMED |
| `Preț unitar`, `Valoare`, `TOTAL`, `TOTAL pp 17.07.2026` | invoice/payment images | financial data | CONFIRMED |
| `Către: Dr. George Istrate` | filled invoice/payment-like list | billing recipient/context; doctor is already handled through registry in the operational form | CONFIRMED |
| `Anexa la factura 2026...` | filled invoice/payment-like list | invoice annex metadata | CONFIRMED |
| `DATA`, `NR FISA LAB`, `NUME PACIENT`, `TIP LUCRARE`, `POZIȚIE ARCADĂ`, `NR. ELEM`, `PREȚ ELEM`, `VALOARE LEI` | filled invoice/payment-like list | invoice/payment annex columns; some duplicate operational concepts but the source is financial | CONFIRMED |
| `FURNIZOR`, `CUMPĂRĂTOR`, `FACTURA`, `Seria`, `Număr`, `Nr. facturii`, `Data` | fiscal invoice image | billing document metadata | CONFIRMED |
| `Semnătura și ștampila de predare`, `Semnătura de primire` | fiscal invoice image | delivery proof or billing document signature, not confirmed work-sheet signature | CONFIRMED |
| `Numele delegatului`, `BI/CI seria`, `Mijlocul de transport` | fiscal invoice image | delivery/billing proof | CONFIRMED |
| `creative.dental.gn@gmail.com`, payment-note logo/contact/footer | payment PDFs | print-only presentation, not an input field | CONFIRMED |

## Unreadable Or Not Safely Interpretable Text

- Handwritten red notes visible near the lower-left edge of the fiscal/invoice photo are unreadable in the provided source.
- Side abbreviation marks on the filled invoice/payment-like list are not safely interpretable as canonical work-sheet fields from this source.

UNREADABLE - requires a clearer source image or client confirmation.

## Required Classification

### 1. Common Administrative Fields

- `Fișa laborator nr`
- Current cycle number, not printed on the current paper source but required by cycle model.
- Priority and intake date are application fields, not visible on the paper sheet.

### 2. Patient And Doctor Fields

- `Doctor`
- `Pacient`
- `Vârsta`
- `Sex`
- Clinic is not visible on the blank sheet but is required by the implemented work/cycle model.

### 3. Work Identification

- `Fișa laborator nr`
- Work code must remain identical across cycles.

### 4. Dental/Tooth Data

- Printed FDI teeth: `18` through `11`, `21` through `28`, `48` through `41`, `31` through `38`.
- Pediatric teeth are not visible on the paper sheet.

### 5. Work Type And Restoration

- `Tip lucrare`
- Restoration subtype is not separately visible; it may be encoded by `Tip lucrare` or open business confirmation.

### 6. Material And Technical Parameters

- No explicit material field is visible on the work sheet.
- Material may be implied by `Tip lucrare` or by technician fields; this requires confirmation.

### 7. Shade/Color Information

- `Culoare`
- Tooth outline drawing, likely shade-zone annotation, requires confirmation.

### 8. Doctor Instructions

- `Observații`
- Collaboration terms imply color photos and clinical details can be doctor instructions.

### 9. Reception Observations

- `Observații`, if split by actor is approved.
- Impression quality is implied by collaboration terms but not visible as a field.

### 10. Technician Observations

- `Observații`, if split by actor is approved.
- Technical observations are not separately labeled on the blank sheet.

### 11. Dates And Deadline Information

- `Termen` repeated for `Faza 1` through `Faza 4`.
- Price list/collaboration terms include deadline rules but not form fields.

### 12. Cycle/Return Information

- `Faza 1` through `Faza 4` may represent clinical phases/probes/returns or production stages; this is not confirmed.
- Return reasons from WORK-CYCLES-001B exist in the application but are not printed on this sheet.

### 13. Stage-Specific Information

- `Faza 1`, `Faza 2`, `Faza 3`, `Faza 4`.
- Whether they map to workflow stages is unclear.

### 14. Confirmation/Signature Areas

- No confirmation/signature area is visible on the blank work sheet.
- Fiscal invoice signatures are delivery/billing proof candidates, not confirmed work-sheet fields.

### 15. Financial Fields Outside Operational Form

- All prices, totals, invoice metadata, urgency fee, and payment-note content remain outside the operational form for unauthorized roles.

### 16. Print-Only Presentation Fields

- Brand, website, phone, email, decorative headers/footers, and payment-note layout are print-only.

## Reconciliation With Existing Implementation

Reusable implementation already exists:

- `WorkFormTemplate` supports per-work-type versioned templates with `DRAFT`, `ACTIVE`, and `ARCHIVED`.
- `WorkFormFieldDefinition` supports `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `CHECKBOX`, `RADIO`, `SELECT`, `MULTISELECT`, `TOOTH`, and `SHADE`.
- `WorkFormSubmission` stores schema and value snapshots.
- Submission validation rejects unknown/reserved keys, oversized payloads, unsafe text, stale template versions, invalid FDI teeth, and invalid option/shade values.
- The current frontend dynamic form renders work-form submissions and read-only display values.

Gaps for `WORKFORM-REAL-001A`:

- `WorkFormSubmission` is currently unique per `WorkOrder`, not owned by `WorkCycle`.
- Templates do not distinguish generic dynamic forms from real laboratory work sheets.
- Field definitions do not carry section, role ownership, lifecycle lock, copy-to-next-cycle, visibility, printability, or financial-sensitivity metadata.
- There is no modeled repeating tooth-level group for fields such as shade/material per tooth.
- There is no confirmed mapping for `Faza 1` through `Faza 4`.
- There is no confirmed actor split for observations.

Necessary migration for implementation:

- Add a real-template discriminator or equivalent classification.
- Add cycle ownership for real work-sheet submissions.
- Preserve existing `WorkFormSubmission` data by non-destructive backfill to cycle 1 only when unambiguous.
- Add metadata needed for sections, ownership, lifecycle, visibility, copy behavior, and printability.

Duplication to avoid:

- Do not create a separate form engine if the existing template/field/submission model can be extended.
- Do not duplicate patient, doctor, clinic, work type, deadline, pricing, or cycle data as editable form values when a registry/reference already owns it.
- Do not copy financial fields into operational form values.

Compatibility risks:

- Existing one-submission-per-work constraint conflicts with cycle-owned sheets.
- If phase fields are workflow stages, duplicating them as free-text form values could drift from workflow execution.
- If shade/material varies by tooth, current flat fields may be insufficient.
- If age is recorded as a snapshot, it may diverge from patient birth date; this can be correct but must be intentional.

Safe backfill strategy:

- For existing `WorkFormSubmission` rows, link to active/cycle 1 only when exactly one cycle exists or when the active cycle is cycle 1.
- Keep the original schema snapshot and values unchanged.
- Do not invent values for clinic, phase deadlines, material, shade zones, or observations.
- Do not backfill financial/billing fields into real work-sheet submissions.

## Decision Table

| Decision | Current finding | Required client confirmation |
|---|---|---|
| Exact real fields | Readable fields are listed in this audit. | Confirm that the blank sheet is the final source and provide clearer source if anything is missing. |
| Common versus work-type-specific fields | Admin, patient, doctor, teeth, color, phases, and observations appear common. | Confirm if material/restoration fields vary by work type. |
| Fields editable by reception after technician claim | Not specified by assets. | Confirm exact fields reception can correct after claim. |
| Fields editable by technicians | Not specified by assets. | Confirm whether technicians edit material, shade, observations, or phase data. |
| Fields locked after stage completion | Not specified by assets. | Confirm field-level locks after claim and after stage completion. |
| Copy values to next cycle | Existing task says do not silently clone. | Confirm per-field copy rule: never, always, user-selected, or field-specific. |
| Signature ownership | Not visible on work sheet; invoice signatures exist. | Confirm delivery proof, work sheet, or both for distinct purposes. |
| Tooth-level repeating groups | Current paper has one tooth selector and one color field. | Confirm if tooth-level repeated fields are required. |
| Shade/material differ by tooth | Not visible except tooth outline. | Confirm if different teeth can have different shade/material. |
| Doctor instructions per cycle | Observations likely cycle-scoped. | Confirm doctor instructions are snapshots per cycle. |
| Reception corrects clinic/doctor after claim | Not specified by assets. | Confirm correction authority and audit requirements. |
| Printable fields | Paper sheet fields plus branding are printable candidates. | Confirm which digital values must print later. |
| Manager-only fields | Financial fields must be manager-only and outside operational form. | Confirm if any non-financial notes are manager-only. |

## Final Recommendation

BLOCKED - BUSINESS CONFIRMATION REQUIRED

Smallest questions before coding:

1. Is `Fișa laborator nr` exactly the application work code?
2. Are `Faza 1` through `Faza 4` doctor-facing clinical phases, workflow stages, or free-text milestones?
3. Should `Observații` be one shared note field or split into doctor, reception, and technician notes?
4. Can shade/material differ by tooth, or is one value per cycle enough?
5. Which fields may reception edit after technician claim, and which fields lock after stage completion?
6. When a new cycle is created, which values may be copied: none, all, user-selected, or field-specific?
