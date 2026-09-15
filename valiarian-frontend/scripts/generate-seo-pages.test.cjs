const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {generate, productDocument, renderDocument, routeFile} = require('./generate-seo-pages.cjs');

const template = `<!doctype html><html><head>
  <title data-rh="true">Default</title>
  <meta data-rh="true" name="description" content="Default description" />
  <meta data-rh="true" property="og:url" content="https://valiarian.com/" />
  <meta data-rh="true" property="og:title" content="Default" />
  <meta data-rh="true" property="og:description" content="Default" />
  <meta data-rh="true" property="og:image" content="default.jpg" />
  <meta data-rh="true" name="twitter:title" content="Default" />
  <meta data-rh="true" name="twitter:description" content="Default" />
  <meta data-rh="true" name="twitter:image" content="default.jpg" />
</head><body><div id="root"></div></body></html>`;

const product = {
  id: '5203d9bf-4007-4bea-87a1-6b8f03505d20',
  slug: 'obsidian-print-polo-white-vr',
  name: 'Obsidian Print Polo - White VR',
  seoTitle: 'Obsidian Print Polo - White VR | Valarian',
  seoDescription: 'Shop Obsidian Print Polo White VR at Valarian.',
  coverImage: '/images/white-vr.jpg',
  price: 1299,
  salePrice: 999,
  currency: 'INR',
  inStock: true,
  stockQuantity: 100,
  isActive: true,
  categoryId: 'category-1',
  category: {id: 'category-1', slug: 'aop-vr-monogram-polo', name: 'AOP VR Monogram Polo'},
};

test('renders product metadata, crawlable content and structured data into initial HTML', () => {
  const html = renderDocument(template, productDocument(product), 'index,follow');
  assert.match(html, /<h1>Obsidian Print Polo - White VR<\/h1>/);
  assert.match(html, /<title data-rh="true">Obsidian Print Polo - White VR \| Valiarian<\/title>/);
  assert.doesNotMatch(html, /\bValarian\b/);
  assert.match(html, /rel="canonical" href="https:\/\/valiarian\.com\/products\/obsidian-print-polo-white-vr"/);
  assert.match(html, /name="robots" content="index,follow"/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /"price":"999\.00"/);
  assert.match(html, /https:\/\/schema\.org\/InStock/);
});

test('uses predictable route files that Nginx can resolve without changing SPA routes', () => {
  assert.equal(routeFile('/'), 'seo/routes/index.html');
  assert.equal(routeFile('/products'), 'seo/routes/products/index.html');
  assert.equal(
    routeFile('/products/obsidian-print-polo-white-vr'),
    'seo/routes/products/obsidian-print-polo-white-vr/index.html'
  );
});

test('generates home, listing, category, slug and UUID route mappings from public APIs', async t => {
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'valiarian-seo-pages-'));
  fs.writeFileSync(path.join(buildDir, 'index.html'), template);
  t.after(() => fs.rmSync(buildDir, {recursive: true, force: true}));

  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url.startsWith('/api/public/products')) {
      response.end(JSON.stringify({products: [product], total: 1}));
      return;
    }
    if (request.url.startsWith('/api/categories')) {
      response.end(
        JSON.stringify([
          {id: 'category-1', slug: 'aop-vr-monogram-polo', name: 'AOP VR Monogram Polo'},
        ])
      );
      return;
    }
    response.statusCode = 404;
    response.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const {port} = server.address();
  const result = await generate({
    buildDir,
    apiBase: `http://127.0.0.1:${port}`,
    robots: 'noindex,nofollow',
  });
  const manifest = JSON.parse(
    fs.readFileSync(path.join(buildDir, 'seo', 'route-manifest.json'), 'utf8')
  );

  assert.deepEqual(result, {routeCount: 5, productCount: 1, categoryCount: 1});
  assert.equal(manifest['/products/obsidian-print-polo-white-vr'], manifest[`/products/${product.id}`]);
  const productHtml = fs.readFileSync(
    path.join(buildDir, ...manifest['/products/obsidian-print-polo-white-vr'].split('/')),
    'utf8'
  );
  assert.match(productHtml, /name="robots" content="noindex,nofollow"/);
  assert.match(productHtml, /<h1>Obsidian Print Polo - White VR<\/h1>/);
});
