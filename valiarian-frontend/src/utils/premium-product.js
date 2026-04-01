export const getPremiumProductVariants = (product) =>
  Array.isArray(product?.variants) ? product.variants : [];

export const getPremiumVariantColorValue = (variant) =>
  String(variant?.color || variant?.colorName || '')
    .trim();

export const getPremiumVariantColorLabel = (variant) =>
  String(variant?.colorName || variant?.color || '')
    .trim();

export const isPremiumVariantInStock = (product, variant) => {
  if (!variant) {
    if (product?.trackInventory === false) {
      return true;
    }

    return Boolean(product?.inStock) && Number(product?.stockQuantity || 0) > 0;
  }

  if (product?.trackInventory === false) {
    return true;
  }

  return Boolean(variant.inStock) && Number(variant.stockQuantity || 0) > 0;
};

export const getPremiumVariantPrice = (product, variant) => {
  const prioritizedPrices = [
    variant?.salePrice,
    product?.salePrice,
    variant?.price,
    product?.price,
  ];
  const matchedPrice = prioritizedPrices.find(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0
  );

  return matchedPrice ? Number(matchedPrice) : 0;
};

export const getPremiumVariantLabel = (variant) =>
  [variant?.size, getPremiumVariantColorLabel(variant)].filter(Boolean).join(' / ') || 'Default';

export const getPremiumVariantColorOptions = (product) => {
  const variants = getPremiumProductVariants(product);
  const seen = new Set();

  const variantOptions = variants.reduce((result, variant) => {
    const colorValue = getPremiumVariantColorValue(variant);

    if (!colorValue || seen.has(colorValue)) {
      return result;
    }

    seen.add(colorValue);
    result.push({
      value: colorValue,
      label: getPremiumVariantColorLabel(variant) || colorValue,
      swatch: String(variant?.color || '').trim(),
    });

    return result;
  }, []);

  if (variantOptions.length > 0) {
    return variantOptions;
  }

  const fallbackColors = Array.isArray(product?.colors) ? product.colors : [];

  return fallbackColors.reduce((result, color) => {
    const normalizedColor = String(color || '').trim();

    if (!normalizedColor || seen.has(normalizedColor)) {
      return result;
    }

    seen.add(normalizedColor);
    result.push({
      value: normalizedColor,
      label: normalizedColor,
      swatch: normalizedColor,
    });

    return result;
  }, []);
};

export const getPremiumVariantSizeOptions = (product) => {
  const variants = getPremiumProductVariants(product);
  const seen = new Set();

  return variants.reduce((result, variant) => {
    const sizeValue = String(variant?.size || '').trim();

    if (!sizeValue || seen.has(sizeValue)) {
      return result;
    }

    seen.add(sizeValue);
    result.push(sizeValue);
    return result;
  }, []);
};

export const getDefaultPremiumVariant = (product, preferredVariantId = '') => {
  const variants = getPremiumProductVariants(product);

  if (!variants.length) {
    return null;
  }

  return (
    variants.find((variant) => variant.id === preferredVariantId) ||
    variants.find((variant) => variant.isDefault && isPremiumVariantInStock(product, variant)) ||
    variants.find((variant) => isPremiumVariantInStock(product, variant)) ||
    variants.find((variant) => variant.isDefault) ||
    variants[0] ||
    null
  );
};

export const findPremiumVariantByOptions = (product, { color, size }) => {
  const variants = getPremiumProductVariants(product);

  return (
    variants.find(
      (variant) => getPremiumVariantColorValue(variant) === color && variant.size === size
    ) || null
  );
};

export const isPremiumColorAvailable = (product, color, size) => {
  const variants = getPremiumProductVariants(product);

  return variants.some(
    (variant) =>
      getPremiumVariantColorValue(variant) === color &&
      (!size || variant.size === size) &&
      isPremiumVariantInStock(product, variant)
  );
};

export const isPremiumSizeAvailable = (product, size, color) => {
  const variants = getPremiumProductVariants(product);

  return variants.some(
    (variant) =>
      variant.size === size &&
      (!color || getPremiumVariantColorValue(variant) === color) &&
      isPremiumVariantInStock(product, variant)
  );
};

export const getPremiumNextAvailableVariant = (product, { color, size }) => {
  const variants = getPremiumProductVariants(product);

  return (
    variants.find(
      (variant) =>
        getPremiumVariantColorValue(variant) === color &&
        variant.size === size &&
        isPremiumVariantInStock(product, variant)
    ) ||
    variants.find(
      (variant) =>
        getPremiumVariantColorValue(variant) === color && isPremiumVariantInStock(product, variant)
    ) ||
    variants.find(
      (variant) => variant.size === size && isPremiumVariantInStock(product, variant)
    ) ||
    getDefaultPremiumVariant(product)
  );
};
