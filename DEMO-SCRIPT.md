# Demo script

Current note: this script demonstrates the implemented prior flow plus the current `NC`/`NG` shell context and company-aware settings. It is not the final validated self-claim workflow. Present it as a module walkthrough until `DEMO-REAL-DATA-001` replaces it with the real two-company, self-claim, patient, pricing, deadline and cycle demo.

1. Open `/login` and use “Acces rapid pentru demonstrație” → “Intră ca manager” when demo mode is enabled.
2. Show “Firmă activă” in the authenticated shell.
3. Switch `NC` → `NG` and explain that the same manager identity remains active.
4. Open Setări and show “Setări firmă”, “Firmă activă: NC — Nicolaie Cristina” and the fictive NC legal/bank fields.
5. Switch `NC` → `NG`, return to Setări and show that NG has different fictive legal/bank fields.
6. Explain that operational workflow remains shared and that billing, series, pricing and issued documents are not separated yet.
7. Open Panou principal and show the authenticated shell.
8. Open Lucrări.
9. Search `Maria Dumitrescu`.
10. Filter by `Clinica Dentară Aurora`.
11. Filter by `Dr. Ana Popescu`.
12. Open work `WO-2026-900001` and show “Detalii specifice lucrării” with the immutable saved form snapshot.
13. Create a new “Coroană zirconiu” work and show dynamic fields: Dinți, Nuanță, Tip zirconiu, Probă solicitată and Observații specifice.
14. Open Tipuri de lucrări, open “Coroană zirconiu”, then open “Configurează fluxul”.
15. Show workflow versions, linear stages, allowed roles, estimated durations and read-only active template behavior.
16. Open a work, show “Flux producție”, assign/reassign the current stage responsible, and explain that the next stage starts unassigned.
17. Open a work and show the QR panel.
18. Open `Scanare`, resolve `WO-2026-900001` manually and show allowed actions, current stage, responsible and progress.
19. Use demo quick access to enter as Tehnician and open `Lucrările mele`.
20. Show the personal queue, filters, assigned stage and start/complete controls.
21. Return as manager and show workload counts in `Lucrările mele`.
22. Open Billing.
23. Select the current month.
24. Show uninvoiced works.
25. Search `PF-<year>-000001` and show the issued proforma.
26. Search `FACT-<year>-000001` and show the unpaid overdue invoice.
27. Search `FACT-<year>-000002` and show the partial invoice: 1,000 RON total, 400 RON collected, 600 RON remaining.
28. Search `CH-2026-001`.
29. Search `OP-DEMO-001`.
30. Open the print route for a billing document.
31. Switch from document view to attachment view.
32. Use browser print preview.
33. Show the month registry and CSV export.
34. Use demo quick access to enter as Recepție and show permission-filtered navigation; Recepție does not see the company switch.
35. Open Centru operațional and show READY preparation groups with active delivery context.
36. Open Livrările mele as Manager/Logistică and show demo deliveries, including planned, assigned, in transit, delivered, failed and unassigned.
37. Filter Nereușite and show the failed delivery.
38. Open delivered delivery `DLV-2026-DEMO-07` or `DLV-2026-DEMO-08`, show “Confirmare internă de primire”, “Deschide dovada”, signature display and proof print route.
39. Open `DLV-2026-DEMO-11` and show the manager override proof without signature.
40. Use demo quick access to enter as Curier and open Livrările mele.
41. Show that the courier sees only own deliveries and no pricing/payment totals.
42. Open Scanare as Curier and resolve `WO-2026-900030`; show the delivery card and “Confirmă predarea”.
43. Open the in-transit delivery and demonstrate the signature modal: recipient, works, signature canvas, confirmation checkbox and “Confirmă predarea”.
44. Explain that the proof is internal operational evidence, not a qualified electronic signature, and that no money, POS, GPS, photos or file upload is involved.
45. Verify `/health`.

All people, clinics, fiscal identifiers, payments and deliveries in the demo are fictive. Payment rows are manual evidence only; the application does not process money. Technician assignments are demo operational data on current workflow stages only. Delivery signatures are internal proof of handover only; proof photos and generic files are not implemented yet.
