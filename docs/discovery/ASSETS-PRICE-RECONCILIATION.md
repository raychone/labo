# ASSETS-PRICE-RECONCILIATION

## Status

In progress.

## Objective

Reconcile the Creative Dental price-list asset against the current real pricing catalog and work-type mapping without overwriting ambiguous commercial values.

## Source

- `apps/api/prisma/catalog/real-pricing-catalog.ts`
- `assets/WhatsApp Image 2026-07-29 at 05.04.45.jpeg`

## Legend

- `MATCH` - current catalog matches the source asset and no business ambiguity remains.
- `MISMATCH` - current catalog differs from the source asset in a material way.
- `MISSING` - the source asset item has no current catalog entry.
- `AMBIGUOUS` - the source asset shows a range, clipped value, or unclear commercial rule that should stay documented as ambiguous.

## Reconciliation Table

| Source asset label | Current WorkType | Current PriceCatalog entry | Source price | Current price | Unit | Deadline rule | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| Coroană/fațetă integral ceramică | `REAL-COR-FATA-CER-3083` | `cor-fata-ceramica` | 500 RON | 500 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană/fațetă integral ceramică placată EMax | `REAL-COR-FATA-EMAX-2342` | `cor-fata-emax` | 600 RON | 600 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană pe implant integral ceramică/placată EMax | `REAL-COR-IMPLANT-E-5112` | `cor-implant-emax` | 600/700 RON | 600 RON | ELEMENT | 1-3 elements: 3 working days per stage | AMBIGUOUS | Source shows a range; seed uses the first value and marks it for validation. |
| Inlay/Table top/Bont hibrid integral ceramică | `REAL-INLAY-TABLE-2754` | `inlay-tabletop-bont-ceramica` | 450 RON | 450 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană zirconia placată integral cu ceramică | `REAL-COR-ZIRCO-9097` | `cor-zirconia-placata` | 450 RON | 450 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană zirconia pe implant placată integral cu ceramică | `REAL-COR-ZIRCO-9871` | `cor-zirconia-implant-placata` | 520 RON | 520 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană zirconia placată vestibular | `REAL-COR-ZIRCO-7900` | `cor-zirconia-vestibular` | 400 RON | 400 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană/Inlay zirconia multistrat integral anatomică | `REAL-COR-ZIRCO-7769` | `cor-zirconia-multistrat` | 300 RON | 300 RON | ELEMENT | 1-3 elements: 3 working days per stage | AMBIGUOUS | Source note says 320 is partially clipped and 300 is visible as the new value. Keep the note. |
| Coroană zirconia multistrat pe implant integral anatomică | `REAL-COR-ZIRCO-7776` | `cor-zirconia-multistrat-implant` | 390 RON | 390 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană metalo-ceramică total fizionomică | `REAL-COR-METAL-4416` | `cor-metaloceramica` | 320 RON | 320 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroane adiacente placate cu ceramică (4+) | `REAL-COROANE-1237` | `coroane-adiacente` | +50 RON / element | 50 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Source uses a per-element add-on. |
| Reproducere țesut gingival ceramică-compozit | `REAL-TESUT-GIN-2069` | `tesut-gingival` | 200 RON | 200 RON | UNIT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană/Inlay compozit | `REAL-COR-INL-1942` | `cor-inlay-compozit` | 300/180 RON | 300 RON | ELEMENT | 1-3 elements: 3 working days per stage | AMBIGUOUS | Source shows a two-value commercial line; seed chooses the first value. |
| Structură metalică Ibar All on X | `REAL-STRUCT-IBA-3088` | `structura-ibar-allonx` | 2000 RON | 2000 RON | CASE | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Structură metalică ICrowns/element | `REAL-STRUCT-ICR-2466` | `structura-icrowns` | 50 RON | 50 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Cheie control implanturi AllOn X/solo | `REAL-CHEIE-CONT-7696` | `cheie-control-implanturi` | 100/30 RON | 100 RON | UNIT | 1-3 elements: 3 working days per stage | AMBIGUOUS | Source shows a range; seed uses the first value and flags it. |
| Retainer Essix | `REAL-RETAINER--1975` | `retainer-essix` | 200 RON | 200 RON | UNIT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Coroană provizorie PMMA | `REAL-COR-PROV-9442` | `coroana-provizorie-pmma` | 100 RON | 100 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Category is grouped under zirconia in the current UI for convenience. |
| RCR zirconia | `REAL-RCR-ZIRCO-2481` | `rcr-zirconia` | 270 RON | 270 RON | UNIT | 1-3 elements: 3 working days per stage | MATCH | Source item is grouped as provisional repair. |
| RCR cu sistem (2 piese) | `REAL-RCR-SISTE-1177` | `rcr-sistem` | 80 RON | 80 RON | UNIT | 1-3 elements: 3 working days per stage | MATCH | Source item is grouped as provisional repair. |
| RCR simplu | `REAL-RCR-SIMPL-0924` | `rcr-simplu` | 70 RON | 70 RON | UNIT | 1-3 elements: 3 working days per stage | MATCH | Source item is grouped as provisional repair. |
| Proteză scheletată (sisteme speciale x2) | `REAL-PROTEZ-SCH-3948` | `proteza-scheletata` | 2000 RON | 2000 RON | CASE | 5 working days | MATCH | Current execution group is `MOBILE_PROSTHESIS`. |
| Proteză flexibilă Biocetal/Acron (culoare Vita) | `REAL-PROTEZ-FLE-5693` | `proteza-flexibila` | 900 RON | 900 RON | CASE | 5 working days | MATCH | Current execution group is `MOBILE_PROSTHESIS`. |
| Proteză acrilică totală/parțială | `REAL-PROTEZ-ACR-8305` | `proteza-acrilica` | 450/420 RON | 450 RON | CASE | 5 working days | AMBIGUOUS | Source shows a range; seed uses the first value and flags it. |
| Proteză pe capse (sistemele nu sunt incluse) | `REAL-PROTEZ-CAP-6461` | `proteza-capse` | 520 RON | 520 RON | CASE | 5 working days | MATCH | Clarifying note in current catalog matches the source meaning. |
| Sisteme speciale pentru proteze acrilice (set) | `REAL-SISTEME-5542` | `sisteme-proteze-acrilice` | 150 RON | 150 RON | UNIT | 5 working days | MATCH | Direct catalog match. |
| Garnitură dinți compozit pentru proteze | `REAL-GARNIT-7304` | `garnitura-dinti-compozit` | 150 RON | 150 RON | UNIT | 5 working days | MATCH | Direct catalog match. |
| Structură metalică pentru proteză | `REAL-STRUCT-MET-6731` | `structura-metalica-proteza` | 200 RON | 200 RON | UNIT | 5 working days | MATCH | Direct catalog match. |
| Bară linguală | `REAL-BARA-LIN-1441` | `bara-linguala` | 150 RON | 150 RON | UNIT | 5 working days | MATCH | Direct catalog match. |
| Reparație/rebazare | `REAL-REPARAT-9536` | `reparatie-rebazare` | 100-250 RON | 100 RON | REPAIR | 3 working days | AMBIGUOUS | Source price is a range; the seed uses the minimum and keeps the note. |
| Proteză Kemeny | `REAL-PROTEZ-KEM-5511` | `proteza-kemeny` | 190 RON | 190 RON | CASE | 5 working days | MATCH | Direct catalog match. |
| Lingură individuală implanturi | `REAL-LINGURA-3217` | `lingura-individuala-implanturi` | 30 RON | 30 RON | UNIT | 5 working days | MATCH | Direct catalog match. |
| Element wax-up/try-in digital | `REAL-ELEMENT-1231` | `waxup-tryin-digital` | 40 RON | 40 RON | ELEMENT | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |
| Gutieră bruxism/contenție/albire | `REAL-GUTIERA-4031` | `gutiera-bruxism` | 120/120/140 RON | 120 RON | UNIT | 1-3 elements: 3 working days per stage | AMBIGUOUS | Source shows multiple values; the first value is used in seed and must stay documented. |
| Model de studiu/printat (arcadă) | `REAL-MODEL-STU-6001` | `model-studiu-printat` | 60 RON | 60 RON | ARCH | 1-3 elements: 3 working days per stage | MATCH | Direct catalog match. |

## Deadline Rule Mapping

The source image supports the same broad execution groups currently used by the seeded catalog:

- `DEFAULT_ELEMENTS` -> 1-3 elements: 3 working days per stage, 4-7 elements: 4 working days per stage, 8-12 elements: 5 working days per stage, 13+ elements: manual due date.
- `PROVISIONAL_REPAIR` -> 3 working days.
- `MOBILE_PROSTHESIS` -> 5 working days.

These are the operational mappings already present in the seed and should remain the canonical business interpretation until a client-approved update changes them.

## Notes

- The source price list is already represented in the app seed and catalog source file.
- Ambiguous rows remain documented instead of being normalized away.
- No destructive migration is required for this reconciliation.
