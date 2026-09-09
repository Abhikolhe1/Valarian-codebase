// Read-only deployment preflight. Never print environment values or secrets.
const fs = require('node:fs');
const path = require('node:path');

function validate(env, requiredOrigins = []) {
  const errors = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must contain at least 32 characters; configure a strong secret before deploying.');
  }
  if (env.NODE_ENV === 'production' && !env.CORS_ORIGIN?.split(',').some(origin => origin.trim())) {
    errors.push('CORS_ORIGIN must be configured in production.');
  }
  if (env.NODE_ENV === 'production' && !env.DELHIVERY_API_TOKEN?.trim()) {
    errors.push('DELHIVERY_API_TOKEN must be configured for the Delhivery-first production shipping flow.');
  }
  if (env.DELHIVERY_ENV && !['staging', 'production'].includes(env.DELHIVERY_ENV.trim().toLowerCase())) {
    errors.push('DELHIVERY_ENV must be either staging or production.');
  }
  if (env.DELHIVERY_BASE_URL) {
    let baseUrl;
    try {
      baseUrl = new URL(env.DELHIVERY_BASE_URL);
    } catch {
      errors.push('DELHIVERY_BASE_URL must be a valid HTTPS URL.');
    }
    if (baseUrl && (baseUrl.protocol !== 'https:' || ![
      'track.delhivery.com',
      'staging-express.delhivery.com',
    ].includes(baseUrl.hostname))) {
      errors.push('DELHIVERY_BASE_URL must use an approved Delhivery HTTPS host.');
    }
  }
  const origins = new Set((env.CORS_ORIGIN || '').split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean));
  for (const origin of requiredOrigins) {
    if (!origins.has(origin)) errors.push('CORS_ORIGIN is missing required application origin: ' + origin);
  }
  return errors;
}

if (require.main === module) {
  try {
    const backendDir = path.resolve(process.argv[2]);
    const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));
    const env = {...dotenv.parse(fs.readFileSync(path.join(backendDir, '.env'))), ...process.env};
    const errors = validate(env, process.argv.slice(3));
    for (const error of errors) console.error('[PREFLIGHT] ' + error);
    if (errors.length) process.exitCode = 1;
    else console.log('[PREFLIGHT] JWT/CORS/Delhivery configuration checks passed.');
  } catch {
    console.error('[PREFLIGHT] Unable to read backend configuration; deployment stopped.');
    process.exitCode = 1;
  }
}

module.exports = {validate};
