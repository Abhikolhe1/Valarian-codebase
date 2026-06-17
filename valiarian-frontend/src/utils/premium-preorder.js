import { paths } from 'src/routes/paths';

export const buildPremiumPreorderPath = ({
  productSlug,
  variantId,
}) => {
  const normalizedSlug = String(productSlug || '').trim();

  if (!normalizedSlug) {
    return null;
  }

  const searchParams = new URLSearchParams({
    product: normalizedSlug,
  });

  if (variantId) {
    searchParams.set('variant', String(variantId));
  }

  return `${paths.premiumPreorder.checkout}?${searchParams.toString()}`;
};

export const resolvePremiumActionPath = ({
  productSlug,
  variantId,
  fallbackPath,
}) => buildPremiumPreorderPath({ productSlug, variantId }) || fallbackPath || null;
