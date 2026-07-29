# Demo script

Current note: this script demonstrates the implemented modules, including `NC`/`NG` shell context, company-aware settings, patient registry, pricing, persisted deadlines, workflow, logistics, delivery proof and billing. It is not the final validated self-claim workflow. Present it as a module walkthrough until `DEMO-REAL-DATA-001` replaces it with the real self-claim and cycle demo.

1. Open `/login` and use “Acces rapid pentru demonstrație” → “Intră ca manager” when demo mode is enabled.
2. Show “Firmă activă” in the authenticated shell.
3. Switch `NC` → `NG` and explain that the same manager identity remains active.
4. Open Setări and show “Setări firmă”, “Firmă activă: NC — Nicolaie Cristina” and the fictive NC legal/bank fields.
5. Switch `NC` → `NG`, return to Setări and show that NG has different fictive legal/bank fields.
6. Explain that operational workflow remains shared, pricing already follows the active company context, and issued document series are finalized in the next financial realignment tasks.
7. Open Panou principal and show the authenticated shell.
8. Open Pacienți.
9. Search `Maria Dumitrescu`, open the patient drawer and show Prezentare, Lucrări, Medici și clinici, Documente and Istoric.
10. Explain that patients have no internal patient code, CNP, CI, address, phone or email; the work code remains the operational identifier.
11. Open Lucrări.
12. Search `Maria Dumitrescu`.
13. Filter by `Clinica Dentară Aurora`.
14. Filter by `Dr. Ana Popescu`.
15. Open work `WO-2026-900001` and show “Detalii specifice lucrării” with the immutable saved form snapshot.
16. Show “Termen efectiv” and the deadline mode/revision in the work drawer. Explain that it is a persisted snapshot, separate from the requested delivery date.
17. Create a new “Coroană zirconiu” work by selecting the patient from the application selector, then show dynamic fields: Dinți, Nuanță, Tip zirconiu, Probă solicitată and Observații specifice.
18. In the create form, show the deadline preview card and explain calculated/manual/unresolved outcomes without exposing prices to reception.
19. Open Tipuri de lucrări, open “Coroană zirconiu”, then open “Configurează fluxul”.
20. Show workflow versions, linear stages, allowed roles, estimated durations and read-only active template behavior.
21. Open a work, show “Flux producție”, assign/reassign the current stage responsible, and explain that the next stage starts unassigned.
22. Open a work and show the QR panel.
23. Open `Scanare`, resolve `WO-2026-900001` manually and show allowed actions, current stage, responsible and progress.
24. Use demo quick access to enter as Tehnician and open `Lucrările mele`.
25. Show the personal queue, filters, assigned stage and start/complete controls.
26. Return as manager and show workload counts in `Lucrările mele`.
27. Open Billing.
28. Select the current month.
29. Show uninvoiced works.
30. Search `PF-<year>-000001` and show the issued proforma.
31. Search `FACT-<year>-000001` and show the unpaid overdue invoice.
32. Search `FACT-<year>-000002` and show the partial invoice: 1,000 RON total, 400 RON collected, 600 RON remaining.
33. Search `CH-2026-001`.
34. Search `OP-DEMO-001`.
35. Open the print route for a billing document.
36. Switch from document view to attachment view.
37. Use browser print preview.
38. Show the month registry and CSV export.
39. Use demo quick access to enter as Recepție and show permission-filtered navigation; Recepție does not see the company switch.
40. Open Centru operațional and show READY preparation groups with active delivery context.
41. Open Livrările mele as Manager/Logistică and show demo deliveries, including planned, assigned, in transit, delivered, failed and unassigned.
42. Filter Nereușite and show the failed delivery.
43. Open delivered delivery `DLV-2026-DEMO-07` or `DLV-2026-DEMO-08`, show “Confirmare internă de primire”, “Deschide dovada”, signature display and proof print route.
44. Open `DLV-2026-DEMO-11` and show the manager override proof without signature.
45. Use demo quick access to enter as Curier and open Livrările mele.
46. Show that the courier sees only own deliveries and no pricing/payment totals.
47. Open Scanare as Curier and resolve `WO-2026-900030`; show the delivery card and “Confirmă predarea”.
48. Open the in-transit delivery and demonstrate the signature modal: recipient, works, signature canvas, confirmation checkbox and “Confirmă predarea”.
49. Explain that the proof is internal operational evidence, not a qualified electronic signature, and that no money, POS, GPS, photos or file upload is involved.
50. Verify `/health`.

All people, patients, clinics, fiscal identifiers, payments and deliveries in the demo are fictive. Payment rows are manual evidence only; the application does not process money. Technician assignments are demo operational data on current workflow stages only. Delivery signatures are internal proof of handover only; proof photos and generic files are not implemented yet.
