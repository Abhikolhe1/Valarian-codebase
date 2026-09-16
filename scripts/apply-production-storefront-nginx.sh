#!/usr/bin/env bash
# Install the repository-managed production storefront vhost with validation
# and automatic rollback. This script intentionally cannot target UAT.
set -euo pipefail

[ $# -eq 1 ] || { echo "Usage: $0 <production-nginx-config>" >&2; exit 2; }
SOURCE_CONFIG="$1"
[ -f "$SOURCE_CONFIG" ] || { echo "Missing production Nginx config: $SOURCE_CONFIG" >&2; exit 1; }

mapfile -t ENABLED_MATCHES < <(
  grep -l -E 'server_name[[:space:]]+valiarian\.com([[:space:]]|;)' \
    /etc/nginx/sites-enabled/* 2>/dev/null || true
)

if [ "${#ENABLED_MATCHES[@]}" -ne 1 ]; then
  echo "Expected exactly one enabled valiarian.com vhost; found ${#ENABLED_MATCHES[@]}" >&2
  exit 1
fi

TARGET_CONFIG="$(readlink -f "${ENABLED_MATCHES[0]}")"
[ -f "$TARGET_CONFIG" ] || { echo "Resolved production Nginx target is not a file: $TARGET_CONFIG" >&2; exit 1; }

BACKUP_DIR="/var/backups/valiarian/production/nginx"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/$(basename "$TARGET_CONFIG").$(date -u +%Y%m%dT%H%M%SZ).bak"
cp -a "$TARGET_CONFIG" "$BACKUP_FILE"
install -m 0644 "$SOURCE_CONFIG" "$TARGET_CONFIG"

restore_previous_config() {
  cp -a "$BACKUP_FILE" "$TARGET_CONFIG"
  nginx -t
  systemctl reload nginx
}

if ! nginx -t; then
  echo "New production Nginx configuration is invalid; restoring ${BACKUP_FILE}" >&2
  restore_previous_config
  exit 1
fi

if ! systemctl reload nginx; then
  echo "Production Nginx reload failed; restoring ${BACKUP_FILE}" >&2
  restore_previous_config
  exit 1
fi

echo "Activated production storefront Nginx configuration; backup: ${BACKUP_FILE}"
