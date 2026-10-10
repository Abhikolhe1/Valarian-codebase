import {ServiceabilityResult} from '../interfaces/shipping-provider.interface';
import {PreferredServiceabilityResult} from '../services/shipping.service';

export type CourierDeliveryStatus =
  | 'available'
  | 'unavailable'
  | 'check_failed'
  | 'not_checked';
export type BlueDartDeliveryStatus = CourierDeliveryStatus;

export interface DeliveryEligibility {
  checkoutAllowed: boolean;
  blueDartDeliveryStatus: BlueDartDeliveryStatus;
  delhiveryDeliveryStatus: CourierDeliveryStatus;
  selectedShippingProvider: 'delhivery' | 'bluedart' | 'manual';
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
    return {checkoutAllowed: false, blueDartDeliveryStatus: 'unavailable', delhiveryDeliveryStatus: 'not_checked', selectedShippingProvider: 'manual', needsManualShipping: false,
      message: 'Please enter a valid Indian delivery PIN code.'};
  }
  const available = result?.isServiceable === true && (!isCod || result.isCodAvailable === true);
  if (available) {
    return {checkoutAllowed: true, blueDartDeliveryStatus: 'available', delhiveryDeliveryStatus: 'not_checked', selectedShippingProvider: 'bluedart', needsManualShipping: false,
      message: 'Delivery is available for this order.'};
  }
  return {
    // Keep the existing COD collection restriction until an external COD
    // collection arrangement is explicitly enabled as a business decision.
    checkoutAllowed: !isCod,
    blueDartDeliveryStatus: result ? 'unavailable' : 'check_failed',
    delhiveryDeliveryStatus: 'not_checked',
    selectedShippingProvider: 'manual',
    needsManualShipping: true,
    message: isCod
      ? 'Cash on delivery could not be confirmed. Please choose online payment.'
      : 'Standard delivery will be arranged for this address.',
  };
}

function providerStatus(
  result: ServiceabilityResult | undefined,
  failed: boolean,
  isCod: boolean,
): CourierDeliveryStatus {
  if (failed) return 'check_failed';
  if (!result) return 'not_checked';
  return result.isServiceable && (!isCod || result.isCodAvailable)
    ? 'available'
    : 'unavailable';
}

export function evaluatePreferredDeliveryEligibility(
  chain: PreferredServiceabilityResult,
  isCod: boolean,
): DeliveryEligibility {
  const delhiveryDeliveryStatus = providerStatus(
    chain.delhivery,
    chain.delhiveryCheckFailed,
    isCod,
  );
  const blueDartDeliveryStatus = providerStatus(
    chain.blueDart,
    chain.blueDartCheckFailed,
    isCod,
  );
  const selectedShippingProvider = chain.selectedProvider.toLowerCase() as
    | 'delhivery'
    | 'bluedart'
    | 'manual';
  if (selectedShippingProvider !== 'manual') {
    return {
      checkoutAllowed: true,
      blueDartDeliveryStatus,
      delhiveryDeliveryStatus,
      selectedShippingProvider,
      needsManualShipping: false,
      message: 'Delivery is available for this order.',
    };
  }
  return {
    // Prepaid orders can still be fulfilled manually through the postal
    // service when integrated couriers do not cover the destination.
    checkoutAllowed: !isCod,
    blueDartDeliveryStatus,
    delhiveryDeliveryStatus,
    selectedShippingProvider,
    needsManualShipping: true,
    message: isCod
      ? 'Cash on delivery is unavailable for this PIN code. Please choose online payment.'
      : 'Standard delivery will be arranged for this address.',
  };
}
