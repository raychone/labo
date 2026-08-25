# Seed-uri

## Seed tehnic

`pnpm --filter @dental-lab/api prisma:seed:technical`

Conține catalogul reutilizabil al aplicației: tipuri de lucrări active, probe, opțiuni de finisare/culoare din catalog și manoperele tehnicianului. Lista de platforme implant este o opțiune de formular, nu o entitate de date separată. Nu creează pacienți, clinici, medici sau lucrări demo.

## Seed demo

`pnpm seed:demo`

Conține utilizatorii demo, clinicile, medicii, pacienții, lucrările, ciclurile/probele, fluxurile, logistica, traseele și documentele de facturare necesare demonstrației. Resetarea demo afectează doar datele cu prefix `demo_`.

## Deploy

`pnpm --filter @dental-lab/api prisma:seed:once:deploy` rulează catalogul tehnic o singură dată. Dacă este necesar un mediu demo la prima instalare, se setează `SEED_DEMO_ON_FIRST_DEPLOY=true`; markerul `initial-deployment` din tabela `seed_runs` împiedică reseed-ul la următoarele deploy-uri.

Configurarea juridică, rolurile și permisiunile rămân în seed-ul de bază `prisma/seed.ts`, iar datele reale introduse ulterior nu sunt șterse de seed-ul tehnic.
