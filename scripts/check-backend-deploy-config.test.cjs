const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validate} = require('./check-backend-deploy-config.cjs');

for (const [store, admin] of [
  ['https://uat.valiarian.com', 'https://uatadmin.valiarian.com'],
  ['https://valiarian.com', 'https://admin.valiarian.com'],
]) {
  test('rejects missing admin origin for ' + store, () => {
    const errors = validate({JWT_SECRET: 'x'.repeat(32), CORS_ORIGIN: store}, [store, admin]);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes(admin));
  });
  test('accepts explicit store/admin origins for ' + store, () => {
    assert.deepEqual(validate({JWT_SECRET: 'x'.repeat(32), CORS_ORIGIN: store + ', ' + admin + '/'}, [store, admin]), []);
  });
  test('wildcards or lookalike domains do not satisfy ' + admin, () => {
    assert.equal(validate({JWT_SECRET: 'x'.repeat(32), CORS_ORIGIN: store + ',*,' + admin + '.evil.test'}, [store, admin]).length, 1);
  });
}

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
