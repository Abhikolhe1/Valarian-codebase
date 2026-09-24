const HOME_SECTIONS_KEY = '/api/cms/pages/slug/home/sections';
const SETTINGS_KEY = '/api/cms/settings';
const HEADER_NAV_KEY = '/api/cms/navigation/header';
const FOOTER_NAV_KEY = '/api/cms/navigation/footer';
const ABOUT_KEY = '/api/about-page';

function categoriesKey() {
  const params = new URLSearchParams();
  params.append(
    'filter',
    JSON.stringify({
      where: {isActive: true, isDeleted: false},
      include: [{relation: 'parentCategory'}],
      order: ['name ASC'],
    })
  );
  return `/api/categories?${params.toString()}`;
}

function productListKey(categorySlug) {
  const params = new URLSearchParams();
  if (categorySlug) params.append('categorySlug', categorySlug);
  params.append('sortBy', 'newest');
  params.append('limit', '20');
  params.append('offset', '0');
  return `/api/public/products?${params.toString()}`;
}

async function requestJson(apiOrigin, key, {optional = false} = {}) {
  const response = await fetch(`${apiOrigin}${key}`, {
    headers: {accept: 'application/json'},
    signal: AbortSignal.timeout(12000),
  });

  if (optional && response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`GET ${key} returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function addOptional(fallback, apiOrigin, key) {
  try {
    const value = await requestJson(apiOrigin, key, {optional: true});
    if (value !== null) fallback[key] = value;
  } catch (error) {
    console.warn(`[SSR] Optional data unavailable for ${key}: ${error.message}`);
  }
}

function matchPublicRoute(pathname) {
  if (pathname === '/') return {type: 'home'};
  if (pathname === '/products') return {type: 'products'};
  if (pathname === '/about-us') return {type: 'about'};
  if (pathname === '/contact-us') return {type: 'contact'};
  if (pathname === '/faqs') return {type: 'faqs'};

  const category = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (category) return {type: 'category', slug: decodeURIComponent(category[1])};

  const product = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (product && product[1] !== 'checkout') {
    return {type: 'product', slug: decodeURIComponent(product[1])};
  }

  return null;
}

async function loadInitialData(apiOrigin, pathname) {
  const route = matchPublicRoute(pathname);
  if (!route) return {route: null, status: 404, swr: {}};

  const swr = {};
  const categoryRequestKey = categoriesKey();
  const categories = await requestJson(apiOrigin, categoryRequestKey);
  swr[categoryRequestKey] = categories;

  await Promise.all([
    addOptional(swr, apiOrigin, SETTINGS_KEY),
    addOptional(swr, apiOrigin, HEADER_NAV_KEY),
    addOptional(swr, apiOrigin, FOOTER_NAV_KEY),
  ]);

  if (route.type === 'home') {
    const newArrivalsKey = '/api/public/products/new-arrivals?limit=10';
    const bestSellersKey = '/api/public/products/best-sellers?limit=10';
    const [sections, newArrivals, bestSellers] = await Promise.all([
      requestJson(apiOrigin, HOME_SECTIONS_KEY),
      requestJson(apiOrigin, newArrivalsKey),
      requestJson(apiOrigin, bestSellersKey),
    ]);
    swr[HOME_SECTIONS_KEY] = sections;
    swr[newArrivalsKey] = newArrivals;
    swr[bestSellersKey] = bestSellers;
  }

  if (route.type === 'products' || route.type === 'category') {
    const activeCategory = route.type === 'category'
      ? categories.find((category) => category.slug === route.slug)
      : null;

    if (route.type === 'category' && !activeCategory) {
      return {route, status: 404, swr};
    }

    const listKey = productListKey(activeCategory?.slug);
    swr[listKey] = await requestJson(apiOrigin, listKey);
  }

  if (route.type === 'product') {
    const productKey = `/api/public/products/${encodeURIComponent(route.slug)}`;
    try {
      const product = await requestJson(apiOrigin, productKey);
      swr[productKey] = product;
      const reviewsKey = `/api/reviews/product/${product.id}`;
      await addOptional(swr, apiOrigin, reviewsKey);
    } catch (error) {
      if (error.status !== 404) throw error;
      swr[productKey] = null;
      return {route, status: 404, swr};
    }
  }

  if (route.type === 'about') {
    swr[ABOUT_KEY] = await requestJson(apiOrigin, ABOUT_KEY);
  }

  return {route, status: 200, swr};
}

module.exports = {
  categoriesKey,
  loadInitialData,
  matchPublicRoute,
  productListKey,
};
