#!/usr/bin/env bash
# Creates a verified pg_dump backup before any migration is allowed to run.
# Never enable `set -x` in this file — PGPASSWORD would be traceable in job logs.
set -euo pipefail

usage() {
  echo "Usage: $0 <backend-env-file> <backup-dir> <retention-days> <label>" >&2
  exit 2
}

[ $# -eq 4 ] || usage

ENV_FILE="$1"
BACKUP_DIR="$2"
RETENTION_DAYS="$3"
LABEL="$4"

[ -f "$ENV_FILE" ] || { echo "[DB] env file not found: $ENV_FILE" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"

set -a
# shellcheck disable=SC1090
source <(grep -E '^(PG_HOST|PG_PORT|PG_USER|PG_PASSWORD|PG_DATABASE)=' "$ENV_FILE")
set +a

: "${PG_HOST:?PG_HOST missing from $ENV_FILE}"
: "${PG_PORT:?PG_PORT missing from $ENV_FILE}"
: "${PG_USER:?PG_USER missing from $ENV_FILE}"
: "${PG_PASSWORD:?PG_PASSWORD missing from $ENV_FILE}"
: "${PG_DATABASE:?PG_DATABASE missing from $ENV_FILE}"

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${LABEL}-${TIMESTAMP}.dump"

echo "[DB] Creating PostgreSQL backup -> ${BACKUP_FILE}" >&2
if ! PGPASSWORD="$PG_PASSWORD" pg_dump -Fc \
    -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" \
    -f "$BACKUP_FILE"; then
  echo "[DB] BACKUP FAILED — deployment must not continue." >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
  echo "[DB] Backup file is empty or missing — deployment must not continue." >&2
  exit 1
fi

echo "[DB] Verifying backup is a readable dump..." >&2
if ! PGPASSWORD="$PG_PASSWORD" pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
  echo "[DB] Backup verification FAILED (pg_restore --list could not read the dump) — deployment must not continue." >&2
  exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "[DB] Backup verified: ${BACKUP_FILE} (${SIZE})" >&2

echo "[DB] Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}" >&2
find "$BACKUP_DIR" -maxdepth 1 -name "${LABEL}-*.dump" -type f -mtime "+${RETENTION_DAYS}" -print -delete >&2

# Only the backup path goes to stdout, for callers to capture with $(...)
echo "$BACKUP_FILE"
