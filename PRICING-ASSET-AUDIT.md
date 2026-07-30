# PRICING-002 Asset Audit

> Canonical current roadmap and status: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md). Pricing module rules are in [docs/modules/pricing.md](docs/modules/pricing.md). This document is retained as an asset audit.

## Scope

Reviewed only local `assets/` material relevant to pricing and execution-time rules. Files remain untracked and are not copied, embedded, committed, OCR-processed in bulk, or exposed through the application.

## Pricing Source Used

- `WhatsApp Image 2026-07-29 at 05.04.45.jpeg`

This image is a clear price list titled “Ofertă Produse și Servicii”, effective from `01.07.2025`. It includes service names, RON prices and execution-time rules. Values were manually transcribed into `apps/api/prisma/catalog/real-pricing-catalog.ts`.

## Assets Reviewed But Not Used

- `WhatsApp Image 2026-07-29 at 05.04.46.jpeg`: collaboration terms, not catalog pricing.
- `WhatsApp Image 2026-07-29 at 05.04.46 (1).jpeg`: laboratory work form, not pricing.
- `WhatsApp Image 2026-07-29 at 05.04.48.jpeg`: contains patient/work/invoice-like information, explicitly excluded.
- `WhatsApp Image 2026-07-29 at 05.04.48 (1).jpeg`: contains fiscal invoice data, explicitly excluded.
- `Nota Plata 2026.pdf`: not processed in this task.
- `Nota Plata A5 2026.pdf`: not processed in this task.

## Clear Data

Clear values were transcribed as integer minor units in RON. Example: `400 RON` is stored as `40000`.

Execution-time rules visible in the pricing image:

- 1-3 elements: 3 days for each stage.
- 4-7 elements: 4 days for each stage.
- 7-12 elements: 5 days for each stage.
- More than 12 elements: manually established due date.
- RCR / provisional works: 2-3 days.
- Mobile prostheses: individual tray / occlusion rim 1-2 days; framework / try-in / finished prosthesis 3-5 days.

For deterministic seed rules, these were normalized to:

- default element services: 1-3 -> 3 days, 4-7 -> 4 days, 8-12 -> 5 days, 13+ -> manual;
- provisional/repair services: 1+ -> 3 days;
- mobile prosthesis services: 1+ -> 5 days.

## Ambiguous Values Requiring Client Validation

- “Coroană pe implant integral ceramică/placată EMax”: displayed as `600/700 RON`; seed uses `60000` and marks validation required.
- “Coroană/Inlay zirconia multistrat integral anatomică”: `320 RON` appears crossed out and `300 RON` appears as replacement; seed uses `30000` and marks validation required.
- “Coroană/Inlay compozit”: displayed as `300/180 RON`; seed uses `30000` and marks validation required.
- “Cheie control implanturi AllOn X/solo”: displayed as `100/30 RON`; seed uses `10000` and marks validation required.
- “Proteză acrilică totală/parțială”: displayed as `450/420 RON`; seed uses `45000` and marks validation required.
- “Reparație/rebazare”: displayed as `100-250 RON`; seed uses `10000` and marks validation required.
- “Gutieră bruxism/contenție/albire”: displayed as `120/120/140 RON`; seed uses `12000` and marks validation required.

## NC/NG Interpretation

The provided price list is a single source list. PRICING-002 seeds it independently for both `NC` and `NG` as a starting point only. Editing NC does not edit NG, and this duplication is not a legal assertion that both companies must use the same list.

## Final Asset Statement

`assets/ remains intentionally untracked; only the pricing source material was reviewed and manually transcribed where unambiguous.`
