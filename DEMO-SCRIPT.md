# Demo script

> Canonical current roadmap and status: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md). Demo-specific current notes are also summarized in [docs/modules/demo.md](docs/modules/demo.md). This document remains the guided presentation script.

Current note: this script demonstrates the implemented modules, including the CORE-ROLE-UX-001 role landing experience, simplified permission-driven navigation, `NC`/`NG` shell context, company-aware settings, patient registry, pricing, persisted deadlines, technician work claim, locked execution snapshots, workflow, logistics, delivery proof and billing. It is still not the final validated real-lab cycle demo; `DEMO-POLISH-002` is planned and `DEMO-REAL-DATA-001` will replace the fictive dataset with real validated flows.

1. Open `/login` and use “Acces rapid pentru demonstrație” → “Intră ca manager” when demo mode is enabled.
2. Show “Firmă activă” in the authenticated shell, then switch `NC` → `NG` and explain that the same manager identity remains active.
3. Open `Acasă` and show the Manager, Recepție and Tehnician panels, their primary actions, and permission-driven navigation groups.
4. Open Setări and show company-aware legal/bank fields for the active company. Switch `NC`/`NG` and show that operational workflow stays shared while financial context changes.
5. Open Pacienți, search `Maria Dumitrescu`, open the patient drawer and show Prezentare, Lucrări, Medici și clinici, Documente and Istoric.
6. Explain that patients have no internal patient code, CNP, CI, address, phone or email; the work code remains the operational identifier.
7. Use demo quick access to enter as Recepție and show permission-filtered navigation; Recepție does not see the company switch or financial totals.
8. Open `Acasă` as Recepție and use the `Lucrare nouă`, `Registru lucrări`, `Status` and `Scanare QR` paths.
9. Open `Lucrări`; show the deadline counters and quick filters `Astăzi`, `Întârziate`, `Disponibile`, then search `Maria Dumitrescu`.
10. Filter by `Clinica Dentară Aurora` and `Dr. Ana Popescu`, then open work `WO-2026-900001`.
11. Show the work drawer: deadline card, execution snapshot, responsibility card, cycles, real laboratory sheet, workflow and immutable saved form snapshot.
12. Create a new “Coroană zirconiu” work by selecting the patient from the application selector, then show dynamic fields: Dinți, Nuanță, Tip zirconiu, Probă solicitată and Observații specifice.
13. In the create form, show the deadline preview card and explain calculated/manual/unresolved outcomes without exposing prices to reception.
14. Save a laboratory sheet draft, mark it complete, then explain that finalized sheets and closed cycles are read-only.
15. Use `Înregistrează revenirea` on a returned work and explain that a new active cycle is opened while historical cycles remain immutable.
16. Open Tipuri de lucrări, open “Coroană zirconiu”, then open “Configurează fluxul”.
17. Show workflow versions, linear stages, allowed roles, estimated durations and read-only active template behavior.
18. Open a work and show the QR panel.
19. Open `Scanare`, resolve `WO-2026-900001` manually and show allowed actions, current stage, responsible, progress and sheet state.
20. Use demo quick access to enter as Tehnician and open `Acasă`; show the Tehnician panel and `Lucrările mele`.
21. In `Atelier tehnician`, show `Lucrări disponibile`, choose a work, click `Preia`, select `NC` or `NG`, then confirm.
22. Show `Lucrările mele`, the claimed work, selected execution company and release action with reason.
23. Show the stage queue filters, assigned stage and start/complete controls.
24. Open a claimed work detail and show `Context de execuție`: fixed company, original technician, current technician, execution start, final due date and `Fixat` status.
25. As manager, point out the fixed price and source. As technician, show that financial snapshot fields are not sent and the UI displays the masked message.
26. Release and reassign a work. Explain that release/reassign does not recalculate company, pricing or deadline; the fixed company remains read-only.
27. Return as manager, open `Status`, show counters, filters, stage/progress, cycle, sheet state, `NC`/`NG`, and open an existing work detail from a row.
28. Open `Facturare`, select the current month and show active company header, overview counters, billable works, proformas, invoices, receivables/restanțe and ambiguous legacy read-only review.
29. Search `PF-<year>-000001` and show the issued proforma.
30. Search `FACT-<year>-000001` and show the unpaid overdue invoice.
31. Search `FACT-<year>-000002` and show the partial invoice: 1,000 RON total, 400 RON collected, 600 RON remaining.
32. Select an invoice with balance and open `Înregistrează încasare`; show the manual payment modal and explain that it records external evidence only.
33. Search `CH-2026-001` and `OP-DEMO-001`, then show the payments tab.
34. Open the print route for a billing document, switch from document view to attachment view and use browser print preview.
35. Show the month registry and CSV export.
36. Open Centru operațional and show READY preparation groups with active delivery context.
37. Open Livrările mele as Manager/Logistică and show demo deliveries, including planned, assigned, in transit, delivered, failed and unassigned.
38. Filter Nereușite and show the failed delivery.
39. Open delivered delivery `DLV-2026-DEMO-07` or `DLV-2026-DEMO-08`, show “Confirmare internă de primire”, “Deschide dovada”, signature display and proof print route.
40. Open `DLV-2026-DEMO-11` and show the manager override proof without signature.
41. Use demo quick access to enter as Curier and open Livrările mele.
42. Show that the courier sees only own deliveries and no pricing/payment totals.
43. Open Scanare as Curier and resolve `WO-2026-900030`; show the delivery card and “Confirmă predarea”.
44. Open the in-transit delivery and demonstrate the signature modal: recipient, works, signature canvas, confirmation checkbox and “Confirmă predarea”.
45. Explain that the proof is internal operational evidence, not a qualified electronic signature, and that no money, POS, GPS, photos or file upload is involved.
46. Verify `/health`.

All people, patients, clinics, fiscal identifiers, payments and deliveries in the demo are fictive. Payment rows are manual evidence only; the application does not process money. Work ownership and technician stage assignments are operational controls only. Delivery signatures are internal proof of handover only; proof photos and generic files are not implemented yet.
