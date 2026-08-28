#!/usr/bin/env bash
# Production deployment orchestrator for the verified srv1547800 layout.
#
# Sequence: backup -> backend build -> migrate -> backend reload -> backend
#           health check -> frontend build+publish -> health check -> admin
#           build+swap -> admin health check -> nginx cutover -> final checks.
# Any failure rolls back the affected app's release artifact (dist/build) and
# reloads/restarts it back to the previous known-good state. The database is
# NEVER rolled back automatically.
#
# Never enable `set -x` here: application env files contain secrets.
set -euo pipefail

[ $# -eq 1 ] || { echo "Usage: $0 <commit-sha>" >&2; exit 2; }
DEPLOY_SHA="$1"
DEPLOY_DIR="/var/www/valiarian/Valarian-codebase"
BACKEND_DIR="${DEPLOY_DIR}/valiarian-backend"
FRONTEND_DIR="${DEPLOY_DIR}/valiarian-frontend"
ADMIN_DIR="${DEPLOY_DIR}/Valiarian-admin-panel"
WEB_ROOT="/var/www/html"
BACKUP_DIR="/var/backups/valiarian/production"
SCRIPT_DIR="${DEPLOY_DIR}/scripts"

log() { echo "[$1] $2"; }

exec 200>/var/lock/valiarian-production-deploy.lock
flock -n 200 || { log DEPLOY "Another production deployment is in progress"; exit 1; }

log DB "Creating verified PostgreSQL backup"
BACKUP_FILE="$(bash "${SCRIPT_DIR}/backup-db.sh" "${BACKEND_DIR}/.env" "$BACKUP_DIR" 14 valiarian-production)"
log DB "Backup verified: ${BACKUP_FILE}"

# ---- Backend: build to a staging dir, never touch the live dist/ until it compiles clean
deploy_backend() {
  log BACKEND "Installing dependencies"
  ( cd "$BACKEND_DIR" && npm ci )

  log BACKEND "Building (staged, not yet live)"
  rm -rf "${BACKEND_DIR}/dist.new"
  # See scripts/deploy-uat.sh for why *.tsbuildinfo must be cleared first.
  rm -f "${BACKEND_DIR}"/*.tsbuildinfo
  ( cd "$BACKEND_DIR" && npx lb-tsc --outDir dist.new )
  [ -f "${BACKEND_DIR}/dist.new/index.js" ] || { log BACKEND "build did not produce dist.new/index.js"; rm -rf "${BACKEND_DIR}/dist.new"; return 1; }

  log BACKEND "Swapping in new build"
  rm -rf "${BACKEND_DIR}/dist.prev"
  if [ -d "${BACKEND_DIR}/dist" ]; then mv "${BACKEND_DIR}/dist" "${BACKEND_DIR}/dist.prev"; fi
  mv "${BACKEND_DIR}/dist.new" "${BACKEND_DIR}/dist"

  log MIGRATION "Running non-destructive schema autoupdate"
  if ! ( cd "$BACKEND_DIR" && node ./dist/migrate ); then
    log MIGRATION "FAILED — restoring previous backend build, database is left as-is for manual review"
    rollback_backend
    return 1
  fi
  log MIGRATION "Completed"

  log BACKEND "Reloading PM2 process valiarian-backend-production"
  if pm2 describe valiarian-backend-production >/dev/null 2>&1; then
    if ! pm2 reload valiarian-backend-production --update-env; then
      log BACKEND "pm2 reload failed — restoring previous build"
      rollback_backend
      return 1
    fi
  elif ! ( cd "$BACKEND_DIR" && pm2 start dist/index.js --name valiarian-backend-production ); then
    log BACKEND "pm2 start failed — restoring previous build"
    rollback_backend
    return 1
  fi

  log HEALTH "Checking backend"
  if ! bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:3035/health 10 3; then
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
    if pm2 describe valiarian-backend-production >/dev/null 2>&1; then
      pm2 reload valiarian-backend-production --update-env || true
    fi
    if bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:3035/health 5 3; then
      log ROLLBACK "Backend restored to previous release and healthy"
    else
      log ROLLBACK "Backend restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous backend build available to restore — needs manual attention"
  fi
}

# ---- Frontend: static storefront published directly to the nginx web root (no pm2 process)
deploy_frontend() {
  log FRONTEND "Installing dependencies"
  ( cd "$FRONTEND_DIR" && npm ci )

  log FRONTEND "Building (staged, not yet live)"
  rm -rf "${FRONTEND_DIR}/build.new"
  ( cd "$FRONTEND_DIR" && BUILD_PATH=build.new GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=2048" npm run build )
  [ -f "${FRONTEND_DIR}/build.new/index.html" ] || { log FRONTEND "build did not produce build.new/index.html"; rm -rf "${FRONTEND_DIR}/build.new"; return 1; }

  log FRONTEND "Publishing storefront to ${WEB_ROOT}"
  rm -rf "${WEB_ROOT}.prev"
  cp -a "$WEB_ROOT" "${WEB_ROOT}.prev"
  find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  cp -a "${FRONTEND_DIR}/build.new/." "$WEB_ROOT/"
  rm -rf "${FRONTEND_DIR}/build.new"

  log HEALTH "Checking frontend"
  if ! bash "${SCRIPT_DIR}/health-check.sh" https://valiarian.com/ 10 3; then
    log HEALTH "Frontend failed health check — rolling back"
    rollback_frontend
    return 1
  fi
  log HEALTH "Frontend OK"
  return 0
}

rollback_frontend() {
  if [ -d "${WEB_ROOT}.prev" ]; then
    find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
    cp -a "${WEB_ROOT}.prev/." "$WEB_ROOT/"
    if bash "${SCRIPT_DIR}/health-check.sh" https://valiarian.com/ 5 3; then
      log ROLLBACK "Frontend restored to previous release and healthy"
    else
      log ROLLBACK "Frontend restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous frontend build available to restore — needs manual attention"
  fi
}

# ---- Admin: staged build, atomic swap, pm2 restart
deploy_admin() {
  log ADMIN "Installing dependencies"
  ( cd "$ADMIN_DIR" && npm ci )

  log ADMIN "Building (staged, not yet live)"
  rm -rf "${ADMIN_DIR}/build.new"
  ( cd "$ADMIN_DIR" && BUILD_PATH=build.new GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=2048" npm run build )
  [ -f "${ADMIN_DIR}/build.new/index.html" ] || { log ADMIN "build did not produce build.new/index.html"; rm -rf "${ADMIN_DIR}/build.new"; return 1; }

  log ADMIN "Swapping in new build"
  rm -rf "${ADMIN_DIR}/build.prev"
  [ ! -d "${ADMIN_DIR}/build" ] || mv "${ADMIN_DIR}/build" "${ADMIN_DIR}/build.prev"
  mv "${ADMIN_DIR}/build.new" "${ADMIN_DIR}/build"

  log ADMIN "Restarting PM2 process valiarian-admin-production"
  if pm2 describe valiarian-admin-production >/dev/null 2>&1; then
    if ! pm2 restart valiarian-admin-production; then
      log ADMIN "pm2 restart failed — restoring previous build"
      rollback_admin
      return 1
    fi
  elif ! pm2 serve "${ADMIN_DIR}/build" 4000 --spa --name valiarian-admin-production; then
    log ADMIN "pm2 serve failed — restoring previous build"
    rollback_admin
    return 1
  fi

  log HEALTH "Checking admin"
  if ! bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:4000/ 10 3; then
    log HEALTH "Admin failed health check — rolling back"
    rollback_admin
    return 1
  fi
  log HEALTH "Admin OK"
  return 0
}

rollback_admin() {
  if [ -d "${ADMIN_DIR}/build.prev" ]; then
    rm -rf "${ADMIN_DIR}/build"
    mv "${ADMIN_DIR}/build.prev" "${ADMIN_DIR}/build"
    if pm2 describe valiarian-admin-production >/dev/null 2>&1; then
      pm2 restart valiarian-admin-production || true
    fi
    if bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:4000/ 5 3; then
      log ROLLBACK "Admin restored to previous release and healthy"
    else
      log ROLLBACK "Admin restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous admin build available to restore — needs manual attention"
  fi
}

# ---- Sequence ----
if ! deploy_backend; then
  log DEPLOY "Production deployment FAILED at backend stage. Frontend/admin were not touched."
  exit 1
fi

if ! deploy_frontend; then
  log DEPLOY "Production deployment FAILED at frontend stage. Backend deployed successfully; frontend rolled back."
  exit 1
fi

if ! deploy_admin; then
  log DEPLOY "Production deployment FAILED at admin stage. Backend and frontend deployed successfully; admin rolled back."
  exit 1
fi

# Production admin cannot use 3001 because UAT frontend owns that port.
# Keep a recoverable copy, validate Nginx, then switch the existing vhost.
NGINX_ADMIN_CONFIG="/etc/nginx/sites-enabled/valiarian-admin-panel"
if grep -q 'localhost:3001' "$NGINX_ADMIN_CONFIG"; then
  cp -a "$NGINX_ADMIN_CONFIG" "${NGINX_ADMIN_CONFIG}.pre-cicd"
  sed -i 's/localhost:3001/localhost:4000/g' "$NGINX_ADMIN_CONFIG"
  nginx -t
  systemctl reload nginx
fi

rm -f /var/www/maintenance/frontend.flag
pm2 save
bash "${SCRIPT_DIR}/health-check.sh" https://valiarian.com/ 10 3
bash "${SCRIPT_DIR}/health-check.sh" https://api.valiarian.com/health 10 3
bash "${SCRIPT_DIR}/health-check.sh" https://admin.valiarian.com/ 10 3
log DEPLOY "Production deployment successful: ${DEPLOY_SHA}"
