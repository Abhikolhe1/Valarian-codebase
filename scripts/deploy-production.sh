#!/usr/bin/env bash
# Production deployment orchestrator for the verified srv1547800 layout.
#
# Sequence: backup -> backend build -> migrate -> backend reload -> backend
#           health check -> frontend build+swap -> health check -> admin
#           build+swap -> health check -> nginx cutover -> final checks.
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

if ! deploy_backend; then
  log DEPLOY "Production deployment FAILED at backend stage. Frontend/admin were not touched."
  exit 1
fi

# ---- Static apps (frontend / admin): build to a staging dir, atomic swap, pm2 serve/restart,
# roll back to the previous release on a restart or health-check failure.
build_static() {
  local name="$1" dir="$2"
  log "${name^^}" "Installing dependencies"
  ( cd "$dir" && npm ci )
  log "${name^^}" "Building (staged, not yet live)"
  rm -rf "${dir}/build.new"
  ( cd "$dir" && BUILD_PATH=build.new GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=2048" npm run build )
  [ -f "${dir}/build.new/index.html" ] || { log "${name^^}" "build did not produce build.new/index.html"; rm -rf "${dir}/build.new"; return 1; }
  return 0
}

deploy_static_app() {
  local name="$1" dir="$2" pm2_name="$3" port="$4" health_url="$5"

  build_static "$name" "$dir" || return 1

  log "${name^^}" "Swapping in new build"
  rm -rf "${dir}/build.prev"
  [ ! -d "${dir}/build" ] || mv "${dir}/build" "${dir}/build.prev"
  mv "${dir}/build.new" "${dir}/build"

  log "${name^^}" "Restarting PM2 process ${pm2_name}"
  if pm2 describe "$pm2_name" >/dev/null 2>&1; then
    if ! pm2 restart "$pm2_name"; then
      log "${name^^}" "pm2 restart failed — restoring previous build"
      rollback_static_app "$name" "$dir" "$pm2_name" "$port" "$health_url"
      return 1
    fi
  elif ! pm2 serve "${dir}/build" "$port" --spa --name "$pm2_name"; then
    log "${name^^}" "pm2 serve failed — restoring previous build"
    rollback_static_app "$name" "$dir" "$pm2_name" "$port" "$health_url"
    return 1
  fi

  log HEALTH "Checking ${name}"
  if ! bash "${SCRIPT_DIR}/health-check.sh" "$health_url" 10 3; then
    log HEALTH "${name^} failed health check — rolling back"
    rollback_static_app "$name" "$dir" "$pm2_name" "$port" "$health_url"
    return 1
  fi
  log HEALTH "${name^} OK"
  return 0
}

rollback_static_app() {
  local name="$1" dir="$2" pm2_name="$3" port="$4" health_url="$5"
  if [ -d "${dir}/build.prev" ]; then
    rm -rf "${dir}/build"
    mv "${dir}/build.prev" "${dir}/build"
    if pm2 describe "$pm2_name" >/dev/null 2>&1; then
      pm2 restart "$pm2_name" || true
    fi
    if bash "${SCRIPT_DIR}/health-check.sh" "$health_url" 5 3; then
      log ROLLBACK "${name^} restored to previous release and healthy"
    else
      log ROLLBACK "${name^} restored but still failing health check — needs manual attention"
    fi
  else
    log ROLLBACK "No previous ${name} build available to restore — needs manual attention"
  fi
}

if ! deploy_static_app frontend "$FRONTEND_DIR" valiarian-frontend-production 3000 http://127.0.0.1:3000/; then
  log DEPLOY "Production deployment FAILED at frontend stage. Backend deployed successfully; frontend rolled back."
  exit 1
fi

if ! deploy_static_app admin "$ADMIN_DIR" valiarian-admin-production 4000 http://127.0.0.1:4000/; then
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

pm2 save
# Visibility is controlled separately by the Production Visibility workflow.
# A deployment must never expose a storefront that was intentionally hidden.
if [ -f /var/www/maintenance/frontend.flag ]; then
  [ -f /var/www/maintenance/maintenance.html ]
  log FRONTEND "Coming-soon mode remains enabled"
else
  bash "${SCRIPT_DIR}/health-check.sh" https://valiarian.com/ 10 3
fi
bash "${SCRIPT_DIR}/health-check.sh" https://api.valiarian.com/health 10 3
bash "${SCRIPT_DIR}/health-check.sh" https://admin.valiarian.com/ 10 3
log DEPLOY "Production deployment successful: ${DEPLOY_SHA}"
