#!/usr/bin/env bash
# Bounded-retry HTTP health check. Exits 0 only on a genuine 2xx response.
set -euo pipefail

usage() {
  echo "Usage: $0 <url> [max_attempts=10] [delay_seconds=3]" >&2
  exit 2
}

[ $# -ge 1 ] || usage

URL="$1"
MAX_ATTEMPTS="${2:-10}"
DELAY="${3:-3}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if curl --fail --silent --show-error --max-time 5 "$URL" > /dev/null; then
    echo "[HEALTH] OK: ${URL} (attempt ${attempt}/${MAX_ATTEMPTS})"
    exit 0
  fi
  echo "[HEALTH] Attempt ${attempt}/${MAX_ATTEMPTS} failed for ${URL}"
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$DELAY"
  fi
done

echo "[HEALTH] FAILED after ${MAX_ATTEMPTS} attempts: ${URL}" >&2
exit 1
