# Demo dataset

All demo data is fictional, deterministic and development-only. Do not use it as production seed data.

## Commands

Run the base development seed first:

```bash
pnpm --filter @dental-lab/api prisma:db:seed
```

Seed or reseed the demo dataset:

```bash
pnpm --filter @dental-lab/api prisma:db:seed:demo
```

Reset only demo data:

```bash
pnpm --filter @dental-lab/api prisma:db:reset-demo
```

The demo scripts set `ALLOW_DEMO_SEED=true` internally and refuse `NODE_ENV=production`.

## Demo Accounts

Password for all demo users: `DemoLab2026!`

Use only in local development:

- `manager@demo.local` - MANAGER
- `receptie@demo.local` - RECEPTIE
- `logistica@demo.local` - LOGISTICA
- `tehnician1@demo.local` - TEHNICIAN
- `tehnician2@demo.local` - TEHNICIAN
- `curier@demo.local` - CURIER
- `medic@demo.local` - MEDIC

## Dataset

- Laboratory: `Laborator Dentar Demo`, `Dental Lab Demo SRL`, fictive tax and registry data.
- Clinics: `Clinica Dentară Aurora`, `Smile Avenue`, `Cabinet Stomatologic Central`, `Dental Point`.
- Doctors: 9 fictional doctors distributed across the four clinics.
- Work types: 12 demonstrative price list entries, including one archived work type.
- Works: 48 work orders across current month, previous month and two months ago.
- Billing: 4 proformas, 8 invoices and 6 manual collection records.

## Stable Search Fixtures

- Patient: `Maria Dumitrescu`
- Clinic: `Clinica Dentară Aurora`
- Doctor: `Dr. Ana Popescu`
- Work code: `WO-2026-900001` for the 2026 demo year
- Proforma: `PF-2026-000001` for the 2026 demo year
- Invoice: `FACT-2026-000001` for the 2026 demo year
- Receipt: `CH-2026-001`
- Payment reference: `OP-DEMO-001`

Document years follow the year when the demo seed is run.

## Scenarios

- Unpaid overdue invoice: `FACT-<year>-000001`, no payments, due date in the past.
- Partial invoice: `FACT-<year>-000002`, total 1,000 RON, collected 400 RON, remaining 600 RON.
- Paid invoices: `FACT-<year>-000004`, `FACT-<year>-000005`, `FACT-<year>-000006`.
- Converted proforma history: `PF-<year>-000001` and `FACT-<year>-000008`.
- Cancelled invoice: `FACT-<year>-000007`.
- Clinic statement scenario: `Clinica Dentară Aurora` has multiple doctors, unpaid and partially paid invoices.

## Reset Strategy

Demo reset deletes only:

- users with `@demo.local` emails;
- records with stable `demo_` IDs;
- work, clinic and work type codes with demo prefixes;
- demo billing series `PFD` and `FACTD`.

It does not truncate tables and does not delete non-demo users or non-demo operational data.
