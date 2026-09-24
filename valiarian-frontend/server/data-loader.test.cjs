const assert = require('node:assert/strict');
const test = require('node:test');
const {categoriesKey, matchPublicRoute, productListKey} = require('./data-loader.cjs');

test('matches only the public SSR allow-list', () => {
  assert.deepEqual(matchPublicRoute('/'), {type: 'home'});
  assert.deepEqual(matchPublicRoute('/products'), {type: 'products'});
  assert.deepEqual(matchPublicRoute('/category/crown-line-polo'), {
    type: 'category',
    slug: 'crown-line-polo',
  });
  assert.deepEqual(matchPublicRoute('/products/example-polo'), {
    type: 'product',
    slug: 'example-polo',
  });
  assert.equal(matchPublicRoute('/products/checkout'), null);
  assert.equal(matchPublicRoute('/cart'), null);
  assert.equal(matchPublicRoute('/login'), null);
  assert.equal(matchPublicRoute('/payment/result'), null);
  assert.equal(matchPublicRoute('/orders/example'), null);
});

test('builds the same stable SWR keys as the existing catalogue hooks', () => {
  const categories = new URL(`https://example.test${categoriesKey()}`);
  assert.equal(categories.pathname, '/api/categories');
  assert.equal(JSON.parse(categories.searchParams.get('filter')).where.isActive, true);

  const products = new URL(`https://example.test${productListKey('crown-line-polo')}`);
  assert.equal(products.pathname, '/api/public/products');
  assert.equal(products.searchParams.get('categorySlug'), 'crown-line-polo');
  assert.equal(products.searchParams.get('sortBy'), 'newest');
  assert.equal(products.searchParams.get('limit'), '20');
  assert.equal(products.searchParams.get('offset'), '0');
});
