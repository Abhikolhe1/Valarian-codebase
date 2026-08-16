import {ProductVariant} from '../models';

/**
 * A product's default variant (the one the storefront card reads stock
 * status from) should never be out of stock while another variant has
 * stock. Given a product's variants and whichever one is nominally the
 * default, returns the variant that should actually be marked default:
 * the nominal one if it still has stock, otherwise whichever variant
 * currently has the most stock. Returns null only if no variant exists.
 */
export function resolveDefaultVariant(
  variants: ProductVariant[],
  nominalDefault?: ProductVariant | null,
): ProductVariant | null {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const resolvedNominal = nominalDefault ?? variants[0];

  if (resolvedNominal && Number(resolvedNominal.stockQuantity || 0) > 0) {
    return resolvedNominal;
  }

  const bestInStockVariant = variants.reduce<ProductVariant | null>(
    (best, variant) => {
      const qty = Number(variant.stockQuantity || 0);
      if (qty <= 0) return best;
      if (!best || qty > Number(best.stockQuantity || 0)) return variant;
      return best;
    },
    null,
  );

  return bestInStockVariant ?? resolvedNominal ?? null;
}
