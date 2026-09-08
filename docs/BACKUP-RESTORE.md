# Backup and Restore

This runbook defines the supported data-protection model for Dental Lab Management. It is operational guidance, not a claim that backups exist until an operator has configured, monitored, and successfully restored them.

## Authoritative data and storage inventory

PostgreSQL is the single authoritative store for normal application writes. It contains operational records, financial snapshots, audit history, sessions, notifications, delivery proof data, and uploaded work attachments (`WorkAttachment.content`). Billing PDFs, statements, and CSV exports are generated from persisted data on demand; they are not an independent source of truth.

The application does not write to a NAS during requests. A NAS is an optional backup destination only. A NAS outage must not block work intake, technician activity, logistics, invoicing, or payments.

## Supported profiles

| Profile | Primary database | First recovery layer | Independent recovery copy |
|---|---|---|---|
| Hybrid Cloud + NAS | Managed cloud PostgreSQL | Provider backup/PITR plus encrypted logical dump on NAS | Provider backup and/or encrypted object-storage copy outside the NAS site |
| Cloud only | Managed cloud PostgreSQL | Provider backup/PITR | Encrypted logical dump in a separate protected cloud account/bucket where practical |

There is no dual-write database, active-active PostgreSQL, or automatic failover to a writable NAS database. Restoring a backup is an explicit incident procedure.

## Recovery objectives

The following are initial operational targets, not guarantees:

- Target RPO: no more than 24 hours from the independent encrypted logical dump, while provider PITR may offer a smaller loss window according to the configured Neon plan and restore window.
- Target RTO: four hours for a rehearsed restore into a replacement cloud database and application redeploy.
- Restore verification: at least monthly and after material schema/infrastructure changes.

The laboratory owner must accept or replace these targets after measuring a real restore. Provider retention and restore-window values must be verified in the Neon console; they are plan/configuration dependent and must not be inferred from this repository.

## Backup prerequisites

Install compatible PostgreSQL client tools and `age` on the backup runner:

- `pg_dump` and `pg_restore` from the same or a newer PostgreSQL major version than the server;
- `age` for public-key encryption;
- `sha256sum` or `shasum`;
- a direct, unpooled PostgreSQL URL dedicated to backup access;
- an age recipient public key on the runner;
- an age identity/private key stored separately from the NAS and backup account.

Pre-create the protected backup target. For the hybrid profile, mount the NAS at that exact directory before scheduling the job. The script deliberately refuses a missing directory instead of creating a local fallback when a mount is unavailable.

Neon pooled hostnames contain `-pooler`. Use the pooled URL for normal API runtime traffic when appropriate, but use a direct URL for migrations, `pg_dump`, and restore work. See Neon's [connection pooling](https://neon.com/docs/connect/connection-pooling) and [migration/export guidance](https://neon.com/docs/import/migrate-from-neon).

Create a protected environment file outside Git, for example `/etc/dental-lab/backup.env`, readable only by the backup service account:

```text
BACKUP_DATABASE_URL=postgresql://...direct-host.../database?sslmode=require
BACKUP_TARGET_DIR=/mounted/backup/dental-lab/postgres
BACKUP_AGE_RECIPIENT=age1...
```

Do not place the age private key, a database password, or this environment file inside the backup destination.

## Create an encrypted logical backup

Load the protected environment and run:

```bash
set -a
. /etc/dental-lab/backup.env
set +a
./scripts/backup-postgres.sh
```

The script:

1. refuses a Neon pooled URL;
2. creates a transaction-consistent custom-format PostgreSQL dump;
3. validates the dump catalogue with `pg_restore --list`;
4. encrypts it with the configured age recipient;
5. verifies the encrypted copy checksum;
6. publishes the archive, SHA-256 file, and JSON manifest atomically, with the manifest last.

Only a set with all three files is a completed backup. The script returns non-zero on failure and prints no connection URL or credentials.

## Scheduling and alerting

Run the script once daily from a dedicated host or backup runner. A systemd template is preferred because failures are visible to the service manager:

```ini
[Unit]
Description=Dental Lab encrypted PostgreSQL backup
After=network-online.target

[Service]
Type=oneshot
User=dental-backup
EnvironmentFile=/etc/dental-lab/backup.env
WorkingDirectory=/opt/dental-lab-management
ExecStart=/opt/dental-lab-management/scripts/backup-postgres.sh
```

```ini
[Unit]
Description=Daily Dental Lab PostgreSQL backup

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

Connect service failure to the operator's monitoring channel. Alert when:

- a scheduled run exits non-zero;
- no completed manifest is newer than the agreed RPO;
- the NAS mount is missing/read-only/full;
- provider backup/PITR becomes unavailable;
- monthly restore verification is overdue.

Do not silently write backups to the runner's local filesystem when the expected NAS mount is absent. Configure and monitor the mount explicitly.

## Retention and isolation

An initial policy suitable for review is:

- daily encrypted logical backups: 35 days;
- monthly encrypted logical backups: 12 months;
- Neon provider backup/PITR: the longest restore window approved for the environment;
- one copy outside the NAS site/account.

Implement expiration using NAS snapshots/lifecycle controls and cloud object lifecycle rules, not an unreviewed recursive deletion command. Protect at least one copy with immutable/object-lock or append-only credentials where the chosen platform supports it. The backup writer should not be able to delete every historical copy.

## Safe restore verification

Never run the restore verifier against production. Create a disposable Neon branch or a separate isolated PostgreSQL database with no application traffic. Neon branches are suitable for testing and point-in-time investigation; see the [Neon branching guide](https://neon.com/docs/guides/branching-intro).

Before the first restore into that disposable target, create a guard that does not exist in production:

```sql
CREATE TABLE public.restore_verification_guard (
  token text PRIMARY KEY
);
INSERT INTO public.restore_verification_guard(token)
VALUES ('replace-with-a-random-one-time-guard');
```

Load restore variables from a protected environment file:

```text
RESTORE_BACKUP_FILE=/secure/path/dental-lab-YYYYMMDDTHHMMSSZ-N.dump.age
RESTORE_AGE_IDENTITY_FILE=/secure/key/location/age-identity.txt
RESTORE_DATABASE_URL=postgresql://...direct-isolated-host.../restore_database?sslmode=require
RESTORE_EXPECTED_DATABASE=restore_database
RESTORE_GUARD_TOKEN=replace-with-a-random-one-time-guard
ALLOW_RESTORE_VERIFICATION=true
ALLOW_DESTRUCTIVE_RESTORE=restore_database
```

Then run:

```bash
set -a
. /etc/dental-lab/restore-test.env
set +a
./scripts/verify-postgres-restore.sh
```

The verifier requires all explicit safety gates, checks the encrypted checksum when present, decrypts only into a restricted temporary directory, validates the archive, replaces objects only in the guarded target, and verifies core tables and Prisma migration completion.

After the script succeeds:

1. run `prisma migrate status` against the restored direct URL;
2. start an isolated API configured for the restored database;
3. verify `/health/ready`;
4. authenticate with a controlled test account or use read-only SQL checks approved for the restore environment;
5. sample counts and representative work, cycle, logistics, attachment, invoice, payment, audit, and technician-earning records;
6. download and validate at least one restored attachment;
7. render a representative invoice/statement;
8. record duration, backup timestamp, result, operator, and any errors;
9. destroy the disposable branch/database after evidence is retained.

A checksum or `pg_restore --list` alone is not a restore test.

## Incident behavior

### NAS unavailable

- The application continues against cloud PostgreSQL.
- The backup job fails loudly; it must not redirect to an unmonitored local path.
- Repair/remount the NAS and run an immediate catch-up dump.
- Confirm the off-site/provider copy remains healthy.
- Escalate if the last verified independent copy exceeds the accepted RPO.

### Cloud application unavailable, database healthy

- Keep the database authoritative and avoid manual writes.
- Deploy a replacement API/web instance with the same reviewed release and secrets.
- Run migrations only if the release requires them and only once via the direct URL.
- Confirm readiness before directing traffic.

### Database unavailable or corrupted

- Stop write traffic; capture incident timing and provider evidence.
- Prefer provider point-in-time/instant restore into a new branch/project when it gives the required recovery point.
- Otherwise restore the newest verified encrypted logical backup into a new isolated database.
- Validate before switching application configuration.
- Never restore over the only remaining production copy.

Neon restore capabilities and retention are configured service properties; verify them in the project settings and rehearse the chosen recovery path. See [Neon project restore-window guidance](https://neon.com/docs/manage/projects).

### Suspected credential compromise

- Revoke exposed database/user/session credentials and rotate application secrets.
- Revoke active application sessions if their confidentiality is uncertain.
- Preserve audit and infrastructure logs.
- Check backup credentials separately; rotate the age recipient only through a planned key transition that preserves access to historical copies.
- Rebuild from a trusted release and validate data integrity before reopening access.

## Evidence checklist

For every scheduled backup retain monitoring evidence of timestamp, archive size, checksum, and success/failure. For every restore exercise retain:

- source backup identifier and age;
- isolated target identifier;
- checksum result;
- restore start/end time;
- schema/migration checks;
- functional sample checks;
- measured RPO/RTO;
- operator and remediation notes.

Do not put patient data, credentials, or decrypted dumps in tickets or monitoring messages.
