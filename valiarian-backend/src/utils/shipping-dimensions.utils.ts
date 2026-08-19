/**
 * Shipping Dimensions Utilities
 *
 * Calculates package weight and dimensions from order items.
 * Applies Blue Dart's volumetric weight formula.
 * Used by ShipmentController.createShipment() to auto-calculate shipment dimensions.
 */

export interface ShippingDimensions {
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  volumetricDivisor?: number;
}

export interface ProductShippingData {
  productId: string;
  variantId?: string;
  quantity: number;
  /** Per-variant dimensions (takes priority over product-level) */
  variantDimensions?: Partial<ShippingDimensions>;
  /** Product-level dimensions (fallback) */
  productDimensions?: Partial<ShippingDimensions>;
}

export interface AggregatedDimensions {
  deadWeightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  volumetricDivisor: number;
  usedDimensions: 'volumetric' | 'dead_weight';
  fallbackUsed: boolean; // true if any item used env var defaults
}

// ── Default dimensions from environment variables ─────────────────────────────
export function getDefaultDimensions(): Required<ShippingDimensions> {
  return {
    weightGrams: parseInt(
      process.env.BLUEDART_DEFAULT_WEIGHT_GRAMS ?? '500',
      10,
    ),
    lengthCm: parseInt(process.env.BLUEDART_DEFAULT_LENGTH_CM ?? '20', 10),
    breadthCm: parseInt(process.env.BLUEDART_DEFAULT_BREADTH_CM ?? '15', 10),
    heightCm: parseInt(process.env.BLUEDART_DEFAULT_HEIGHT_CM ?? '10', 10),
    volumetricDivisor: parseInt(
      process.env.BLUEDART_VOLUMETRIC_DIVISOR ?? '5000',
      10,
    ),
  };
}

// ── Volumetric weight formula ─────────────────────────────────────────────────
/**
 * Calculate volumetric weight in grams.
 * Blue Dart standard formula: (L × B × H) / volumetricDivisor
 * where dimensions are in cm and divisor is typically 5000.
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  breadthCm: number,
  heightCm: number,
  volumetricDivisor = 5000,
): number {
  // Result is in kg from the formula, convert to grams
  const volumetricKg = (lengthCm * breadthCm * heightCm) / volumetricDivisor;
  return Math.ceil(volumetricKg * 1000); // round up to nearest gram
}

// ── Chargeable weight ─────────────────────────────────────────────────────────
/**
 * Blue Dart charges whichever is higher: dead weight or volumetric weight.
 */
export function getChargeableWeight(
  deadWeightGrams: number,
  volumetricWeightGrams: number,
): {
  chargeableWeightGrams: number;
  usedDimensions: 'volumetric' | 'dead_weight';
} {
  if (volumetricWeightGrams > deadWeightGrams) {
    return {
      chargeableWeightGrams: volumetricWeightGrams,
      usedDimensions: 'volumetric',
    };
  }
  return {
    chargeableWeightGrams: deadWeightGrams,
    usedDimensions: 'dead_weight',
  };
}

// ── Aggregate across order items ──────────────────────────────────────────────
/**
 * Calculate total shipping dimensions for an entire order.
 *
 * Logic per item:
 *  1. Use variant dimensions if present (variant-level override)
 *  2. Fall back to product dimensions
 *  3. Fall back to env var defaults
 *
 * Weight is summed across all items (quantity-aware).
 * Dimensions are taken from the largest individual item (conservative approach
 * for single-box shipments; for multi-box, use per-shipment item dimensions).
 */
export function calculateOrderShippingDimensions(
  products: ProductShippingData[],
): AggregatedDimensions {
  const defaults = getDefaultDimensions();
  let fallbackUsed = false;

  let totalDeadWeightGrams = 0;
  let maxLengthCm = 0;
  let maxBreadthCm = 0;
  let maxHeightCm = 0;
  const divisor = defaults.volumetricDivisor;

  for (const item of products) {
    // Resolve dimensions: variant → product → defaults
    const dims = resolveDimensions(
      item.variantDimensions,
      item.productDimensions,
      defaults,
    );

    if (dims.usedFallback) fallbackUsed = true;

    // Weight is additive (multiply by quantity)
    totalDeadWeightGrams += dims.weightGrams * item.quantity;

    // Dimensions: take the max across all items (fits in one box assumption)
    if (dims.lengthCm > maxLengthCm) maxLengthCm = dims.lengthCm;
    if (dims.breadthCm > maxBreadthCm) maxBreadthCm = dims.breadthCm;
    if (dims.heightCm > maxHeightCm) maxHeightCm = dims.heightCm;
  }

  // Handle empty order (defensive)
  if (products.length === 0) {
    totalDeadWeightGrams = defaults.weightGrams;
    maxLengthCm = defaults.lengthCm;
    maxBreadthCm = defaults.breadthCm;
    maxHeightCm = defaults.heightCm;
    fallbackUsed = true;
  }

  const volumetricWeightGrams = calculateVolumetricWeight(
    maxLengthCm,
    maxBreadthCm,
    maxHeightCm,
    divisor,
  );

  const {chargeableWeightGrams, usedDimensions} = getChargeableWeight(
    totalDeadWeightGrams,
    volumetricWeightGrams,
  );

  return {
    deadWeightGrams: totalDeadWeightGrams,
    lengthCm: maxLengthCm,
    breadthCm: maxBreadthCm,
    heightCm: maxHeightCm,
    volumetricWeightGrams,
    chargeableWeightGrams,
    volumetricDivisor: divisor,
    usedDimensions,
    fallbackUsed,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function resolveDimensions(
  variant: Partial<ShippingDimensions> | undefined,
  product: Partial<ShippingDimensions> | undefined,
  defaults: Required<ShippingDimensions>,
): {
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  usedFallback: boolean;
} {
  let usedFallback = false;

  const get = <K extends keyof ShippingDimensions>(
    key: K,
  ): number => {
    const v = variant?.[key] as number | undefined;
    if (v !== undefined && v > 0) return v;

    const p = product?.[key] as number | undefined;
    if (p !== undefined && p > 0) return p;

    usedFallback = true;
    return defaults[key] as number;
  };

  return {
    weightGrams: get('weightGrams'),
    lengthCm: get('lengthCm'),
    breadthCm: get('breadthCm'),
    heightCm: get('heightCm'),
    usedFallback,
  };
}

/**
 * Convert grams to kg (rounded to 3 decimal places) for API calls that expect kg.
 */
export function gramsToKg(grams: number): number {
  return Math.round((grams / 1000) * 1000) / 1000;
}
