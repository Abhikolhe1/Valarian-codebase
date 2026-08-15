#!/usr/bin/env bash
# Production deployment orchestrator. Same sequence and rollback behavior as
# deploy-uat.sh, but every path/port/process-name is unverified for production
# (no production SSH access was used to build this pipeline), so nothing is
# hardcoded here. All of it must be supplied as environment variables by the
# workflow before this script is trusted with a real run — see the required
# list below. Until those are confirmed against the real production server,
# treat this script as a reviewed draft, not a verified deployment path.
#
# Never enable `set -x` here — env files contain secrets.
set -euo pipefail

usage() {
  echo "Usage: $0 <commit-sha>" >&2
  echo "Requires PROD_DEPLOY_DIR, PROD_BACKEND_PM2_NAME, PROD_FRONTEND_PM2_NAME," >&2
  echo "PROD_ADMIN_PM2_NAME, PROD_BACKEND_HEALTH_URL, PROD_FRONTEND_HEALTH_URL," >&2
  echo "PROD_ADMIN_HEALTH_URL, PROD_BACKUP_DIR as environment variables." >&2
  exit 2
}
[ $# -eq 1 ] || usage
DEPLOY_SHA="$1"

: "${PROD_DEPLOY_DIR:?PROD_DEPLOY_DIR not set — confirm the real production checkout path before running this}"
: "${PROD_BACKEND_PM2_NAME:?PROD_BACKEND_PM2_NAME not set}"
: "${PROD_FRONTEND_PM2_NAME:?PROD_FRONTEND_PM2_NAME not set}"
: "${PROD_ADMIN_PM2_NAME:?PROD_ADMIN_PM2_NAME not set}"
: "${PROD_BACKEND_HEALTH_URL:?PROD_BACKEND_HEALTH_URL not set}"
: "${PROD_FRONTEND_HEALTH_URL:?PROD_FRONTEND_HEALTH_URL not set}"
: "${PROD_ADMIN_HEALTH_URL:?PROD_ADMIN_HEALTH_URL not set}"
: "${PROD_BACKUP_DIR:?PROD_BACKUP_DIR not set}"

DEPLOY_DIR="$PROD_DEPLOY_DIR"
BACKEND_DIR="${DEPLOY_DIR}/valiarian-backend"
FRONTEND_DIR="${DEPLOY_DIR}/valiarian-frontend"
ADMIN_DIR="${DEPLOY_DIR}/Valiarian-admin-panel"

BACKEND_PM2_NAME="$PROD_BACKEND_PM2_NAME"
FRONTEND_PM2_NAME="$PROD_FRONTEND_PM2_NAME"
ADMIN_PM2_NAME="$PROD_ADMIN_PM2_NAME"

BACKEND_HEALTH_URL="$PROD_BACKEND_HEALTH_URL"
FRONTEND_HEALTH_URL="$PROD_FRONTEND_HEALTH_URL"
ADMIN_HEALTH_URL="$PROD_ADMIN_HEALTH_URL"

BACKUP_DIR="$PROD_BACKUP_DIR"
BACKUP_RETENTION_DAYS="${PROD_BACKUP_RETENTION_DAYS:-14}"

SCRIPT_DIR="${DEPLOY_DIR}/scripts"

log() { echo "[$1] $2"; }

log DEPLOY "Deploying commit ${DEPLOY_SHA} to PRODUCTION"

deploy_backend() {
  log BACKEND "Installing dependencies"
  ( cd "$BACKEND_DIR" && npm ci )

  log BACKEND "Building (staged, not yet live)"
  rm -rf "${BACKEND_DIR}/dist.new"
  ( cd "$BACKEND_DIR" && npx lb-tsc --outDir dist.new )
  [ -f "${BACKEND_DIR}/dist.new/index.js" ] || { log BACKEND "build did not produce dist.new/index.js"; rm -rf "${BACKEND_DIR}/dist.new"; return 1; }

  log BACKEND "Swapping in new build"
  rm -rf "${BACKEND_DIR}/dist.prev"
  if [ -d "${BACKEND_DIR}/dist" ]; then mv "${BACKEND_DIR}/dist" "${BACKEND_DIR}/dist.prev"; fi
  mv "${BACKEND_DIR}/dist.new" "${BACKEND_DIR}/dist"

  log MIGRATION "Running schema migration (autoupdate, never --rebuild)"
  if ! ( cd "$BACKEND_DIR" && node ./dist/migrate ); then
    log MIGRATION "FAILED — restoring previous backend build, database is left as-is for manual review"
    rollback_backend
    return 1
  fi
  log MIGRATION "Completed"

  log BACKEND "Reloading PM2 process ${BACKEND_PM2_NAME}"
  if ! pm2 reload "$BACKEND_PM2_NAME" --update-env; then
    log BACKEND "pm2 reload failed — restoring previous build"
    rollback_backend
    return 1
  fi

  log HEALTH "Checking backend"
  if ! bash "${SCRIPT_DIR}/health-check.sh" "$BACKEND_HEALTH_URL" 10 3; then
    log HEALTH "Backend failed health check — rolling back"
    rollback_backend
    return 1
  fi
  log HEALTH "Backend OK"
  return 0
}

rollback_backend() {
  if [ -d "${BACKEND_DIR}/dist.prev" ]; then
    rm -rf "${BACKEND_DIR}/dist"
    mv "${BACKEND_DIR}/dist.prev" "${BACKEND_DIR}/dist"
    pm2 reload "$BACKEND_PM2_NAME" --update-env || true
    if bash "${SCRIPT_DIR}/health-check.sh" "$BACKEND_HEALTH_URL" 5 3; then
      log ROLLBACK "Backend restored to previous release and healthy"
    else
      log ROLLBACK "Backend restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous backend build available to restore — needs manual attention"
  fi
}

deploy_static_app() {
  local name="$1" dir="$2" pm2_name="$3" health_url="$4"

  log "${name^^}" "Installing dependencies"
  ( cd "$dir" && npm ci )

  log "${name^^}" "Building (staged, not yet live)"
  rm -rf "${dir}/build.new"
  ( cd "$dir" && BUILD_PATH=build.new GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=2048" npm run build )
  [ -f "${dir}/build.new/index.html" ] || { log "${name^^}" "build did not produce build.new/index.html"; rm -rf "${dir}/build.new"; return 1; }

  log "${name^^}" "Swapping in new build"
  rm -rf "${dir}/build.prev"
  if [ -d "${dir}/build" ]; then mv "${dir}/build" "${dir}/build.prev"; fi
  mv "${dir}/build.new" "${dir}/build"

  log "${name^^}" "Restarting PM2 process ${pm2_name}"
  if ! pm2 restart "$pm2_name"; then
    log "${name^^}" "pm2 restart failed — restoring previous build"
    rollback_static_app "$name" "$dir" "$pm2_name" "$health_url"
    return 1
  fi

  log HEALTH "Checking ${name}"
  if ! bash "${SCRIPT_DIR}/health-check.sh" "$health_url" 10 3; then
    log HEALTH "${name^} failed health check — rolling back"
    rollback_static_app "$name" "$dir" "$pm2_name" "$health_url"
    return 1
  fi
  log HEALTH "${name^} OK"
  return 0
}

rollback_static_app() {
  local name="$1" dir="$2" pm2_name="$3" health_url="$4"
  if [ -d "${dir}/build.prev" ]; then
    rm -rf "${dir}/build"
    mv "${dir}/build.prev" "${dir}/build"
    pm2 restart "$pm2_name" || true
    if bash "${SCRIPT_DIR}/health-check.sh" "$health_url" 5 3; then
      log ROLLBACK "${name^} restored to previous release and healthy"
    else
      log ROLLBACK "${name^} restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous ${name} build available to restore — needs manual attention"
  fi
}

LOCK_FILE="/var/lock/valiarian-production-deploy.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log DEPLOY "Another production deployment is already in progress. Aborting."
  exit 1
fi

log DB "Creating PostgreSQL backup"
BACKUP_FILE="$(bash "${SCRIPT_DIR}/backup-db.sh" "${BACKEND_DIR}/.env" "$BACKUP_DIR" "$BACKUP_RETENTION_DAYS" valiarian-production)"
log DB "Backup verified: ${BACKUP_FILE}"

if ! deploy_backend; then
  log DEPLOY "PRODUCTION deployment FAILED at backend stage. Frontend/admin were not touched."
  exit 1
fi

if ! deploy_static_app frontend "$FRONTEND_DIR" "$FRONTEND_PM2_NAME" "$FRONTEND_HEALTH_URL"; then
  log DEPLOY "PRODUCTION deployment FAILED at frontend stage. Backend deployed successfully; frontend rolled back."
  exit 1
fi

if ! deploy_static_app admin "$ADMIN_DIR" "$ADMIN_PM2_NAME" "$ADMIN_HEALTH_URL"; then
  log DEPLOY "PRODUCTION deployment FAILED at admin stage. Backend and frontend deployed successfully; admin rolled back."
  exit 1
fi

log DEPLOY "PRODUCTION deployment successful — commit ${DEPLOY_SHA} is live"
