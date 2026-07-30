# Glossary

| Term | Meaning |
|---|---|
| Work order / lucrare | Operational dental lab work record, identified by a work code such as `WO-2026-000001`. |
| Clinica | External dental clinic/cabinet. |
| Medic | External doctor associated with a clinic. |
| Pacient | Patient identity record linked to work orders. |
| Receptie | Internal role that registers and manages intake work. |
| Tehnician | Internal role that claims and executes technical work. |
| Manager | Administrative/financial/operational role with broad access. |
| Curier | Delivery role with mobile-oriented delivery flow. |
| NC | Legal/financial context Nicolaie Cristina. |
| NG | Legal/financial context Nicolaie Gabriel. |
| Legal entity | Company context used for settings, pricing, documents, payments, and execution snapshots. |
| Claim | Technician or manager action that assigns active work ownership. |
| Release | Action that clears active ownership while preserving history and locked execution snapshot. |
| Reassign | Manager action that changes active technician while preserving locked execution context. |
| Ownership | Current operational responsibility for a work order. |
| Snapshot | Immutable/versioned copy of business facts at a point in time. |
| Catalog | Company-specific standard price list entries. |
| Agreement | Clinic or doctor commercial pricing rule with validity period. |
| Deadline | Calculated or manual operational due date. |
| Effective due date | The official deadline shown to users, from manual or calculated source. |
| Workflow | Template and execution of ordered technical stages for a work. |
| Stage | One workflow step, assignable/startable/completable. |
| NIR | Romanian inventory reception note. Planned, not implemented. |
| Bon de consum | Romanian material consumption document. Planned, not implemented. |
| Audit | Server-side record of critical actions. |
| RBAC | Role-based access control with permissions, scopes, roles, and overrides. |
| Public ID | Identifier safe for API/UI contract where needed. |
| Internal ID | Database identifier that should not be exposed unless necessary. |
