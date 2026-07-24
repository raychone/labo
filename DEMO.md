# Demo aplicatie Dental Lab Management

Acest document este ghidul de prezentare cap-coada pentru stadiul curent al aplicatiei. Toate datele demo sunt fictive si sunt doar pentru development/prezentare.

## 1. Pregatire inainte de prezentare

Porneste baza de date, API-ul si frontend-ul:

```bash
docker compose up -d
pnpm --filter @dental-lab/api prisma:db:seed
pnpm --filter @dental-lab/api prisma:db:seed:demo
PORT=3010 pnpm --filter @dental-lab/api start
pnpm --filter @dental-lab/web dev --host 127.0.0.1
```

Deschide aplicatia in browser:

```text
http://127.0.0.1:5173
```

Daca vrei sa refaci datasetul demo de la zero:

```bash
pnpm --filter @dental-lab/api prisma:db:reset-demo
pnpm --filter @dental-lab/api prisma:db:seed:demo
```

## 2. Conturi demo

Parola pentru toate conturile demo:

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

## 3. Mesaj de inceput pentru clienta

Aplicatia este gandita pentru managementul operational al unui laborator dentar: lucrari primite de la clinici, QR pentru identificare rapida, utilizatori cu roluri, catalog de preturi, setari laborator si zona de facturare/evidenta incasari.

Spune clar:

- datele din demo sunt fictive;
- aplicatia nu proceseaza bani;
- incasarile sunt inregistrari manuale ale unor plati facute in afara aplicatiei;
- factura printabila este interna/demo, nu integrare RO e-Factura;
- workflow-ul de productie, fisierele si livrarile sunt taskuri urmatoare, nu sunt gata in acest moment.

## 4. Login si shell aplicatie

1. Intra pe `http://127.0.0.1:5173`.
2. Logheaza-te cu `manager@demo.local`.
3. Arata ca dupa login utilizatorul intra in aplicatie, nu intr-o pagina publica.
4. Arata navigatia principala:
   - Dashboard;
   - Lucrari;
   - Scanare;
   - Facturare;
   - Clinici si medici;
   - Tipuri de lucrari;
   - Utilizatori;
   - Setari.

Ce explici:

- fiecare utilizator vede meniuri in functie de rol si permisiuni;
- autentificarea este pe cookie securizat;
- validarea si permisiunile sunt aplicate si pe backend, nu doar in UI.

## 5. Dashboard

Deschide Dashboard.

Ce arati:

- aplicatia are shell autentificat si pagina de start;
- este pregatita pentru indicatori operationali;
- dashboard-ul real detaliat este planificat ulterior.

Ce spui:

Dashboard-ul este momentan punctul de intrare. Datele operationale detaliate se vad acum in Lucrari si Facturare.

## 6. Lucrari

Deschide `Lucrari`.

Ce arati:

1. Registrul de lucrari.
2. Search dupa pacient:

```text
Maria Dumitrescu
```

3. Filtrare dupa clinica:

```text
Clinica Dentară Aurora
```

4. Filtrare dupa medic:

```text
Dr. Ana Popescu
```

5. Deschide o lucrare.
6. Arata detaliile:
   - pacient;
   - clinica;
   - medic;
   - tip lucrare;
   - cantitate;
   - prioritate;
   - termen promis;
   - status;
   - valoare, daca utilizatorul are drept de pricing.

Ce explici:

- lucrarea primeste cod unic `WO-<an>-<numar>`;
- statusul actual este `REGISTERED`, pentru ca workflow-ul de productie vine intr-un task ulterior;
- pretul este snapshot pe lucrare;
- datele sunt filtrabile pentru receptie/manager.

Valoare stabila pentru cautare:

```text
WO-2026-900001
```

Daca demo-ul este rulat intr-un alt an, codurile devin `WO-<an>-900001`.

## 7. QR si scanare

Din detaliul unei lucrari, arata QR-ul.

Ce arati:

- fiecare lucrare are QR privat;
- QR-ul nu contine nume pacient, preturi sau ID-uri interne;
- QR-ul poate fi folosit pentru identificarea rapida a lucrarii.

Deschide `Scanare`.

Ce arati:

- pagina de scanare;
- fallback manual unde poti introduce codul lucrarii:

```text
WO-2026-900001
```

Ce explici:

- scanarea reala cu camera este pregatita in UI;
- QR-ul este rezolvat prin backend;
- accesul ramane autorizat.

## 8. Clinici si medici

Deschide `Clinici si medici`.

Ce arati:

- lista clinicilor;
- cautare/filtre;
- deschiderea unei clinici;
- date de facturare;
- medicii asociati clinicii;
- arhivare/restaurare, unde exista permisiune.

Clinici demo:

- `Clinica Dentară Aurora`;
- `Smile Avenue`;
- `Cabinet Stomatologic Central`;
- `Dental Point`.

Ce explici:

- medicii sunt externi, nu utilizatori interni ai aplicatiei;
- fiecare medic apartine unei clinici;
- datele de facturare ale clinicii sunt folosite in documentele printabile.

## 9. Tipuri de lucrari si preturi

Deschide `Tipuri de lucrari`.

Ce arati:

- catalog de lucrari;
- cod, denumire, descriere, pret de baza;
- activ/inactiv;
- formular de creare/editare, daca rolul are permisiune.

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

## 10. Facturare

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

## 11. Scenarii financiare de aratat

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

## 12. Print preview si anexa

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

## 13. Export CSV

In `Facturare`, mergi la `Inchidere luna` si apasa export registru lunar CSV.

Ce explici:

- CSV-ul este pentru reconciliere operationala;
- valorile sunt protejate impotriva formula injection;
- exportul este auditat pe backend.

## 14. Utilizatori si RBAC

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

## 15. Setari laborator

Deschide `Setari`.

Ce arati:

- nume laborator;
- nume legal;
- CUI fictiv;
- numar registru fictiv;
- adresa;
- moneda;
- locale;
- timezone;
- culoare principala;
- footer document.

Ce explici:

- aceste date sunt folosite in documentele printabile;
- datele demo sunt fictive si marcate ca demo.

## 16. Ce este gata acum

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
- tipuri de lucrari si preturi;
- lucrari cu QR;
- scanare/rezolvare QR;
- facturare operationala;
- proforme;
- facturi;
- evidenta incasari manuale;
- documente printabile;
- anexe;
- situatii lunare;
- CSV;
- dataset demo realist si resetabil.

## 17. Ce nu este gata inca

Nu prezenta ca finalizat:

- workflow productie pe etape;
- asignare tehnicieni pe lucrari;
- fisiere/atasamente private;
- logistica/livrari;
- semnaturi;
- QC;
- notificari;
- dashboard operational complet;
- cautare globala avansata;
- rapoarte complete;
- audit UI;
- RO e-Factura/SPV;
- procesare reala de plati.

## 18. Flow recomandat de prezentare

Ordine recomandata:

1. Login manager.
2. Navigatie/shell.
3. Lucrari.
4. Search `Maria Dumitrescu`.
5. Filtru `Clinica Dentară Aurora`.
6. Deschide lucrare.
7. Arata QR.
8. Scanare cu fallback manual.
9. Clinici si medici.
10. Tipuri de lucrari.
11. Facturare overview.
12. Lucrari nefacturate.
13. Proforme.
14. Factura neachitata.
15. Factura partial incasata.
16. Cautare `CH-2026-001`.
17. Cautare `OP-DEMO-001`.
18. Factura achitata.
19. Factura anulata.
20. Print/PDF si anexa.
21. Inchidere luna si CSV.
22. Utilizatori si roluri.
23. Login cu receptie/tehnician/curier pentru meniuri diferite.
24. Setari laborator.
25. Recapitulare ce este gata si ce urmeaza.

## 19. Fraza de inchidere

Aplicatia acopera deja baza operationala: utilizatori, roluri, clinici, medici, catalog de lucrari, receptie lucrari, QR, facturare, incasari manuale si documente printabile. Urmatorul pas natural este workflow-ul de productie, ca fiecare lucrare sa treaca prin etape, tehnicieni, fisiere, control calitate si livrare.
