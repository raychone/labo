# MVP Implementation Plan

## 1. Executive Summary

Construim o aplicatie web custom pentru managementul integral al unui laborator de tehnica dentara din Romania. MVP-ul trebuie sa acopere fluxul complet al unei lucrari dentare, de la ridicare/comanda pana la livrare, incasare, facturare si inchidere, cu trasabilitate completa.

Repository-ul este gol, deci recomandarea de start este un monolit modular TypeScript:

- Frontend: React + Vite + TypeScript, React Router, TanStack Query, React Hook Form + Zod.
- Backend: NestJS + TypeScript, REST API, Prisma, PostgreSQL.
- UI: design system intern mobile-first, full responsive, cu componente separate si consistente.
- Testing: Vitest/Jest pentru unit, Supertest pentru API, Playwright pentru fluxuri critice.
- DevOps: Docker Compose pentru development, migratii Prisma, seed demo, CI minimal.

Nu implementam in aceasta etapa functionalitati de business, ci stabilim planul executabil. Implementarea ulterioara se va face task cu task, actualizand acest document dupa fiecare etapa.

## 2. Scope MVP

MVP Core trebuie sa permita executarea unui flux end-to-end:

1. Managerul creeaza utilizatori, roluri si configurari initiale.
2. Receptia inregistreaza o lucrare noua.
3. Lucrarea primeste QR si atasamente.
4. Logistica planifica lucrarea si alege fluxul tehnologic.
5. Tehnicienii executa etapele atribuite.
6. Controlul calitatii aproba sau respinge lucrarea.
7. Receptia/logistica pregateste livrarea.
8. Curierul confirma predarea catre medic/cabinet.
9. Managerul inregistreaza incasarea.
10. Managerul emite factura PDF.
11. Lucrarea este inchisa si arhivabila.

MVP Extended include portalul medicului, rapoarte suplimentare, export contabil si PWA imbunatatit pentru curier.

## 3. Non-goals MVP

- Nu construim microservicii.
- Nu implementam Kubernetes.
- Nu introducem Elasticsearch.
- Nu folosim RabbitMQ fara nevoie demonstrata.
- Nu implementam e-Factura/ANAF in MVP.
- Nu construim modul complet de stocuri.
- Nu permitem signup public.
- Nu permitem alegerea libera a rolului.
- Nu tratam aplicatia ca simplu CRUD fara workflow, audit si permisiuni.

## 4. Assumptions

- Aplicatia deserveste un singur laborator operational comun, cu doua contexte juridice/financiare: `NC` - Nicolaie Cristina si `NG` - Nicolaie Gabriel.
- Utilizatorii sunt creati doar de manager.
- Datele pacientului sunt modelate explicit prin `PATIENTS-001`; codul operational ramane codul lucrarii.
- Fisierele private sunt accesibile doar prin backend autorizat.
- Facturarea MVP genereaza PDF si numerotare controlata, dar elementele fiscale finale se valideaza cu contabilul clientului.
- Interfata trebuie sa fie mobile-first si full responsive, inclusiv pentru tablet si desktop.
- Utilizatorii pot fi non-tehnici; UI-ul trebuie sa foloseasca limbaj clar, actiuni evidente si ecrane fara aglomerare.

## 4.1 Real Lab Workflow Realignment

`ROADMAP-REALIGN-002` realiniaza produsul dupa fluxul real validat in laborator. Documentul sursa pentru aceasta decizie este `REAL-LAB-WORKFLOW.md`.

Decizii obligatorii:

- exista o singura aplicatie, o singura baza de date si un singur flux operational comun;
- exista doua contexte juridice/financiare, `NC` si `NG`;
- cei doi manageri vad si opereaza ambele contexte;
- utilizatorii nu sunt duplicati pe companie;
- receptia nu alege firma la creare lucrare;
- tehnicianul alege `NC`/`NG` la primul claim tehnic, iar firma ramane atasata lucrarii;
- fluxul tehnicianului devine self-claim, nu asignare obligatorie de manager;
- preturile, documentele, seriile, incasarile si rapoartele financiare sunt separate prin contextul global;
- statusul operational este comun si vizibil intern cu mascare de permisiuni;
- pacientul devine entitate proprie, fara cod intern de pacient;
- demo-ul existent ramane demonstratie a fluxului anterior pana la `DEMO-REAL-DATA-001`.

### Active Roadmap After ROADMAP-REALIGN-002

Faza 1 - Realiniere structurala:

1. `ROADMAP-REALIGN-002`
2. `ORG-CONTEXT-001`
3. `ORG-DATA-MIGRATION-001`

Faza 2 - Datele reale:

4. `PATIENTS-001`
5. `PRICING-002`
6. `WORK-DEADLINES-001`

Faza 3 - Atelierul real:

7. `TECH-CLAIM-001`
8. `STATUS-001`
9. `WORK-CYCLES-001`
10. `WORKFORM-REAL-001`

Faza 4 - Financiar si documente:

11. `BILLING-REALIGN-001`
12. `PAYMENTS-002`
13. `DOCUMENTS-001`
14. `COLLABORATION-TERMS-001`

Faza 5 - Rezilienta si finalizare:

15. `OFFLINE-001`
16. `DASHBOARD-002`
17. `SEARCH-001`
18. `REPORTS-001`
19. `AUDIT-UI-001`
20. `DEMO-REAL-DATA-001`
21. `E2E-001`
22. `SECURITY-001`
23. `DEPLOY-001`

## 5. Open Questions for Client

- Ce date despre pacient sunt strict necesare operational?
- Laboratorul este platitor de TVA?
- Care sunt seriile de factura si regulile curente de numerotare?
- Ce tipuri de lucrari si fluxuri tehnologice sunt folosite cel mai frecvent?
- Ce documente trebuie tiparite fizic langa QR?
- Cine poate vedea observatiile medicului si notele interne?
- Portalul medicului intra in MVP Core sau MVP Extended?
- Ce export contabil este necesar ulterior?

## 6. User Roles

### MANAGER

Acces administrativ, operational si financiar extins. Creeaza utilizatori, gestioneaza roluri, vede audit, configureaza preturi, facturi, rapoarte si setari laborator.

### LOGISTICA

Gestioneaza planificarea, prioritatile, alocarea, fluxurile tehnologice si blocajele operationale. Nu vede implicit date financiare.

### RECEPTIE

Inregistreaza lucrari, completeaza fise, gestioneaza intrari/iesiri fizice, QR, atasamente si predari catre logistica/curier. Nu vede financiar.

### TEHNICIAN

Vede lucrarile alocate, executa etape, adauga observatii/fisiere si marcheaza probleme sau rework.

### CURIER

Are interfata simpla, optimizata pentru telefon. Vede ridicari/livrari proprii, scaneaza QR, confirma predari si poate captura semnatura/fotografie.

### MEDIC / CABINET

Portal simplificat. Creeaza sau urmareste comenzi proprii, incarca fisiere, comunica prin comentarii si confirma receptia. Recomandare: MVP Extended, dupa ce fluxul intern este stabil.

## 7. Permission Matrix

Legend: A = implicit permis, O = posibil prin override explicit, - = interzis implicit.

| Permission | Manager | Logistica | Receptie | Tehnician | Curier | Medic |
|---|---:|---:|---:|---:|---:|---:|
| users.create | A | - | - | - | - | - |
| users.read | A | - | - | - | - | - |
| users.update | A | - | - | - | - | - |
| users.disable | A | - | - | - | - | - |
| users.assign_roles | A | - | - | - | - | - |
| roles.read | A | - | - | - | - | - |
| permissions.read | A | - | - | - | - | - |
| works.create | A | O | A | - | - | O |
| works.read_all | A | A | A | - | - | - |
| works.read_assigned | A | A | A | A | A | A |
| works.update | A | A | A | O | - | O |
| works.assign | A | A | - | - | - | - |
| works.change_status | A | A | A | A | A | O |
| works.archive | A | - | - | - | - | - |
| workflow.read | A | A | A | A | - | - |
| workflow.configure | A | O | - | - | - | - |
| workflow.assign_stage | A | O | - | - | - | - |
| workflow.start_stage | A | O | - | A | - | - |
| workflow.pause_stage | A | O | - | A | - | - |
| workflow.complete_stage | A | O | - | A | - | - |
| workflow.reassign_stage | A | O | - | - | - | - |
| workflow.reopen_stage | A | O | - | - | - | - |
| technician.workbench.read | A | O | - | A | - | - |
| technician.workload.read | A | O | - | - | - | - |
| logistics.read | A | A | A | - | - | - |
| logistics.plan | A | A | - | - | - | - |
| logistics.assign | A | A | - | - | - | - |
| logistics.prepare_delivery | A | A | A | - | - | - |
| reception.receive | A | O | A | - | - | - |
| reception.edit_intake | A | O | A | - | - | - |
| reception.handover_to_logistics | A | O | A | - | - | - |
| reception.handover_to_courier | A | A | A | - | - | - |
| delivery.read_own | A | O | O | - | A | - |
| delivery.create_route | A | A | O | - | - | - |
| delivery.pickup | A | O | O | - | A | - |
| delivery.deliver | A | O | O | - | A | O |
| delivery.fail | A | O | O | - | A | - |
| delivery.capture_signature | A | O | O | - | A | O |
| quality.read | A | A | O | A | - | - |
| quality.approve | A | O | - | O | - | - |
| quality.reject | A | O | - | O | - | - |
| quality.rework | A | A | - | O | - | - |
| finance.read | A | - | - | - | - | O |
| finance.record_payment | A | - | - | - | - | - |
| finance.refund | A | - | - | - | - | - |
| finance.read_reports | A | - | - | - | - | - |
| invoice.create | A | - | - | - | - | - |
| invoice.read | A | - | - | - | - | O |
| invoice.download | A | - | - | - | - | O |
| invoice.cancel | A | - | - | - | - | - |
| invoice.configure_series | A | - | - | - | - | - |
| pricing.read | A | - | - | - | - | - |
| pricing.create | A | - | - | - | - | - |
| pricing.update | A | - | - | - | - | - |
| reports.operational | A | A | O | - | - | - |
| reports.financial | A | - | - | - | - | - |
| reports.productivity | A | A | - | O | - | - |
| settings.read | A | O | - | - | - | - |
| settings.update | A | - | - | - | - | - |
| audit.read | A | O | - | - | - | - |
| files.upload | A | A | A | A | A | A |
| files.read | A | A | A | A | O | A |
| files.delete | A | O | O | - | - | O |
| comments.create | A | A | A | A | A | A |
| comments.read_internal | A | A | A | A | - | - |
| comments.read_external | A | A | A | A | A | A |

## 8. Authentication Model

- Nu exista signup public.
- Managerul creeaza utilizatorii si poate reseta accesul.
- Login cu email/username si parola.
- Hash parole cu Argon2id.
- Sesiune prin cookie httpOnly, secure, sameSite=lax/strict.
- Expirare sesiune si refresh controlat.
- Logout sterge sesiunea server-side.
- Utilizatorii dezactivati pierd accesul imediat.
- Rate limiting pentru login.
- Mesaj generic pentru credentiale invalide, fara enumerare utilizatori.
- Audit pentru login reusit, login esuat, logout, resetare parola, dezactivare utilizator.
- Fara parole, tokenuri sau cookie-uri in loguri.
- CSRF protection pentru cookie auth.

Decizie MVP: recuperarea parolei nu este publica; managerul reseteaza accesul.

## 9. Authorization Model

Autorizarea se face prin RBAC granular, cu reguli de scope si ownership.

Entitati:

- User
- Role
- Permission
- UserRole
- RolePermission
- UserPermissionOverride
- ResourcePolicy

Reguli:

- Backend-ul este sursa de adevar.
- Frontend-ul doar ascunde actiunile nepermise.
- Fiecare endpoint verifica permisiunea si scope-ul.
- Permisiunile pot avea scope: all, assigned, own_clinic, own_delivery, own_stage.
- Override-urile pot acorda sau retrage explicit permisiuni.
- Orice schimbare de rol/permisiune intra in audit.
- Cache-ul de permisiuni trebuie invalidat imediat la schimbari.

## 10. Domain Model

Entitati principale:

- Laboratory
- User
- Role
- Permission
- Clinic
- Doctor
- PatientReference
- WorkOrder
- WorkType
- WorkOrderItem
- WorkflowTemplate
- WorkflowTemplateVersion
- WorkflowStageTemplate
- WorkOrderWorkflowSnapshot
- WorkOrderStage
- StageChecklistItem
- QualityCheck
- DeliveryRoute
- DeliveryStop
- Payment
- Invoice
- InvoiceLine
- FileAsset
- Comment
- Notification
- AuditLog
- BusinessEvent

Separare date:

- Comentarii: discutii operationale sau externe.
- Note interne: vizibile doar personalului autorizat.
- Observatii medic: vizibile medicului si personalului autorizat.
- Audit imuabil: istoric tehnic si operational, needitabil.
- Evenimente business: timeline lizibil pentru utilizatori.

## 11. Work Order Lifecycle

Statusuri MVP propuse:

- DRAFT
- REGISTERED
- AWAITING_LOGISTICS
- PLANNED
- IN_PRODUCTION
- AWAITING_QUALITY_CONTROL
- QUALITY_REJECTED
- QUALITY_APPROVED
- READY_FOR_DELIVERY
- HANDED_TO_COURIER
- DELIVERED
- AWAITING_PAYMENT
- PARTIALLY_PAID
- PAID
- INVOICED
- CLOSED
- CANCELLED

Am eliminat statusurile redundante RECEIVED, ASSIGNED si IN_TRANSIT ca statusuri generale. Acestea pot exista ca evenimente, stari de etapa sau stari de livrare. Astfel statusul lucrarii ramane clar, iar detaliile operationale stau in modulele dedicate.

## 12. State Transition Matrix

| From | To | Permission | Required Conditions | Audit Event | Notification | Reversible | Reason Required |
|---|---|---|---|---|---|---|---|
| DRAFT | REGISTERED | works.create | campuri minime valide | work.registered | logistica | da | nu |
| REGISTERED | AWAITING_LOGISTICS | reception.handover_to_logistics | QR generat, fisa minima | work.handover_logistics | logistica | da | da |
| AWAITING_LOGISTICS | PLANNED | logistics.plan | termen intern, tip lucrare, flux ales | work.planned | tehniciani vizati | da | da |
| PLANNED | IN_PRODUCTION | works.assign | cel putin o etapa alocata | work.production_started | tehnician | nu simplu | nu |
| IN_PRODUCTION | AWAITING_QUALITY_CONTROL | workflow.complete_stage | toate etapele obligatorii finalizate | work.ready_qc | QC/logistica | da | da |
| AWAITING_QUALITY_CONTROL | QUALITY_REJECTED | quality.reject | checklist QC completat | work.qc_rejected | logistica/tehnician | da | da |
| QUALITY_REJECTED | IN_PRODUCTION | quality.rework | etapa rework creata | work.rework_opened | tehnician | nu | da |
| AWAITING_QUALITY_CONTROL | QUALITY_APPROVED | quality.approve | checklist QC trecut | work.qc_approved | receptie/logistica | da | da |
| QUALITY_APPROVED | READY_FOR_DELIVERY | logistics.prepare_delivery | ambalare si documente minime | work.ready_delivery | receptie/curier | da | nu |
| READY_FOR_DELIVERY | HANDED_TO_COURIER | reception.handover_to_courier | scan QR, curier selectat | work.handed_courier | medic optional | nu simplu | nu |
| HANDED_TO_COURIER | DELIVERED | delivery.deliver | confirmare, optional semnatura/foto | work.delivered | manager/receptie/medic | da controlat | nu |
| DELIVERED | AWAITING_PAYMENT | finance.read | sold > 0 | work.awaiting_payment | manager | automat | nu |
| AWAITING_PAYMENT | PARTIALLY_PAID | finance.record_payment | plata < sold | payment.partial | manager | prin corectie | nu |
| AWAITING_PAYMENT | PAID | finance.record_payment | plata >= sold | payment.full | manager | prin corectie | nu |
| PARTIALLY_PAID | PAID | finance.record_payment | sold 0 | payment.full | manager | prin corectie | nu |
| PAID | INVOICED | invoice.create | date fiscale valide, numar disponibil | invoice.issued | manager/medic | nu | nu |
| INVOICED | CLOSED | works.archive | livrat, platit/facturat conform regula | work.closed | manager | nu simplu | nu |
| Any active | CANCELLED | works.change_status | verificare impact financiar/livrare | work.cancelled | roluri implicate | nu simplu | da |

## 13. Technological Workflow Engine

MVP-ul foloseste template-uri versionate:

- WorkflowTemplate contine denumirea generala.
- WorkflowTemplateVersion contine versiunea activa.
- WorkflowStageTemplate defineste etapele, ordinea, rolul/competenta, checklist si campuri obligatorii.
- La alocarea pe lucrare se creeaza WorkOrderWorkflowSnapshot si WorkOrderStage.
- Editarea template-ului nu modifica retroactiv lucrarile existente.

Template-uri seed:

- Coroana ceramica: verificare, CAD, frezare/printare, ceramica, finisare, QC, ambalare.
- Gutiere: verificare, scanare, modelare, printare, finisare, QC, ambalare.
- Lucrare pe implant: verificare, CAD, proba, frezare, stratificare, QC, ambalare.

## 14. Reception Flow

Pagini:

- Lucrari noi
- Inregistrare lucrare
- Detalii lucrare
- Scanare QR
- Predare catre logistica
- Predare catre curier

Acceptance:

- Receptia poate crea lucrare fara sa vada preturi.
- QR este generat automat.
- Atasamentele sunt private.
- Predarea catre logistica creeaza audit si eveniment business.

## 15. Logistics Flow

Pagini:

- Board operational
- Lucrari de planificat
- Calendar/termene
- Alocare tehnicieni
- Pregatire livrare

Acceptance:

- Logistica vede toate lucrarile operationale.
- Poate planifica si prioritiza.
- Nu vede costuri, profit, facturi sau incasari fara override.
- Blocajele si intarzierile sunt vizibile rapid.

## 16. Technician Flow

Pagini:

- Lucrarile mele
- Etapa curenta
- Detalii tehnice
- Atasamente
- Raportare problema

Acceptance:

- Tehnicianul vede doar lucrarile alocate.
- Poate porni, pune pe pauza si finaliza etapa.
- Finalizarea valideaza checklist/campuri obligatorii.
- Etapele finalizate nu se rescriu fara audit.

## 17. Courier Flow

Interfata curierului este mobile-first strict:

- lista ridicari/livrari
- detalii cabinet
- buton apel telefonic
- scanare QR
- confirmare predare
- imposibil de livrat
- observatii, fotografie, semnatura

Nu includem GPS in MVP.

## 18. Doctor Flow

Recomandare: portal medic in MVP Extended.

Motiv: fluxul intern trebuie stabilizat mai intai. In MVP Core, receptia poate introduce lucrari primite de la medic. Portalul medicului se adauga dupa ce modelele de status, fisiere si comentarii sunt stabile.

## 19. Quality Control Flow

- QC poate fi etapa obligatorie in workflow.
- Checklist-ul QC este snapshot pe lucrare.
- Reject creeaza motiv obligatoriu si deschide rework.
- Approve permite pregatirea pentru livrare.

## 20. Payment Flow

- Managerul vede solduri si incasari.
- Platile pot fi partiale sau integrale.
- Plata are metoda, data, referinta si audit.
- Plata se poate asocia cu una sau mai multe lucrari.
- Corectiile se fac prin evenimente explicite, nu prin suprascriere tacita.

## 21. Invoice Flow

- Managerul configureaza date laborator si serie factura.
- Factura are linii, TVA configurabil, data emitere/scadenta, client, furnizor.
- Numerotarea este unica si nereutilizabila.
- Facturile emise nu se editeaza direct.
- PDF-ul se arhiveaza.
- e-Factura si integrarea contabila sunt Post-MVP sau MVP Extended.
- Toate regulile fiscale trebuie validate cu contabilul clientului.

## 22. QR and Traceability

- QR-ul contine doar identificator opac sau URL securizat.
- Nu contine date personale in clar.
- Scanarea cere autentificare.
- Backend-ul verifica permisiuni.
- Scanarea poate genera audit.
- Exista fallback de cautare manuala dupa cod lucrare.
- Regenerarea QR invalideaza identificatorul anterior.

## 23. Audit Model

AuditLog este imuabil si include:

- actorUserId
- action
- resourceType
- resourceId
- beforeValue
- afterValue
- metadata
- ip/userAgent cand este legal si util
- createdAt

Evenimente auditate:

- login/logout
- creare/editare/dezactivare user
- schimbare rol/permisiune
- creare/editare lucrare
- schimbare status
- atasare/stergere fisier
- finalizare etapa
- QC approve/reject
- predari curier
- incasari
- facturi
- resetari si configurari critice

## 24. File Storage Model

- In development: storage local abstractizat.
- In productie: S3-compatible private bucket.
- Fisierele nu sunt publice direct.
- Backend-ul emite URL temporar sau stream autorizat.
- Metadata in baza de date.
- Tipuri: photo, document, stl, invoice_pdf, signature, other.
- Validare MIME, extensie, marime.
- Scan antivirus poate fi Post-MVP daca nu blocheaza livrarea initiala.

## 25. Notifications

MVP Core:

- notificari in-app.
- badge-uri pentru lucrari noi, etape atribuite, QC, livrari, intarzieri.

MVP Extended:

- email.
- notificari PWA.
- SMS/WhatsApp doar dupa validare operationala.

## 26. Reports and KPIs

MVP Core:

- lucrari active
- lucrari pe status
- lucrari intarziate
- lucrari gata de livrare
- lucrari pe tehnician
- lucrari pe cabinet
- timp mediu per etapa
- QC respins
- rework
- incasari pe perioada
- solduri neincasate

Rapoartele trebuie sa fie clare si rapide, nu decorative.

## 27. Proposed Technical Architecture

Structura recomandata:

```text
apps/
  web/
  api/
packages/
  shared/
  ui/
  config/
docker-compose.yml
README.md
MVP-IMPLEMENTATION-PLAN.md
```

Justificare:

- React + Vite livreaza rapid un SPA performant si responsive.
- NestJS ofera module clare, guards, validation pipes si testabilitate buna.
- Prisma + PostgreSQL acopera integritatea relationala si migratiile.
- Monolitul modular reduce complexitatea operationala.
- Shared package permite tipuri si validari comune.

Ce evitam:

- Microservicii: prea multa complexitate pentru un singur laborator.
- Kubernetes: cost operational inutil pentru MVP.
- Elasticsearch: PostgreSQL cu indexuri si search simplu este suficient initial.
- RabbitMQ: evenimentele pot fi persistate in DB; queue se adauga doar cand apare nevoie reala.

## 28. Database Entities

Entitati initiale:

- users
- roles
- permissions
- user_roles
- role_permissions
- user_permission_overrides
- laboratories
- clinics
- doctors
- patient_references
- work_types
- work_orders
- work_order_items
- workflow_templates
- workflow_template_versions
- workflow_stage_templates
- work_order_workflow_snapshots
- work_order_stages
- stage_checklist_items
- quality_checks
- delivery_routes
- delivery_stops
- file_assets
- comments
- price_catalog_items
- payments
- invoices
- invoice_lines
- notifications
- audit_logs
- business_events

Constrangeri importante:

- unique invoice series + number.
- unique work order number.
- unique QR opaque id activ.
- foreign keys pentru relatii critice.
- optimistic locking pe work_orders si work_order_stages.
- soft disable pentru users; audit pentru resurse critice.

## 29. API Modules

- AuthModule
- UsersModule
- RbacModule
- SettingsModule
- ClinicsModule
- DoctorsModule
- WorkOrdersModule
- WorkTypesModule
- WorkflowTemplatesModule
- WorkflowExecutionModule
- ReceptionModule
- LogisticsModule
- TechnicianModule
- QualityModule
- DeliveriesModule
- FilesModule
- CommentsModule
- QrModule
- PricingModule
- PaymentsModule
- InvoicesModule
- ReportsModule
- NotificationsModule
- AuditModule

Fiecare modul expune endpoint-uri REST validate cu DTO + Zod/class-validator si protejate prin guards de autentificare/autorizare.

## 30. Frontend Routes

- /login
- /app
- /app/dashboard
- /app/works
- /app/works/new
- /app/works/:id
- /app/reception
- /app/logistics
- /app/technician
- /app/courier
- /app/qc
- /app/clinics
- /app/doctors
- /app/users
- /app/roles
- /app/pricing
- /app/payments
- /app/invoices
- /app/reports
- /app/settings
- /app/audit

Rutele sunt filtrate dupa permisiuni, dar accesul real este refuzat de backend.

## 31. Role-specific Interfaces

### Shared UI Requirements

- Mobile-first, full responsive pe telefon, tableta si desktop.
- Layout clar, fara formulare gigantice.
- Actiuni principale limitate per ecran.
- Statusuri cu culori consistente.
- Empty/loading/error states obligatorii.
- Filtre persistente.
- Cautare dupa numar lucrare, medic, pacient, cabinet, QR.
- Confirmari pentru actiuni sensibile.
- Text clar pentru utilizatori non-tehnici.
- Performanta: code splitting pe rute, request caching, paginare, virtualizare doar unde este justificat.

### Component Library Required

Componente separate in `packages/ui`:

- Button
- IconButton
- Accordion
- Select
- RadioGroup
- Checkbox
- Switch
- Textarea
- TextInput
- NumberInput
- DateInput
- FileUpload
- Card
- StatusBadge
- PriorityBadge
- Modal
- Drawer
- Tabs
- Toast
- Tooltip
- DataTable
- FilterBar
- SearchInput
- Timeline
- Stepper
- QRScanner
- SignaturePad
- EmptyState
- LoadingState
- ErrorState

Fiecare componenta are variante, stari disabled/loading/error/focus si teste de baza.

## 32. Security Requirements

- Argon2id pentru parole.
- Cookie httpOnly secure.
- CSRF protection.
- Rate limiting.
- Validare input backend.
- Sanitizare output unde este cazul.
- RBAC + scope pe fiecare endpoint.
- Fisiere private.
- Audit pentru actiuni critice.
- Fara secrete in repository.
- Environment validation.
- Headers securitate.
- CORS strict.
- Control concurenta pe etape si facturi.

## 33. Validation Rules

- Lucrare: cabinet, medic, tip lucrare, termen promis si identificator pacient sunt minime pentru REGISTERED.
- Planificare: flux tehnologic si termen intern obligatorii.
- Etapa: checklist si campuri obligatorii inainte de complete.
- QC reject: motiv obligatoriu.
- Predare curier: scan QR si curier obligatorii.
- Livrare: confirmare si cel putin metoda de confirmare.
- Plata: suma pozitiva, metoda, data.
- Factura: client, furnizor, linii, serie, numar, data emitere.

## 34. Error Handling

- API returneaza erori standardizate.
- Frontend afiseaza mesaje clare, fara detalii tehnice sensibile.
- 401 pentru neautentificat.
- 403 pentru neautorizat.
- 409 pentru conflict concurenta.
- 422 pentru validare business.
- Erorile critice sunt logate structurat.

## 35. Observability

- Logging structurat JSON in API.
- Request id.
- Health endpoint.
- Audit separat de loguri tehnice.
- Metrics simple Post-MVP daca nu sunt necesare initial.
- Error boundary in frontend.

## 36. Backup and Recovery

- Backup PostgreSQL zilnic in productie.
- Backup fisiere private.
- Procedura de restore testata.
- Export audit in format controlat Post-MVP.
- Seed separat de date reale.

## 37. Testing Strategy

- Unit tests pentru servicii, validari, politici RBAC.
- Integration tests pentru module API.
- API tests pentru permisiuni directe.
- Playwright pentru fluxuri end-to-end.
- Component tests pentru UI critical.
- Teste de concurenta pentru etape si facturi.

## 38. Manual Test Strategy

Matrice manuala:

| Scenario | Manager | Logistica | Receptie | Tehnician | Curier | Medic |
|---|---:|---:|---:|---:|---:|---:|
| creeaza user | da | nu | nu | nu | nu | nu |
| vede preturi | da | nu | nu | nu | nu | optional |
| creeaza lucrare | da | optional | da | nu | nu | optional |
| vede lucrare nealocata | da | da | da | nu | nu | nu |
| finalizeaza etapa | da | optional | nu | da | nu | nu |
| livreaza lucrare | da | optional | optional | nu | da | confirmare |
| genereaza factura | da | nu | nu | nu | nu | nu |
| citeste audit | da | optional | nu | nu | nu | nu |

Teste obligatorii:

- Receptia nu poate accesa preturile nici prin API.
- Tehnicianul nu poate vedea lucrari nealocate.
- Curierul nu poate accesa date financiare.
- Medicul nu poate vedea lucrarile altui cabinet.
- Logistica nu poate genera facturi.
- Doar managerul poate crea utilizatori.
- User dezactivat pierde acces imediat.
- Modificarea rolului produce efect imediat.
- QR-ul nu permite acces fara autentificare.
- Factura emisa nu poate fi suprascrisa.
- Numar factura nu se poate duplica.
- Doua persoane nu finalizeaza aceeasi etapa simultan fara conflict controlat.

## 39. Seed Strategy

Seed development:

- manager
- user logistica
- user receptie
- doi tehnicieni
- curier
- doi medici
- doua cabinete
- tipuri de lucrari
- trei workflow templates
- lucrari in statusuri diferite
- atasamente mock
- incasari demo
- factura demo
- date pentru dashboard

Parolele seed sunt generate local sau documentate ca valori de development, niciodata parole reale.

## 40. Migration Strategy

- Prisma migrations versionate.
- Seed separat de migrations.
- Fiecare task care modifica schema include migration si test.
- Backfill explicit pentru date existente dupa ce apar date reale.

## 41. Deployment Strategy

MVP:

- Docker Compose pentru API, web, PostgreSQL.
- Build web static servit prin reverse proxy sau server dedicat.
- API NestJS containerizat.
- Storage local doar development; productie S3-compatible.
- CI ruleaza lint, typecheck, test, build.
- Environments: local, staging, production.

Decizie concreta FOUNDATION-002:

- Docker Compose porneste PostgreSQL local pentru development.
- Portul implicit de host pentru PostgreSQL este `55439`, mapat catre `5432` in container, pentru a reduce conflictele cu instalari locale existente.
- API-ul incarca `.env` din directorul API sau din radacina monorepo-ului.
- API-ul valideaza env-ul cu Zod inainte de startup.
- `GET /health` include statusul conectivitatii PostgreSQL.

## 42. Definition of Done

Un task este Done cand:

- codul este implementat conform planului.
- schema/migratiile sunt actualizate daca e cazul.
- testele automate relevante trec.
- flow-ul manual critic este verificat.
- permisiunile backend sunt testate.
- UI este responsive mobile/tablet/desktop unde exista ecran.
- documentatia si acest plan sunt actualizate.
- nu exista secrete in repository.

## 43. MVP Milestones

1. Foundation: repo, monorepo, tooling, UI base, Docker.
2. Auth + RBAC: login, sesiuni, users, roles, permissions.
3. Core Data: clinics, doctors, work types, settings.
4. Work Orders + QR + Files: inregistrare si atasamente.
5. Workflow Execution: template-uri, snapshot, etape.
6. Reception + Logistics + Technician: flux operational intern.
7. QC + Delivery + Courier: aprobare si livrare.
8. Payments + Invoices: incasari, sold, factura PDF.
9. Reports + Audit: rapoarte MVP si audit complet.
10. Hardening: E2E, security tests, responsive QA, deployment.

## 44. Detailed Task Breakdown

### FOUNDATION-001 - Initialize monorepo

- Scop: creare structura apps/packages.
- Motiv: baza comuna pentru web, api si shared.
- Module: root, apps/web, apps/api, packages/shared, packages/ui.
- Dependinte: none.
- Pasi: init package manager, tsconfig base, lint, format, scripts.
- Acceptare: `pnpm install`, lint/typecheck script disponibile.
- Teste automate: typecheck minimal.
- Teste manuale: structura clara in repo.
- Riscuri: tooling prea complex.
- Nu modifica: business logic.
- DoD: repo porneste local.
- Estimare: S.

### FOUNDATION-002 - Docker Compose development

- Scop: PostgreSQL si servicii locale.
- Motiv: development reproducibil.
- Module: docker-compose.yml, env examples.
- Dependinte: FOUNDATION-001.
- Pasi: postgres service, env validation, docs.
- Acceptare: DB porneste local.
- Teste: connect health.
- Manual: `docker compose up`.
- Riscuri: porturi ocupate.
- Nu modifica: schema business.
- DoD: API poate conecta DB.
- Estimare: S.

### UI-001 - Design tokens and base styles

- Scop: stiluri consistente, mobile-first.
- Motiv: UX clar pentru utilizatori non-tehnici.
- Module: packages/ui, apps/web styles.
- Dependinte: FOUNDATION-001.
- Pasi: tokens spacing/color/type/radius, focus states, responsive breakpoints.
- Acceptare: tokens folositi de componente.
- Teste: visual smoke.
- Manual: inspectie mobile/tablet/desktop.
- Riscuri: paleta inconsistente.
- Nu modifica: business pages.
- DoD: baza UI documentata.
- Estimare: M.

Decizie concreta UI-001:

- Token-urile de design sunt definite ca CSS custom properties in `packages/ui/src/styles.css`.
- Nu se introduce Tailwind, Storybook sau alt framework CSS in UI-001.
- Preview-ul intern de stiluri este disponibil la `/` si `/style-preview`.
- Base styles includ document defaults, tipografie, focus-visible, native controls, stari disabled/invalid, layout utilities minimale si reduced motion.
- Linting nu este configurat in scripturile proiectului; comanda `pnpm lint` nu reprezinta inca o verificare valida a repository-ului.

### UI-002 - Core UI components

- Scop: componente separate Button, Accordion, Select, RadioGroup, Textarea, Card etc.
- Motiv: consistenta si viteza de dezvoltare.
- Module: packages/ui.
- Dependinte: UI-001.
- Pasi: implementare componente, variante, disabled/loading/error/focus.
- Acceptare: componente exportate si folosite intr-o pagina demo interna.
- Teste: component/unit.
- Manual: verificare touch targets si responsive.
- Riscuri: supraincarcare design system.
- Nu modifica: business logic.
- DoD: componente de baza reutilizabile.
- Estimare: L.

Decizie concreta UI-002:

- Componentele UI generice sunt implementate in `packages/ui/src/components`.
- Exporturile publice sunt centralizate in `packages/ui/src/index.ts`.
- `/style-preview` demonstreaza componentele UI-002 fara date reale sau request-uri API.
- `DataTable` foloseste tabel semantic cu horizontal scroll controlat pe mobil pentru MVP.
- `FileUpload` gestioneaza selectia locala de fisiere, fara upload/API/storage.
- `QRScanner` si `SignaturePad` nu sunt incluse in UI-002 deoarece depind de task-uri functionale cu browser/device capabilities.
- Nu s-au adaugat dependinte noi sau framework UI.

### UX-HARDENING-001 - Romanian UX, modal, sidebar, toast, QR and export hardening

- Scop: intarirea experientei existente fara taskuri functionale noi.
- Motiv: aplicatia trebuie sa fie coerenta pentru utilizatori non-tehnici, mobile-first si pregatita pentru demo/client.
- Module: `packages/ui`, shell frontend, auth/login, settings, works/QR/scan, billing exports, pagini operationale existente, documentatie.
- Dependinte: UI-002, AUTH-001, RBAC-001, SHELL-001, QR-001, BILLING-002, WORKFORMS-001.
- Scope: toast lifecycle, modal/drawer responsive si focus behavior, sidebar stabil, localizare romana cu diacritice, setari RO-only pentru laborator, QR UI hardening, CSV export hardening, texte si densitate UI.
- Non-goals: workflow execution, fisiere, dashboard operational, calcule noi de billing, reguli fiscale noi, permisiuni noi, WORKFORMS-002.
- Acceptance criteria:
  - Notificarile au durata finita, curatare manuala, limita de vizibilitate si se sterg la schimbari de auth.
  - Modalurile/drawerele au header/body/footer stabile, body scrollabil, focus return, Escape si comportament mobil `100dvh`.
  - Sidebarul desktop ramane pe viewport, navigatia si continutul principal scrolleaza independent.
  - Textele vizibile principale sunt in romana cu diacritice si nu afiseaza enumuri brute unde exista etichete user-facing.
  - Setarile laboratorului permit doar `RO`, `ro-RO`, `Europe/Bucharest`, `RON`.
  - QR-ul nu afiseaza tokenul brut, camera are placeholder inainte de pornire, iar modalul QR are loading/error/retry.
  - CSV-urile folosesc UTF-8 BOM, CRLF, separator `;`, quoting, neutralizare formule, date romanesti si coloana moneda.
- Backend: limitat la validare setari RO-only si CSV headers/content-type/filename.
- Frontend: componente UI reutilizabile, shell, pagini existente, QR/scan si exporturi client.
- Securitate: nu expune ID-uri interne in QR label; curata toasts pe auth lifecycle; nu slabeste RBAC.
- Audit: nu introduce evenimente noi inutile; pastreaza audit QR existent.
- Testare: `pnpm typecheck`, `pnpm test`, `pnpm build`, plus smoke manual pe shell, QR, CSV si pagini cheie.
- Status: COMPLETED.

### AUTH-001 - Auth backend

- Scop: login/logout securizat.
- Motiv: acces controlat.
- Module: AuthModule, User entity.
- Dependinte: FOUNDATION-002.
- Pasi: Argon2id, sesiuni cookie, rate limit, audit login.
- Acceptare: login/logout functional, user dezactivat blocat.
- Teste: unit + integration.
- Manual: login invalid/generic.
- Riscuri: configurare cookie in dev.
- Nu modifica: RBAC complex.
- DoD: auth securizat MVP.
- Estimare: L.

Decizie concreta AUTH-001:

- Autentificarea backend este implementata in `apps/api/src/modules/auth`.
- Persistenta minima foloseste Prisma + PostgreSQL cu modelele `User`, `Session` si `AuditLog`.
- Prisma este configurat prin `apps/api/prisma.config.ts`; schema este in `apps/api/prisma/schema.prisma`; migrarile sunt in `apps/api/prisma/migrations`.
- `GET /auth/csrf`, `POST /auth/login`, `GET /auth/me` si `POST /auth/logout` sunt endpoint-urile AUTH-001.
- Sesiunile sunt server-side; cookie-ul contine doar tokenul random, iar baza de date pastreaza hash SHA-256 pentru token.
- Parolele sunt verificate cu Argon2id prin `@node-rs/argon2`, cu parametri expliciti.
- CSRF foloseste double-submit cookie pentru request-urile state-changing existente care se bazeaza pe cookie, inclusiv logout.
- Rate limiter-ul pentru login este in-memory si documentat ca limita MVP.
- Seed-ul development creeaza doar managerul local din variabilele `AUTH_SEED_*`.
- Nu s-au implementat RBAC, roluri, public signup, resetare parola, frontend login final sau entitati business.

### RBAC-001 - Permission model

- Scop: roluri, permisiuni, scope, override-uri.
- Motiv: nu autorizam cu `role === MANAGER`.
- Module: RbacModule, guards.
- Dependinte: AUTH-001.
- Pasi: schema, seed permissions, guard, decorator permission.
- Acceptare: endpoint protejat refuza 403 corect.
- Teste: permission matrix API.
- Manual: verificare user cu/ fara permisiune.
- Riscuri: model prea complicat.
- Nu modifica: business workflow.
- DoD: autorizare centralizata.
- Estimare: L.

Decizie concreta RBAC-001:

- Modelele `Role`, `Permission`, `UserRole`, `RolePermission` si `UserPermissionOverride` sunt adaugate in Prisma.
- Scope-urile implementate sunt `ALL`, `ASSIGNED`, `OWN_CLINIC`, `OWN_DELIVERY` si `OWN_STAGE`.
- Registry-ul tipat al permisiunilor MVP este in `apps/api/src/modules/rbac/permission-registry.ts`.
- Seed-ul creeaza cele 62 permisiuni MVP, cele sase roluri sistem si maparea `A` din matrice.
- Valorile `O` din matrice nu sunt acordate implicit si raman posibile prin override `ALLOW`.
- `DENY` override are prioritate peste roluri si peste override `ALLOW`.
- Autorizarea este centralizata in `AuthorizationService`; endpoint-urile folosesc `@RequirePermission` si `PermissionsGuard`.
- Permisiunile nu sunt copiate in sesiune sau cookie; evaluarea citeste DB-ul si schimbarile au efect fara relogare.
- Endpointurile tehnice adaugate sunt `GET /auth/permissions`, `GET /rbac/roles` si `GET /rbac/permissions`.
- Nu s-au implementat CRUD useri, editor roluri, editor permisiuni, UI RBAC sau module business.

### USERS-001 - User management

- Scop: manager creeaza/editeaza/dezactiveaza useri.
- Motiv: fara signup public.
- Module: UsersModule, web users routes.
- Dependinte: RBAC-001, UI-002.
- Pasi: CRUD controlat, assign roles, reset access.
- Acceptare: doar manager creeaza user.
- Teste: API + E2E.
- Manual: user dezactivat pierde acces.
- Riscuri: expunere date inutile.
- Nu modifica: finance.
- DoD: user management complet MVP.
- Estimare: L.

Decizie concreta USERS-001:

- Backend-ul de user management este implementat in `apps/api/src/modules/users`.
- `User` are campul `mustChangePassword`, folosit pentru parole temporare generate de manager si resetari de parola.
- Migrarea determinista este `apps/api/prisma/migrations/20260722211000_user_management_fields/migration.sql`.
- Endpointurile implementate sunt `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/disable`, `POST /users/:id/enable`, `PUT /users/:id/roles` si `POST /users/:id/reset-password`.
- Endpointurile USERS folosesc `AuthGuard`, `PermissionsGuard`, `@RequirePermission(...)` si `CsrfGuard` pentru mutatii cookie-auth.
- Rolurile sunt asignate prin `roleKeys`; doar rolurile active sunt acceptate.
- Resetarea parolei nu trimite email, nu returneaza parola si nu logheaza parola; seteaza `mustChangePassword=true`, actualizeaza `passwordChangedAt` si revoca sesiunile.
- Dezactivarea este soft-disable, revoca sesiunile si pastreaza auditul, rolurile si override-urile.
- Protectia ultimului administrator foloseste permisiunile efective `users.create`, `users.update`, `users.disable` si `users.assign_roles` cu scope `ALL`, nu cheia rolului `MANAGER`.
- UI-ul este implementat la `/users` in `apps/web/src/features/users`, folosind componentele `@dental-lab/ui`.
- Nu s-au implementat signup public, invite links, email reset, MFA, SSO, custom role CRUD, role editor complet, permission editor complet sau module business.
- Risc ramas: protectia ultimului administrator este verificata la nivel de service pe baza permisiunilor efective curente; fara lock dedicat pe un agregat administrativ, doua modificari concurente rare pot necesita intarire intr-un task de hardening.

### SETTINGS-001 - Laboratory settings

- Scop: date laborator si setari fiscale initiale.
- Motiv: facturi si branding PDF.
- Module: SettingsModule.
- Dependinte: RBAC-001.
- Pasi: model Laboratory, update guarded, audit.
- Acceptare: manager poate salva antet factura.
- Teste: API.
- Manual: validare campuri obligatorii.
- Riscuri: reguli fiscale nevalidate.
- Nu modifica: invoice generation.
- DoD: setari persistente.
- Estimare: M.

Decizie concreta SETTINGS-001:

- Setarile globale sunt implementate prin modelul Prisma `LaboratorySettings`.
- Singleton-ul foloseste cheia unica `key = "default"`; API-ul expune doar `GET /settings` si `PATCH /settings`.
- Valorile default seeduite idempotent sunt `Europe/Bucharest`, `ro-RO`, `RON`, `RO`, `#0f766e` si `Dental Lab Management`.
- Endpointul `GET /settings` foloseste `settings.read`; `PATCH /settings` foloseste `settings.update` si `CsrfGuard`.
- Validarile sunt stricte pentru nume laborator, email, telefon, website `http/https`, tara ISO alpha-2, locale allowlist, currency allowlist, timezone allowlist si culoare hex.
- Frontend-ul `/settings` este implementat cu formular mobile-first, stare loading/error, mod read-only fara `settings.update`, reset/revert si toast la salvare.
- Contractele stabile si utilitarele de formatare sunt in `packages/shared/src/settings.ts`; backend-ul pastreaza constante locale pentru a respecta configuratia curenta `rootDir`.
- Branding-ul implementat include `primaryColor` si `documentFooter`.
- Upload-ul de logo nu este implementat in SETTINGS-001 deoarece `FILES-001`/private storage nu exista inca; `logoFileKey` ramane nullable.
- Auditul `settings.updated` salveaza doar campurile modificate si valori nesensibile.
- Nu s-au implementat multi-tenant, lucrari, facturare, serii de facturi, email/SMS sau generic key-value settings.

### CLINICS-001 - Clinics and doctors

- Scop: cabinete si medici.
- Motiv: lucrarile depind de client.
- Module: ClinicsModule, DoctorsModule.
- Dependinte: RBAC-001, UI-002.
- Pasi: CRUD, cautare, activ/dezactivat.
- Acceptare: receptia poate selecta medic/cabinet.
- Teste: API.
- Manual: cautare rapida.
- Riscuri: duplicare cabinete.
- Nu modifica: portal medic.
- DoD: date client stabile.
- Estimare: M.

### WORKTYPES-001 - Work types and pricing base

- Scop: tipuri de lucrari si baza de pret.
- Motiv: planificare si facturare.
- Module: WorkTypesModule, PricingModule minimal.
- Dependinte: RBAC-001.
- Pasi: CRUD work type, price catalog read/update manager.
- Acceptare: non-finance nu vede pret.
- Teste: permission API.
- Manual: logistica fara preturi.
- Riscuri: model pret prea rigid.
- Nu modifica: invoices.
- DoD: catalog initial.
- Estimare: M.
- Implementare: `WorkTypesModule` expune catalogul de baza sub `/work-types`; pretul standard este `basePriceMinor` integer si moneda vine din `LaboratorySettings.currency`.
- Non-goals implementate explicit: fara categorii, fara price lists per clinica, fara discount, fara TVA, fara work orders si fara istoric comercial complet in WORKTYPES-001.

### WORKS-001 - Work order creation

- Scop: inregistrare lucrare.
- Motiv: entitatea centrala.
- Module: WorkOrdersModule, Reception UI.
- Dependinte: CLINICS-001, WORKTYPES-001, UI-002.
- Pasi: schema, create form, validation, work number.
- Acceptare: receptia creeaza lucrare REGISTERED.
- Teste: API + form.
- Manual: mobile si desktop form.
- Riscuri: formular prea mare.
- Nu modifica: workflow execution.
- DoD: lucrare persistenta si auditata.
- Estimare: L.
- Implementare: `WorksModule` expune registrul sub `/works`; lucrarea este creata direct cu status `REGISTERED`, cod `WO-YYYY-NNNNNN`, snapshot de pret si audit.
- Non-goals implementate explicit: fara workflow execution, fara QR/barcode, fara fisiere, fara asignari, fara arhivare lucrare si fara model dedicat de pacient in WORKS-001.
- Securitate pricing: receptia foloseste `/works/work-type-options`, care nu returneaza preturi; campurile de pret din `/works` sunt vizibile doar cu `pricing.read`.

### QR-001 - QR generation and scan

- Scop: QR opac pentru lucrare.
- Motiv: trasabilitate fizica.
- Module: QrModule, QRScanner UI.
- Dependinte: WORKS-001.
- Pasi: generate opaque id, label endpoint, scan resolve authorized.
- Acceptare: QR fara auth nu da date.
- Teste: API unauthorized/authorized.
- Manual: scan browser mobil.
- Riscuri: camera permissions.
- Nu modifica: delivery.
- DoD: QR functional si securizat.
- Estimare: M.
- Implementare: `QrModule` expune metadata, PNG privat, resolve autorizat si audit print sub `/works`; payloadul este `dl-work:<opaque-token>` si nu include cod lucrare, date pacient, preturi sau ID-uri interne.
- UI: `/works` afiseaza modal de eticheta printabila din drawerul lucrarii; `/scan` este ruta lazy-loaded cu `BarcodeDetector` pornit doar la actiunea utilizatorului si fallback manual.
- Non-goals implementate explicit: fara workflow/stage changes, fara asignari, fara QC, fara delivery, fara fisiere, fara notificari si fara portal public/anonim.

### SHELL-001 - Authenticated application shell and navigation

- Status: COMPLETED.
- Obiectiv: experienta unitara pentru utilizatorii autentificati, cu layout, navigare si protectie vizibila a rutelor.
- Scope: app shell responsive, top bar/mobile nav, desktop sidebar, linkuri catre paginile existente, user menu, logout, stari loading/unauthorized si redirect login.
- Non-goals: dashboard operational, redesign pagini existente, permisiuni noi, business logic nou.
- Dependente: AUTH-001, RBAC-001, UI-002, QR-001.
- Acceptance criteria: utilizatorul autentificat navigheaza intre `/works`, `/scan`, `/clinics`, `/work-types`, `/users`, `/settings`; utilizatorul neautentificat este trimis la `/login`; linkurile nepermise nu sunt promovate in navigatie.
- Backend: fara endpointuri noi estimate; reutilizeaza `/auth/me`, `/auth/permissions`, `/auth/logout`.
- Frontend: layout shell, route protection, navigation responsive, logout flow, login polish.
- Securitate: route protection este doar UX; backend RBAC ramane sursa de adevar.
- Audit: fara audit nou; logout ramane comportamentul AUTH-001.
- Testare: component/route tests pentru auth loading, unauthorized redirect, permission-aware nav si logout.
- Implementare: shell autentificat pe `/` cu dashboard, sidebar desktop, topbar/drawer mobil, route registry permission-aware, redirect login cu `returnTo` sigur, 403/404, logout CSRF si handler central pentru 401.
- Login: formular final fara credentiale precompletate, clear parola la login esuat, focus pe parola si redirect catre prima ruta permisa dupa autentificare.
- API client frontend: `apps/web/src/lib/api-client.ts` centralizeaza `VITE_API_BASE_URL`, cookie credentials, parse erori si notificarea globala pentru sesiuni expirate.
- Non-goals pastrate: fara endpointuri backend noi, fara dashboard operational, fara permisiuni noi, fara business logic nou.

### DASHBOARD-001 - Operational dashboard

- Status: SUPERSEDED BY DASHBOARD-002.
- Obiectiv: ecran initial cu indicatori operationali pentru utilizatori autentificati.
- Scope: sumar lucrari, urgente, termene apropiate, linkuri rapide si stari goale.
- Non-goals: rapoarte financiare, grafice complexe, exporturi, notificari realtime.
- Dependente: SHELL-001, WORKS-001, RBAC-001.
- Acceptance criteria: dashboardul afiseaza doar date permise si ramane utilizabil pe mobile.
- Backend: endpoint sumar dashboard sau compunere din endpointuri existente, fara date financiare fara `pricing.read`.
- Frontend: ruta dashboard in shell, carduri responsive, loading/error states.
- Securitate: respecta RBAC server-side si mascare pricing.
- Audit: fara audit nou pentru citire.
- Testare: API/unit unde exista agregari, frontend permission states si responsive smoke.

### FORMS-001 - Form patterns and validation UX

- Status: COMPLETED.
- Obiectiv: standardizare formulare pentru utilizatori atehnici.
- Scope: patternuri pentru erori, required markers, field groups, submit states, reset/cancel si validare Zod/RHF coerenta.
- Non-goals: schimbarea regulilor business, wizard complex, autosave, template builder dinamic, snapshot valori formular pe lucrare.
- Dependente: UI-002, SHELL-001.
- Acceptance criteria: formularele principale au erori clare, stari de saving consistente si layout mobile-first.
- Backend: fara endpointuri noi.
- Frontend: helperi/componente compuse peste UI primitives si aplicare pe formularele existente prioritare.
- Securitate: nu inlocuieste validarea server-side.
- Audit: fara audit nou.
- Testare: component tests pentru erori, disabled states si submit.
- Implementare: adaugate `FormLayout`, `FormSection`, `FormGrid`, `FormGridFull`, `FormErrorSummary`, `FormActions`, `ConfirmActionModal`, normalizare frontend pentru erori API, focus pe error summary/primul camp invalid, dirty guards pentru refresh/navigare/close si patternuri aplicate pe login, users, settings, clinics/doctors, work types, works si manual scan.

### WORKFORMS-001 - Work form template builder

- Status: COMPLETED.
- Obiectiv: configurarea formularelor dinamice per tip de lucrare fara salvarea valorilor pe WorkOrder.
- Scope: template activ per WorkType, field definitions, field types MVP, versiuni, preview, activare si arhivare.
- Non-goals: upload fisiere, scripting, HTML custom, conditional rules engine complex, autosave, completare/snapshot valori pe lucrare.
- Dependente: FORMS-001, WORKTYPES-001, RBAC-001.
- Acceptance criteria: managerii pot defini si publica un template versionat pentru un tip de lucrare, iar utilizatorii fara permisiuni de modificare il vad read-only.
- Backend: modele si endpointuri pentru template-uri si field definitions, validate server-side, fara modificare retroactiva a versiunilor publicate.
- Frontend: ruta de administrare template pentru WorkType, lista campuri, add/edit, ordonare simpla, preview si stari de activare/arhivare.
- Securitate: RBAC server-side pentru citire/modificare/arhivare, validare stricta a optiunilor JSON si a tipurilor de camp.
- Audit: audit pentru create/update/activate/archive template.
- Testare: unit si integration pentru servicii/controllere, teste frontend pentru builder, preview, read-only si validare.
- Implementare: adaugate modelele `WorkFormTemplate` si `WorkFormFieldDefinition`, migrarea `20260724204700_work_form_template_builder`, partial unique index pentru un singur template activ per WorkType, endpointuri REST cu RBAC/CSRF, validare server-side stricta pentru field keys/options/default values/validation, shared contracts si helperi puri, ruta `/work-types/:workTypeId/form`, link “Configureaza formularul” in catalog, builder mobile-first cu versiuni, editor, optiuni, ordonare, preview si read-only mode.
- Decizie: arhivarea manuala permite doar drafturi; template-ul activ anterior este arhivat automat doar in tranzactia de activare a unei versiuni noi.

### WORKFORMS-002 - Work form completion and immutable snapshot

- Status: COMPLETED.
- Obiectiv: completarea formularelor dinamice pe lucrare si salvarea unui snapshot imutabil al template-ului folosit.
- Scope: completare valori pentru WorkOrder pe baza template-ului activ, validare, snapshot versiune/campuri/raspunsuri si afisare read-only in detalii.
- Non-goals: editare template, fisiere, workflow execution, conditional rules engine complex.
- Dependente: WORKFORMS-001, WORKS-001, RBAC-001.
- Acceptance criteria: o lucrare noua poate salva raspunsurile cerute de template, iar lucrarile existente pastreaza snapshotul chiar daca template-ul se modifica ulterior.
- Backend: modele/contract pentru raspunsuri si snapshot, validare server-side impotriva snapshotului, tranzactii unde este necesar.
- Frontend: completare in create/edit Work, erori pe campuri dinamice, summary, read-only snapshot in detalii.
- Securitate: RBAC pentru citire/modificare lucrari, fara expunere date peste permisiuni.
- Audit: audit pentru create/update raspunsuri formular pe lucrare.
- Testare: unit/integration pentru snapshot si validare, frontend pentru completare, erori si compatibilitate cu FORMS-001 patterns.
- Implementare: adaugat `WorkFormSubmission` 1:1 optional pe `WorkOrder`, migrarea `20260726004000_work_form_submission_snapshot`, validare backend dedicata, snapshot schema construit server-side, create atomic WorkOrder + submission, update values contra snapshot, inlocuire/eliminare submission la schimbare WorkType confirmata, UI dinamic in `/works`, read-only snapshot in drawer, demo seed cu template-uri si submission-uri, plus demo login sigur prin `/auth/demo-login`.

### BILLING-001 - Billing workspace, proformas, invoices and month-end registry

- Status: COMPLETED.
- Obiectiv: workspace financiar central pentru inchiderea lunii si eliminarea cautarii manuale intre fise, lucrari, proforme, facturi, chitante si Excel.
- Scope: registru financiar, lucrari facturabile, proforme, facturi interne, linii document snapshot, serii/numere, plati, solduri, filtre, grupari, cautare, export CSV, print preview HTML si audit.
- Non-goals: RO e-Factura, SPV, contabilitate generala, TVA complex, note de credit/stornari fiscale complexe, PDF legal final, email/SMS, bank reconciliation, multi-currency conversion, workflow sau formulare dinamice.
- Dependente: WORKS-001, SETTINGS-001, RBAC-001, SHELL-001, FORMS-001.
- Acceptance criteria: managerul poate selecta lucrari compatibile, crea/emite proforme, transforma proforma in factura, crea factura directa, inregistra plati partiale/finale, vedea solduri si cauta dupa lucrare/document/chitanta.
- Backend: `BillingModule` cu `BillingDocument`, `BillingDocumentLine`, `Payment`, `BillingSeries`, endpointuri `/billing`, `/billing-documents`, `/payments`, `/billing-series`, tranzactii pentru issue/convert/payment si numerotare prin increment atomic pe serie.
- Frontend: ruta lazy `/billing`, navigare Facturare, carduri lunare, lucrari nefacturate, documente, incasari, inchidere luna, serii, CSV si print preview.
- Securitate: RBAC server-side cu `finance.*` si `invoice.*`, CSRF pe mutatii, fara role checks, fara pacient in audit, valori mascate in billable works fara drept financiar/pricing.
- Audit: `billing.proforma_created`, `billing.proforma_issued`, `billing.invoice_created`, `billing.invoice_issued`, `billing.proforma_converted`, `billing.document_cancelled`, `billing.payment_recorded`, `billing.payment_cancelled`, `billing.series_created`, `billing.series_updated`.
- Testare: Prisma validate/generate/migrate/seed, typecheck, teste API/frontend, build si smoke runtime cu proforma, factura si plati.

### BILLING-002 - Printable billing documents and clinic statements

- Status: COMPLETED.
- Obiectiv: documente printabile/PDF si situatii pe clinica bazate pe datele BILLING-001.
- Scope: proforma printabila, factura interna printabila, anexa factura, situatie clinica, situatie medic, registru lunar, CSV securizat, browser print/PDF, branding, filtre financiare si evidenta manuala completa a incasarilor.
- Non-goals: RO e-Factura, SPV, XML fiscal, contabilitate generala, TVA complex, POS, procesare card, casierie, reconciliere bancara, semnatura electronica avansata.
- Dependente: BILLING-001, SETTINGS-001, FILES-001 optional pentru arhivare PDF privata.
- Acceptance criteria: managerul poate genera documente clare pentru clinica, cu branding laborator si totaluri reconciliabile cu registrul; facturile pot primi incasari manuale partiale/finale, refuza overpayment si expun sold/status derivat.
- Backend: endpointuri print/statements/export in `BillingModule`, migrare nedestructiva pentru `BillingDocumentLine.workCreatedAtSnapshot`, filtre listare documente, CSV securizat.
- Frontend: ruta `/billing/documents/:id/print`, print/PDF/statement UI, preview detaliat, filtre pe status incasare/perioada/medic/pacient/search, deep links catre lucrari/documente.
- Securitate: RBAC `invoice.download`/`invoice.read`/`finance.read_reports`, date pacient doar unde este justificat.
- Audit: audit pentru print/export/statements fara pacient sau linii complete in metadata.
- Testare: Prisma validate/generate/migrate, typecheck, teste API/frontend, build si smoke runtime pe endpointuri print/statements/export.

### DEMO-SEED-001 - Realistic demonstration dataset

- Status: COMPLETED.
- Obiectiv: set realist de date pentru demonstratie comerciala.
- Scope: clinici, medici, tipuri lucrari, lucrari, proforme, facturi si situatii lunare demonstrative.
- Non-goals: date reale client, productie, import Excel.
- Dependente: BILLING-002, WORKS-001, CLINICS-001, WORKTYPES-001.
- Acceptance criteria: demo-ul poate arata fluxuri realiste fara introducere manuala lunga.
- Backend: `prisma:db:seed:demo` si `prisma:db:reset-demo`, idempotente, cu guard production si reset limitat la date demo.
- Frontend: fara schimbari majore, doar suport pentru demo daca e necesar.
- Securitate: fara date personale reale.
- Audit: fara audit pentru seed local.
- Testare: seed de baza, seed demo rulat de doua ori, reset demo, guard production, typecheck, teste, build si smoke API.

### FILES-001 - Private file upload

- Status: DEFERRED.
- Scop: atasamente foto/document/STL.
- Motiv: fisa lucrarii completa.
- Module: FilesModule, FileUpload UI.
- Dependinte: WORKS-001, RBAC-001.
- Pasi: upload, metadata, private download, validations.
- Acceptare: acces fisiere conform permisiuni.
- Teste: API permissions.
- Manual: upload mobil/desktop.
- Riscuri: fisiere mari STL.
- Nu modifica: storage productie final.
- DoD: storage abstractizat.
- Estimare: L.

### FILES-002 - File preview and lifecycle controls

- Status: DEFERRED.
- Obiectiv: previzualizare si control operational pentru fisierele private.
- Scope: listare atasamente, preview pentru tipuri suportate, rename/replace/archive unde este permis.
- Non-goals: editor fisiere, OCR, procesare STL avansata, storage productie final.
- Dependente: FILES-001, SHELL-001.
- Acceptance criteria: fisierele raman private si pot fi inspectate/gestionate conform permisiunilor.
- Backend: endpointuri metadata si lifecycle cu validare DTO si RBAC.
- Frontend: preview drawer/modal, stari de incarcare si erori clare.
- Securitate: download/preview prin endpoint autorizat, fara URL public permanent.
- Audit: audit pentru archive/replace si actiuni critice.
- Testare: API permissions, file metadata lifecycle si UI states.

### LABELS-001 - Printable labels and document templates

- Status: NOT STARTED.
- Obiectiv: etichete si documente printabile consistente pentru lucrari.
- Scope: template eticheta QR, format print, date minime operationale, optiuni de print.
- Non-goals: facturi PDF, rapoarte, editor vizual template.
- Dependente: QR-001, SHELL-001.
- Acceptance criteria: etichetele se printeaza lizibil si nu includ date interzise.
- Backend: endpointuri de date printabile daca este necesar; reutilizeaza QR metadata unde e suficient.
- Frontend: UI print labels si CSS print stabil.
- Securitate: fara date pacient sensibile peste minimul aprobat; fara preturi.
- Audit: audit print unde exista actiuni critice.
- Testare: unit/component pentru render, manual print preview.

### WORKFLOW-001 - Workflow templates

- Status: COMPLETED.
- Obiectiv: configurare fluxuri tehnologice liniare, versionate, per tip de lucrare.
- Scope: template-uri workflow, versiuni, etape ordonate, roluri permise pe etapa, durata estimata, activare/arhivare/clonare si seed demo.
- Non-goals: executie workflow pe lucrare, snapshot pe WorkOrder, asignari, tranzitii, drag-and-drop, ramificari, etape paralele, checklist runtime.
- Dependinte: WORKTYPES-001, RBAC-001, SHELL-001.
- Acceptance criteria: managerul poate configura fluxuri fara sa modifice istoricul lucrarilor; maximum un template ACTIVE per WorkType; drafturile pot fi editate; ACTIVE/ARCHIVED sunt read-only; activarea unei versiuni arhiveaza versiunea activa anterioara.
- Backend: `WorkflowTemplatesModule`, DTO validation, Prisma models `WorkflowTemplate` si `WorkflowStageDefinition`, tranzactii si advisory lock per WorkType pentru versiuni/activare.
- Frontend: ruta `/work-types/:workTypeId/workflow`, builder mobile-first pentru versiuni si etape, link din drawer-ul tipului de lucrare.
- Securitate: RBAC server-side cu `workflow.read`, `workflow.create`, `workflow.update`, `workflow.archive`; actiunile state-changing necesita CSRF.
- Audit: create/update/stages replaced/activate/archive/clone pe `workflow_template`.
- Testare: shared helper tests, backend service/validation tests, frontend builder test, typecheck, test, build si smoke API/UI.

### WORKFLOW-002 - Workflow execution snapshot

- Scop: instantiere flux operational pe lucrare fara dependenta de editari ulterioare ale template-ului.
- Motiv: istoricul si traseul lucrarii trebuie sa ramana neschimbate dupa modificarea template-ului activ.
- Module: WorkflowExecutionModule, WorksModule.
- Dependinte: WORKFLOW-001, WORKS-001.
- Pasi:
  - la creare lucrare, gaseste template-ul ACTIVE pentru WorkType;
  - copiaza template/stage data in `WorkWorkflowExecution` si `WorkStageExecution`;
  - seteaza prima etapa ca etapa curenta;
  - expune `GET /works/:workId/workflow`;
  - expune start/complete pentru etapa curenta cu versiuni asteptate;
  - inregistreaza evenimente si audit.
- Acceptare:
  - snapshot creat pentru lucrari cu template activ;
  - lucrarile fara template activ raman permise si afiseaza empty state;
  - statusul lucrarii ramane general, iar starea de productie ramane in workflow execution;
  - start este permis doar pentru etapa curenta PENDING;
  - complete este permis doar pentru etapa curenta IN_PROGRESS;
  - finalizarea unei etape non-finale avanseaza etapa curenta;
  - finalizarea ultimei etape marcheaza workflow-ul COMPLETED;
  - versiuni stale returneaza conflict;
  - RBAC server-side foloseste `workflow.start_stage` si `workflow.complete_stage`.
- Backend: modele relationale separate pentru execution, stages si events; tranzactii, row lock si optimistic versioning.
- Frontend: sectiune workflow in drawer-ul lucrarii, indicator in registru, timeline si butoane de start/finalizare.
- Securitate: autentificare cookie, CSRF pentru mutatii, RBAC server-side, stage role snapshot si manager override prin scope ALL.
- Audit: `workflow.execution_created`, `workflow.stage_started`, `workflow.stage_completed`, `workflow.execution_completed`.
- Teste: unit, service, component si smoke manual cu API/web.
- Manual: creare/seed demo cu snapshot, start etapa, complete etapa si avansare etapa curenta.
- Riscuri: datele snapshot dubleaza template-ul intentionat; editarea template-ului nu trebuie sa rescrie executiile existente.
- Nu modifica: technician UI, assignments, pause/resume, skip/back/reopen, QC, delivery, logistics, files, notifications, QR repair.
- DoD: execution model stabil.
- Estimare: L.
- Status: COMPLETED.

### SCAN-002 - Scan actions and operational handoffs

- Status: NOT STARTED.
- Obiectiv: folosirea scanarii QR pentru actiuni operationale controlate.
- Scope: resolve scan plus actiuni permise contextual, precum handoff sau deschidere etapa, fara automatism periculos.
- Non-goals: camera library noua daca `BarcodeDetector` este suficient, logistica, delivery, QC, fisiere, notificari, public/anonymous scan.
- Dependente: QR-001, WORKFLOW-002, TECH-001.
- Acceptance criteria: scanarea nu schimba status fara confirmare si permisiune explicita; contextul scanarii afiseaza actiunile permise de server.
- Backend: `POST /scan/resolve`, audit scan, RBAC scan si reutilizare endpointuri workflow/asignare pentru mutatii.
- Frontend: UI scan operational, confirmari clare, fallback manual, camera pornita explicit.
- Securitate: RBAC server-side si token opac; fara acces anonim.
- Audit: audit pentru fiecare actiune declansata din scan.
- Testare: API permissions/state transitions, frontend camera/manual action states.

### LOGISTICS-001 - Laboratory operational center, intake and internal logistics

- Scop: centru operational pentru receptie/logistica, locatie fizica, blocari, ambalare si pregatiri interne pentru livrare.
- Motiv: vizibilitate operationala cap-coada dupa workflow, fara a porni livrarea efectiva.
- Module: LogisticsModule, `/logistics`, scan context, demo seed.
- Dependinte: WORKFLOW-002, TECH-001, SCAN-002, USERS-001, RBAC-001.
- Pasi: stare logistica separata, evenimente append-only, filtre operationale, actiuni explicite, grupuri interne pe clinica.
- Acceptare: logistica afiseaza si modifica stari operationale fara pricing; billing nu blocheaza operational; grupurile nu reprezinta rute/livrari.
- Teste: Prisma validate/generate/migrate, seed demo idempotent, shared/API/web unit tests, typecheck, build, smoke API/UI.
- Manual: `/logistics`, `/scan`, endpointuri center/summary/work/groups.
- Riscuri: delivery real, semnaturi, QC formal, fisiere, notificari si rute curier raman pentru taskuri ulterioare.
- Nu modifica: facturare fiscala, payment processing, courier delivery.
- DoD: lucrarile pot fi urmarite si pregatite intern pana la `READY_FOR_DELIVERY`.
- Estimare: L.
- Status: COMPLETED.

### TECH-001 - Technician workbench

- Scop: asignarea unui tehnician responsabil pe etapa curenta si ecran personal “Lucrările mele”.
- Motiv: productie reala si coada clara pentru tehnicieni.
- Module: TechnicianAssignmentsModule, Workbench UI.
- Dependinte: WORKFLOW-002, USERS-001, RBAC-001.
- Pasi: assign/reassign/unassign etapa curenta, coada personala, workload manager, start/complete din workbench.
- Acceptare: tehnician vede doar etapa curenta asignata lui; manager vede etape curente asignate si neasignate; reasignarea unei etape in lucru cere confirmare si audit.
- Teste: Prisma validate/generate/migrate, unit tests shared/API, typecheck, test, build, seed demo idempotent.
- Manual: `/workbench` pe mobile/tablet/desktop, login manager si tehnician demo, endpointuri workbench/workload/options.
- Riscuri: conflict concurenta tratat cu versiune optimista; warning `pg` la shutdown ramane observabil.
- Nu modifica: SCAN-002, logistica, QC, fisiere, notificari, payroll.
- DoD: etapa curenta este asignabila si executabila conform RBAC si ownership.
- Estimare: L.
- Status: COMPLETED.

### QC-001 - Quality control

- Scop: approve/reject/rework.
- Motiv: calitate si trasabilitate.
- Module: QualityModule.
- Dependinte: TECH-001.
- Pasi: checklist QC, reject reason, rework stage.
- Acceptare: reject cere motiv.
- Teste: state transitions.
- Manual: reject si approve.
- Riscuri: reguli incomplete.
- Nu modifica: delivery.
- DoD: QC controleaza statusul.
- Estimare: M.
- Status: NOT STARTED.

### DELIVERY-001 - Courier planning and delivery execution

- Scop: livrari operationale pornite din grupuri READY, planificate si executate de curier.
- Motiv: predare controlata fara expunere financiara catre curier.
- Module: DeliveryModule, Courier UI, Scan integration.
- Dependinte: LOGISTICS-001, SCAN-002, RBAC-001.
- Pasi: create delivery from READY group, assign courier, pickup, start transit, complete, fail, reschedule, cancel.
- Acceptare: curierul vede doar livrarile proprii, fara pricing; pickup muta lucrarile in `HANDED_TO_DELIVERY`; complete muta lucrarile in `DELIVERED`.
- Teste: typecheck, unit tests, suite completa, migration/seed checks si smoke API/UI.
- Manual: login curier demo, `/deliveries`, scan lucrare in livrare proprie, filtre manager/logistica.
- Riscuri: validare fizica pe telefon si dovada semnatura raman pentru taskurile urmatoare.
- Nu modifica: GPS, harti, optimizare rute, plati, semnaturi, poze dovada.
- DoD: livrare operationala end-to-end fara semnatura.
- Estimare: XL.
- Status: COMPLETED.

### SIGNATURES-001 - Delivery signatures and proof capture

- Status: COMPLETED.
- Obiectiv: dovada interna de predare prin semnatura capturata in browser sau manager override explicit.
- Scope: `DeliveryProof` dedicat, stroke JSON normalizat, hash SHA-256, finalizare livrare cu semnatura obligatorie, override manager auditat, proof read/print si seed demo.
- Non-goals: fotografie, FILES-001, upload generic, verificare identitate avansata, GPS, biometrie/pressure, semnatura electronica avansata/calificata, eIDAS, fiscalizare.
- Dependente: DELIVERY-001.
- Acceptance criteria: dovada este privata, unica per livrare, legata de livrare, imuabila dupa finalizare si vizibila doar autorizat.
- Backend: `DeliveryProofModule`, `GET /deliveries/:id/proof`, `GET /deliveries/:id/proof/print-view`, `POST /deliveries/:id/complete` cu semnatura sau override.
- Frontend: `SignaturePad`, `SignatureDisplay`, modal confirmare predare, modal override manager, pagina `/deliveries/:id/proof/print`.
- Securitate: RBAC server-side, `OWN_DELIVERY`, payload strict, fara base64 PNG/raw SVG/HTML/date biometrice/date financiare in proof.
- Audit: `delivery.signature_captured`, `delivery.completed_without_signature`, `delivery.proof_viewed`, `delivery.proof_printed`.
- Testare: validator semnatura, component tests UI, permission registry, typecheck, test, build si smoke API/UI.

### NOTIFICATIONS-001 - Operational notifications

- Status: DEFERRED.
- Obiectiv: notificari operationale pentru evenimente importante.
- Scope: notificari in-app si/sau email localizate pentru statusuri relevante.
- Non-goals: realtime complex, SMS, push mobile nativ, marketing.
- Dependente: SHELL-001, WORKFLOW-002, DELIVERY-001.
- Acceptance criteria: utilizatorii primesc doar notificari permise si utile.
- Backend: model notificari, service emitere, preferinte minime daca sunt definite.
- Frontend: centru notificari in shell si stari unread/read.
- Securitate: filtrare per utilizator/rol, fara date financiare nepermise.
- Audit: audit pentru notificari critice trimise sau esuate.
- Testare: unit service, API permissions, UI unread/read.

### PAYMENTS-001 - Payments and balances

- Scop: incasari si solduri.
- Motiv: inchidere financiara.
- Module: PaymentsModule.
- Dependinte: WORKS-001, RBAC-001.
- Pasi: payment create, allocate to works, balance.
- Acceptare: non-manager refuzat.
- Teste: API permissions and calculations.
- Manual: plata partiala/integrala.
- Riscuri: corectii contabile.
- Nu modifica: invoices.
- DoD: sold corect.
- Estimare: L.

### INVOICE-001 - Invoice PDF and numbering

- Scop: factura PDF standard.
- Motiv: document financiar MVP.
- Module: InvoicesModule.
- Dependinte: PAYMENTS-001, SETTINGS-001.
- Pasi: series/number lock, invoice lines, PDF render, archive.
- Acceptare: numar unic, factura emisa nu se editeaza.
- Teste: concurrency + PDF smoke.
- Manual: descarcare PDF.
- Riscuri: cerinte fiscale.
- Nu modifica: e-Factura.
- DoD: factura MVP auditata.
- Estimare: XL.

### REPORTS-001 - Operational and financial reports

- Scop: KPI MVP.
- Motiv: manager si logistica au vizibilitate.
- Module: ReportsModule.
- Dependinte: WORKS-001, TECH-001, PAYMENTS-001.
- Pasi: endpoints agregare, filters, report pages.
- Acceptare: rapoarte rapide si permissioned.
- Teste: integration.
- Manual: date seed vizibile.
- Riscuri: query performance.
- Nu modifica: dashboard decorativ.
- DoD: rapoarte MVP.
- Estimare: L.

### SEARCH-001 - Global search

- Status: NOT STARTED.
- Obiectiv: cautare globala peste lucrari, clinici, medici, documente si audit permis.
- Scope: search central in shell, rezultate grupate, deep links si filtrare RBAC.
- Non-goals: motor extern de cautare, ranking complex, indexare full-text dedicata daca nu este necesara.
- Dependente: BILLING-002, WORKS-001, CLINICS-001, RBAC-001.
- Acceptance criteria: utilizatorii gasesc rapid pacient, lucrare, clinica, medic sau document permis.
- Backend: endpoint agregat permission-aware.
- Frontend: search global accesibil din shell.
- Securitate: rezultate filtrate server-side, fara date pacient peste permisiuni.
- Audit: fara audit pentru simple read/search daca nu este cerut.
- Testare: query results si permisiuni.

### DEMO-POLISH-001 - Commercial demo polish

- Status: NOT STARTED.
- Obiectiv: finisare demo comercial dupa date realiste si fluxuri principale.
- Scope: copy, empty states, micro-polish, ghid demo si verificari de prezentare.
- Non-goals: functionalitati noi majore.
- Dependente: DEMO-SEED-001, BILLING-002, DASHBOARD-001.
- Acceptance criteria: aplicatia poate fi prezentata coerent unei cliente fara pregatire tehnica.
- Backend: fara schimbari majore.
- Frontend: polish punctual.
- Securitate: fara relaxari de autentificare.
- Audit: fara audit nou.
- Testare: smoke demo flow.
- Status: NOT STARTED.

### AUDIT-UI-001 - Audit viewer UI

- Scop: vizualizare audit autorizata.
- Motiv: trasabilitate completa.
- Module: AuditModule.
- Dependinte: RBAC-001.
- Pasi: filters, resource view, actor view.
- Acceptare: manager vede audit, altii doar cu permisiune.
- Teste: API permission.
- Manual: cautare evenimente.
- Riscuri: date sensibile in audit.
- Nu modifica: audit write events existente.
- DoD: audit lizibil.
- Estimare: M.
- Status: NOT STARTED.

### SECURITY-001 - Security hardening

- Scop: verificari securitate MVP.
- Motiv: date sensibile si roluri.
- Module: all.
- Dependinte: major modules.
- Pasi: headers, CORS, rate limits, dependency audit, permission tests.
- Acceptare: checklist security trece.
- Teste: negative API tests.
- Manual: acces direct endpoint.
- Riscuri: false sense of security.
- Nu modifica: scope functional major.
- DoD: hardening minim complet.
- Estimare: M.

### E2E-001 - End-to-end critical flows

- Scop: Playwright pentru flux complet.
- Motiv: prevenire regresii.
- Module: tests/e2e.
- Dependinte: all core flows.
- Pasi: login roles, create work, plan, execute, QC, deliver, payment, invoice.
- Acceptare: E2E trece local/CI.
- Teste: Playwright.
- Manual: cross-device smoke.
- Riscuri: teste fragile.
- Nu modifica: business logic.
- DoD: suite stabila.
- Estimare: L.

### DEPLOY-001 - Staging deployment

- Scop: mediu testabil de client.
- Motiv: validare reala.
- Module: Docker, CI, env.
- Dependinte: SECURITY-001, E2E-001.
- Pasi: build, migrate, seed staging, backup config.
- Acceptare: URL staging functional.
- Teste: smoke production build.
- Manual: login si flux scurt.
- Riscuri: configurare storage.
- Nu modifica: feature scope.
- DoD: staging stabil.
- Estimare: M.

## 44.1 Realigned Future Task Definitions

Aceste taskuri inlocuiesc ordinea veche dupa `SIGNATURES-001`. Detaliile complete si deciziile validate sunt in `REAL-LAB-WORKFLOW.md`.

### ROADMAP-REALIGN-002 - Real lab workflow roadmap alignment

- Status: COMPLETED.
- Obiectiv: realinierea documentatiei si roadmap-ului la fluxul real validat.
- Scope: plan, status, README, demo docs si document arhitectural nou.
- Non-goals: cod, migrare, seed, endpoint, UI, pricing, pacienti, offline, context switch.
- Dependente: SIGNATURES-001.
- Acceptance criteria: noua ordine este documentata, impact matrix exista, demo-ul curent este marcat ca flux anterior.
- Backend: fara modificari.
- Frontend: fara modificari.
- Securitate: fara relaxari.
- Audit: documenteaza auditul necesar pentru taskurile viitoare.
- Testare: `git diff --check` si verificare docs-only.

### ORG-CONTEXT-001 - Global NC/NG company context

- Status: COMPLETED.
- Obiectiv: context global vizibil `NC`/`NG` pentru ecrane si actiuni sensibile la firma.
- Scope: registru firme, selector in shell, persistenta context, validare backend a contextului.
- Non-goals: pricing, billing rewrite, pacienti, self-claim, migrare date existente.
- Dependente: ROADMAP-REALIGN-002, SHELL-001, SETTINGS-001, RBAC-001.
- Acceptance criteria: managerii pot comuta `NC`/`NG`, contextul este vizibil, backendul refuza contexte nepermise, workflow-ul operational ramane comun.
- Backend: guard/helper context firma si extensie setari unde este necesar.
- Frontend: selector responsive in shell, in stilul aplicatiei.
- Securitate: contextul este verificat server-side, nu doar in browser.
- Audit: include contextul in actiunile critice sensibile la firma.
- Testare: unit, integration unde se valideaza contextul, frontend tests, typecheck, test, build.
- Implementare: model `LegalEntity`, camp nullable `Session.activeLegalEntityId`, seed idempotent `NC`/`NG`, `OrganizationContextModule`, endpointuri `GET /organization-context` si `PUT /organization-context`, permisiuni `organization_context.read` si `organization_context.switch`, helper/guard/decorator pentru taskurile viitoare si selector global in shell.
- Decizie audit: schimbarea manuala scrie `organization_context.switched`; initializarea determinista la `NC` la prima citire nu este auditata ca sa evite zgomot operational.
- Compatibilitate: `LaboratorySettings` ramane singleton, `BillingDocument`/`BillingSeries`/`Payment` raman fara firma, iar `WorkOrder` nu primeste inca firma.

### ORG-DATA-MIGRATION-001 - Company-aware local data migration

- Status: COMPLETED.
- Obiectiv: alinierea setarilor locale/demo la structura cu `NC`/`NG`.
- Scope: migrare determinista, model `LegalEntitySettings`, seed compatibil si `/settings` context-aware.
- Non-goals: migrari destructive fara aprobare, pricing complet, billing rewrite, firma pe lucrare, document center.
- Dependente: ORG-CONTEXT-001.
- Acceptance criteria: `NC` si `NG` au fiecare exact un rand de settings, seed-ul ramane idempotent, singletonul legacy este pastrat si `/settings` citeste/scrie doar contextul activ.
- Backend: model `LegalEntitySettings`, migrare fara DROP, backfill din `laboratory_settings.default`, SettingsModule cu context guard si audit sigur.
- Frontend: pagina `/settings` afiseaza firma activa, valori diferite NC/NG, mod read-only si confirmare pentru schimbarea firmei cand formularul este dirty.
- Securitate: refuz productie/remote pentru resetari destructive.
- Audit: `settings.updated` include `legalEntityCode` si campurile schimbate fara IBAN complet sau payload fiscal complet.
- Testare: Prisma validate/generate/migrate, seed, demo seed idempotency, typecheck, test, build.
- Implementare: tabela `legal_entity_settings`, relatie 1:1 cu `LegalEntity`, seed NC/NG cu date fictive si override-uri locale optionale.
- Compatibilitate: billing/print raman pe singleton legacy pana la `BILLING-REALIGN-001`; works, pricing, payments si seriile de documente nu sunt modificate.

### PATIENTS-001 - Patient records and history

- Status: COMPLETED.
- Obiectiv: pacienti reutilizabili cu istoric de lucrari.
- Scope: model pacient, CRUD, istoric lucrari, medici/clinici, documente existente, cautare si integrare la creare lucrare.
- Non-goals: portal pacient, dosar medical complet, medic permanent obligatoriu, cod intern pacient, CNP, CI, adresa, telefon, email, import din `assets/`.
- Dependente: ORG-CONTEXT-001, WORKS-001, CLINICS-001.
- Acceptance criteria: pacientul are nume/prenume, campuri optionale limitate, multe lucrari, fara cod intern; lucrarile noi folosesc `patientId`, iar `patientName` ramane snapshot.
- Backend: model `Patient`, DTO validation, relatie nullable `WorkOrder.patientId`, backfill determinist din `patientName`, PatientsModule si permisiuni `patients.*`.
- Frontend: pagina `/patients` cu taburi Prezentare, Lucrari, Medici si clinici, Documente, Istoric; selector pacient si quick create in `/works`.
- Securitate: RBAC server-side, optiunile de pacient nu expun note/documente, pacientii arhivati nu pot fi folositi la lucrari noi.
- Audit: create/update/archive/restore fara payload complet, nume sau note in metadata.
- Testare: Prisma validate/generate/migrate, seed, demo seed idempotency, unit tests, typecheck, test, build, smoke API/web.

### PRICING-002 - Company-specific pricing and agreements

- Status: COMPLETED.
- Obiectiv: preturi manager-only separate pentru `NC` si `NG`.
- Scope: liste standard, negocieri clinic/medic, discounturi, perioade, istoric, rezolvare pret.
- Non-goals: procesare plati, contabilitate, e-Factura, expunere preturi catre non-manageri.
- Dependente: ORG-CONTEXT-001, WORKTYPES-001, CLINICS-001.
- Acceptance criteria: pretul se rezolva doctor > clinica > standard firma si non-financiarul nu primeste campuri de pret.
- Backend: modele pricing, resolver pur, DTO validation, tranzactii.
- Frontend: workspace manager pentru preturi si istoric.
- Securitate: `pricing.*` si mascare server-side.
- Audit: create/update/archive agreement.
- Testare: unit resolver, API permission tests, UI tests.
- Implementare: `PricingModule` expune catalogul companiei active sub `/pricing/catalog`, acordurile comerciale sub `/pricing/agreements` si preview-ul de rezolvare sub `/pricing/resolve-preview`.
- Date: `PriceCatalogItem`, `ExecutionTimeRule`, `PricingAgreement` si `PricingAgreementRule` sunt legate de firma activa din sesiune; `WorkType` ramane comun, iar `WorkType.basePriceMinor` ramane camp legacy.
- Resolver: foloseste doar firma activa, cauta catalog activ pentru `workTypeId`, aplica prima regula de medic aplicabila, apoi prima regula de clinica aplicabila, apoi pretul standard.
- UI: ruta `/pricing` are taburi pentru catalog, acorduri, preview calcul, termene si sursa/istoric.
- Seed demo: lista Creative Dental transcrisa manual este seeduita separat pentru `NC` si `NG`; randurile ambigue sunt marcate in note si documentate in `PRICING-ASSET-AUDIT.md`.
- Securitate implementata: managerul are acces, receptia/logistica/tehnicienii/curierii nu primesc acces la `/pricing`; reception flow ramane fara preturi.
- Verificari: prisma validate/generate/migrate, seed baza, demo seed idempotent, typecheck, test, build si smoke API/UI au trecut.

### WORK-DEADLINES-001A - Deadline engine and Romanian business-day calendar

- Status: COMPLETED.
- Obiectiv: infrastructura determinista pentru calculul termenelor din regulile de executie.
- Scope: tipuri shared, calendar lucrator romanesc 2026-2030, selector reguli, engine pur, preview optional in `/pricing/resolve-preview`.
- Non-goals: snapshot pe WorkOrder, modificari Prisma, UI registry lucrari, alerte vizuale, claim tehnician, planificare curier.
- Dependente: PRICING-002, ORG-CONTEXT-001.
- Acceptance criteria: weekendurile si sarbatorile RO sunt excluse, `includeStartDay` este explicit, ora default este 17:00 `Europe/Bucharest`, regulile manuale returneaza `MANUAL`, lipsa/ambiguitatea returneaza `UNRESOLVED`.
- Backend: `DeadlinesModule` cu `BusinessCalendarService`, `DeadlineEngineService` si selector pur.
- Frontend: fara schimbari de UI in 001A; preview-ul poate fi consumat ulterior.
- Securitate: preview-ul pastreaza RBAC/CSRF manager-only al pricing si nu expune ID-uri interne de reguli.
- Audit: fara audit nou, deoarece preview-ul nu persista date.
- Testare: unit selector/calendar/engine, controller preview RBAC/CSRF, typecheck, test, build.

### WORK-DEADLINES-001B - Deadline persistence and workflow integration

- Status: APPROVED.
- Obiectiv: persistenta snapshotului de deadline la momentul operational corect.
- Scope: legarea engine-ului 001A de claim/workflow, salvare `executionStartedAt` si `calculatedDueAt`, status vizual derivat.
- Non-goals: schimbarea regulilor financiare sau recalcularea istoricului fara aprobare.
- Dependente: WORK-DEADLINES-001A, TECH-CLAIM-001 sau decizie echivalenta de integrare workflow.
- Acceptance criteria: primul claim operational seteaza snapshotul de termen, iar corectiile sunt controlate si auditate.
- Backend: persistenta deadline snapshot, validari, tranzactii.
- Frontend: alerte si filtre deadline.
- Securitate: date operationale fara preturi pentru non-manageri.
- Audit: snapshot si corectii.
- Testare: integration workflow, UI state tests, regresii pricing.

### TECH-CLAIM-001 - Technician self-claim

- Status: NOT STARTED.
- Obiectiv: inlocuirea fluxului implicit de asignare cu self-claim.
- Scope: coada etape disponibile, claim/start/complete, radio `NC`/`NG` la primul claim tehnic, release/corectie manager.
- Non-goals: transfer etapa, payroll, planning obligatoriu de manager.
- Dependente: ORG-CONTEXT-001, WORKFLOW-002, TECH-001, PRICING-002.
- Acceptance criteria: tehnicianul claim-uieste etapa, firma se blocheaza pe lucrare, auditul include claimed/started/completed/duration.
- Backend: claim endpoints, optimistic locking, reguli firma.
- Frontend: workbench self-claim si radio selector.
- Securitate: ownership si RBAC server-side.
- Audit: claim, release, correction, start, complete.
- Testare: conflict, permission, component si smoke mobile.

### STATUS-001 - Operational status page

- Status: NOT STARTED.
- Obiectiv: `/status` pentru vizibilitate operationala comuna.
- Scope: taburi Astazi/In lucru/Disponibile/Intarziate/Plecate/Revenite/Finalizate, filtre si progres.
- Non-goals: dashboard financiar, panou public, analytics complex.
- Dependente: ORG-CONTEXT-001, TECH-CLAIM-001, WORK-DEADLINES-001, WORK-CYCLES-001.
- Acceptance criteria: toti utilizatorii interni vad status operational permis; doar managerii vad financiar.
- Backend: endpoint agregat permission-aware.
- Frontend: pagina responsive cu taburi si filtre.
- Securitate: fara scurgeri de preturi/financiar.
- Audit: fara audit read standard.
- Testare: aggregation, permissions, UI filters.

### WORK-CYCLES-001 - Clinic return cycles

- Status: NOT STARTED.
- Obiectiv: modelarea ciclurilor plecat la medic, revenit, retrimis.
- Scope: return types, timeline cicluri, integrare logistics/delivery/status.
- Non-goals: portal medic, upload fisiere, rewrite QC.
- Dependente: DELIVERY-001, LOGISTICS-001, STATUS-001.
- Acceptance criteria: istoricul nu este suprascris, current cycle este vizibil.
- Backend: cycle transitions si optimistic locking.
- Frontend: actiuni retur/ciclu si timeline.
- Securitate: actiuni pe roluri.
- Audit: return/resend/correction.
- Testare: state transitions, API permissions, UI.

### WORKFORM-REAL-001 - Real laboratory work form

- Status: NOT STARTED.
- Obiectiv: formular digital conform fisei reale de laborator.
- Scope: numar fisa, medic, pacient, varsta, sex, tip lucrare, nuanta, dinti FDI, faze, termene faze, note, QR print.
- Non-goals: scripting custom, fisiere generice, patru faze hardcodate.
- Dependente: PATIENTS-001, WORKFORMS-002, WORKFLOW-002, WORK-DEADLINES-001.
- Acceptance criteria: formular printabil, snapshot imuabil, faze din workflow.
- Backend: validari si snapshot extins.
- Frontend: accordions/tabs/radios/selects/reusable controls.
- Securitate: acces pacient/lucrare permissioned.
- Audit: create/update submission.
- Testare: validators, print smoke, frontend tests.

### BILLING-REALIGN-001 - Company-aware billing

- Status: NOT STARTED.
- Obiectiv: facturare separata pe contextul `NC`/`NG`.
- Scope: lucrari finalizate, proforme, facturi, anexe, incasari, restante si filtre.
- Non-goals: e-Factura, SPV, procesare plati, contabilitate generala.
- Dependente: ORG-CONTEXT-001, PRICING-002, WORK-DEADLINES-001, BILLING-002.
- Acceptance criteria: documentele nu amesteca lucrari NC/NG si folosesc seria/headerul corect.
- Backend: query-uri context-aware, serii si validari documente.
- Frontend: billing workspace dupa context activ.
- Securitate: finance RBAC si context validation.
- Audit: firma inclusa in evenimente financiare.
- Testare: grouping, filters, permissions, print.

### PAYMENTS-002 - Manual payment evidence realignment

- Status: NOT STARTED.
- Obiectiv: evidenta manuala completa a incasarilor pe factura company-aware.
- Scope: plati multiple/partiale, metode, referinte, anulare, recalcul sold/status.
- Non-goals: POS, card processing, bank sync, bon fiscal.
- Dependente: BILLING-REALIGN-001.
- Acceptance criteria: unpaid/partial/paid si soldul se recalculeaza corect; overpayment, zero si negativ sunt refuzate.
- Backend: validari stricte si tranzactii.
- Frontend: "Inregistreaza incasare", istoric si filtre.
- Securitate: finance-only.
- Audit: record/cancel payment.
- Testare: status/balance/search/filter tests.

### DOCUMENTS-001 - Company-aware document center

- Status: NOT STARTED.
- Obiectiv: documente operationale si financiare cu header de firma.
- Scope: fisa laborator, proforma, factura, anexa, nota incasare, dovada predare, termeni colaborare.
- Non-goals: XML e-Factura, semnatura calificata, URL public.
- Dependente: ORG-CONTEXT-001, BILLING-REALIGN-001, WORKFORM-REAL-001.
- Acceptance criteria: open new tab, print, download, link pacient/lucrare, snapshot, A4/A5 unde trebuie.
- Backend: render si acces autorizat.
- Frontend: actiuni documente si taburi.
- Securitate: storage/acces privat.
- Audit: print/download critic.
- Testare: render, permissions, print smoke.

### COLLABORATION-TERMS-001 - Versioned collaboration terms

- Status: NOT STARTED.
- Obiectiv: termeni de colaborare versionati pe firma.
- Scope: detalii amprenta, nuanta, probe, termene, refaceri, costuri extra, versiune, firma emitenta.
- Non-goals: pagina statica hardcodata, consultanta juridica, semnare contractuala.
- Dependente: DOCUMENTS-001.
- Acceptance criteria: managerul publica versiuni si documentele folosesc versiunea corecta.
- Backend: model versionat si validari.
- Frontend: management si print/download.
- Securitate: write manager-only.
- Audit: create/publish/archive.
- Testare: versioning si permissions.

### OFFLINE-001 - Essential offline operation

- Status: NOT STARTED.
- Obiectiv: operatiuni esentiale disponibile offline cu sincronizare ulterioara.
- Scope: IndexedDB, coada mutatii, `clientMutationId`, sync auto/manual, conflicte.
- Non-goals: offline pricing, billing, payments, series, settings.
- Dependente: TECH-CLAIM-001, STATUS-001, WORKFORM-REAL-001.
- Acceptance criteria: create work, complete form, claim/start/complete stage, notes si status operational se pot sincroniza sigur.
- Backend: idempotency si optimistic locking.
- Frontend: stari Online/Offline/sync si conflict UI.
- Securitate: cache doar pentru date autorizate.
- Audit: actiuni sincronizate.
- Testare: sync/conflict/browser offline smoke.

### DASHBOARD-002 - Real workflow dashboard

- Status: NOT STARTED.
- Obiectiv: dashboard aliniat cu status, deadlines, cycles si context firma.
- Scope: sumar operational si financiar manager-only.
- Non-goals: inlocuirea `/status`, analytics complex.
- Dependente: STATUS-001, BILLING-REALIGN-001.
- Acceptance criteria: sumarul reconciliaza cu status si billing.
- Backend: agregari permissioned.
- Frontend: carduri responsive.
- Securitate: financiar manager-only.
- Audit: fara audit read standard.
- Testare: aggregation si UI tests.

### DEMO-REAL-DATA-001 - Validated workflow demo dataset

- Status: NOT STARTED.
- Obiectiv: demo realist pentru fluxul validat `NC`/`NG`.
- Scope: doi manageri, trei tehnicieni, pacienti, pricing, deadlines, self-claim, cycles, billing, documents.
- Non-goals: date reale, seed productie.
- Dependente: DOCUMENTS-001, PAYMENTS-002, STATUS-001.
- Acceptance criteria: demo script prezinta fluxul real cap-coada.
- Backend: seed idempotent guarded.
- Frontend: demo script si acces rapid daca este necesar.
- Securitate: date fictive.
- Audit: fara audit pentru seed local.
- Testare: seed idempotency, typecheck, test, build, smoke demo.

## 45. Dependency Graph

```text
FOUNDATION-001
  -> FOUNDATION-002
  -> UI-001 -> UI-002
  -> AUTH-001 -> RBAC-001
RBAC-001 -> USERS-001 -> LOGISTICS-001
RBAC-001 -> SETTINGS-001 -> INVOICE-001
RBAC-001 -> CLINICS-001 -> WORKS-001
RBAC-001 -> WORKTYPES-001 -> WORKFLOW-001
WORKS-001 -> QR-001
SHELL-001 -> FORMS-001
WORKS-001 -> BILLING-001 -> BILLING-002 -> DEMO-SEED-001
BILLING-002 -> WORKFORMS-001 -> WORKFORMS-002
WORKFORMS-001 -> WORKFLOW-001 -> WORKFLOW-002 -> TECH-001 -> SCAN-002 -> LOGISTICS-001 -> DELIVERY-001 -> SIGNATURES-001
SIGNATURES-001 -> ROADMAP-REALIGN-002 -> ORG-CONTEXT-001 -> ORG-DATA-MIGRATION-001
ORG-CONTEXT-001 -> PATIENTS-001 -> WORKFORM-REAL-001
ORG-CONTEXT-001 -> PRICING-002 -> WORK-DEADLINES-001 -> TECH-CLAIM-001 -> STATUS-001 -> WORK-CYCLES-001
WORK-CYCLES-001 -> BILLING-REALIGN-001 -> PAYMENTS-002 -> DOCUMENTS-001 -> COLLABORATION-TERMS-001
STATUS-001 -> OFFLINE-001 -> DASHBOARD-002 -> SEARCH-001 -> REPORTS-001 -> AUDIT-UI-001 -> DEMO-REAL-DATA-001 -> E2E-001 -> SECURITY-001 -> DEPLOY-001
Deferred legacy tasks: FILES-001, FILES-002, QC-001, NOTIFICATIONS-001, DEMO-POLISH-001
WORKS-001 -> PAYMENTS-001 -> INVOICE-001 (legacy split, covered operationally by BILLING-001/BILLING-002)
WORKS-001 -> REPORTS-001
RBAC-001 -> AUDIT-UI-001
Core modules -> SECURITY-001 -> E2E-001 -> DEPLOY-001
```

## 46. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Permisiuni implementate inconsistent | critic | guard central, teste negative API |
| Formular lucrare prea complex | mare | ecrane impartite, progressive disclosure |
| Workflow prea rigid | mare | template versionat + snapshot |
| Facturare cu reguli fiscale gresite | mare | validare cu contabil, fara afirmatii juridice definitive |
| Fisiere expuse public | critic | storage privat, backend autorizat |
| Concurenta pe etape/facturi | mare | optimistic locking, tranzactii DB |
| UI greu pentru non-tehnici | mare | componente clare, touch targets, teste manuale cu roluri |
| Rapoarte lente | mediu | indexuri, paginare, agregari simple |
| Scope creep portal medic | mediu | portal in MVP Extended |

## 47. Post-MVP Roadmap

- Portal medic complet.
- PWA curier cu offline partial.
- Integrare ANAF/e-Factura.
- Export contabil.
- Modul stocuri/materiale.
- Notificari email/SMS/WhatsApp.
- Analytics avansat.
- Calendar productie avansat.
- Semnaturi si documente custom.
- Multi-laborator daca apare cerinta.

## 48. Questions Requiring Client Validation

- Date fiscale exacte laborator.
- Regim TVA.
- Reguli interne de corectie/anulare factura.
- Campuri obligatorii pe tip de lucrare.
- Fluxuri tehnologice reale si ordinea etapelor.
- Cine poate aproba QC.
- Cine poate marca rework.
- Nivelul de vizibilitate al medicului.
- Retentia fisierelor si auditului.
- Format eticheta QR.

## 49. Recommended First Implementation Task

Primul task recomandat este `FOUNDATION-001 - Initialize monorepo`.

Motiv: repository-ul este gol, iar toate cerintele depind de o baza tehnica coerenta. Dupa `FOUNDATION-001`, trebuie executate imediat `FOUNDATION-002`, `UI-001` si `UI-002`, deoarece cerintele de mobile-first, responsive, consistenta vizuala si componente separate sunt obligatorii si trebuie puse in fundatie, nu adaugate tarziu.
