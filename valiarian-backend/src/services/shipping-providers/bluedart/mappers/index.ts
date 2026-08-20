import {BlueDartConfig} from '../../../../config/bluedart.config';
import {CreateReversePickupParams, CreateShipmentParams, ServiceabilityParams} from '../../../../interfaces/shipping-provider.interface';
import {BlueDartConfigurationError, BlueDartValidationError} from '../../bluedart-errors';

function required(value: string | undefined, name: string, operation: string): string {
  if (!value) throw new BlueDartConfigurationError(`${name} is required for ${operation}`, operation);
  return value;
}

/** UNCONFIRMED CONTRACT: replace envelope/field names after official schema confirmation. */
export function buildModernAccountProfile(config: BlueDartConfig, operation: string): Record<string, string> | undefined {
  if (config.modernProfileMode === 'none') return undefined;
  const profile: Record<string, string> = {
    CustomerCode: required(config.account.customerCode, 'BLUEDART_CUSTOMER_CODE', operation),
  };
  if (config.account.originArea) profile.OriginArea = config.account.originArea;
  if (config.account.areaCode) profile.AreaCode = config.account.areaCode;
  if (config.modernProfileMode === 'legacy-profile') {
    profile.LoginID = required(config.account.loginId, 'BLUEDART_LOGIN_ID', operation);
    profile.LicenceKey = required(config.account.licenceKey, 'BLUEDART_LICENCE_KEY', operation);
  }
  return profile;
}

export function mapServiceabilityRequest(params: ServiceabilityParams, config: BlueDartConfig) {
  if (!/^\d{6}$/.test(params.pincode)) throw new BlueDartValidationError('A valid six-digit pincode is required', {operation: 'checkServiceability'});
  return {pincode: params.pincode, weightGrams: params.weightGrams, profile: buildModernAccountProfile(config, 'checkServiceability')};
}

export function mapWaybillRequest(params: CreateShipmentParams, config: BlueDartConfig) {
  if (params.isCod && !params.codFavorOf && !config.account.codFavorOf) throw new BlueDartValidationError('COD beneficiary configuration is required', {operation: 'createShipment'});
  return {
    providerRequestId: params.providerRequestId || `order:${params.orderReference}`,
    order: {reference: params.orderReference, number: params.orderNumber, declaredValue: params.declaredValue},
    consignee: {name: params.receiverName, phone: params.receiverPhone, email: params.receiverEmail, address: params.receiverAddress, city: params.receiverCity, state: params.receiverState, pincode: params.receiverPincode, country: params.receiverCountry},
    origin: {name: params.warehouseName, pincode: params.warehousePincode, areaCode: params.warehouseAreaCode, originArea: params.warehouseOriginArea},
    package: {weightGrams: params.weightGrams, lengthCm: params.lengthCm, breadthCm: params.breadthCm, heightCm: params.heightCm, pieces: params.numberOfPieces || 1, description: params.itemDescription},
    service: {productCode: params.productCode || config.account.productCode, subProductCode: params.subProductCode || config.account.subProductCode, serviceType: params.serviceType || config.account.serviceType},
    cod: {enabled: params.isCod, amount: params.isCod ? params.codAmount || 0 : 0, favorOf: params.isCod ? params.codFavorOf || config.account.codFavorOf : undefined},
    profile: buildModernAccountProfile(config, 'createShipment'),
  };
}

export function mapTrackingRequest(awbNumber: string, config: BlueDartConfig) { return {awbNumber, profile: buildModernAccountProfile(config, 'trackShipment')}; }
export function mapCancellationRequest(awbNumber: string, config: BlueDartConfig) { return {awbNumber, profile: buildModernAccountProfile(config, 'cancelShipment')}; }
export function mapReversePickupRequest(params: CreateReversePickupParams, config: BlueDartConfig) {
  return {providerRequestId: params.providerRequestId || `return:${params.orderReference}`, originalAwbNumber: params.originalAwbNumber, pickup: {name: params.pickupName, phone: params.pickupPhone, address: params.pickupAddress, city: params.pickupCity, state: params.pickupState, pincode: params.pickupPincode}, destination: {name: params.warehouseName, pincode: params.warehousePincode, areaCode: params.warehouseAreaCode, originArea: params.warehouseOriginArea}, weightGrams: params.weightGrams, itemDescription: params.itemDescription, pickupLocationCode: config.account.pickupLocationCode, profile: buildModernAccountProfile(config, 'createReversePickup')};
}
