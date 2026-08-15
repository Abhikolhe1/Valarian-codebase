#!/usr/bin/env bash
# UAT deployment orchestrator. Runs ON THE SERVER, invoked over SSH after the
# repo at DEPLOY_DIR has already been fetched/reset to the target commit.
#
# Sequence: backup -> verify -> backend build -> migrate -> backend reload ->
#           backend health check -> frontend build+swap -> health check ->
#           admin build+swap -> health check.
# Any failure rolls back the affected app's release artifact (dist/build) and
# reloads it back to the previous known-good state. The database is NEVER
# rolled back automatically.
#
# Never enable `set -x` here — env files contain secrets.
set -euo pipefail

usage() {
  echo "Usage: $0 <commit-sha>" >&2
  exit 2
}
[ $# -eq 1 ] || usage
DEPLOY_SHA="$1"

DEPLOY_DIR="/var/www/valiarian-uat/Valarian-codebase"
BACKEND_DIR="${DEPLOY_DIR}/valiarian-backend"
FRONTEND_DIR="${DEPLOY_DIR}/valiarian-frontend"
ADMIN_DIR="${DEPLOY_DIR}/Valiarian-admin-panel"

BACKEND_PM2_NAME="valiarian-backend-uat"
FRONTEND_PM2_NAME="valiarian-frontend-uat"
ADMIN_PM2_NAME="valiarian-admin-uat"

BACKEND_HEALTH_URL="http://127.0.0.1:3055/health"
FRONTEND_HEALTH_URL="http://127.0.0.1:3001/"
ADMIN_HEALTH_URL="http://127.0.0.1:4001/"

BACKUP_DIR="/var/backups/valiarian/uat"
BACKUP_RETENTION_DAYS="14"

SCRIPT_DIR="${DEPLOY_DIR}/scripts"

log() { echo "[$1] $2"; }

log DEPLOY "Deploying commit ${DEPLOY_SHA} to UAT"

# ---- Backend: build to a staging dir, never touch the live dist/ until it compiles clean
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

# ---- Static apps (frontend / admin): build to a staging dir, atomic swap, restart pm2 serve
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

# ---- Sequence ----
LOCK_FILE="/var/lock/valiarian-uat-deploy.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log DEPLOY "Another UAT deployment is already in progress. Aborting."
  exit 1
fi

log DB "Creating PostgreSQL backup"
BACKUP_FILE="$(bash "${SCRIPT_DIR}/backup-db.sh" "${BACKEND_DIR}/.env" "$BACKUP_DIR" "$BACKUP_RETENTION_DAYS" valiarian-uat)"
log DB "Backup verified: ${BACKUP_FILE}"

if ! deploy_backend; then
  log DEPLOY "UAT deployment FAILED at backend stage. Frontend/admin were not touched."
  exit 1
fi

if ! deploy_static_app frontend "$FRONTEND_DIR" "$FRONTEND_PM2_NAME" "$FRONTEND_HEALTH_URL"; then
  log DEPLOY "UAT deployment FAILED at frontend stage. Backend deployed successfully; frontend rolled back."
  exit 1
fi

if ! deploy_static_app admin "$ADMIN_DIR" "$ADMIN_PM2_NAME" "$ADMIN_HEALTH_URL"; then
  log DEPLOY "UAT deployment FAILED at admin stage. Backend and frontend deployed successfully; admin rolled back."
  exit 1
fi

log DEPLOY "UAT deployment successful — commit ${DEPLOY_SHA} is live"
