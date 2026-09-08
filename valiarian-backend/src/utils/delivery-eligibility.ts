import {ServiceabilityResult} from '../interfaces/shipping-provider.interface';

export type BlueDartDeliveryStatus = 'available' | 'unavailable' | 'check_failed';

export interface DeliveryEligibility {
  checkoutAllowed: boolean;
  blueDartDeliveryStatus: BlueDartDeliveryStatus;
  message: string;
  needsManualShipping: boolean;
}

// Format/country validation is independent of the courier's coverage database.
// A valid format alone is not proof that a PIN is assigned to a post office.
export function isIndianDeliveryAddress(pincode: string, country = 'India'): boolean {
  return /^[1-9]\d{5}$/.test(pincode.trim()) &&
    ['india', 'in', 'ind'].includes(country.trim().toLowerCase());
}

export function evaluateDeliveryEligibility(
  result: ServiceabilityResult | undefined,
  isCod: boolean,
): DeliveryEligibility {
  if (result?.reason === 'invalid_pincode') {
    return {checkoutAllowed: false, blueDartDeliveryStatus: 'unavailable', needsManualShipping: false,
      message: 'Please enter a valid Indian delivery PIN code.'};
  }
  const available = result?.isServiceable === true && (!isCod || result.isCodAvailable === true);
  if (available) {
    return {checkoutAllowed: true, blueDartDeliveryStatus: 'available', needsManualShipping: false,
      message: 'Blue Dart delivery is available for this order.'};
  }
  return {
    // Keep the existing COD collection restriction until an external COD
    // collection arrangement is explicitly enabled as a business decision.
    checkoutAllowed: !isCod,
    blueDartDeliveryStatus: result ? 'unavailable' : 'check_failed',
    needsManualShipping: true,
    message: isCod
      ? 'Cash on delivery could not be confirmed. Please choose online payment.'
      : result
        ? 'Blue Dart delivery is unavailable. Arrange an external courier such as India Post.'
        : 'Blue Dart availability check failed. Delivery is unconfirmed; arrange an external courier or recheck Blue Dart.',
  };
}
