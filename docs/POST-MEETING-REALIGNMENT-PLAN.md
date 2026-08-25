# Post-Meeting Realignment Roadmap

Status: PLAN ONLY — implementation not started

This is the single canonical implementation roadmap for the post-meeting Dental Lab Management changes. It consolidates final client clarifications and supersedes contradictory wording in earlier planning drafts. [`REALIGNMENT-IMPLEMENTATION-PLAN.md`](./REALIGNMENT-IMPLEMENTATION-PLAN.md) remains the historical reference for already delivered work.

No Prisma schema, migration, API, UI, seed, test, production data, or production source file was changed while preparing this roadmap. No execution bundle may start until its prerequisites and applicable open decisions are resolved.

## 1. Scope and non-negotiable rules

Every increment preserves current routes, issued billing documents, historical work, technician earning snapshots, QR identity, audit history, and valid logistics routes. User-facing work is not complete when only schema/API/service/tests exist: visible production UI, role checks, responsive states, and manual click-through are required.

The implementation must not create one WorkOrder per tooth, item, probe, route stop, or QR; split a true arch/case product into fake tooth items; create item-level ownership/logistics/status; use a fixed five-probe enum; multiply customer billing by probes or maneuvers; recalculate historical monetary snapshots; let technicians choose CDT/NG; silently save one-off catalog data; or use transient toasts as the only notification channel. Complex New Work/edit operational modals remain fullscreen on desktop/tablet/mobile where already established.

## 2. Canonical domain model

```text
WorkOrder = one patient case = one physical/operational case
           = one QR = one logistics unit = one courier route unit
           = one commercial lifecycle
  ├── WorkOrderItem[] = independently configured components
  ├── ToothConnection[] = normalized adjacent-tooth data
  ├── ProbeCycle[] = sequential case-level probe history
  └── TechnicianPerformedOperation[] = immutable earning snapshots
```

### Case-level versus item-level data

Case/WorkOrder level: patient, clinic, doctor, derived legal entity, deadline date/time, urgency, general notes, active ProbeCycle only after a real probe is opened, completed probe history, overall operational status, claim/release ownership, logistics/route/courier lifecycle, QR, and billing lifecycle. Initial New Work is intake only and creates no ProbeCycle or required ProbeType. There is no automatic default execution deadline: Reception or Logistics enters it for New Work and for every returning case/new cycle; deadline history is preserved.

Item/component level: anatomical scope, concrete FDI teeth where applicable, WorkType/custom WorkType, shade/color, implant platform/custom platform, restoration type, technical code/details, item notes, and commercial snapshot/amount. Items have no independent route, delivery, pickup, ownership, overall status, or commercial lifecycle.

### WorkOrderItem and anatomical scope

An item is not necessarily tied to exactly one tooth. It has an explicit scope supporting:

| Scope | Meaning | Example |
|---|---|---|
| `TOOTH` | One FDI tooth | 11 → Zr I |
| `TEETH` | Several teeth, one component | 11,12,21 → one component |
| `UPPER_ARCH` | Upper-arch component | upper appliance |
| `LOWER_ARCH` | Lower-arch component | lower-arch gutieră |
| `BOTH_ARCHES` | Both arches, one component | bimaxillary component |
| `CASE` | General case component | preparation |

Exact storage may use normalized tables, but scope semantics must be retained. A lower-arch gutieră remains one WorkOrderItem, not 16 fake items. Commercial quantity comes from WorkType/price configuration, never automatically from selected-tooth count.

### ProbeCycle, status, urgency, legal context

ProbeCycle belongs to the entire WorkOrder, never a tooth/item. Initial New Work creates no cycle. After a real probe context is opened, the active cycle is not counted as completed history until the technician selects `Probă gata`. That event closes the active cycle into `Proba 1 — <ProbeType>` and sends the case Technician → Logistics → Courier → Doctor/Clinic. If the case returns, Reception records visible status `Recepționată`, selects the next compatible ProbeType and deadline, and creates the next active cycle; Reception or Logistics may reset the operational deadline for the returned work. The next `Probă gata` closes it into `Proba 2 — <ProbeType>`, and so on. Probe numbers represent completed sequential cycles; ProbeType is selected before/during the active cycle. Cycles are unlimited and sequential, the same type may repeat, and `number` and data-driven `ProbeType` are separate. `Finalizată` means the technician definitively declares no more probe is expected, then final logistics/courier continues. Technician choice between `Probă gata` and `Finalizată` is server-authorized and audited; it is not an open decision.

Urgency replaces generic priority: `NONE` Fără urgență 0%; `URGENCY_1` +35%; `URGENCY_2` +50%; `URGENCY_3` +75%; `URGENCY_4` +100%. Only precedence against agreement discount, item override, and manual adjustment remains open. Historical priority remains readable.

Clinic/doctor collaboration determines CDT or NG. Incompatible context is rejected; technicians never choose the company. Authorized clinic/doctor UI visibly exposes business ownership. Missing both clinic and doctor follows Decision A below. New Work supports inline `Pacient nou`, `Clinică nouă`, `Medic nou`; created entities become immediately selectable and partially entered data is preserved. `Alt tip` and `Altă platformă` are one-off by default; explicit `Salvează în catalog` is permissioned and audited.

### Dental assets, FDI order, mirroring, and connections

The canonical source is the real PNG set in `assets/dinti`: `11.png`–`18.png` and `41.png`–`48.png`. Normal upper source 11–18 mirrors to 21–28; normal lower source 41–48 mirrors to 31–38. Mirroring is visual only: a mirrored image persists its displayed FDI identity (21, never 11).

Permanent adult order is upper `18 17 16 15 14 13 12 11 21 22 23 24 25 26 27 28`, lower `48 47 46 45 44 43 42 41 31 32 33 34 35 36 37 38`. No quadrant headings and no central `+`; midline adjacency 11–21 and 41–31 is valid.

Between every adjacent pair is a persisted clickable circular control: 15 upper + 15 lower = 30. Only anatomical neighbors may connect; no upper/lower cross-arch links. Store canonical normalized pairs so 11–12 and 12–11 cannot be distinct records. Connections require both teeth in meaningful case/component context. Removing a tooth removes orphan connections and shows a visible Romanian message.

Shortcuts are `Arcada superioară`, `Arcada inferioară`, `Ambele arcade`, `Șterge selecția`; manual changes remain possible. UI shortcut selection is distinct from semantic scope: lower-arch gutieră keeps `LOWER_ARCH`, not a meaningless array of 16 teeth.

Build one reusable dental diagram with modes `create`, `edit`, `readOnly`, `technician-operation-selection`, reused in Lucrare nouă, Editare lucrare, Detalii lucrare, and Add Manoperă. Real images are primary, FDI readable, states include unselected/configured/edited/read-only/connected/disabled, and no opaque overlay hides the PNG. Desktop/tablet/mobile must preserve anatomy and tappable controls; controlled horizontal scrolling is preferable to unusable shrinkage.

## 3. Operations and finance

Technicians claim/release the complete WorkOrder. Multiple technicians may work sequentially on it; ownership is never per tooth/item. The final B14 performed-maneuver flow is tooth-first: the technician selects one or more relevant FDI teeth, then selects the maneuver. One performed maneuver may contain multiple teeth; quantity is the number of distinct explicitly selected valid adult FDI teeth; the effective technician rate is per element. Conceptual fields: WorkOrder, technician, optional ProbeCycle, maneuver, selected FDI teeth, quantity snapshot, rate-per-element snapshot, total snapshot, performed time, notes. A normalized tooth junction is required for active uniqueness and history.

Manager configures technician-specific maneuver rates per explicit dental element. There is no selectable technician maneuver unit: `PER_UNIT`, `PER_ARCH`, and `PER_CASE` are not canonical. Every performed maneuver selects explicit unique valid adult FDI teeth; quantity is their count (11 = 1; 11+12 = 2; 11+12+21 = 3). Arch/case items, WorkOrder quantity, connected groups, and probe count never infer earnings. Technician cannot edit rate. Every operation snapshots effective quantity, rate per element, and total; later manager rate changes never alter old operations.

Customer billing = WorkOrderItem commercial values + urgency/agreement/authorized adjustments. Technician earnings = operation total snapshots. They are completely separate. Operations in completed Probe 1, Probe 2, or later cycles may increase earnings but never automatically customer billing. Manager payment views show case, scope, maneuver, quantity × rate, total, technician, paid/unpaid, and day/month/year history; current technician payment logic is extended, not replaced.

## 4. Compatibility classification

| Concept | Classification and direction |
|---|---|
| Auth/RBAC/organization | KEEP/EXTEND; add item, cycle, scope, maneuver, notification, finalization permissions. |
| WorkOrder, QR, work code, routes | KEEP/EXTEND/HISTORICAL-COMPATIBILITY; one case and one QR/route unit. |
| WorkOrderItem | MIGRATE/EXTEND; broad scope, independent configuration, no item operations. |
| ToothConnection | EXTEND/MIGRATE; canonical adjacent pairs and orphan cleanup. |
| WorkType/catalog/forms | EXTEND/HISTORICAL-COMPATIBILITY; preserve snapshots and one-off values. |
| WorkCycle | SUPERSEDE/MIGRATE; case-level ProbeCycle reads, old source labels retained. |
| ProbeType | EXTEND; data-driven, repeatable, archiveable, no fixed enum. |
| Technician claim/earnings | KEEP/EXTEND; case claim and generalized immutable operations. |
| Clinic/doctor/legal context | EXTEND; inline management and compatibility validation. |
| Logistics/routes/courier | KEEP/EXTEND; one WorkOrder row/stop, cycle as context only. |
| Notifications | EXTEND/MIGRATE; durable targeted center and exact deep links. |
| Billing/payments/arrears/storno/close | KEEP/EXTEND/HISTORICAL-COMPATIBILITY; one commercial lifecycle and immutable snapshots. |
| Generic priority, old return terminology, technician company selector | SUPERSEDE/DEPRECATE-UI for new flows; history remains readable. |

All top-level read models remain one result per WorkOrder in Works, Status, Reception, Technician, Logistics, Courier, Patients, Billing, Search, and QR resolution. Details may load item/cycle breakdown separately.

## 5. UI evolution and regression policy

All implementation must evolve the current product. The canonical order is **REUSE FIRST → EXTEND SECOND → SUPERSEDE ONLY WHERE REQUIRED**. Do not redesign or rebuild the application from scratch.

Preserve the current application shell, valid role navigation, existing UI kit/components, design tokens, spacing and typography, fullscreen operational modal behavior, responsive patterns, working pages and filters, Logistics Centru operațional and Trasee, Technician earnings/payment views, Billing infrastructure, Audit UI, QR/search behavior, and role permissions that remain valid. New dental UI may be specialized as a clinical control, but its surrounding forms, buttons, cards, modals, and states must use the existing component library and visual language.

When a requirement affects an existing page, modify the existing page/component. Do not create “New Work v2”, a parallel Technician workflow, a second Logistics center or route system, a replacement payment ledger, or separate billing implementation. Extend the current Reception New Work flow with multi-item dental configuration; extend the current Technician Workbench with case details, scoped Manopere, `Probă gata`, and `Finalizată`; extend current Logistics/Trasee, earnings/payment, and billing views.

Remove or hide UI only where the underlying concept is explicitly superseded: new-flow `Revenire`, obsolete Workflow/Stage controls, obsolete normal-user Cycle controls, technician CDT/NG selection, generic Priority where Urgență replaces it, global WorkType/shade/platform/restoration fields that become item-specific, ambiguous Finalizată actions, generic tooth selectors replaced by `assets/dinti`, and duplicate ProbeCycle UI. Historical data remains readable when its active UI is removed.

Before changing a user-facing flow, the owning bundle must identify current working behavior, preserve behavior still required, list the exact legacy behavior being superseded, implement incrementally, update focused regression tests, and manually verify the entire affected flow. Broad cleanup/refactors are out of scope unless required by the feature. Existing code is not deleted merely because a new model exists.

Every bundle report must include: existing UI preserved; existing UI modified; legacy UI removed/hidden; new UI added; regression tests run; and manual click-through results. A client-operable bundle is not complete until the necessary UI is visible and usable, but unrelated pages/components must not be rewritten.

## 6. Subepics

Every subepic has the same Definition of Done: dependencies/decisions resolved; domain/API and migration checks pass; server RBAC and human-readable Romanian audit pass; visible UI exists for named roles/routes with loading, empty, error, permission, desktop/tablet/mobile states; current UI behavior is preserved unless explicitly listed as superseded; focused regression tests pass; manual click-through passes; no historical snapshot or unrelated route regresses. Bundle handoff must record existing UI preserved, modified UI, removed/hidden legacy UI, added UI, regression tests run, and manual click-through results.

For every entry in this section, the bold metadata and compressed field text are authoritative for: Goal, Risk, Dependencies, Scope, Out of scope, Domain/data impact, API impact, Visible UI acceptance, Migration/backward compatibility, RBAC, Audit, Automated tests, Manual verification, and Definition of Done. When a short entry does not repeat a field name, the shared Definition of Done above still applies and the entry's scope-specific sentence is the controlling detail.

### POSTMODEL-001 — Canonical contract
**Risk:** MEDIUM. **Dependencies:** none. **Goal:** Freeze final case/item/scope/cycle/maneuver/billing vocabulary and transition tables. **Scope:** All rules in sections 2–5, legacy mappings, invariants. **Out:** implementation. **API/data:** contracts only. **UI acceptance:** contract names exact Romanian labels, required controls, and reuse/extend/supersede boundaries. **Migration:** read-first, no destructive rename or fabricated meaning. **RBAC/audit:** actor/permission/event per mutation. **Tests:** contract fixtures. **Manual:** product/operations review.

### RBAC-AUDIT-001 — Authorization and audit matrix
**Risk:** MEDIUM. **Dependencies:** POSTMODEL-001. **Goal:** Protect all new actions. **Scope:** manager, reception, technician, logistics, courier, read-only; cross-tenant isolation; before/after, reason, actor, correlation ID; Audit UI hides raw JSON/IDs/enums. **UI acceptance:** only permitted Romanian controls appear and denied actions explain why. **Migration:** existing valid access preserved until superseded. **Tests/manual:** permission matrix and role happy/denied paths.

### WORKITEMS-001 — Broad-scope WorkOrderItem
**Risk:** HIGH. **Dependencies:** POSTMODEL, RBAC. **Goal:** Many independently configured items without one-per-tooth bias. **Scope:** six scopes, FDI sets, custom/catalog snapshots, commercial units. **Out:** item ownership/logistics/status. **UI:** item editor/cards show tooth, teeth, arch, both-arch, case semantics. **Migration:** preserve legacy fields; do not invent tooth prices/connections. **Tests/manual:** tooth, multi-tooth, lower-arch, case examples.

### LEGACY-COMPAT-001 — Safe legacy projection
**Risk:** HIGH. **Dependencies:** WORKITEMS. **Goal:** Idempotent read/backfill contract. **Scope:** old fields/cycles/operations/documents, ambiguity flags, reconciliation, QR/document access. **Out:** production rollout. **UI:** explicit historical/ambiguous marker. **Migration:** no fabricated items/connections. **Tests/manual:** dry-run fixtures and representative records.

### TOOTH-CONNECTIONS-001 — Persisted neighbor relationships
**Risk:** HIGH. **Dependencies:** WORKITEMS, RBAC. **Goal:** 30 real relationships including midlines. **Scope:** canonical pairs, context validation, orphan cleanup, Romanian audit. **Out:** rendering. **UI:** later diagram must visibly consume persisted state. **Tests/manual:** valid/invalid/duplicate/cross-arch/removal cases.

### TOOTH-DIAGRAM-001 — Reusable real-asset diagram
**Risk:** HIGH. **Dependencies:** TOOTH-CONNECTIONS, WORKITEMS. **Goal:** One reusable responsive component from actual `assets/dinti`. **Scope:** FDI order, mirrored identity, no `+`, circles, shortcuts, states, modes. **UI:** all four named flows, all devices, touch/scroll/loading/error/disabled click-through. **Tests/manual:** every source/mirror and midline pair.

### LEGALENTITY-001 — Clinic/doctor context and inline entities
**Risk:** MEDIUM-HIGH. **Dependencies:** WORKITEMS, RBAC. **Goal:** Derive CDT/NG and keep intake in one flow. **Scope:** inline patient/clinic/doctor, visible ownership, compatibility/missing context. **UI:** New Work inline actions; technician read-only context. **Tests/manual:** clinic-only, doctor-only, compatible/mismatch/absent.

### MULTIITEM-UI-001 — Independent multi-item New Work
**Risk:** HIGH. **Dependencies:** TOOTH-DIAGRAM, LEGALENTITY, WORKITEMS. **Goal:** One case with repeated add/configure target flow. **Scope:** case fields, per-item WorkType/color/platform/restoration/details, custom values, preserved partial form, one-item semantics for `BUCATĂ` and tooth-count semantics for `ELEMENT`. **UI:** fullscreen Romanian flow, responsive and error states, one case not three. **Tests/manual:** 11/12/21 plus lower-arch gutieră.

### WORKDETAIL-UI-001 — Complete case detail/edit
**Risk:** MEDIUM-HIGH. **Dependencies:** MULTIITEM-UI, TOOTH-DIAGRAM, CONNECTIONS. **Goal:** Show diagram, scopes, connections, item data, case data. **UI:** exact readable fields and semantic arch/case scope; internal editing without cramped dialog. **Migration:** legacy explicit. **Audit/tests/manual:** edit current fields, protect issued/earning snapshots.

### PROBE-001 — Case-level unlimited ProbeCycle
**Risk:** HIGH. **Dependencies:** WORKITEMS, LEGACY-COMPAT, RBAC. **Goal:** Model real active ProbeCycles and completed sequential probe history without confusing initial intake with a probe. **Scope:** Initial New Work creates no ProbeCycle; after `Recepționată`/a real probe context, `Probă gata` closes the active cycle as `Proba 1 — <type>`; only a returned case creates the next active cycle, whose completion becomes Proba 2, then N. **UI:** Reception chooses the next compatible ProbeType/deadline after return; current active cycle and completed history are visibly distinct. **Out:** fake initial return, per-item cycle, fixed enum, billing per probe. **Migration:** old cycles map to history where safe and retain source labels where ambiguous. **Tests/manual:** zero ProbeTypes for initial intake, completion numbering, repeat type, N cycles, archived type, concurrency.

### DEADLINE-URGENCY-001 — Explicit deadlines and urgency
**Risk:** MEDIUM-HIGH. **Dependencies:** PROBE, LEGALENTITY, RBAC. **Goal:** Enter date/time, preserve history, keep 0/25/50/75/100 urgency. **UI:** visible before confirmation and in detail/billing. **Out:** automatic default. **Tests/manual:** exact time, returning case, boundaries; urgency is applied once after the item subtotal and B19 owns later discount precedence.

### PROBE-FINALIZATION-001 — Probă gata/Recepționată/Finalizată
**Risk:** HIGH. **Dependencies:** PROBE, DEADLINE-URGENCY, RBAC. **Goal:** Final confirmed technician choice and case transitions. **Scope:** `Probă gata` completes the active cycle into numbered history and enables the case-level logistics path; return is recorded as `Recepționată` before the next active cycle is selected; `Finalizată` ends the definitive technical case instead of producing another probe. **UI:** Workbench visibly offers both actions; Reception sees active-cycle versus completed `Proba 1/2` history and `Recepționată`; Logistics sees current probe/final context. **Audit:** server authorization and Romanian event text. **Tests/manual:** initial active cycle → `Probă gata` → logistics → return/`Recepționată` → next cycle → `Probă gata` → final.

### MANEUVER-UNIT-001 — Maneuver pricing units
**Risk:** HIGH. **Dependencies:** POSTMODEL, RBAC. **Goal:** Manager configures technician-specific rates per explicit dental element. **Scope:** one global per-element/per-tooth semantic; no configurable unit field. **UI:** Work Settings/Manopere visibly shows `Tarif / element`; manager manages maneuvers, archive/restore, and effective-dated technician rates. **Migration:** old performed earnings remain unchanged and are not recalculated. **RBAC/audit:** manager-only configuration and audited rate changes. **Tests/manual:** 11=1, 11+12=2, 11+12+21=3, ten teeth=10.

### MANEUVER-SCOPE-001 — Add Manoperă scope UI
**Risk:** HIGH. **Dependencies:** MANEUVER-UNIT, TOOTH-DIAGRAM, WORKITEMS, PROBE. **Goal:** Explicit-tooth technician maneuver scope with deterministic per-element quantity. **Scope:** tooth-first, maneuver-second; every maneuver selects one or more relevant valid adult FDI teeth; quantity is the distinct selected-tooth count. One parent performed maneuver may contain many tooth junctions. The same WorkOrder + maneuver + tooth cannot have two active attributions, regardless of technician or ProbeCycle; different maneuvers may coexist. Transfer requires remove old attribution, preserve its history, then add the new attribution. Partial overlap rejects the entire atomic request with readable conflicting teeth. **UI:** B14 will reuse the current ToothDiagram, show `Ceramică · 5 elemente × 35,00 RON = 175,00 RON`, and provide no manual quantity, item, arch, or case selector. **Migration/data:** database-level concurrency protection is mandatory; performed snapshots and removal history remain immutable. **Audit:** selected teeth, quantity, rate per element, total, and removal reason are readable. **Tests/manual:** empty/duplicate/invalid teeth, cross-technician conflict, ProbeCycle non-partitioning, removal/re-attribution, different maneuvers on one tooth, and partial-overlap atomicity.

### TECH-EARNINGS-001 — Earnings and payment read models
**Risk:** MEDIUM-HIGH. **Dependencies:** MANEUVER-SCOPE, PROBE-FINALIZATION. **Goal:** Multiple technician attribution and readable manager payments. **UI:** scope, quantity × rate, total, paid/unpaid, periods. **Out:** recalc. **Tests/manual:** A/B across cycles and payment history.

### INTAKE-CUSTOM-001 — One-off custom values
**Risk:** MEDIUM. **Dependencies:** MULTIITEM-UI, LEGALENTITY, RBAC. **Goal:** `Alt tip`/`Altă platformă` without silent catalog insertion, with explicit human-readable WorkType-name save into the shared catalog. **Commercial:** WorkType price may remain `NULL`; only Manager reads/configures prices, and the first `NULL → value` transition resolves eligible exact-`workTypeId` item prices without rewriting resolved/locked/issued history. **Notification integration:** a new unpriced catalog WorkType emits the canonical `NEW_UNPRICED_WORK_TYPE_REQUIRES_MANAGER_PRICING` trigger with dedupe key `work_type:<id>:pricing_required`; durable notification delivery/resolution is consumed by B18. **UI:** one-off versus explicit save control, no price visibility for Reception/Technician. **Audit/tests/manual:** permission, duplicate/concurrency, invalid, save/no-save, propagation and confidentiality paths.

### PROBE-OPS-001 — Case-level logistics/courier
**Risk:** HIGH. **Dependencies:** PROBE-FINALIZATION, TECH-EARNINGS, LEGALENTITY. **Goal:** Existing logistics/routes/delivery/pickup operate on one WorkOrder and distinguish `PROBE_READY` from `FINAL_READY`. **Scope:** readiness-gated outbound, WorkOrder-level movement history, explicit delivery success/failure, structured failure reason, immutable failed-attempt history with distinct retries, and canonical B18 event contracts (`NEW_WORK`, `PROBE_READY`, `FINAL_WORK_READY`, `DELIVERY_COMPLETED`, `DELIVERY_FAILED`) with deterministic deep-link keys. Logistics does not create ProbeCycles; Reception owns `Recepționată`. **UI:** one row/stop, markers, route, outcomes, cycle context, no confidential pricing. **Migration:** reuse existing nullable-compatible delivery/logistics models; no fabricated ProbeCycle links for legacy movements. **Tests/manual:** readiness gates, one WorkOrder with many items/teeth, multiple probes, explicit outcomes, failure/retry history, concurrency and confidentiality.

### NOTIFICATIONS-001 — Durable center and deep links
**Risk:** MEDIUM. **Dependencies:** RBAC, WORKDETAIL, PROBE-FINALIZATION, PROBE-OPS, INTAKE-CUSTOM. **Goal:** Persist the canonical B16/B17 events plus `DEADLINE_APPROACHING`, `OVERDUE_WORK`, `NEW_WORK_AVAILABLE`, and `NEW_PROBE_AVAILABLE` with recipient-specific read/resolved state, database dedupe, role-safe recipients, and exact deep links. Manager financial types `PAYMENT_NOTE_REQUIRED`, `INVOICE_REQUIRED`, and `LARGE_OUTSTANDING_BALANCE` are runtime-supported contracts only; B19 owns authoritative emission/resolution rules and must not be fabricated here. **UI:** authenticated-shell unread center, Romanian severity, polling/refetch, exact resource deep links, permission-safe. **Operational principle:** Logistics is an action queue, not the permanent WorkOrder registry. The server derives the queue from new unhandled work, readiness without an active transport, explicit pickup, and failed delivery; successful delegation removes the case, while failed transport and later ProbeReady/FinalReady state recreate the actionable context. **Tests/manual:** recipient/dedupe/unread/resolution/deadline/deep-link and fast-delegation scenarios.

### BILLING-WORKITEMS-001 — One commercial lifecycle
**Risk:** HIGH. **Dependencies:** WORKITEMS, DEADLINE-URGENCY, INTAKE-CUSTOM, TECH-EARNINGS. **Goal:** Item-aware aggregation once per case. Emit and resolve `PAYMENT_NOTE_REQUIRED` and `INVOICE_REQUIRED` only from authoritative commercial conditions; evaluate `LARGE_OUTSTANDING_BALANCE` using a Manager-configured, currency-safe threshold and resolve it when the balance falls below the threshold. Provide stable billing deep-link objectives without changing B18 notification persistence. **UI:** one billing case, configured arch/unit quantity, no maneuver/probe duplication, immutable PDFs. **Tests/manual:** multi-item, two probes, payment/storno/close, historical document.

### READMODEL-UI-001 — Case projections and legacy UI
**Risk:** MEDIUM. **Dependencies:** WORKDETAIL, PROBE-OPS, NOTIFICATIONS, BILLING. **Goal:** one top-level WorkOrder everywhere. **UI:** target terms, historical labels, pagination, detail boundaries, no obsolete selectors/plus/fixed probes. **Tests/manual:** new and historical case in every role.

### MIGRATION-HISTORY-001 — Controlled rollout
**Risk:** HIGH. **Dependencies:** LEGACY-COMPAT, PROBE, BILLING, READMODEL. **Goal:** resumable idempotent backfill and reconciliation. **Out:** reset/delete/rewrite snapshots. **UI:** migration status/warnings and continued old QR/document access. **Tests/manual:** staging dry run, partial retry, count reconciliation, approval gate.

### E2E-POSTMEETING-001 — Release gate
**Risk:** MEDIUM. **Dependencies:** all preceding subepics. **Goal:** validate final golden scenario, security, performance, migration, PDF, notifications, routes, and manual role audit. **UI:** no release without visible production click-through. **Tests/manual:** full scenario and legacy search.

## 7. Execution bundles

| Bundle | Included | Risk | Depends on |
|---|---|---|---|
| B01 | POSTMODEL-001 | MEDIUM | — |
| B02 | RBAC-AUDIT-001 | MEDIUM | B01 |
| B03 | WORKITEMS-001 | HIGH | B01–B02 |
| B04 | LEGACY-COMPAT-001 | HIGH | B03 |
| B05 | TOOTH-CONNECTIONS-001 | HIGH | B03 |
| B06 | TOOTH-DIAGRAM-001 | HIGH | B05 |
| B07 | LEGALENTITY-001 | MEDIUM-HIGH | B03, B02 |
| B08 | MULTIITEM-UI-001 | HIGH | B06–B07 |
| B09 | WORKDETAIL-UI-001 | MEDIUM-HIGH | B06, B08 |
| B10 | PROBE-001 | HIGH | B03–B04, B02 |
| B11 | DEADLINE-URGENCY-001 | MEDIUM-HIGH | B07, B10 |
| B12 | PROBE-FINALIZATION-001 | HIGH | B10–B11 |
| B13 | MANEUVER-UNIT-001 | HIGH | B01–B02 |
| B14 | MANEUVER-SCOPE-001 | HIGH | B06, B10, B13 |
| B15 | TECH-EARNINGS-001 | MEDIUM-HIGH | B12, B14 |
| B16 | INTAKE-CUSTOM-001 | MEDIUM | B07–B08 |
| B17 | PROBE-OPS-001 | HIGH | B07, B12, B15 |
| B18 | NOTIFICATIONS-001 | MEDIUM | B02, B12, B17 |
| B19 | BILLING-WORKITEMS-001 | HIGH | B08, B11, B15–B16 | In progress in current implementation: final-readiness gating, automatic CD/NG numbering, simplified invoice, immutable payment-note snapshot, deterministic urgency/discount handling, payment/storno history, and financial notification hooks. |
| B20 | READMODEL-UI-001 | MEDIUM | B09, B17–B19 |
| B21 | MIGRATION-HISTORY-001 | HIGH | B04, B10, B19–B20 |
| B22 | E2E-POSTMEETING-001 | MEDIUM | B21 |

Exit gate for each bundle: its automated checks, server RBAC/audit, visible role UI, responsive states, manual click-through, compatibility checks, and reversible/reconcilable data behavior pass. The handoff also records existing UI preserved, existing UI modified, legacy UI removed/hidden, new UI added, and regression tests run. High-risk bundles: B03, B04, B05, B06, B08, B10, B12, B13, B14, B17, B19, B21. Do not combine high-risk migration and billing work.

## 8. Remaining open decisions

| ID | Only remaining decision | Needed before |
|---|---|---|
| A | Behavior when both clinic and doctor are absent: block, explicit `fără context`, or later assignment. | B07 |
| D | Material WORK_UPDATED changes and recipients. | B18 |
| F | Whether/how Manager may correct performed maneuver entries, including reason/audit/financial rule. | B15 |

Resolved and removed: technician choice of `Probă gata`/`Finalizată`; case-level ProbeCycle; independent multi-items; broad scope; one billing lifecycle; derived legal context; real assets/mirroring; valid 11–21 and 41–31; four maneuver units; generalized maneuver scope; Decision C urgency policy: WorkOrder-level Normal 0%, Urgență 1 +35%, Urgență 2 +50%, Urgență 3 +75%, Urgență 4 +100%, applied once after item subtotal, with B19 retaining final discount precedence; Decision E catalog permission: Reception, Technician and Manager may explicitly save a human-readable custom WorkType name to the existing intake catalog, while only Manager may read or configure prices. One-off custom values remain usable without catalog persistence; there is no separate implant-platform persistence model because the operational platform list is the existing shared intake option set.

PRE-B20 intake clarification: initial WorkOrder reception is not a ProbeCycle and does not require or create a ProbeCycle/ProbeType. The initial operational WorkCycle remains the existing case/workflow anchor; real ProbeCycles still require a selectable ProbeType. The existing shared intake shade list (`WORK_SHADE_OPTIONS`) and implant-platform list (`IMPLANT_PLATFORM_OPTIONS`) remain the canonical operational options; no duplicate catalog model is introduced. Reception may select these values, historical free-text values remain readable, and the demo seed is convenience data rather than an application invariant. The user-facing technical `Cod` is `technicalCodeNotes` and is editable only through its dedicated Manager/Logistics/Technician permission; Reception remains read-only. B20–B22 remain not started.

Decision B resolved: ProbeType is one global laboratory catalog shared identically by CDT and NG. ProbeType has no legal-entity or organization ownership. Manager administers the catalog; Manager, Reception and Technician may select or correct the ProbeType associated with a ProbeCycle; Reception and Technician cannot administer the global catalog. ProbeType corrections are audited and completed historical ProbeCycles preserve their historical display meaning. Archived ProbeTypes remain readable in history and are unavailable for new active cycles until restored.

## 9. Master end-to-end scenario

1. Reception creates one WorkOrder for Test Patient, compatible CDT clinic/doctor, explicit date/time, and Urgență 2.
2. It contains Item A `TOOTH` 11 (X/A2/Alpha Bio/screw-retained), B `TOOTH` 12 (Y/A1), C `TOOTH` 21 (Z/B1), and D `LOWER_ARCH` Gutieră.
3. Real PNG/mirrored FDI behavior is correct; connections 11–12 and 11–21 persist. One WorkOrder remains.
4. The initial WorkOrder is claimable without a ProbeType or ProbeCycle. A real ProbeType is chosen only when the first technical probe context is opened. Technician and Logistics receive NEW WORK; click opens exact WorkOrder.
5. Technician A claims case; selects explicit teeth 11+12 for a maneuver (quantity 2, rate per element).
6. A selects `Probă gata`; the active first cycle closes into completed `Proba 1 — Lingură`. Logistics is notified; no finalization or invoice duplication; the whole case routes/delivers. The initial case did not require a fake return.
7. Case returns; Reception records `Recepționată`, selects Lingură again, enters a new deadline, and creates the next active cycle. It is completed as `Proba 2 — Lingură` only when the technician later selects `Probă gata`.
8. Technician B claims the same WorkOrder, adds another maneuver, and selects `Finalizată`; action is authorized/audited, ends the definitive technical case without producing another probe, and final logistics/courier continues.
9. Billing shows one WorkOrder; configured item commercial units apply, lower arch stays one unit, probes/maneuvers do not multiply customer value, urgency is applied once under C.
10. Manager sees immutable A/B earnings by scope and payment state. Payment, arrears, storno, close-month and documents remain consistent.
11. Historical WorkOrder and old issued document remain readable, downloadable, and numerically unchanged.

## 10. Mandatory role/UI regression audit

### Master test assertions

The release matrix must prove that explicit selected teeth 11 gives quantity 1, 11+12 gives 2, and 11+12+21 gives 3; duplicates do not increase quantity; invalid teeth are rejected; and lower/both-arch items, WorkOrder quantity, connections, and probe count never infer technician elements. It must also prove that New Work starts one active cycle with Reception-selected ProbeType and deadline, that `Probă gata` closes it as `Proba 1 — <type>` without a preceding return, that only `Recepționată` followed by Reception's next ProbeType/deadline creates the next active cycle, the next completion is Proba 2, the same type can repeat, and `Finalizată` ends the definitive technical case without creating another probe.

Manager: dashboard, Work Settings/Manopere with fixed per-element semantics and technician rates, technician payments, clinics/doctors/business ownership, billing, audit, notifications. Reception: fullscreen New Work, real diagram/mirroring, independent items, arch scope/shortcuts, inline entities, active ProbeType/deadline, completed Proba 1/2 history, editing, notifications. Technician: one case detail, dental composition, future B14 Add Manoperă with explicit FDI tooth selection, shortcuts, `Probă gata`, `Finalizată`, earnings, notifications, no company selector. Logistics: one row per WorkOrder, active/completed probe context, route builder, delivery/pickup, markers/notes, notifications. Courier: one WorkOrder per route case/stop and no tooth duplication.

Search visible UI for obsolete `Revenire`, user-facing legacy Stage/Workflow/Cycle, NC instead of CDT, company selector, global work type/color, fixed five probes, generic priority, fake tooth buttons/assets, central `+`, missing 11–21/41–31, maneuver payment without unit, duplicated case rows, and backend-only features.

## 11. Roadmap checkpoint

| Measure | Count |
|---|---:|
| Subepics | 22 |
| Execution bundles | 22 |
| High-risk bundles | 12 |
| Remaining open decisions | 5 |
| Master scenario steps | 11 |
| Implementation changes made while creating this roadmap | 0 |

Recommended first implementation bundle: **B01 / POSTMODEL-001**. It establishes only the canonical contract and compatibility guardrails; B02 must follow before new write paths.
