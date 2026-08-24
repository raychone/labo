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

Case/WorkOrder level: patient, clinic, doctor, derived legal entity, deadline date/time, urgency, general notes, active ProbeCycle, completed probe history, overall operational status, claim/release ownership, logistics/route/courier lifecycle, QR, and billing lifecycle. Initial New Work creates the active first technical cycle; it is not modeled as a returned probe. There is no automatic default execution deadline: Reception or Logistics enters it for New Work and for every returning case/new cycle; deadline history is preserved.

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

ProbeCycle belongs to the entire WorkOrder, never a tooth/item. The initial New Work creates an active cycle by selecting the current ProbeType and explicit deadline; it does not require a fake return. The active cycle is not counted as completed history until the technician selects `Probă gata`. That event closes the active cycle into `Proba 1 — <ProbeType>` and sends the case Technician → Logistics → Courier → Doctor/Clinic. If the case returns, Reception records visible status `Recepționată`, selects the next ProbeType and deadline, and creates the next active cycle. The next `Probă gata` closes it into `Proba 2 — <ProbeType>`, and so on. Probe numbers represent completed sequential cycles; ProbeType is selected before/during the active cycle. Cycles are unlimited and sequential, the same type may repeat, and `number` and data-driven `ProbeType` are separate. `Finalizată` means the technician definitively declares no more probe is expected, then final logistics/courier continues. Technician choice between `Probă gata` and `Finalizată` is server-authorized and audited; it is not an open decision.

Urgency replaces generic priority: `NONE` Fără urgență 0%; `URGENCY_1` +25%; `URGENCY_2` +50%; `URGENCY_3` +75%; `URGENCY_4` +100%. Only precedence against agreement discount, item override, and manual adjustment remains open. Historical priority remains readable.

Clinic/doctor collaboration determines CDT or NG. Incompatible context is rejected; technicians never choose the company. Authorized clinic/doctor UI visibly exposes business ownership. Missing both clinic and doctor follows Decision A below. New Work supports inline `Pacient nou`, `Clinică nouă`, `Medic nou`; created entities become immediately selectable and partially entered data is preserved. `Alt tip` and `Altă platformă` are one-off by default; explicit `Salvează în catalog` is permissioned and audited.

### Dental assets, FDI order, mirroring, and connections

The canonical source is the real PNG set in `assets/dinti`: `11.png`–`18.png` and `41.png`–`48.png`. Normal upper source 11–18 mirrors to 21–28; normal lower source 41–48 mirrors to 31–38. Mirroring is visual only: a mirrored image persists its displayed FDI identity (21, never 11).

Permanent adult order is upper `18 17 16 15 14 13 12 11 21 22 23 24 25 26 27 28`, lower `48 47 46 45 44 43 42 41 31 32 33 34 35 36 37 38`. No quadrant headings and no central `+`; midline adjacency 11–21 and 41–31 is valid.

Between every adjacent pair is a persisted clickable circular control: 15 upper + 15 lower = 30. Only anatomical neighbors may connect; no upper/lower cross-arch links. Store canonical normalized pairs so 11–12 and 12–11 cannot be distinct records. Connections require both teeth in meaningful case/component context. Removing a tooth removes orphan connections and shows a visible Romanian message.

Shortcuts are `Arcada superioară`, `Arcada inferioară`, `Ambele arcade`, `Șterge selecția`; manual changes remain possible. UI shortcut selection is distinct from semantic scope: lower-arch gutieră keeps `LOWER_ARCH`, not a meaningless array of 16 teeth.

Build one reusable dental diagram with modes `create`, `edit`, `readOnly`, `technician-operation-selection`, reused in Lucrare nouă, Editare lucrare, Detalii lucrare, and Add Manoperă. Real images are primary, FDI readable, states include unselected/configured/edited/read-only/connected/disabled, and no opaque overlay hides the PNG. Desktop/tablet/mobile must preserve anatomy and tappable controls; controlled horizontal scrolling is preferable to unusable shrinkage.

## 3. Operations and finance

Technicians claim/release the complete WorkOrder. Multiple technicians may work sequentially on it; ownership is never per tooth/item. A performed operation supports one tooth, several teeth, one/several items, upper/lower/both arches, or whole case. Conceptual fields: WorkOrder, technician, optional ProbeCycle, maneuver, scope type, selected FDI teeth, selected item IDs, quantity snapshot, unit-rate snapshot, total snapshot, performed time, notes. Normalized junction tables are acceptable.

Manager configures maneuver pricing units: `PER_ELEMENT` / Per element; `PER_UNIT` / Per unitate; `PER_ARCH` / Per arcadă; `PER_CASE` / Per lucrare. `PER_ELEMENT` counts only explicitly selected relevant dental elements/tooth identities: 11 = quantity 1; 11+12 = 2; 11+12+21 = 3. It never means WorkOrderItem count, and a lower-arch gutieră is not automatically 16 PER_ELEMENT units. `PER_UNIT` counts selected identifiable WorkOrderItems/components: one lower-arch Gutieră item = quantity 1; two applicable items = quantity 2, regardless of how many teeth each contains. `PER_ARCH` counts selected arches (upper=1, lower=1, both=2); `PER_CASE` is always one case. These are distinct rules. Add Manoperă adapts: PER_ELEMENT requires the reusable dental selector and shortcuts; PER_ARCH shows arches; PER_UNIT shows applicable WorkOrderItems; PER_CASE requires no tooth selection. Technician cannot edit rate. Every operation snapshots effective quantity, rate, and total; later manager price changes never alter old operations. Any correction is explicit, permissioned, audited.

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
**Risk:** HIGH. **Dependencies:** TOOTH-DIAGRAM, LEGALENTITY, WORKITEMS. **Goal:** One case with repeated add/configure target flow. **Scope:** case fields, per-item WorkType/color/platform/restoration/details, custom values, preserved partial form. **UI:** fullscreen Romanian flow, responsive and error states, one case not three. **Tests/manual:** 11/12/21 plus lower-arch gutieră.

### WORKDETAIL-UI-001 — Complete case detail/edit
**Risk:** MEDIUM-HIGH. **Dependencies:** MULTIITEM-UI, TOOTH-DIAGRAM, CONNECTIONS. **Goal:** Show diagram, scopes, connections, item data, case data. **UI:** exact readable fields and semantic arch/case scope; internal editing without cramped dialog. **Migration:** legacy explicit. **Audit/tests/manual:** edit current fields, protect issued/earning snapshots.

### PROBE-001 — Case-level unlimited ProbeCycle
**Risk:** HIGH. **Dependencies:** WORKITEMS, LEGACY-COMPAT, RBAC. **Goal:** Model the active first cycle and completed sequential probe history without confusing them. **Scope:** Initial New Work creates an active current cycle from Reception-selected ProbeType and deadline; `Probă gata` closes that active cycle as `Proba 1 — <type>`; only a returned case with `Recepționată` creates the next active cycle, whose completion becomes Proba 2, then N. **UI:** Reception chooses current ProbeType/deadline at New Work and next ProbeType/deadline after return; current active cycle and completed history are visibly distinct. **Out:** fake initial return, per-item cycle, fixed enum, billing per probe. **Migration:** old cycles map to history where safe and retain source labels where ambiguous. **Tests/manual:** initial active cycle without return, completion numbering, repeat type, N cycles, archived type, concurrency.

### DEADLINE-URGENCY-001 — Explicit deadlines and urgency
**Risk:** MEDIUM-HIGH. **Dependencies:** PROBE, LEGALENTITY, RBAC. **Goal:** Enter date/time, preserve history, keep 0/25/50/75/100 urgency. **UI:** visible before confirmation and in detail/billing. **Out:** automatic default. **Tests/manual:** exact time, returning case, boundaries; urgency is applied once after the item subtotal and B19 owns later discount precedence.

### PROBE-FINALIZATION-001 — Probă gata/Recepționată/Finalizată
**Risk:** HIGH. **Dependencies:** PROBE, DEADLINE-URGENCY, RBAC. **Goal:** Final confirmed technician choice and case transitions. **Scope:** `Probă gata` completes the active cycle into numbered history and enables the case-level logistics path; return is recorded as `Recepționată` before the next active cycle is selected; `Finalizată` ends the definitive technical case instead of producing another probe. **UI:** Workbench visibly offers both actions; Reception sees active-cycle versus completed `Proba 1/2` history and `Recepționată`; Logistics sees current probe/final context. **Audit:** server authorization and Romanian event text. **Tests/manual:** initial active cycle → `Probă gata` → logistics → return/`Recepționată` → next cycle → `Probă gata` → final.

### MANEUVER-UNIT-001 — Maneuver pricing units
**Risk:** HIGH. **Dependencies:** POSTMODEL, RBAC. **Goal:** Manager configures four units and rates with non-overlapping quantity semantics. **Scope:** PER_ELEMENT counts explicitly selected relevant FDI teeth only; PER_UNIT counts selected identifiable WorkOrderItems/components; PER_ARCH counts selected arches; PER_CASE counts one WorkOrder. A lower-arch item is never converted to 16 PER_ELEMENT units. **UI:** Work Settings/Maneuvers page visibly shows Romanian labels, unit definitions, examples, and validation. **Migration:** old operations unchanged and are not recalculated. **RBAC/audit:** manager-only configuration and audited changes. **Tests/manual:** 11=1, 11+12=2, 11+12+21=3; one lower-arch item=PER_UNIT 1; two items=2; arch and case examples.

### MANEUVER-SCOPE-001 — Add Manoperă scope UI
**Risk:** HIGH. **Dependencies:** MANEUVER-UNIT, TOOTH-DIAGRAM, WORKITEMS, PROBE. **Goal:** Generalized tooth/teeth/item/arch/case operation with deterministic unit behavior. **Scope:** PER_ELEMENT requires explicit relevant tooth selection from the WorkOrder and counts selected teeth, never WorkOrderItems; PER_UNIT requires selection of one or more applicable WorkOrderItems and counts components, never their internal tooth count; PER_ARCH and PER_CASE remain distinct. **UI:** controls adapt by unit, relevant teeth/items only, shortcuts, calculated quantity/total, no rate edit, responsive/error states; a lower-arch Gutieră PER_UNIT flow selects the component, while PER_ELEMENT never infers 16 teeth. **Migration:** legacy operations retain their snapshots and use explicit legacy/general scope where unavailable. **Audit:** selected scope and calculated quantity are readable. **Tests/manual:** all four units, 11/12/21 examples, one-versus-two components, and immutable snapshots.

### TECH-EARNINGS-001 — Earnings and payment read models
**Risk:** MEDIUM-HIGH. **Dependencies:** MANEUVER-SCOPE, PROBE-FINALIZATION. **Goal:** Multiple technician attribution and readable manager payments. **UI:** scope, quantity × rate, total, paid/unpaid, periods. **Out:** recalc. **Tests/manual:** A/B across cycles and payment history.

### INTAKE-CUSTOM-001 — One-off custom values
**Risk:** MEDIUM. **Dependencies:** MULTIITEM-UI, LEGALENTITY, RBAC. **Goal:** `Alt tip`/`Altă platformă` without silent catalog insertion. **UI:** one-off versus explicit save control. **Audit/tests/manual:** permission, duplicate, invalid, save/no-save paths.

### PROBE-OPS-001 — Case-level logistics/courier
**Risk:** HIGH. **Dependencies:** PROBE-FINALIZATION, TECH-EARNINGS, LEGALENTITY. **Goal:** Existing logistics/routes/delivery/pickup operate on one WorkOrder. **UI:** one row/stop, markers, route, outcomes, cycle context. **Tests/manual:** complete flow and failed outcome re-eligibility.

### NOTIFICATIONS-001 — Durable center and deep links
**Risk:** MEDIUM. **Dependencies:** RBAC, WORKDETAIL, PROBE-FINALIZATION, PROBE-OPS. **Goal:** Persist NEW WORK (Technician/Logistics), PROBE READY, FINAL WORK READY, material updates, route/billing/payment events. **UI:** highly visible unread center, filters, read/dismiss, exact resource deep links, permission-safe. **Tests/manual:** recipient/dedupe/unread/deep-link scenarios.

### BILLING-WORKITEMS-001 — One commercial lifecycle
**Risk:** HIGH. **Dependencies:** WORKITEMS, DEADLINE-URGENCY, INTAKE-CUSTOM, TECH-EARNINGS. **Goal:** Item-aware aggregation once per case. **UI:** one billing case, configured arch/unit quantity, no maneuver/probe duplication, immutable PDFs. **Tests/manual:** multi-item, two probes, payment/storno/close, historical document.

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
| B19 | BILLING-WORKITEMS-001 | HIGH | B08, B11, B15–B16 |
| B20 | READMODEL-UI-001 | MEDIUM | B09, B17–B19 |
| B21 | MIGRATION-HISTORY-001 | HIGH | B04, B10, B19–B20 |
| B22 | E2E-POSTMEETING-001 | MEDIUM | B21 |

Exit gate for each bundle: its automated checks, server RBAC/audit, visible role UI, responsive states, manual click-through, compatibility checks, and reversible/reconcilable data behavior pass. The handoff also records existing UI preserved, existing UI modified, legacy UI removed/hidden, new UI added, and regression tests run. High-risk bundles: B03, B04, B05, B06, B08, B10, B12, B13, B14, B17, B19, B21. Do not combine high-risk migration and billing work.

## 8. Remaining open decisions

| ID | Only remaining decision | Needed before |
|---|---|---|
| A | Behavior when both clinic and doctor are absent: block, explicit `fără context`, or later assignment. | B07 |
| D | Material WORK_UPDATED changes and recipients. | B18 |
| E | Exact permission for `Salvează în catalog`. | B16 |
| F | Whether/how Manager may correct performed maneuver entries, including reason/audit/financial rule. | B15 |

Resolved and removed: technician choice of `Probă gata`/`Finalizată`; case-level ProbeCycle; independent multi-items; broad scope; one billing lifecycle; derived legal context; real assets/mirroring; valid 11–21 and 41–31; four maneuver units; generalized maneuver scope; Decision C urgency policy: WorkOrder-level Normal 0%, Urgență 1 +25%, Urgență 2 +50%, Urgență 3 +75%, Urgență 4 +100%, applied once after item subtotal, with B19 retaining final discount precedence.

Decision B resolved: ProbeType is one global laboratory catalog shared identically by CDT and NG. ProbeType has no legal-entity or organization ownership. Manager administers the catalog; Manager, Reception and Technician may select or correct the ProbeType associated with a ProbeCycle; Reception and Technician cannot administer the global catalog. ProbeType corrections are audited and completed historical ProbeCycles preserve their historical display meaning. Archived ProbeTypes remain readable in history and are unavailable for new active cycles until restored.

## 9. Master end-to-end scenario

1. Reception creates one WorkOrder for Test Patient, compatible CDT clinic/doctor, explicit date/time, and Urgență 2.
2. It contains Item A `TOOTH` 11 (X/A2/Alpha Bio/screw-retained), B `TOOTH` 12 (Y/A1), C `TOOTH` 21 (Z/B1), and D `LOWER_ARCH` Gutieră.
3. Real PNG/mirrored FDI behavior is correct; connections 11–12 and 11–21 persist. One WorkOrder remains.
4. Reception chooses ProbeType Lingură for case-level Probe 1. Technician and Logistics receive NEW WORK; click opens exact WorkOrder.
5. Technician A claims case; adds PER_ELEMENT 11+12 (quantity 2) and PER_ARCH lower arch (quantity 1).
6. A selects `Probă gata`; the active first cycle closes into completed `Proba 1 — Lingură`. Logistics is notified; no finalization or invoice duplication; the whole case routes/delivers. The initial case did not require a fake return.
7. Case returns; Reception records `Recepționată`, selects Lingură again, enters a new deadline, and creates the next active cycle. It is completed as `Proba 2 — Lingură` only when the technician later selects `Probă gata`.
8. Technician B claims the same WorkOrder, adds another maneuver, and selects `Finalizată`; action is authorized/audited, ends the definitive technical case without producing another probe, and final logistics/courier continues.
9. Billing shows one WorkOrder; configured item commercial units apply, lower arch stays one unit, probes/maneuvers do not multiply customer value, urgency is applied once under C.
10. Manager sees immutable A/B earnings by scope and payment state. Payment, arrears, storno, close-month and documents remain consistent.
11. Historical WorkOrder and old issued document remain readable, downloadable, and numerically unchanged.

## 10. Mandatory role/UI regression audit

### Master test assertions

The release matrix must prove that PER_ELEMENT 11 gives quantity 1, 11+12 gives 2, and 11+12+21 gives 3; that a lower-arch Gutieră does not become 16 PER_ELEMENT units; that PER_UNIT on one identifiable lower-arch WorkOrderItem gives quantity 1 and on two applicable WorkOrderItems gives quantity 2 regardless of internal tooth counts; and that PER_ARCH/PER_CASE remain distinct calculations. It must also prove that New Work starts one active cycle with Reception-selected ProbeType and deadline, that `Probă gata` closes it as `Proba 1 — <type>` without a preceding return, that only `Recepționată` followed by Reception's next ProbeType/deadline creates the next active cycle, that the next completion is Proba 2, that the same type can repeat, and that `Finalizată` ends the definitive technical case without creating another probe.

Manager: dashboard, Work Settings/four maneuver units and their exact quantity rules, technician payments, clinics/doctors/business ownership, billing, audit, notifications. Reception: fullscreen New Work, real diagram/mirroring, independent items, arch scope/shortcuts, inline entities, active ProbeType/deadline, completed Proba 1/2 history, editing, notifications. Technician: one case detail, dental composition, Add Manoperă with PER_ELEMENT tooth selection versus PER_UNIT component selection, PER_ARCH/PER_CASE, shortcuts, `Probă gata`, `Finalizată`, earnings, notifications, no company selector. Logistics: one row per WorkOrder, active/completed probe context, route builder, delivery/pickup, markers/notes, notifications. Courier: one WorkOrder per route case/stop and no tooth duplication.

Search visible UI for obsolete `Revenire`, user-facing legacy Stage/Workflow/Cycle, NC instead of CDT, company selector, global work type/color, fixed five probes, generic priority, fake tooth buttons/assets, central `+`, missing 11–21/41–31, maneuver payment without unit, duplicated case rows, and backend-only features.

## 11. Roadmap checkpoint

| Measure | Count |
|---|---:|
| Subepics | 22 |
| Execution bundles | 22 |
| High-risk bundles | 12 |
| Remaining open decisions | 6 |
| Master scenario steps | 11 |
| Implementation changes made while creating this roadmap | 0 |

Recommended first implementation bundle: **B01 / POSTMODEL-001**. It establishes only the canonical contract and compatibility guardrails; B02 must follow before new write paths.
