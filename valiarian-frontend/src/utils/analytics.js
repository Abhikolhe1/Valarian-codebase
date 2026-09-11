const PRODUCTION_HOSTS = new Set(['valiarian.com', 'www.valiarian.com']);
const PURCHASE_STORAGE_KEY = 'valiarian_ga4_purchase_ids';
const MAX_STORED_PURCHASE_IDS = 100;

const pendingEvents = [];
const pendingPurchaseIds = new Set();
let isWaitingForSettings = false;

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asText = (value) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || undefined;
  }

  return value?.name || value?.title || undefined;
};

const compactObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ''));

const getBrowserWindow = () => (typeof window === 'undefined' ? null : window);

const isProductionStorefront = (browserWindow) =>
  Boolean(browserWindow && PRODUCTION_HOSTS.has(browserWindow.location?.hostname));

const readTrackedPurchaseIds = (browserWindow) => {
  try {
    const stored = JSON.parse(browserWindow.localStorage.getItem(PURCHASE_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch (error) {
    return [];
  }
};

const rememberPurchaseId = (browserWindow, transactionId) => {
  try {
    const ids = readTrackedPurchaseIds(browserWindow).filter((id) => id !== transactionId);
    browserWindow.localStorage.setItem(
      PURCHASE_STORAGE_KEY,
      JSON.stringify([...ids, transactionId].slice(-MAX_STORED_PURCHASE_IDS))
    );
  } catch (error) {
    // Analytics must never interrupt checkout when browser storage is unavailable.
  }
};

const sendEvent = (browserWindow, queuedEvent) => {
  if (typeof browserWindow?.gtag !== 'function') {
    return false;
  }

  try {
    browserWindow.gtag('event', queuedEvent.name, queuedEvent.parameters);
    queuedEvent.onSent?.();
    return true;
  } catch (error) {
    return false;
  }
};

const flushPendingEvents = () => {
  const browserWindow = getBrowserWindow();

  if (!isProductionStorefront(browserWindow) || typeof browserWindow.gtag !== 'function') {
    return;
  }

  while (pendingEvents.length) {
    sendEvent(browserWindow, pendingEvents.shift());
  }
};

const waitForAnalyticsSettings = (browserWindow) => {
  if (isWaitingForSettings) return;

  isWaitingForSettings = true;
  browserWindow.addEventListener(
    'siteSettingsLoaded',
    () => {
      isWaitingForSettings = false;
      flushPendingEvents();
    },
    { once: true }
  );
};

export const toAnalyticsItem = (input = {}, index) => {
  const product = input.product || {};
  const variant = input.variant || {};
  const itemId = input.productId || input.id || product.id;
  const itemName = input.name || product.name;
  const price = asNumber(
    input.salePrice ??
      variant.salePrice ??
      product.salePrice ??
      input.price ??
      variant.price ??
      product.price
  );
  const quantity = Math.max(1, asNumber(input.quantity) || 1);
  const color = input.colorName || input.color || input.colors?.[0] || variant.colorName || variant.color;
  const size = input.size || variant.size;
  const variantId = input.variantId || variant.id || input.sku || variant.sku;
  const itemVariant = [variantId, color, size].filter(Boolean).map(String).join(' / ');

  return compactObject({
    item_id: asText(itemId),
    item_name: asText(itemName),
    affiliation: 'Valiarian online store',
    item_brand: asText(input.brand || product.brand) || 'Valiarian',
    item_category: asText(input.category || product.category),
    item_variant: itemVariant || undefined,
    price,
    quantity,
    index: Number.isInteger(index) ? index : undefined,
  });
};

export const buildEcommerceParameters = (items = [], parameters = {}) => {
  const analyticsItems = (Array.isArray(items) ? items : [])
    .map((item, index) => toAnalyticsItem(item, index))
    .filter((item) => item.item_id || item.item_name);
  const calculatedValue = analyticsItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const suppliedValue = asNumber(parameters.value);

  return compactObject({
    ...parameters,
    currency: parameters.currency || 'INR',
    value: suppliedValue === undefined ? Number(calculatedValue.toFixed(2)) : suppliedValue,
    items: analyticsItems,
  });
};

export const trackAnalyticsEvent = (name, parameters = {}, onSent) => {
  const browserWindow = getBrowserWindow();

  if (!name || !isProductionStorefront(browserWindow)) {
    return false;
  }

  const queuedEvent = { name, parameters: compactObject(parameters), onSent };

  if (sendEvent(browserWindow, queuedEvent)) {
    return true;
  }

  pendingEvents.push(queuedEvent);
  waitForAnalyticsSettings(browserWindow);
  return true;
};

export const trackEcommerceEvent = (name, items, parameters = {}) =>
  trackAnalyticsEvent(name, buildEcommerceParameters(items, parameters));

export const trackPurchase = ({ transactionId, items, ...parameters }) => {
  const browserWindow = getBrowserWindow();
  const normalizedTransactionId = asText(transactionId);

  if (!normalizedTransactionId || !isProductionStorefront(browserWindow)) {
    return false;
  }

  if (
    pendingPurchaseIds.has(normalizedTransactionId) ||
    readTrackedPurchaseIds(browserWindow).includes(normalizedTransactionId)
  ) {
    return false;
  }

  pendingPurchaseIds.add(normalizedTransactionId);

  return trackAnalyticsEvent(
    'purchase',
    buildEcommerceParameters(items, {
      ...parameters,
      transaction_id: normalizedTransactionId,
    }),
    () => {
      rememberPurchaseId(browserWindow, normalizedTransactionId);
      pendingPurchaseIds.delete(normalizedTransactionId);
    }
  );
};
