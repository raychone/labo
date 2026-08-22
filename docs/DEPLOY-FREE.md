# Deploy online pentru demo

Acest ghid publică aplicația pentru prezentare, nu pentru date reale de pacienți. Configurația recomandată este:

- API NestJS pe Render Web Service Free;
- frontend Vite pe Render Static Site Free;
- PostgreSQL pe Neon Free.

Atașamentele sunt păstrate în PostgreSQL, deci pentru demo nu este necesar un disk persistent separat.

## 1. Pregătește repository-ul

1. Creează un repository privat pe GitHub și urcă proiectul.
2. Verifică să nu fie urcat `.env`, parole sau URL-uri de bază de date.
3. Păstrează fișierul `render.yaml` în rădăcina repository-ului.

Nu folosi date reale de pacienți în baza gratuită de demo.

## 2. Creează baza de date gratuită

1. Intră pe [neon.tech](https://neon.tech) și creează cont.
2. Creează un proiect PostgreSQL, de exemplu `dental-lab-demo`.
3. Din **Connect** copiază ambele connection string-uri:
   - pooled, cel care conține `-pooler`, pentru `DATABASE_URL`;
   - direct, fără `-pooler`, pentru `DIRECT_URL` și migrații Prisma.
4. Păstrează-le temporar într-un password manager. Nu le pune în GitHub.

Neon oferă pooling și pe planul Free; pentru acest demo este suficient. Verifică limita curentă în pagina planului înainte de prezentare.

## 3. Creează serviciile Render

1. Intră pe [render.com](https://render.com) și creează cont cu GitHub.
2. Alege **New → Blueprint**.
3. Selectează repository-ul și branch-ul principal.
4. Render va detecta `render.yaml` și va propune `dental-lab-api` și `dental-lab-web`.
5. Pentru API completează:
   - `DATABASE_URL` cu URL-ul Neon pooled (`-pooler`);
   - `DIRECT_URL` cu URL-ul Neon direct, fără `-pooler`.
6. Pentru `WEB_ORIGIN` și `VITE_API_BASE_URL` poți pune temporar valorile sugerate de Render sau le poți lăsa pentru pasul următor.
7. Confirmă planul **Free** și pornește deploy-ul.

După crearea serviciilor, copiază URL-urile reale din Render:

- API: `https://<numele-api>.onrender.com`
- Web: `https://<numele-web>.onrender.com`

Apoi actualizează exact aceste variabile:

- în API, `WEB_ORIGIN=https://<numele-web>.onrender.com`;
- în Web, `VITE_API_BASE_URL=https://<numele-api>.onrender.com`.

Nu adăuga slash la final. Salvează variabilele și declanșează un redeploy pentru ambele servicii.

## 4. Verifică migrarea și API-ul

Build-ul API rulează automat `prisma migrate deploy` înainte de pornirea serviciului. Este pus în `buildCommand` deoarece `preDeployCommand` este disponibil pe Render pentru servicii plătite, nu pentru Web Service Free.

Deschide:

```text
https://<numele-api>.onrender.com/health
```

Răspunsul trebuie să indice că API-ul este pornit și baza de date este disponibilă. Dacă migration command eșuează, verifică în Render log-urile serviciului și că `DATABASE_URL` este URL-ul Neon complet, inclusiv SSL.

## 5. Rulează seed-ul inițial și seed-ul demo

Seed-ul demo nu se rulează automat la fiecare deploy și nu poate rula cu `NODE_ENV=production`. Rulează-l o singură dată, local, către baza Neon, după ce migrarea a reușit.

În terminal, din rădăcina proiectului:

```bash
export DATABASE_URL='URL-ul-Neon-pooler'
export DIRECT_URL='URL-ul-Neon-direct-fara-pooler'
export NODE_ENV=development
export AUTH_SEED_EMAIL='admin-demo@example.com'
export AUTH_SEED_PASSWORD='schimba-cu-o-parola-lunga-si-unica'
export AUTH_SEED_DISPLAY_NAME='Demo Administrator'

pnpm --filter @dental-lab/api prisma:seed:deploy
ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:seed:demo:deploy
```

Seed-ul demo creează utilizatorii de prezentare:

```text
manager@demo.local
receptie@demo.local
logistica@demo.local
tehnician1@demo.local
tehnician2@demo.local
curier@demo.local
medic@demo.local
```

Parola demo existentă în seed este `DemoLab2026!`. Pentru instanța Render de prezentare, butoanele de acces rapid sunt activate prin `VITE_DEMO_MODE=true` în frontend și `DEMO_LOGIN_ENABLED=true` în API. Acestea permit oricui are URL-ul să intre direct în profilurile demo, deci dezactivează ambele variabile înainte de utilizarea reală a aplicației.

Dacă vrei să refaci demo-ul de la zero, numai pe această bază de prezentare, rulează:

```bash
export DATABASE_URL='URL-ul-Neon-pooler'
export DIRECT_URL='URL-ul-Neon-direct-fara-pooler'
export NODE_ENV=development
ALLOW_DEMO_SEED=true pnpm --filter @dental-lab/api prisma:reset:demo:deploy
```

Nu rula reset-ul pe o bază care conține date reale.

## 6. Checklist înainte de prezentare

- deschide frontend-ul și fă login cu fiecare rol demo;
- verifică lucrări, status, billing, catalog, atașamente și preview-ul imaginilor;
- verifică trasee, asignarea curierului și pagina curierului pe telefon;
- verifică exporturile PDF și CSV;
- verifică că API-ul răspunde la `/health`;
- fă un request în API înainte de demo, deoarece serviciul Render Free poate porni la rece după o perioadă fără trafic;
- nu folosi carduri, date medicale reale sau parole reale.

## 7. Deploy-uri ulterioare

La fiecare push pe branch-ul conectat, Render poate redeploya automat. Migrațiile noi sunt aplicate în build-ul API. Nu rerula seed-ul demo după fiecare push: seed-ul este pentru popularea inițială a mediului de prezentare.

Pentru un mediu real va trebui ulterior să treci la backup-uri, monitorizare, secrete gestionate, politici de retenție și planuri plătite; configurația Free este doar pentru demonstrație.
