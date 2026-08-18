#!/usr/bin/env bash
# Production deployment orchestrator for the verified srv1547800 layout.
# Never enable set -x here: application env files contain secrets.
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

log BACKEND "Installing dependencies and building"
( cd "$BACKEND_DIR" && npm ci )
rm -rf "${BACKEND_DIR}/dist.new"
rm -f "${BACKEND_DIR}"/*.tsbuildinfo
( cd "$BACKEND_DIR" && npx lb-tsc --outDir dist.new )
[ -f "${BACKEND_DIR}/dist.new/index.js" ] || { log BACKEND "Build output missing"; exit 1; }
rm -rf "${BACKEND_DIR}/dist.prev"
[ ! -d "${BACKEND_DIR}/dist" ] || mv "${BACKEND_DIR}/dist" "${BACKEND_DIR}/dist.prev"
mv "${BACKEND_DIR}/dist.new" "${BACKEND_DIR}/dist"

log MIGRATION "Running non-destructive schema autoupdate"
( cd "$BACKEND_DIR" && node ./dist/migrate )
if pm2 describe valiarian-backend-production >/dev/null 2>&1; then
  pm2 reload valiarian-backend-production --update-env
else
  ( cd "$BACKEND_DIR" && pm2 start dist/index.js --name valiarian-backend-production )
fi
bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:3035/health 10 3

build_static() {
  local name="$1" dir="$2"
  log "${name^^}" "Installing dependencies and building"
  ( cd "$dir" && npm ci )
  rm -rf "${dir}/build.new"
  ( cd "$dir" && BUILD_PATH=build.new GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=2048" npm run build )
  [ -f "${dir}/build.new/index.html" ] || { log "${name^^}" "Build output missing"; exit 1; }
}
build_static frontend "$FRONTEND_DIR"
build_static admin "$ADMIN_DIR"

log FRONTEND "Publishing storefront to ${WEB_ROOT}"
rm -rf "${WEB_ROOT}.prev"
cp -a "$WEB_ROOT" "${WEB_ROOT}.prev"
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a "${FRONTEND_DIR}/build.new/." "$WEB_ROOT/"

rm -rf "${ADMIN_DIR}/build.prev"
[ ! -d "${ADMIN_DIR}/build" ] || mv "${ADMIN_DIR}/build" "${ADMIN_DIR}/build.prev"
mv "${ADMIN_DIR}/build.new" "${ADMIN_DIR}/build"
if pm2 describe valiarian-admin-production >/dev/null 2>&1; then
  pm2 restart valiarian-admin-production
else
  pm2 serve "${ADMIN_DIR}/build" 4000 --spa --name valiarian-admin-production
fi
bash "${SCRIPT_DIR}/health-check.sh" http://127.0.0.1:4000/ 10 3

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
