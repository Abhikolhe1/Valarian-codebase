#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const SITE_ORIGIN = 'https://valiarian.com';
const DEFAULT_DESCRIPTION =
  "Discover Valiarian's premium polo T-shirts, crafted with refined design, exceptional comfort and timeless style.";

function plainText(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function limitText(value, maxLength = 160) {
  const text = plainText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function normalizeBrandName(value) {
  return String(value || '').replace(/\bValarian\b/g, 'Valiarian');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(value = '') {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function productDocument(product) {
  const name = plainText(product.name || 'Product');
  const slug = product.slug || product.id;
  const canonicalUrl = `${SITE_ORIGIN}/products/${encodeURIComponent(slug)}`;
  const title = normalizeBrandName(limitText(product.seoTitle || `${name} | Valiarian`, 60));
  const description = normalizeBrandName(limitText(
    product.seoDescription ||
      product.shortDescription ||
      product.description ||
      `Shop ${name} by Valiarian and view available colours, sizes and product details.`,
    160
  ));
  const images = [product.coverImage, ...(Array.isArray(product.images) ? product.images : [])]
    .filter(Boolean)
    .map(absoluteUrl);
  const price = Number(product.salePrice || product.price || 0);
  const available = Boolean(product.inStock && Number(product.stockQuantity || 0) > 0);
  const category = product.category;
  const breadcrumbs = [
    {name: 'Home', url: SITE_ORIGIN},
    {name: 'Products', url: `${SITE_ORIGIN}/products`},
    ...(category?.slug
      ? [
          {
            name: plainText(category.name),
            url: `${SITE_ORIGIN}/category/${encodeURIComponent(category.slug)}`,
          },
        ]
      : []),
    {name, url: canonicalUrl},
  ];

  return {
    title,
    description,
    canonicalUrl,
    image: images[0],
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          '@id': `${canonicalUrl}#product`,
          name,
          description,
          image: images,
          sku: product.sku || undefined,
          brand: {'@type': 'Brand', name: 'Valiarian'},
          category: category?.name || undefined,
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: product.currency || 'INR',
            price: price.toFixed(2),
            availability: available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
        breadcrumbSchema(breadcrumbs),
      ],
    },
    body: `<main data-seo-prerendered="true">
      <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/products">Products</a>${
        category?.slug
          ? ` / <a href="/category/${escapeHtml(encodeURIComponent(category.slug))}">${escapeHtml(
              category.name
            )}</a>`
          : ''
      }</nav>
      <article>
        <h1>${escapeHtml(name)}</h1>
        ${images[0] ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(name)}" />` : ''}
        <p>${escapeHtml(description)}</p>
        <p>Price: ${escapeHtml(product.currency || 'INR')} ${escapeHtml(price.toFixed(2))}. ${
      available ? 'In stock.' : 'Out of stock.'
    }</p>
      </article>
    </main>`,
  };
}

function categoryDocument(category, products) {
  const name = plainText(category.name || 'Products');
  const canonicalUrl = `${SITE_ORIGIN}/category/${encodeURIComponent(category.slug)}`;
  const description = limitText(
    category.description ||
      `Browse ${name} from Valiarian and view available products, colours, sizes and details.`,
    160
  );
  const title = limitText(`${name} | Premium Polo T-Shirts | Valiarian`, 60);
  const links = products
    .map(
      product =>
        `<li><a href="/products/${escapeHtml(encodeURIComponent(product.slug))}">${escapeHtml(
          plainText(product.name)
        )}</a></li>`
    )
    .join('\n');

  return {
    title,
    description,
    canonicalUrl,
    image: absoluteUrl(category.image),
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': canonicalUrl,
          name,
          description,
          url: canonicalUrl,
        },
        breadcrumbSchema([
          {name: 'Home', url: SITE_ORIGIN},
          {name: 'Products', url: `${SITE_ORIGIN}/products`},
          {name, url: canonicalUrl},
        ]),
      ],
    },
    body: `<main data-seo-prerendered="true">
      <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/products">Products</a></nav>
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(description)}</p>
      <ul>${links}</ul>
    </main>`,
  };
}

function listingDocument(products) {
  const title = 'Premium Polo T-Shirts for Men | Valiarian';
  const description =
    'Shop premium Valiarian polo T-shirts crafted for exceptional comfort, refined style and everyday wear.';
  const links = products
    .map(
      product =>
        `<li><a href="/products/${escapeHtml(encodeURIComponent(product.slug))}">${escapeHtml(
          plainText(product.name)
        )}</a></li>`
    )
    .join('\n');

  return {
    title,
    description,
    canonicalUrl: `${SITE_ORIGIN}/products`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_ORIGIN}/products`,
      name: title,
      description,
      url: `${SITE_ORIGIN}/products`,
    },
    body: `<main data-seo-prerendered="true">
      <h1>Premium Polo T-Shirts for Men</h1>
      <p>${escapeHtml(description)}</p>
      <ul>${links}</ul>
    </main>`,
  };
}

function homeDocument(categories) {
  const title = 'Valiarian | Premium Polo T-Shirts';
  const links = categories
    .map(
      category =>
        `<li><a href="/category/${escapeHtml(encodeURIComponent(category.slug))}">${escapeHtml(
          plainText(category.name)
        )}</a></li>`
    )
    .join('\n');

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${SITE_ORIGIN}/`,
    image: `${SITE_ORIGIN}/assets/images/social/valiarian-share-preview.jpeg`,
    body: `<main data-seo-prerendered="true">
      <h1>Wear the Sensation</h1>
      <p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>
      <nav aria-label="Shop categories"><ul>${links}</ul></nav>
    </main>`,
  };
}

function setMeta(html, selector, value) {
  const escapedValue = escapeHtml(value);
  const attribute = selector.startsWith('property:') ? 'property' : 'name';
  const key = selector.replace(/^(property|name):/, '');
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escapedKey}["'][^>]*>`, 'i');
  const tag = `<meta data-rh="true" ${attribute}="${key}" content="${escapedValue}" />`;
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `  ${tag}\n</head>`);
}

function renderDocument(template, document, robots) {
  let html = template.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title data-rh="true">${escapeHtml(document.title)}</title>`);
  html = setMeta(html, 'name:description', document.description);
  html = setMeta(html, 'name:robots', robots);
  html = setMeta(html, 'property:og:type', 'website');
  html = setMeta(html, 'property:og:url', document.canonicalUrl);
  html = setMeta(html, 'property:og:title', document.title);
  html = setMeta(html, 'property:og:description', document.description);
  html = setMeta(html, 'name:twitter:title', document.title);
  html = setMeta(html, 'name:twitter:description', document.description);
  if (document.image) {
    html = setMeta(html, 'property:og:image', document.image);
    html = setMeta(html, 'name:twitter:image', document.image);
  }
  html = html.replace(/\s*<link[^>]+rel=["']canonical["'][^>]*>/gi, '');
  const additions = [
    `  <link data-rh="true" rel="canonical" href="${escapeHtml(document.canonicalUrl)}" />`,
    document.schema
      ? `  <script id="seo-route-structured-data" type="application/ld+json">${JSON.stringify(
          document.schema
        ).replace(/</g, '\\u003c')}</script>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  html = html.replace('</head>', `${additions}\n</head>`);
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('Frontend template does not contain the expected empty React root');
  }
  return html.replace('<div id="root"></div>', `<div id="root">${document.body}</div>`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, {headers: {accept: 'application/json'}}, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GET ${url} returned HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GET ${url} returned invalid JSON: ${error.message}`));
        }
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error(`GET ${url} timed out`)));
    request.on('error', reject);
  });
}

async function loadCatalogue(apiBase) {
  const products = [];
  let offset = 0;
  let total = 1;
  while (offset < total) {
    const page = await getJson(`${apiBase}/api/public/products?limit=100&offset=${offset}`);
    const pageProducts = Array.isArray(page.products) ? page.products : [];
    products.push(...pageProducts);
    total = Number(page.total || 0);
    offset += pageProducts.length;
    if (pageProducts.length === 0) break;
  }

  const filter = encodeURIComponent(
    JSON.stringify({where: {isActive: true, isDeleted: false}, order: ['name ASC']})
  );
  const categories = await getJson(`${apiBase}/api/categories?filter=${filter}`);
  return {
    products: products.filter(product => product.slug && product.isActive !== false),
    categories: (Array.isArray(categories) ? categories : []).filter(category => category.slug),
  };
}

function routeFile(route) {
  const normalizedRoute = route === '/' ? '' : route.replace(/^\//, '');
  return `seo/routes/${normalizedRoute}${normalizedRoute ? '/' : ''}index.html`;
}

function writeRoute(buildDir, template, manifest, route, document, robots) {
  const relativeFile = routeFile(route);
  const target = path.join(buildDir, ...relativeFile.split('/'));
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, renderDocument(template, document, robots), 'utf8');
  manifest[route] = relativeFile;
}

async function generate({buildDir, apiBase, robots = 'index,follow'}) {
  const indexFile = path.resolve(buildDir, 'index.html');
  const template = fs.readFileSync(indexFile, 'utf8');
  const {products, categories} = await loadCatalogue(apiBase.replace(/\/$/, ''));
  if (products.length === 0) throw new Error('No published products were returned; refusing to generate empty SEO pages');
  if (categories.length === 0) throw new Error('No active categories were returned; refusing to generate empty SEO pages');

  const manifest = {};
  writeRoute(buildDir, template, manifest, '/', homeDocument(categories), robots);
  writeRoute(buildDir, template, manifest, '/products', listingDocument(products), robots);

  for (const category of categories) {
    const categoryProducts = products.filter(
      product => product.categoryId === category.id || product.category?.slug === category.slug
    );
    const route = `/category/${encodeURIComponent(category.slug)}`;
    writeRoute(buildDir, template, manifest, route, categoryDocument(category, categoryProducts), robots);
  }

  for (const product of products) {
    const document = productDocument(product);
    const slugRoute = `/products/${encodeURIComponent(product.slug)}`;
    writeRoute(buildDir, template, manifest, slugRoute, document, robots);
    if (product.id) {
      const idRoute = `/products/${encodeURIComponent(product.id)}`;
      writeRoute(buildDir, template, manifest, idRoute, document, robots);
    }
  }

  const manifestFile = path.join(buildDir, 'seo', 'route-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), {recursive: true});
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {routeCount: Object.keys(manifest).length, productCount: products.length, categoryCount: categories.length};
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key || ''}`);
    result[key.slice(2)] = value;
  }
  if (!result['build-dir'] || !result['api-base']) {
    throw new Error('Usage: generate-seo-pages.cjs --build-dir <path> --api-base <url> [--robots <value>]');
  }
  return {buildDir: result['build-dir'], apiBase: result['api-base'], robots: result.robots};
}

if (require.main === module) {
  generate(parseArguments(process.argv.slice(2)))
    .then(result => {
      process.stdout.write(
        `Generated ${result.routeCount} crawler routes for ${result.productCount} products and ${result.categoryCount} categories.\n`
      );
    })
    .catch(error => {
      process.stderr.write(`SEO page generation failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  categoryDocument,
  generate,
  homeDocument,
  listingDocument,
  productDocument,
  renderDocument,
  routeFile,
};
