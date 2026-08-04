# WORKFORM-REAL Client Questions

## Purpose

Minimum business confirmations needed before implementing `WORKFORM-REAL-001A`.

## Mandatory Decisions

### 1. Exact Fields On The Real Sheet

**Client question:** Fișa digitală trebuie să conțină exact câmpurile de pe hârtie: `Fișa laborator nr`, `Doctor`, `Pacient`, `Vârsta`, `Sex`, `Tip lucrare`, `Culoare`, dinții, `Faza 1-4`, `Termen`, `Observații`?

- Why it matters: The implementation must not invent fields or miss fields from the real sheet.
- Options:
  - [ ] Da, acestea sunt câmpurile corecte pentru MVP.
  - [ ] Nu, trebuie adăugate/eliminate câmpuri.
- Recommended default: Da, based on the inspected blank paper sheet.
- Technical impact: Defines the initial template schema and migration/backfill expectations.
- Blocks implementation: Yes.

### 2. Common Fields Versus Work-Type-Specific Fields

**Client question:** Aceste câmpuri sunt aceleași pentru toate tipurile de lucrări sau unele apar doar la anumite tipuri?

- Why it matters: Templates are assigned by work type.
- Options:
  - [ ] Pentru MVP, aceeași fișă pentru toate tipurile de lucrări.
  - [ ] Fișe diferite pe tip de lucrare.
- Recommended default: Same MVP sheet for all work types, because the paper source is one generic sheet.
- Technical impact: One shared real work-sheet template pattern versus multiple work-type variants.
- Blocks implementation: Yes.

### 3. Reception Edit Rights

**Client question:** După ce tehnicianul preia lucrarea, recepția mai poate modifica datele introduse inițial?

- Why it matters: Edit rights must be clear before locking form values.
- Options:
  - [ ] Nu, după preluare recepția nu mai modifică fișa normal.
  - [ ] Da, recepția poate corecta doar câmpuri administrative.
  - [ ] Da, recepția poate corecta orice câmp, cu motiv.
- Recommended default: Administrative corrections only, with audit.
- Technical impact: Defines reception permissions and conflict handling after claim.
- Blocks implementation: Yes.

### 4. Technician Edit Rights

**Client question:** Ce completează tehnicianul pe fișa digitală?

- Why it matters: Technician-owned fields need separate permissions and lock rules.
- Options:
  - [ ] Doar observații tehnice.
  - [ ] Observații tehnice plus culoare/material/dinți când este nevoie.
  - [ ] Tehnicianul nu completează fișa în MVP.
- Recommended default: Observații tehnice plus culoare/material/dinți when needed, matching current task scope.
- Technical impact: Defines technician edit endpoints/UI and field ownership.
- Blocks implementation: Yes.

### 5. Locking After Claim Or Stage Completion

**Client question:** Când se blochează câmpurile ca să rămână istoric corect?

- Why it matters: Historical cycle data must remain immutable.
- Options:
  - [ ] Datele recepției se blochează la preluarea de către tehnician; datele tehnicianului se blochează la finalizarea etapei.
  - [ ] Toată fișa se poate modifica până la închiderea ciclului.
  - [ ] Doar managerul poate debloca/corecta, cu motiv.
- Recommended default: Reception fields lock at claim; technician fields lock at stage completion; manager correction requires audit.
- Technical impact: Defines lifecycle guards and tests.
- Blocks implementation: Yes.

### 6. Copying Values Into A New Cycle

**Client question:** Când lucrarea revine și se deschide un ciclu nou, ce date se copiază din ciclul anterior?

- Why it matters: The system must not silently clone previous answers.
- Options:
  - [ ] Nu se copiază nimic automat; recepția completează/confirmă din nou.
  - [ ] Se copiază automat pacientul, clinica, medicul, tipul lucrării și dinții.
  - [ ] Utilizatorul alege ce copiază.
- Recommended default: Copy no editable form values automatically; keep work code and patient from the same WorkOrder, default clinic/doctor for confirmation.
- Technical impact: Defines create-next-cycle form behavior and backfill rules.
- Blocks implementation: Yes.

### 7. Tooth-Level Repeating Information

**Client question:** Pentru fiecare dinte trebuie completate detalii separate?

- Why it matters: A repeating tooth-level form is more complex than a simple tooth selector.
- Options:
  - [ ] Nu, este suficientă selectarea dinților pe lucrare/ciclu.
  - [ ] Da, fiecare dinte poate avea detalii proprii.
- Recommended default: No per-tooth repeating details for MVP, because the paper sheet shows one tooth selector.
- Technical impact: Determines whether existing `TOOTH` field is sufficient or a new grouped model is needed.
- Blocks implementation: Yes.

### 8. Material And Shade Per Tooth

**Client question:** Culoarea sau materialul pot fi diferite pe fiecare dinte?

- Why it matters: Per-tooth shade/material changes schema and UI.
- Options:
  - [ ] Nu, o culoare/material pentru lucrare este suficient în MVP.
  - [ ] Da, culoarea poate diferi pe dinte.
  - [ ] Da, materialul poate diferi pe dinte.
- Recommended default: One shade/material value per cycle for MVP; add notes for exceptions.
- Technical impact: Defines whether existing `SHADE`/`SELECT` fields are enough.
- Blocks implementation: Yes.

### 9. Doctor Instructions Per Cycle

**Client question:** Instrucțiunile medicului trebuie păstrate separat pentru fiecare ciclu?

- Why it matters: Returned works must preserve old instructions and new instructions.
- Options:
  - [ ] Da, fiecare ciclu are propriile instrucțiuni/observații.
  - [ ] Nu, se păstrează o singură observație pe lucrare.
- Recommended default: Yes, per cycle, because every cycle remains visible forever.
- Technical impact: Stores instructions in cycle-owned immutable submissions.
- Blocks implementation: Yes.

### 10. Clinic/Doctor Correction After Claim

**Client question:** După preluarea lucrării de către tehnician, cine poate corecta clinica sau medicul?

- Why it matters: Clinic/doctor are registry references and cycle history.
- Options:
  - [ ] Doar managerul, cu motiv.
  - [ ] Recepția, cu motiv.
  - [ ] Nu se mai corectează după preluare; se deschide un ciclu nou dacă este cazul.
- Recommended default: Reception or manager correction with reason before cycle closure; prior cycle history remains audited.
- Technical impact: Defines correction permissions and audit events.
- Blocks implementation: Yes.

### 11. Signatures

**Client question:** Semnăturile trebuie să apară pe fișa de lucru sau doar pe livrare/factură?

- Why it matters: The inspected work sheet has no signature area; invoices have signatures.
- Options:
  - [ ] Doar pe livrare/factură, nu pe fișa de lucru.
  - [ ] Și pe fișa de lucru.
  - [ ] Nu în MVP.
- Recommended default: Only delivery/invoice signatures, not work-sheet signatures.
- Technical impact: Avoids adding signature fields to the real work-sheet schema.
- Blocks implementation: No, can be deferred if default is accepted.

### 12. Printable Fields

**Client question:** Pentru MVP trebuie să tipărim fișa digitală ca pe hârtie?

- Why it matters: Printing is out of scope for `WORKFORM-REAL-001A`, but fields should be marked if needed later.
- Options:
  - [ ] Nu, doar salvăm fișa digitală acum.
  - [ ] Da, dar tipărirea poate fi implementată mai târziu.
  - [ ] Da, tipărirea este obligatorie acum.
- Recommended default: Save digital data now; mark printable fields for later.
- Technical impact: Adds printability metadata only, without building document printing.
- Blocks implementation: No, unless printing is required now.

### 13. Manager-Only/Internal Fields

**Client question:** Există observații interne care trebuie văzute doar de manageri?

- Why it matters: Financial/private data must not be visible to all operational roles.
- Options:
  - [ ] Nu în fișa de lucru MVP.
  - [ ] Da, există observații interne manager-only.
- Recommended default: No manager-only/internal fields in the operational work sheet MVP.
- Technical impact: If yes, server-side field visibility rules are required.
- Blocks implementation: No, can be deferred if default is accepted.

## Recommended MVP Decisions

- Use the visible paper-sheet fields for MVP.
- Use one common sheet across work types first.
- Store one sheet per cycle.
- Keep doctor instructions and observations cycle-scoped.
- Lock reception fields after technician claim.
- Lock technician fields after stage completion.
- Do not auto-copy editable values into a new cycle.
- Use one tooth selector and one shade/material value per cycle, with notes for exceptions.
- Keep signatures, printing, and manager-only internal notes out of MVP unless explicitly required.

## Can Be Deferred After MVP

- Different sheets per work type.
- Tooth-level repeating details.
- Shade/material per tooth.
- Printed work-sheet layout.
- Work-sheet signatures.
- Manager-only internal notes inside the work sheet.
- Photo/file attachments for shade details.

## Final Confirmation Block

Client can reply with:

```text
Confirm pentru MVP:
1. Câmpurile de pe fișa analizată sunt corecte: Da/Nu + modificări.
2. Fișa este comună pentru toate tipurile de lucrări: Da/Nu.
3. Recepția poate corecta după preluare: Nu / doar administrativ / orice cu motiv.
4. Tehnicianul completează: doar observații / observații plus date tehnice / nimic.
5. Blocare: la preluare și finalizare etapă / la închidere ciclu / doar manager.
6. Ciclu nou: nu copiază automat / copiază câmpuri de bază / utilizatorul alege.
7. Detalii pe fiecare dinte: Nu/Da.
8. Culoare/material diferit pe dinte: Nu/Da.
9. Instrucțiuni medic pe fiecare ciclu: Da/Nu.
10. Corectare clinică/medic după preluare: manager / recepție / nu.
11. Semnături pe fișa de lucru: Nu/Da/nu în MVP.
12. Tipărire fișă în MVP: Nu/Da mai târziu/Da acum.
13. Câmpuri interne doar manager: Nu/Da.
```
