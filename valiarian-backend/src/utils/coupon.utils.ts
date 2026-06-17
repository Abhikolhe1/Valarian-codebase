import {Coupon, Product, ProductVariant} from '../models';

export const roundCouponCurrency = (value: number): number =>
  Number(Number(value || 0).toFixed(2));

export const normalizeCouponCode = (code: string): string =>
  String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

export const getCouponAvailabilityError = (
  coupon: Pick<Coupon, 'isDeleted' | 'isActive' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): string | null => {
  if (!coupon || coupon.isDeleted) {
    return 'Coupon not found';
  }

  if (!coupon.isActive) {
    return 'This coupon is currently inactive';
  }

  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return 'This coupon is not active yet';
  }

  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    return 'This coupon has expired';
  }

  return null;
};

export const calculateCouponDiscount = (
  coupon: Pick<Coupon, 'discountType' | 'discountValue' | 'maxDiscountAmount'>,
  subtotal: number,
): number => {
  const normalizedSubtotal = Number(subtotal || 0);

  if (normalizedSubtotal <= 0) {
    return 0;
  }

  let discountAmount =
    coupon.discountType === 'percentage'
      ? (normalizedSubtotal * Number(coupon.discountValue || 0)) / 100
      : Number(coupon.discountValue || 0);

  if (Number(coupon.maxDiscountAmount || 0) > 0) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  }

  return roundCouponCurrency(Math.min(discountAmount, normalizedSubtotal));
};

const findPositivePrice = (...values: Array<unknown>): number | null => {
  for (const value of values) {
    const normalizedValue = Number(value);

    if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
      return normalizedValue;
    }
  }

  return null;
};

export const resolveCheckoutUnitPrice = (params: {
  requestedPrice?: number;
  product?: Partial<Product> | null;
  variant?: Partial<ProductVariant> | null;
}): number => {
  const resolvedPrice = findPositivePrice(
    params.requestedPrice,
    params.product?.salePrice,
    params.variant?.price,
    params.product?.price,
  );

  return roundCouponCurrency(resolvedPrice || 0);
};

export const resolveCheckoutOriginalUnitPrice = (params: {
  requestedOriginalPrice?: number;
  requestedPrice?: number;
  product?: Partial<Product> | null;
  variant?: Partial<ProductVariant> | null;
}): number => {
  const resolvedPrice = findPositivePrice(
    params.requestedOriginalPrice,
    params.variant?.price,
    params.product?.price,
    params.requestedPrice,
    params.product?.salePrice,
  );

  return roundCouponCurrency(resolvedPrice || 0);
};
