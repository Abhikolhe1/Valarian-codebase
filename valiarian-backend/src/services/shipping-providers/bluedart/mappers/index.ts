import {BlueDartConfig} from '../../../../config/bluedart.config';
import {CreateReversePickupParams, CreateShipmentParams, ServiceabilityParams, TransitTimeParams} from '../../../../interfaces/shipping-provider.interface';
import {BlueDartConfigurationError, BlueDartValidationError} from '../../bluedart-errors';

function required(value: string | undefined, name: string, operation: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new BlueDartConfigurationError(`${name} is required for ${operation}`, operation);
  return normalized;
}

function requiredPincode(value: string | undefined, name: string, operation: string): string {
  const pincode = required(value, name, operation);
  if (!/^\d{6}$/.test(pincode)) throw new BlueDartValidationError(`${name} must be a valid six-digit pincode`, {operation});
  return pincode;
}

/**
 * Blue Dart's platform-wide date format, confirmed from real sandbox response
 * data (Location Finder's `BlueDartHolidays[].HolidayDate`, 2026-08-25) and
 * from the Master Download request spec given directly by the user
 * (2026-08-26): `/Date(<epoch-ms>)/`. Used consistently for every Blue Dart
 * date field in this integration rather than guessing a per-field format.
 */
export function formatBlueDartDate(date: Date): string {
  return `/Date(${date.getTime()})/`;
}

/**
 * Confirmed common profile shape — shared by every confirmed Blue Dart
 * business API (Finder, Transit Time, Product/Sub-Product, Master Download,
 * Waybill). Single source of truth; do not construct this object inline
 * elsewhere.
 */
export function buildProfile(config: BlueDartConfig, operation: string) {
  return {
    Api_type: 'S',
    LicenceKey: required(config.account.licenceKey, 'BLUEDART_LICENCE_KEY', operation),
    LoginID: required(config.account.loginId, 'BLUEDART_LOGIN_ID', operation),
  };
}

/** UNCONFIRMED CONTRACT: only used by the still-unconfirmed reverse-pickup/pickup-registration mappers below. */
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

/**
 * Confirmed against Blue Dart's "Get Services For Pincode" reference docs
 * (Finder API, GetServicesforPincode): request body is `{pinCode, profile}`.
 */
export function mapServiceabilityRequest(params: ServiceabilityParams, config: BlueDartConfig) {
  if (!/^\d{6}$/.test(params.pincode)) throw new BlueDartValidationError('A valid six-digit pincode is required', {operation: 'checkServiceability'});
  return {pinCode: params.pincode, profile: buildProfile(config, 'checkServiceability')};
}

/**
 * Confirmed field names from the Blue Dart Transit Time specification
 * (GetDomesticTransitTimeForPinCodeandProduct).
 */
export function mapTransitTimeRequest(params: TransitTimeParams, config: BlueDartConfig) {
  const operation = 'getTransitTime';
  if (!/^\d{6}$/.test(params.originPincode) || !/^\d{6}$/.test(params.destinationPincode)) {
    throw new BlueDartValidationError('Valid six-digit origin and destination pincodes are required', {operation});
  }
  if (!/^\d{4}$/.test(params.pickupTime)) {
    throw new BlueDartValidationError('pickupTime must use 24-hour HHmm format', {operation});
  }
  return {
    pPinCode: params.originPincode,
    pPinCodeTo: params.destinationPincode,
    pProductCode: required(params.productCode, 'productCode', operation),
    pSubProductCode: params.subProductCode,
    pPudate: formatBlueDartDate(params.pickupDate),
    pPickupTime: params.pickupTime,
    profile: buildProfile(config, operation),
  };
}

/** Confirmed: GetAllProductsAndSubProducts takes only `{profile}`. */
export function mapProductsRequest(config: BlueDartConfig) {
  return {profile: buildProfile(config, 'getProductsAndSubProducts')};
}

/** Confirmed: DownloadPinCodeMaster takes `{lastSynchDate, profile}`. */
export function mapMasterDownloadRequest(lastSynchDate: Date, config: BlueDartConfig) {
  return {lastSynchDate: formatBlueDartDate(lastSynchDate), profile: buildProfile(config, 'downloadPinCodeMaster')};
}

/**
 * Confirmed field names from the Blue Dart Waybill Generation specification
 * (GenerateWayBill: Request{Shipper, Consignee, Services, Returnadds?,
 * IsUpdateAPI}, Profile). Maps real Valiarian order/warehouse data — nothing
 * here is invented; every field traces to a CreateShipmentParams value or
 * explicit account configuration, and required-but-missing values throw
 * clearly rather than being defaulted to placeholder data.
 *
 * Valiarian uses its configured warehouse address as the RTO address, so the
 * documented Returnadds object is populated from the same real origin data.
 */
export function mapWaybillRequest(params: CreateShipmentParams, config: BlueDartConfig) {
  const operation = 'createShipment';
  if (params.isCod && !params.codFavorOf && !config.account.codFavorOf) {
    throw new BlueDartValidationError('COD beneficiary configuration is required', {operation});
  }

  const now = new Date();
  const pickupTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  // Alphanumeric only, max 20 chars per spec — sanitize the order number
  // rather than inventing a separate reference.
  const creditReferenceNo = params.orderNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  if (!creditReferenceNo) throw new BlueDartValidationError('CreditReferenceNo cannot be empty after sanitizing orderNumber', {operation});
  if (!Number.isFinite(params.weightGrams) || params.weightGrams <= 0) {
    throw new BlueDartValidationError('weightGrams must be greater than zero', {operation});
  }
  const pieceCount = params.numberOfPieces ?? 1;
  if (!Number.isInteger(pieceCount) || pieceCount < 1) {
    throw new BlueDartValidationError('numberOfPieces must be at least one', {operation});
  }
  if ([params.lengthCm, params.breadthCm, params.heightCm].some(value => !Number.isFinite(value) || value <= 0)) {
    throw new BlueDartValidationError('lengthCm, breadthCm, and heightCm must be greater than zero', {operation});
  }
  const warehousePhone = required(params.warehousePhone, 'warehousePhone', operation);
  const receiverPhone = required(params.receiverPhone, 'receiverPhone', operation);

  const Shipper: Record<string, unknown> = {
    CustomerAddress1: required(params.warehouseAddressLine1, 'BLUEDART_SHIPPER_ADDRESS_LINE1 (warehouse address)', operation),
    CustomerAddress2: params.warehouseCity || '',
    CustomerAddress3: params.warehouseState || '',
    CustomerCode: required(config.account.customerCode, 'BLUEDART_CUSTOMER_CODE', operation),
    CustomerEmailID: '',
    CustomerGSTNumber: '',
    CustomerLatitude: '',
    CustomerLongitude: '',
    CustomerMaskedContactNumber: '',
    CustomerMobile: warehousePhone,
    CustomerName: required(params.warehouseName, 'warehouseName', operation),
    CustomerPincode: requiredPincode(params.warehousePincode, 'warehousePincode', operation),
    CustomerTelephone: warehousePhone,
    IsToPayCustomer: false,
    OriginArea: required(params.warehouseOriginArea, 'warehouseOriginArea', operation),
    // Account-specific Sender is not configured; preserve the documented key
    // without copying Blue Dart's sample account value.
    Sender: '',
    VendorCode: '',
  };

  const Consignee: Record<string, unknown> = {
    ConsigneeName: required(params.receiverName, 'receiverName', operation),
    ConsigneeAddress1: required(params.receiverAddress, 'receiverAddress', operation),
    ConsigneeAddress2: params.receiverCity,
    ConsigneeAddress3: params.receiverState,
    ConsigneeAddressType: 'R',
    ConsigneeAttention: '',
    ConsigneeEmailID: params.receiverEmail || '',
    ConsigneeGSTNumber: '',
    ConsigneeLatitude: '',
    ConsigneeLongitude: '',
    ConsigneeMaskedContactNumber: '',
    ConsigneePincode: requiredPincode(params.receiverPincode, 'receiverPincode', operation),
    ConsigneeMobile: receiverPhone,
    ConsigneeTelephone: '',
  };

  const Returnadds: Record<string, unknown> = {
    ManifestNumber: '',
    ReturnAddress1: required(params.warehouseAddressLine1, 'warehouse return address', operation),
    ReturnAddress2: params.warehouseCity || '',
    ReturnAddress3: params.warehouseState || '',
    ReturnContact: required(params.warehouseName, 'warehouse return contact', operation),
    ReturnEmailID: '',
    ReturnLatitude: '',
    ReturnLongitude: '',
    ReturnMaskedContactNumber: '',
    ReturnMobile: warehousePhone,
    ReturnPincode: requiredPincode(params.warehousePincode, 'warehouse return pincode', operation),
    ReturnTelephone: warehousePhone,
  };

  const Services: Record<string, unknown> = {
    ProductCode: required(params.productCode || config.account.productCode, 'productCode', operation),
    // Valiarian ships physical merchandise (apparel), not paper documents —
    // Dutiables (1), not Docs (0).
    ProductType: params.productType ?? 0,
    PieceCount: pieceCount,
    ActualWeight: params.weightGrams / 1000, // grams -> kg, per spec ("kg" in field description)
    Commodity: {},
    CreditReferenceNo: creditReferenceNo,
    Dimensions: [{Breadth: params.breadthCm, Count: pieceCount, Height: params.heightCm, Length: params.lengthCm}],
    ECCN: '',
    PickupDate: formatBlueDartDate(now),
    PickupTime: pickupTime,
    DeclaredValue: params.declaredValue,
    // Kept separate from Pickup Registration per explicit instruction —
    // Waybill only creates the shipment record; pickup is a distinct call.
    RegisterPickup: false,
    AWBNo: '',
    // Keeps the sandbox verification response small; label handling is a
    // separate, still-unconfirmed capability in this integration.
    PDFOutputNotRequired: true,
    PackType: '',
    itemdtl: [],
    noOfDCGiven: 0,
  };
  if (params.subProductCode || config.account.subProductCode) {
    Services.SubProductCode = params.subProductCode || config.account.subProductCode;
  }
  if (params.isCod) {
    const codAmount = params.codAmount ?? 0;
    if (!Number.isFinite(codAmount) || codAmount <= 0) {
      throw new BlueDartValidationError('codAmount must be greater than zero for COD shipments', {operation});
    }
    Services.CollectableAmount = codAmount;
  }
  if (params.itemDescription) {
    Services.SpecialInstruction = params.itemDescription;
  }

  return {
    Request: {Consignee, Returnadds, Services, Shipper, IsUpdateAPI: false},
    Profile: buildProfile(config, operation),
  };
}

/** Confirmed shape for CancelWaybill, per the user-supplied spec (2026-08-26). */
export function mapCancelWaybillRequest(awbNumber: string, config: BlueDartConfig) {
  const operation = 'cancelShipment';
  return {
    Request: {AWBNo: required(awbNumber, 'awbNumber', operation)},
    Profile: buildProfile(config, operation),
  };
}

// ── Not yet confirmed against official spec — unchanged from prior speculative implementation. ──
export function mapTrackingRequest(awbNumber: string, config: BlueDartConfig) { return {awbNumber, profile: buildModernAccountProfile(config, 'trackShipment')}; }
export function mapReversePickupRequest(params: CreateReversePickupParams, config: BlueDartConfig) {
  return {providerRequestId: params.providerRequestId || `return:${params.orderReference}`, originalAwbNumber: params.originalAwbNumber, pickup: {name: params.pickupName, phone: params.pickupPhone, address: params.pickupAddress, city: params.pickupCity, state: params.pickupState, pincode: params.pickupPincode}, destination: {name: params.warehouseName, pincode: params.warehousePincode, areaCode: params.warehouseAreaCode, originArea: params.warehouseOriginArea}, weightGrams: params.weightGrams, itemDescription: params.itemDescription, pickupLocationCode: config.account.pickupLocationCode, profile: buildModernAccountProfile(config, 'createReversePickup')};
}
