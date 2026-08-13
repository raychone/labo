# ASSETS-DOCS-AUDIT

## Status

In progress.

## Objective

Audit every file under `assets/` and classify how each source should be used in pricing, the laboratory sheet, payment notes, invoices, and printable company-aware documents.

## Scope

- Inspect every file in `assets/`.
- Document what is visible, what is direct source material, and what remains ambiguous.
- Keep NC/NG company-awareness intact.
- Do not silently promote ambiguous historical values into business rules.

## Asset Inventory

| Filename | Type | Visible title / branding | Intended use | Data already exists in app | Authority | Directly mappable fields / text | Needs business confirmation | Belongs to |
|---|---|---|---|---|---|---|---|---|
| `WhatsApp Image 2026-07-29 at 05.04.45.jpeg` | Photo of printed price list | `Oferta Produse si Servicii`, `Creative Dental Art`, `www.creative-dental-art.ro` | Real client price/catalog source and execution-time notes | Yes. The pricing catalog and deadline rules already exist in code/seed. | Authoritative source for product names and base prices; ambiguous for some ranges | Product/service names, categories, prices, execution-time notes, courier notes, special repair/prosthesis rules | Exact treatment of ambiguous values such as ranges, clipped prices, and special courier wording | Shared operational source; company-aware catalog rows can be instantiated per NC/NG |
| `WhatsApp Image 2026-07-29 at 05.04.46.jpeg` | Photo of collaboration terms page | `Detalii Amprentă` | Client collaboration / intake guidance, especially impressions, shade transmission, trials, and deadlines | Partly. Some rules already exist as workflow/deadline validation and help text. | Authoritative operational reference; not a legal contract engine | Impression guidance, color-photo guidance, repeated phase notes, deadline working-day language, transport-time exclusion | Which sentences are informational only versus enforced rules; whether photo uploads are required now | Shared operational source |
| `WhatsApp Image 2026-07-29 at 05.04.46 (1).jpeg` | Photo of blank laboratory sheet | `Creative Dental Art`, `Fișa laborator nr`, `Doctor`, `Pacient`, `Vârsta`, `Sex`, `Tip lucrare`, `Culoare`, `Faza 1-4`, `Observații`, FDI tooth layout | Canonical real laboratory sheet layout for work-cycle rendering and intake persistence | Yes. The real work-sheet schema exists and already persists cycle-scoped intake values. | Authoritative source for laboratory sheet structure | Laboratory sheet number, doctor, patient, age, sex, work type, shade, FDI tooth grid, four phase lines, observations, brand header text | Whether `Faza 1-4` are purely print phases or should ever mirror execution stages; whether the printed sheet should show one or two contact lines | Shared operational source |
| `WhatsApp Image 2026-07-29 at 05.04.48.jpeg` | Photo of historical invoice / payment-like document | `Seria`, `Număr`, `FURNIZOR`, `CUMPĂRĂTOR`, `FACTURA` | Structural reference for invoice / payment-note layout | Partly. Billing documents, series, legal-entity snapshots, print views, and statements already exist. | Illustrative for layout; historical data is not reusable as business truth | Seller / buyer blocks, invoice number/date placement, line-table structure, total block, signature/footer placement | Whether the photographed company is the intended NG historical example; exact legal data must never be copied blindly | Likely NG historical / company-specific example; do not mix into NC documents |
| `WhatsApp Image 2026-07-29 at 05.04.48 (1).jpeg` | Photo of monthly registry / annex-style table | Unclear / unreadable from the source image | Reference for monthly register or billing annex presentation | Partly. Billing statements, month registry, and CSV exports already exist. | Ambiguous; useful only as a presentation hint | Table-like registry layout, row grouping, totals area | Exact headings and row semantics need clearer source or client confirmation | Unknown / needs confirmation |
| `Nota Plata 2026.pdf` | PDF template | Creative Dental payment-note branding shell | Primary A4 payment-note / document branding reference | Yes. Billing print views and statement printouts already exist; the A5 statement print uses the same family of branding cues. | Authoritative print layout reference | Header treatment, contact block, body spacing, footer treatment, overall A4 composition | Exact legal company/contact values for NC/NG must still come from active company settings | Shared document template, rendered per active company |
| `Nota Plata A5 2026.pdf` | PDF template | Creative Dental A5 payment-note branding shell | Compact statement / note de plată print variant | Yes. The billing statement print page already references this asset as its header art. | Authoritative print layout reference | Compact header/banner composition, print spacing, footer treatment, A5-friendly proportions | Whether the A5 format is production-approved for all statement use cases or only for print preview / compact notes | Shared document template, rendered per active company |

## Asset Grouping

### Shared operational laboratory

- `WhatsApp Image 2026-07-29 at 05.04.45.jpeg`
- `WhatsApp Image 2026-07-29 at 05.04.46.jpeg`
- `WhatsApp Image 2026-07-29 at 05.04.46 (1).jpeg`

### Likely NG historical billing example

- `WhatsApp Image 2026-07-29 at 05.04.48.jpeg`

### Unknown / needs confirmation

- `WhatsApp Image 2026-07-29 at 05.04.48 (1).jpeg`

### Shared printable templates

- `Nota Plata 2026.pdf`
- `Nota Plata A5 2026.pdf`

## Direct Mapping Summary

- Price list products map directly to the seeded real pricing catalog.
- The laboratory sheet maps directly to the real cycle-scoped work sheet.
- Collaboration terms map to validation/help text and should remain informational where not explicitly enforced.
- The invoice photo maps to the billing print structure and company-scoped legal-entity snapshots.
- The payment-note PDFs map to the printable note-de-plată / statement branding shells.

## Confirmation Gaps

- Exact handling of price ranges and clipped prices from the price list.
- Whether the collaboration-terms sheet should become a stored client reference document or remain a validation aid.
- Whether the historical invoice photo should be treated as NG-only reference or as a generic billing layout example.
- Whether the A5 payment-note template is the production default for all statements or only for compact printouts.

## Notes

- No asset file was modified, renamed, moved, optimized, converted, or deleted.
- PDF rendering for inspection was done only in temporary locations.
