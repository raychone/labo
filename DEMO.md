# Demo aplicație Dental Lab Management

> Canonical current roadmap and status: [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md). Demo-specific current notes are also summarized in [docs/modules/demo.md](docs/modules/demo.md). This document remains the presentation guide.

Acest document este ghidul de prezentare cap-coadă pentru stadiul curent al aplicației. Toate datele demo sunt fictive și sunt doar pentru development/prezentare.

## Notă ROADMAP-REALIGN-002

Demo-ul curent prezintă funcționalitățile deja implementate, inclusiv contextul `NC`/`NG`, pacienți, prețuri pe companie, termene calculate, workflow operațional, revendicare de lucrări de către tehnician, logistică, livrări și facturare.

Nu prezenta demo-ul curent ca implementare finală a fluxului de atelier real. Pentru întâlniri comerciale, formulează-l ca demonstrație a modulelor existente până la realinierea completă prin `TECH-CLAIM-001`, `STATUS-001`, `BILLING-REALIGN-001` și `DEMO-REAL-DATA-001`.

`ORG-CONTEXT-001` adaugă selectorul global „Firmă activă”, iar `ORG-DATA-MIGRATION-001` mută pagina Setări pe date juridice distincte pentru `NC` și `NG`. Pentru demo:

1. Intră ca Manager.
2. Observă „Firmă activă” în shell.
3. Schimbă `NC` → `NG`.
4. Arată că utilizatorul rămâne același și nu apare logout.
5. Arată că fluxurile operaționale, precum `/works`, rămân accesibile.
6. Deschide Setări și arată datele NC.
7. Schimbă în NG și arată că Setări afișează date juridice diferite.
8. Spune explicit că prețurile sunt deja dependente de contextul activ, iar separarea finală a documentelor emise și seriilor reale vine în taskurile financiare următoare.

## 1. Pregătire înainte de prezentare

Pornește baza de date, API-ul și frontend-ul:

```bash
docker compose up -d
pnpm seed:demo
pnpm dev
```

După primul seed, pentru pornirile următoare rulează doar:

```bash
pnpm dev
```

În development, frontend-ul afișează automat butoanele demo. Scriptul `pnpm dev` pornește API-ul cu `DEMO_MODE=true` pe `3010` și web-ul pe `3000`.

Deschide aplicația în browser:

```text
http://localhost:3000
```

Pentru login demo cu cookie-uri CSRF, folosește `localhost`, nu combina `127.0.0.1` cu `localhost`:

```text
http://localhost:3000
```

Dacă vrei să refaci datasetul demo de la zero:

```bash
pnpm --filter @dental-lab/api prisma:db:reset-demo
pnpm seed:demo
```

## 2. Conturi demo

Pe pagina `/login`, în demo mode, poți folosi secțiunea:

```text
Acces rapid pentru demonstrație
```

Butoanele intră ca Manager, Recepție, Logistică, Tehnician, Curier sau Medic fără să expună parola în browser.

Parola fallback pentru toate conturile demo:

```text
DemoLab2026!
```

Cont principal pentru prezentare:

```text
manager@demo.local
```

Conturi utile pentru a demonstra permisiuni si meniuri diferite:

- `receptie@demo.local`
- `logistica@demo.local`
- `tehnician1@demo.local`
- `tehnician2@demo.local`
- `curier@demo.local`
- `medic@demo.local`

## 3. Mesaj de început pentru clientă

Aplicația este gândită pentru managementul operațional al unui laborator dentar: lucrări primite de la clinici, QR pentru identificare rapidă, utilizatori cu roluri, catalog de prețuri, setări laborator și zona de facturare/evidență încasări.

Spune clar:

- datele din demo sunt fictive;
- aplicația nu procesează bani;
- încasările sunt înregistrări manuale ale unor plăți făcute în afara aplicației;
- factura printabila este interna/demo, nu integrare RO e-Factura;
- datele juridice NC/NG din Setări sunt fictive și trebuie validate cu clienta înainte de folosire reală;
- configurarea si execuția workflow-ului, scanarea operațională, logistica internă, livrările curierului și semnătura internă de primire sunt disponibile în demo;
- semnătura este doar “Confirmare internă de primire”, nu semnătură electronică calificată;
- fișierele și dovada foto sunt taskuri următoare.

## 4. Login și shell aplicație

1. Intra pe `http://localhost:3000`.
2. Folosește “Acces rapid pentru demonstrație” → “Intră ca manager”.
3. Arată că după login utilizatorul intră în aplicație, nu într-o pagină publică.
4. Arată navigația principală:
   - Panou principal;
   - Pacienți;
   - Lucrări;
   - Scanare;
   - Livrările mele;
   - Facturare;
   - Clinici și medici;
   - Tipuri de lucrări;
   - Utilizatori;
   - Setări.

Ce explici:

- fiecare utilizator vede meniuri în funcție de rol și permisiuni;
- autentificarea este pe cookie securizat;
- validarea si permisiunile sunt aplicate si pe backend, nu doar in UI.

## 5. Setări firmă NC/NG

Deschide `Setări`.

Ce arăți:

1. Titlul „Setări firmă”.
2. „Firmă activă: NC — Nicolaie Cristina”.
3. Date juridice fictive pentru NC:
   - Denumire juridică;
   - Număr registrul comerțului;
   - Cod fiscal;
   - IBAN;
   - Bancă.
4. Textul „Modificările se aplică numai firmei active.”
5. Schimbă contextul din shell la `NG`.
6. Arată că formularul se reîncarcă cu date diferite pentru NG.

Ce explici:

- aplicația păstrează setări juridice separate pentru cele două firme;
- contextul activ este stocat pe sesiune, nu în localStorage;
- dacă formularul are modificări nesalvate, aplicația cere confirmare înainte de schimbarea firmei;
- fluxul operațional rămâne comun;
- facturile, seriile, prețurile și documentele reale vor fi realiniate în taskuri dedicate.

## 6. Dashboard

Deschide Dashboard.

Ce arati:

- aplicatia are shell autentificat si pagina de start;
- este pregatita pentru indicatori operationali;
- dashboard-ul real detaliat este planificat ulterior.

Ce spui:

Dashboard-ul este momentan punctul de intrare. Datele operationale detaliate se vad acum in Lucrari si Facturare.

## 7. Pacienți

Deschide `Pacienți`.

Ce arăți:

1. Registrul de pacienți.
2. Search după:

```text
Maria Dumitrescu
```

3. Deschide dosarul pacientei.
4. Arată taburile:
   - Prezentare;
   - Lucrări;
   - Medici și clinici;
   - Documente;
   - Istoric.
5. Arată că pacienta are mai multe lucrări și istoric pe medici/clinici, fără cod intern de pacient.

Ce explici:

- pacientul are doar date operaționale minime: nume, prenume și câmpuri opționale limitate;
- nu există CNP, CI, adresă, telefon sau email în dosarul pacientului;
- codul de urmărit în laborator rămâne codul lucrării `WO-...`;
- documentele afișate sunt referințe existente din facturare/livrare, nu un modul complet de fișiere.

## 8. Lucrări

Deschide `Lucrări`.

Ce arati:

1. Registrul de lucrări.
2. Search după pacient:

```text
Maria Dumitrescu
```

3. Filtrare după clinică:

```text
Clinica Dentară Aurora
```

4. Filtrare după medic:

```text
Dr. Ana Popescu
```

5. Deschide o lucrare.
6. Arată detaliile:
   - pacient;
   - clinică;
   - medic;
   - tip lucrare;
   - cantitate;
   - prioritate;
   - termen promis;
   - termen efectiv calculat;
   - mod deadline: calculat, manual sau nerezolvat;
   - status;
   - valoare, dacă utilizatorul are drept de pricing;
   - “Detalii specifice lucrării”, cu formularul salvat ca snapshot.

Ce explici:

- lucrarea primește cod unic `WO-<an>-<număr>`;
- pacientul se alege din selectorul aplicației sau se creează rapid din modal, nu se introduce ca text liber;
- statusul actual este `REGISTERED` la creare, iar execuția workflow-ului se urmărește separat în secțiunea de flux producție;
- prețul este snapshot pe lucrare;
- termenul efectiv este snapshot pe lucrare și nu expune prețuri pentru rolurile fără acces financiar;
- dacă se schimbă cabinetul, medicul, tipul de lucrare sau cantitatea, aplicația cere versiunea deadline-ului și recalculează controlat;
- un termen manual setat de manager rămâne blocat până la o corecție explicită;
- formularul specific este snapshot imutabil; dacă template-ul se schimbă ulterior, lucrarea veche păstrează câmpurile și valorile salvate;
- datele sunt filtrabile pentru receptie/manager.

Valoare stabila pentru cautare:

```text
WO-2026-900001
```

Dacă demo-ul este rulat într-un alt an, codurile devin `WO-<an>-900001`.

Pentru creare lucrare nouă, alege pacienta din selector, apoi alege `Coroană zirconiu`. Arată secțiunea “Detalii specifice lucrării”:

- Dinți;
- Nuanță;
- Tip zirconiu;
- Probă solicitată;
- Observații specifice.

În aceeași creare, arată cardul de preview pentru termen:

- `Termen efectiv` calculat din regulile de execuție;
- explicația cu zile lucrătoare și calendar;
- lipsa totalurilor financiare pentru rolurile fără `pricing.read`;
- dacă regula este manuală, aplicația afișează că termenul trebuie decis explicit.

## 9. QR și scanare

Din detaliul unei lucrări, arată QR-ul.

Ce arati:

- fiecare lucrare are QR privat;
- QR-ul nu conține nume pacient, prețuri sau ID-uri interne;
- QR-ul poate fi folosit pentru identificarea rapidă a lucrării.

Deschide `Scanare`.

Ce arăți:

- pagina de scanare;
- placeholder clar înainte de pornirea camerei;
- fallback manual unde poți introduce codul lucrării:

```text
WO-2026-900001
```

Ce explici:

- scanarea reală cu camera este pregătită în UI și pornește doar la acțiunea utilizatorului;
- QR-ul este rezolvat prin backend;
- accesul rămâne autorizat;
- pagina afișează etapa curentă, responsabilul, progresul și acțiunile permise;
- pornirea/finalizarea etapei sau asignarea responsabilului cer confirmare explicită.

Pentru curier, scanează:

```text
WO-2026-900030
```

Arată că livrarea este `În tranzit` și butonul duce către confirmarea predării.

## 10. Livrări și semnătură internă

Intră ca Manager și deschide `Livrările mele`.

Ce arăți:

1. Lista de livrări cu statusuri planificate, atribuite, în tranzit, finalizate, nereușite și neatribuite.
2. Deschide `DLV-2026-DEMO-07` sau `DLV-2026-DEMO-08`.
3. Arată secțiunea “Confirmare internă de primire”.
4. Apasă “Deschide dovada”.
5. Arată semnătura redată read-only, destinatarul, confirmatorul și hash-ul parțial.
6. Apasă “Printează dovada” și arată pagina `/deliveries/:id/proof/print`.
7. Explică disclaimer-ul: document intern operațional, nu semnătură electronică calificată.
8. Deschide livrarea `DLV-2026-DEMO-11` și arată badge-ul de finalizare fără semnătură prin override.

Pentru semnare live:

1. Intră ca `curier@demo.local` sau folosește butonul “Intră ca curier”.
2. Deschide `Livrările mele`.
3. Deschide livrarea `DLV-2026-DEMO-06`, aflată `În tranzit`.
4. Completează destinatarul dacă este necesar.
5. Apasă “Confirmă livrarea”.
6. În modal, semnează în canvas, bifează confirmarea și apasă “Confirmă predarea”.
7. Arată că livrarea devine finalizată și proof-ul devine disponibil.

Ce explici:

- curierul nu poate finaliza fără semnătură;
- managerul poate finaliza fără semnătură doar cu motiv explicit și audit;
- aplicația nu stochează PNG/base64, ci coordonate normalizate și hash SHA-256;
- dovada nu este expusă în liste, exporturi sau audit raw.

## 11. Clinici și medici

Deschide `Clinici și medici`.

Ce arati:

- lista clinicilor;
- căutare/filtre;
- deschiderea unei clinici;
- date de facturare;
- medicii asociați clinicii;
- arhivare/restaurare, unde exista permisiune.

Clinici demo:

- `Clinica Dentară Aurora`;
- `Smile Avenue`;
- `Cabinet Stomatologic Central`;
- `Dental Point`.

Ce explici:

- medicii sunt externi, nu utilizatori interni ai aplicației;
- fiecare medic apartine unei clinici;
- datele de facturare ale clinicii sunt folosite în documentele printabile.

## 12. Tipuri de lucrări și prețuri

Deschide `Tipuri de lucrări`.

Ce arati:

- catalog de lucrări;
- cod, denumire, descriere, preț de bază;
- activ/inactiv;
- formular de creare/editare, daca rolul are permisiune.
- butonul „Configurează formularul” pentru template-ul dinamic de intake;
- butonul „Configurează fluxul” pentru etapele tehnologice standard.

Exemple demo:

- `Coroană zirconiu`;
- `Coroană metalo-ceramică`;
- `Proteză totală`;
- `Gutiere`;
- `Bont personalizat implant`;
- `Wax-up diagnostic`.

Ce explici:

- preturile sunt in bani intregi in backend, fara Float;
- pretul se copiaza ca snapshot pe lucrare;
- tipurile inactive raman in istoric, dar nu sunt folosite pentru lucrari noi.
- fluxurile sunt versionate per tip de lucrare; activarea unui draft arhiveaza versiunea activa anterioara.

Deschide „Configurează fluxul” pe `Coroană zirconiu`.

Ce arati:

- lista de versiuni ale fluxului;
- etapele liniare ale fluxului;
- rolurile permise pe fiecare etapa;
- durata estimata;
- preview-ul fluxului.

Ce explici:

- prima etapa este tratata automat ca etapa initiala;
- ultima etapa este tratata automat ca etapa finala;
- template-urile active/arhivate sunt read-only;
- acest ecran configureaza fluxul standard, dar nu porneste inca executia etapelor pe o lucrare existenta.

## 13. Facturare

Deschide `Facturare`.

Ce arati:

1. Cardurile lunare:
   - nefacturat;
   - facturat;
   - incasat;
   - sold restant;
   - proforme deschise;
   - facturi neincasate.

2. Filtre:
   - perioada;
   - cautare;
   - status incasare;
   - grupare dupa clinica, medic, zi, luna, pacient, status.

3. Tab `Lucrari nefacturate`:
   - lucrari care pot fi adaugate in proforma/factura;
   - selectie multipla;
   - creare proforma;
   - creare factura.

4. Tab `Proforme si facturi`:
   - documente draft/emise/anulate/achitate;
   - emitere document;
   - transformare proforma in factura;
   - print/PDF.

5. Tab `Evidenta incasari`:
   - incasari manuale;
   - metoda informativa;
   - chitanta;
   - referinta bancara.

6. Tab `Inchidere luna`:
   - totaluri pe grupare;
   - export registru lunar CSV.

7. Tab `Serii`:
   - serii proforme/facturi.

Ce explici:

- aplicatia nu proceseaza plata;
- se noteaza manual faptul ca plata a avut loc in afara aplicatiei;
- statusurile `UNPAID`, `PARTIALLY_PAID`, `PAID` sunt derivate din incasari active;
- overpayment este refuzat de backend.

## 14. Scenarii financiare de aratat

### Factura neachitata/restanta

Cauta:

```text
FACT-2026-000001
```

Arata:

- factura emisa;
- zero incasari;
- sold restant;
- due date in trecut;
- apare ca restanta.

### Factura partial incasata

Cauta:

```text
FACT-2026-000002
```

Arata:

- total factura: 1.000 RON;
- suma incasata: 400 RON;
- sold restant: 600 RON;
- status: partial incasata.

Cauta si dupa chitanta:

```text
CH-2026-001
```

Cauta si dupa referinta:

```text
OP-DEMO-001
```

### Factura achitata integral

Cauta:

```text
FACT-2026-000004
```

Arata:

- sold 0;
- status achitat integral;
- istoric incasari.

### Proforma convertita

Cauta:

```text
PF-2026-000001
FACT-2026-000008
```

Arata:

- proforma ramane in istoric;
- factura exista separat;
- lucrarile sunt atasate facturii.

### Factura anulata

Cauta:

```text
FACT-2026-000007
```

Arata:

- status `CANCELLED`;
- nu accepta incasari noi;
- ramane in istoric.

## 15. Print preview si anexa

Dintr-o factura, apasa `Print / PDF`.

Ce arati:

- ruta dedicata de print;
- tab Document;
- tab Anexa;
- date laborator;
- date client;
- linii cu:
  - cod lucrare;
  - data intrarii;
  - pacient;
  - medic;
  - tip lucrare;
  - cantitate;
  - valoare;
- totaluri si sold.

Ce explici:

- se poate folosi printul browserului pentru PDF;
- documentul este intern/demo;
- RO e-Factura/SPV nu este implementat in acest stadiu.

## 16. Export CSV

In `Facturare`, mergi la `Inchidere luna` si apasa export registru lunar CSV.

Ce explici:

- CSV-ul este pentru reconciliere operationala;
- valorile sunt protejate impotriva formula injection;
- exportul este auditat pe backend.

## 17. Utilizatori si RBAC

Deschide `Utilizatori`.

Ce arati:

- lista utilizatori;
- roluri;
- creare/editare utilizator;
- activare/dezactivare;
- resetare parola;
- asignare roluri.

Ce explici:

- rolurile sunt server-side;
- meniul se adapteaza dupa permisiuni;
- backend-ul verifica fiecare endpoint.

Pentru demonstratie rapida, delogheaza-te si logheaza-te cu:

```text
receptie@demo.local
tehnician1@demo.local
curier@demo.local
```

Arata ca meniurile si accesul sunt diferite.

## 18. Lucrarile mele pentru tehnicieni

Din acces rapid demo, intra ca `tehnician1@demo.local` sau foloseste butonul “Intră ca tehnician”.

Deschide `Lucrările mele`.

Ce arati:

- tabul `Lucrări disponibile`;
- revendicarea unei lucrări cu alegerea explicită `NC` sau `NG`;
- tabul `Lucrările mele`, unde apare lucrarea revendicată;
- eliberarea responsabilității cu motiv, dacă trebuie corectată o revendicare;
- coada personală de etape pentru execuția workflow-ului;
- filtrele rapide `Toate`, `De început`, `În lucru`, `Urgente`, `Astăzi`, `Întârziate`;
- cardul de lucrare cu etapa curenta, termen, progres si responsabil;
- actiunile `Începe etapa` si `Finalizează etapa`, disponibile doar cand statusul permite;
- faptul ca tehnicianul vede lucrările disponibile pentru revendicare și lucrările proprii revendicate.

Revino ca manager si deschide `Lucrările mele`.

Ce arati:

- managerul vede atelierul complet, inclusiv etape neasignate;
- sectiunea `Încărcare tehnicieni`;
- in `Lucrări`, coloanele `Responsabil` si `Companie execuție`;
- in detaliul unei lucrări, cardul `Responsabilitate` cu istoric append-only;
- actiunea manager-only `Reasignează`, cu motiv si selectie `NC`/`NG`;
- in detaliul unei lucrari, sectiunea `Flux producție` are control `Responsabil` pentru asignare/reasignare/eliminare;
- reasignarea unei etape deja pornite cere confirmare si ramane in istoric/audit.

Ce explici:

- responsabilitatea pe lucrare este separată de asignarea etapei curente;
- claim-ul pe lucrare folosește optimistic locking si refuză conflictele;
- firma de execuție este `NC` sau `NG` si nu se trimite ID intern in UI;
- asignarea este pe etapa curenta, nu pe toata lucrarea;
- etapa urmatoare ramane neasignata cand fluxul avanseaza;
- backend-ul verifica permisiunile si assignment-ul, UI-ul doar ghideaza utilizatorul.

## 19. Ce este gata acum

Gata in stadiul curent:

- monorepo React/Nest/Prisma/PostgreSQL;
- autentificare cookie + CSRF;
- RBAC server-side;
- shell autentificat si navigatie;
- componente UI reutilizabile;
- formulare cu validare si UX consistent;
- management utilizatori;
- setari laborator;
- clinici si medici;
- registru pacienti si dosar pacient;
- tipuri de lucrari si preturi;
- lucrari cu QR;
- scanare/rezolvare QR;
- template-uri de workflow;
- executie workflow pe etape;
- asignare tehnicieni pe etapa curenta;
- coada personala pentru tehnicieni;
- logistica interna;
- pregatire livrare;
- livrari curier;
- confirmare interna de primire cu semnatura;
- dovada printabila de predare;
- facturare operationala;
- proforme;
- facturi;
- evidenta incasari manuale;
- documente printabile;
- anexe;
- situatii lunare;
- CSV;
- dataset demo realist si resetabil.

## 20. Ce nu este gata inca

Nu prezenta ca finalizat:

- fisiere/atasamente private;
- dovada foto;
- QC;
- notificari;
- dashboard operational complet;
- cautare globala avansata;
- rapoarte complete;
- audit UI;
- RO e-Factura/SPV;
- procesare reala de plati.

## 21. Flow recomandat de prezentare

Ordine recomandata:

1. Login manager.
2. Navigatie/shell.
3. Pacienti.
4. Search `Maria Dumitrescu` si dosar pacient.
5. Lucrari.
6. Search `Maria Dumitrescu`.
7. Filtru `Clinica Dentară Aurora`.
8. Deschide lucrare.
9. Arata QR.
10. Scanare cu fallback manual.
11. Clinici si medici.
12. Tipuri de lucrari.
13. Facturare overview.
14. Lucrari nefacturate.
15. Proforme.
16. Factura neachitata.
17. Factura partial incasata.
18. Cautare `CH-2026-001`.
19. Cautare `OP-DEMO-001`.
20. Factura achitata.
21. Factura anulata.
22. Print/PDF si anexa.
23. Inchidere luna si CSV.
24. Utilizatori si roluri.
25. Login cu tehnician si arata `Lucrări disponibile`, claim cu `NC`/`NG`, `Lucrările mele` si eliberare.
26. Explică faptul că prima preluare fixează contextul de execuție: firma, tehnicianul inițial, termenul și pricing-ul intern.
27. Deschide o lucrare claimuită din `Lucrări` și arată cardul `Context de execuție`:
    - status `Fixat`;
    - firma `NC`/`NG`;
    - tehnician inițial și tehnician curent;
    - start execuție și termen final;
    - pentru manager, prețul fixat și sursa prețului.
28. Revino pe rol tehnician și arată aceeași lucrare: firma și termenul sunt vizibile, dar informațiile financiare sunt mascate.
29. Eliberează o lucrare și explică faptul că eliberarea nu modifică firma, prețul sau termenul deja fixate.
30. Reia/reasignează aceeași lucrare și arată că firma este blocată; schimbarea firmei este refuzată de backend și nu există buton de edit snapshot.
26. Login manager si arata `Responsabilitate`, istoric, reassign si asignarea responsabilului in fluxul lucrarii.
27. Login cu receptie/curier pentru meniuri diferite.
28. Setari laborator.
29. Recapitulare ce este gata si ce urmeaza.

## 22. Fraza de inchidere

Aplicatia acopera deja baza operationala: utilizatori, roluri, clinici, medici, pacienti, catalog de lucrari, receptie lucrari, QR, scanare operationala cu actiuni confirmate, formulare dinamice, template-uri de workflow, executia etapelor curente cu asignare pe tehnicieni, logistica, livrari, confirmare interna de predare, facturare, incasari manuale si documente printabile. Urmatorul pas natural este realinierea preturilor pe firme, clinici si medici.
