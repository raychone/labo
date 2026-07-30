# Clinics And Doctors

## Status

Implemented.

## Purpose

Manage external dental clinics and doctors.

## Roles And Permissions

Clinic permissions: `clinics.create`, `clinics.read`, `clinics.update`, `clinics.archive`. Doctor permissions: `doctors.create`, `doctors.read`, `doctors.update`, `doctors.archive`.

## Domain Concepts

Clinic, doctor, archive/restore, billing identity fields, clinic-doctor relationship.

## Business Rules

Doctors belong to clinics. Archived clinics/doctors should not be used for new active work.

## Data Model

`Clinic`, `Doctor`.

## API

`/clinics`, `/clinics/options`, `/clinics/:id`, archive/restore. `/doctors`, `/doctors/options`, `/doctors/:id`, archive/restore.

## UI

`/clinics` shows clinic and doctor management.

## Audit

Create/update/archive/restore actions.

## Security

Server-side validation and RBAC.

## Edge Cases

Archived entities with existing historical works; duplicate codes/emails.

## Implemented Tasks

CLINICS-001.

## Planned Tasks

Clinic return cycles and future doctor portal are planned separately.

## Deferred

External clinic/doctor self-service portal.

## Open Decisions

Doctor portal scope.

## Related Documents

[works.md](works.md), [patients.md](patients.md), [pricing.md](pricing.md).
