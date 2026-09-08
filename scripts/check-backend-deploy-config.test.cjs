const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validate} = require('./check-backend-deploy-config.cjs');

test('rejects missing and short secrets without echoing them', () => {
  for (const secret of [undefined, '', 'short-test-secret']) {
    const errors = validate({JWT_SECRET: secret});
    assert.equal(errors.length, 1);
    if (secret) assert.ok(!errors.join('').includes(secret));
  }
});
test('accepts strong secret and production origins', () => {
  assert.deepEqual(validate({JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production', CORS_ORIGIN: 'https://example.test'}), []);
});
test('rejects missing or empty production origin list', () => {
  for (const origin of [undefined, '', ' , ']) {
    assert.equal(validate({JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production', CORS_ORIGIN: origin}).length, 1);
  }
});
