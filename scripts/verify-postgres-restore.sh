#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

fail() {
  printf 'verify-postgres-restore: %s\n' "$1" >&2
  exit 1
}

require_value() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "$name is required."
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

sha256_file() {
  local path="$1"
  local output

  if command -v sha256sum >/dev/null 2>&1; then
    output="$(sha256sum "$path")"
  elif command -v shasum >/dev/null 2>&1; then
    output="$(shasum -a 256 "$path")"
  else
    fail "sha256sum or shasum is required."
  fi

  printf '%s\n' "${output%% *}"
}

require_value RESTORE_BACKUP_FILE
require_value RESTORE_AGE_IDENTITY_FILE
require_value RESTORE_DATABASE_URL
require_value RESTORE_EXPECTED_DATABASE
require_value RESTORE_GUARD_TOKEN
require_command age
require_command pg_restore
require_command psql

[[ "${ALLOW_RESTORE_VERIFICATION:-false}" == "true" ]] || fail "Set ALLOW_RESTORE_VERIFICATION=true for an isolated restore test."
[[ "${ALLOW_DESTRUCTIVE_RESTORE:-}" == "$RESTORE_EXPECTED_DATABASE" ]] || fail "ALLOW_DESTRUCTIVE_RESTORE must exactly equal RESTORE_EXPECTED_DATABASE."
[[ -f "$RESTORE_BACKUP_FILE" ]] || fail "RESTORE_BACKUP_FILE does not exist."
[[ -f "$RESTORE_AGE_IDENTITY_FILE" ]] || fail "RESTORE_AGE_IDENTITY_FILE does not exist."

case "$RESTORE_DATABASE_URL" in
  *-pooler.*) fail "RESTORE_DATABASE_URL must be a direct PostgreSQL connection, not a pooled Neon URL." ;;
esac

actual_database="$(psql --dbname="$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'select current_database();')"
[[ "$actual_database" == "$RESTORE_EXPECTED_DATABASE" ]] || fail "Connected database does not match RESTORE_EXPECTED_DATABASE."
case "$actual_database" in
  postgres|template0|template1) fail "Refusing to restore into a PostgreSQL system database." ;;
esac

guard_present="$(printf '%s\n' "select exists (select 1 from public.restore_verification_guard where token = :'guard_token');" \
  | psql --dbname="$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -v guard_token="$RESTORE_GUARD_TOKEN" -Atq)"
[[ "$guard_present" == "t" ]] || fail "The isolated target does not contain the required restore verification guard."

checksum_file="$RESTORE_BACKUP_FILE.sha256"
if [[ -f "$checksum_file" ]]; then
  expected_checksum="$(awk 'NR == 1 { print $1 }' "$checksum_file")"
  [[ "$expected_checksum" =~ ^[0-9a-fA-F]{64}$ ]] || fail "The backup checksum file is malformed."
  actual_checksum="$(sha256_file "$RESTORE_BACKUP_FILE")"
  [[ "$actual_checksum" == "$expected_checksum" ]] || fail "The encrypted backup checksum does not match."
fi

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/dental-lab-restore.XXXXXXXX")"
trap 'rm -rf -- "$temporary_directory"' EXIT
plain_dump="$temporary_directory/database.dump"

age --decrypt --identity "$RESTORE_AGE_IDENTITY_FILE" --output "$plain_dump" "$RESTORE_BACKUP_FILE"
pg_restore --list "$plain_dump" >/dev/null

pg_restore \
  --clean \
  --file=- \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$plain_dump" \
  | psql --dbname="$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1

schema_check="$(psql --dbname="$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "select (to_regclass('public._prisma_migrations') is not null and to_regclass('public.work_orders') is not null and to_regclass('public.users') is not null);")"
[[ "$schema_check" == "t" ]] || fail "Required application tables are missing after restore."

unfinished_migrations="$(psql --dbname="$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc 'select count(*) from public._prisma_migrations where finished_at is null and rolled_back_at is null;')"
[[ "$unfinished_migrations" == "0" ]] || fail "The restored database contains unfinished Prisma migrations."

printf 'verify-postgres-restore: completed database=%s\n' "$actual_database"
