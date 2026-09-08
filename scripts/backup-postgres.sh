#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

fail() {
  printf 'backup-postgres: %s\n' "$1" >&2
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

require_value BACKUP_DATABASE_URL
require_value BACKUP_TARGET_DIR
require_value BACKUP_AGE_RECIPIENT
require_command age
require_command pg_dump
require_command pg_restore

case "$BACKUP_DATABASE_URL" in
  *-pooler.*) fail "BACKUP_DATABASE_URL must be a direct PostgreSQL connection, not a pooled Neon URL." ;;
esac

[[ -d "$BACKUP_TARGET_DIR" ]] || fail "BACKUP_TARGET_DIR must already exist; refusing to create a possible local fallback for a missing mount."
[[ -w "$BACKUP_TARGET_DIR" ]] || fail "BACKUP_TARGET_DIR is not writable."

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/dental-lab-backup.XXXXXXXX")"
backup_timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="dental-lab-${backup_timestamp}-$$.dump.age"
final_archive="$BACKUP_TARGET_DIR/$backup_name"
final_checksum="$final_archive.sha256"
final_manifest="$final_archive.json"
staged_archive="$BACKUP_TARGET_DIR/.$backup_name.partial"
staged_checksum="$BACKUP_TARGET_DIR/.$backup_name.sha256.partial"
staged_manifest="$BACKUP_TARGET_DIR/.$backup_name.json.partial"

cleanup() {
  rm -rf -- "$temporary_directory"
  rm -f -- "$staged_archive" "$staged_checksum" "$staged_manifest"
}
trap cleanup EXIT

plain_dump="$temporary_directory/database.dump"
encrypted_dump="$temporary_directory/$backup_name"

PGDATABASE="$BACKUP_DATABASE_URL" pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$plain_dump"

pg_restore --list "$plain_dump" >/dev/null
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted_dump" "$plain_dump"

archive_checksum="$(sha256_file "$encrypted_dump")"
archive_size="$(wc -c < "$encrypted_dump" | tr -d '[:space:]')"

install -m 0600 "$encrypted_dump" "$staged_archive"
copied_checksum="$(sha256_file "$staged_archive")"
[[ "$archive_checksum" == "$copied_checksum" ]] || fail "The encrypted archive changed while being copied."

printf '%s  %s\n' "$archive_checksum" "$backup_name" > "$staged_checksum"
printf '{"formatVersion":1,"createdAt":"%s","archive":"%s","bytes":%s,"sha256":"%s","encryption":"age","dumpFormat":"postgres-custom"}\n' \
  "$backup_timestamp" "$backup_name" "$archive_size" "$archive_checksum" > "$staged_manifest"
chmod 0600 "$staged_checksum" "$staged_manifest"

mv -- "$staged_archive" "$final_archive"
mv -- "$staged_checksum" "$final_checksum"
mv -- "$staged_manifest" "$final_manifest"

printf 'backup-postgres: completed archive=%s bytes=%s\n' "$backup_name" "$archive_size"
