# Patients

## Status

Implemented.

## Purpose

Track patient identity and work history.

## Roles And Permissions

`patients.read`, `patients.create`, `patients.update`, `patients.archive`, `patients.documents.read`.

## Domain Concepts

Patient first/last name, normalized search fields, optional birth date, sex, notes, archive state.

## Business Rules

The patient has no operational code; work code remains the operational identifier. A patient can have many works.

## Data Model

`Patient`, relation to `WorkOrder`.

## API

`GET /patients`, `GET /patients/options`, `GET /patients/:id`, `GET /patients/:id/works`, `POST /patients`, `PATCH /patients/:id`, archive/restore.

## UI

`/patients`.

## Audit

Create/update/archive/restore.

## Security

Patient data is private. Use RBAC and avoid unnecessary exposure.

## Edge Cases

Duplicate names, archived patients with historical works, optional demographic fields.

## Implemented Tasks

PATIENTS-001.

## Planned Tasks

Patient document references and richer dossier may expand later.

## Deferred

Full patient document storage depends on file module.

## Open Decisions

Minimum legal/medical fields require client confirmation.

## Related Documents

[works.md](works.md), [clinics-doctors.md](clinics-doctors.md).
