import { INCLUDED_SHIPPING_CHARGE } from 'src/config/checkout';
import { fCurrency } from 'src/utils/format-number';

// Keep delivery-charge presentation consistent across every order summary.
export const formatOrderDeliveryCharge = (deliveryMode, shipping) => {
  const included = `${fCurrency(INCLUDED_SHIPPING_CHARGE)} included`;
  if (deliveryMode !== 'express') return included;

  const expressCharge = Number(shipping || 29);
  return `${included} + ${fCurrency(expressCharge)} Express`;
};
