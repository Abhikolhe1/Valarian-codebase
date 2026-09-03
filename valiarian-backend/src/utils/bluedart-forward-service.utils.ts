import {BlueDartConfigurationError} from '../services/shipping-providers/bluedart-errors';

export type ForwardDeliveryMode = 'configured' | 'surface' | 'air' | 'domestic_priority';
export type ForwardPaymentType = 'prepaid' | 'cod';

export interface ForwardWaybillService {
  deliveryMode: ForwardDeliveryMode;
  paymentType: ForwardPaymentType;
  productCode?: string;
  subProductCode?: string;
  serviceType?: string;
}

export function resolveForwardDeliveryMode(value?: string): ForwardDeliveryMode {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'configured';
  if (normalized === 'surface' || normalized === 'ground') return 'surface';
  if (normalized === 'air' || normalized === 'apex') return 'air';
  if (normalized === 'domestic' || normalized === 'domestic_priority' || normalized === 'domestic-priority') {
    return 'domestic_priority';
  }
  if (normalized === 'configured') return 'configured';
  throw new BlueDartConfigurationError(
    'BLUEDART_DELIVERY_MODE must be surface, air, domestic_priority, or configured',
    'selectForwardWaybillService',
  );
}

/**
 * Selects the forward domestic ecommerce service before Finder/Waybill calls.
 * Surface mode is deliberately closed: there is no D/A fallback.
 */
export function selectForwardWaybillService(
  isCod: boolean,
  env: NodeJS.ProcessEnv = process.env,
): ForwardWaybillService {
  const deliveryMode = resolveForwardDeliveryMode(env.BLUEDART_DELIVERY_MODE);
  const paymentType: ForwardPaymentType = isCod ? 'cod' : 'prepaid';

  if (deliveryMode === 'surface') {
    return {
      deliveryMode,
      paymentType,
      productCode: 'E',
      subProductCode: isCod ? 'C' : 'P',
      serviceType: 'surface',
    };
  }

  if (deliveryMode === 'air') {
    return {
      deliveryMode,
      paymentType,
      productCode: 'A',
      subProductCode: isCod ? 'C' : 'P',
      serviceType: 'air',
    };
  }

  if (deliveryMode === 'domestic_priority') {
    if (isCod) {
      throw new BlueDartConfigurationError(
        'Domestic Priority (D/blank) is not a COD ecommerce mapping; choose surface or air for COD orders',
        'selectForwardWaybillService',
      );
    }
    return {
      deliveryMode,
      paymentType,
      productCode: 'D',
      subProductCode: undefined,
      serviceType: 'domestic_priority',
    };
  }

  return {
    deliveryMode,
    paymentType,
    productCode: env.BLUEDART_PRODUCT_CODE,
    subProductCode: env.BLUEDART_SUB_PRODUCT_CODE ?? undefined,
    serviceType: env.BLUEDART_SERVICE_TYPE,
  };
}
