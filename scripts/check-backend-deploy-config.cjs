// Read-only deployment preflight. Never print environment values or secrets.
const fs = require('node:fs');
const path = require('node:path');

function validate(env) {
  const errors = [];
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must contain at least 32 characters; configure a strong secret before deploying.');
  }
  if (env.NODE_ENV === 'production' && !env.CORS_ORIGIN?.split(',').some(origin => origin.trim())) {
    errors.push('CORS_ORIGIN must be configured in production.');
  }
  return errors;
}

if (require.main === module) {
  try {
    const backendDir = path.resolve(process.argv[2]);
    const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));
    const env = {...dotenv.parse(fs.readFileSync(path.join(backendDir, '.env'))), ...process.env};
    const errors = validate(env);
    for (const error of errors) console.error('[PREFLIGHT] ' + error);
    if (errors.length) process.exitCode = 1;
    else console.log('[PREFLIGHT] JWT/CORS configuration checks passed.');
  } catch {
    console.error('[PREFLIGHT] Unable to read backend configuration; deployment stopped.');
    process.exitCode = 1;
  }
}

module.exports = {validate};
