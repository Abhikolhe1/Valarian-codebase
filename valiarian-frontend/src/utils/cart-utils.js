const DEFAULT_CART_IMAGE = '/assets/placeholder.svg';
const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

export const getCartItemProductId = (item) => item?.productId || item?.id || item?.product?.id || null;

const resolveEffectiveCartPrice = (input = {}, variant = {}, product = {}) => {
  const prioritizedPrices = [
    input.salePrice,
    variant.salePrice,
    product.salePrice,
    input.price,
    variant.price,
    product.price,
  ];

  const resolvedPrice = prioritizedPrices.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);

  return resolvedPrice ? Number(resolvedPrice) : 0;
};

const resolveActualCartPrice = (input = {}, variant = {}, product = {}) => {
  const prioritizedPrices = [
    input.originalPrice,
    input.regularPrice,
    variant.price,
    product.price,
    input.price,
  ];

  const resolvedPrice = prioritizedPrices.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);

  return resolvedPrice ? Number(resolvedPrice) : 0;
};

export const getCartItemKey = (item) => {
  const productId = getCartItemProductId(item);

  if (!productId) {
    return '';
  }

  return `${productId}::${item?.variantId || item?.variant?.id || 'default'}`;
};

export const isCartItemMatch = (item, identifier) =>
  item?.key === identifier || item?.cartItemId === identifier || item?.id === identifier;

export const clampCartQuantity = (quantity, available) => {
  const parsedQuantity = Math.max(1, Number(quantity || 1));
  const parsedAvailable = Number(available);

  if (!Number.isFinite(parsedAvailable) || parsedAvailable <= 0) {
    return parsedQuantity;
  }

  return Math.min(parsedQuantity, parsedAvailable);
};

export const normalizeCartItem = (input) => {
  if (!input) {
    return null;
  }

  const product = input.product || {};
  const variant = input.variant || {};
  const productId = getCartItemProductId(input);

  if (!productId) {
    return null;
  }

  const rawAvailable =
    input.available ??
    input.stockQuantity ??
    variant.stockQuantity ??
    product.stockQuantity ??
    0;

  const colors = Array.isArray(input.colors)
    ? input.colors.filter(Boolean)
    : [input.color || variant.color].filter(Boolean);

  const image =
    input.coverUrl ||
    input.image ||
    input.coverImage ||
    product.coverImage ||
    product.images?.[0] ||
    DEFAULT_CART_IMAGE;

  const normalizedItem = {
    id: productId,
    productId,
    cartItemId: input.cartItemId || (input.product ? input.id : undefined),
    variantId: input.variantId || variant.id || null,
    name: input.name || product.name || 'Product',
    coverUrl: image,
    image,
    price: resolveEffectiveCartPrice(input, variant, product),
    originalPrice: resolveActualCartPrice(input, variant, product),
    available: Number.isFinite(Number(rawAvailable)) ? Number(rawAvailable) : 0,
    quantity: clampCartQuantity(input.quantity || 1, rawAvailable),
    colors,
    colorName: input.colorName || variant.colorName || null,
    size: input.size || variant.size || null,
    sku: input.sku || variant.sku || product.sku || null,
    slug: input.slug || product.slug || null,
    gstRate: Number(input.gstRate || input.taxes || variant.taxes || product.taxes || 0),
  };

  return {
    ...normalizedItem,
    key: getCartItemKey(normalizedItem),
  };
};

export const normalizeCart = (cart = []) =>
  (Array.isArray(cart) ? cart : []).map((item) => normalizeCartItem(item)).filter(Boolean);

export const calculateCheckoutTotals = (cart = [], discount = 0, shipping = 0) => {
  const normalizedCart = normalizeCart(cart);

  const totalItems = normalizedCart.reduce((sum, item) => sum + item.quantity, 0);
  const subTotal = normalizedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const actualSubTotal = normalizedCart.reduce(
    (sum, item) => sum + Math.max(Number(item.originalPrice || item.price || 0), Number(item.price || 0)) * item.quantity,
    0
  );
  const productDiscount = Math.max(actualSubTotal - subTotal, 0);
  const taxAmount = normalizedCart.reduce((sum, item) => {
    const gstRate = Number(item.gstRate || 0);
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

    if (gstRate <= 0 || lineTotal <= 0) {
      return sum;
    }

    const baseAmount = lineTotal / (1 + gstRate / 100);
    return sum + (lineTotal - baseAmount);
  }, 0);
  const total = subTotal - Number(discount || 0);

  return {
    cart: normalizedCart,
    totalItems,
    actualSubTotal: roundCurrency(actualSubTotal),
    productDiscount: roundCurrency(productDiscount),
    subTotal: roundCurrency(subTotal),
    taxAmount: roundCurrency(taxAmount),
    total: roundCurrency(total),
  };
};

export const findCartItem = (cart = [], identifier) =>
  normalizeCart(cart).find((item) => isCartItemMatch(item, identifier));
