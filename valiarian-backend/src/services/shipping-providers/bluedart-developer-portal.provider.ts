import {assertBlueDartBaseUrlConfigured, BlueDartConfig, loadBlueDartConfig} from '../../config/bluedart.config';
import {AlternateInstructionParams, AlternateInstructionResult, CreateReversePickupParams, CreateReversePickupResult, CreateShipmentParams, CreateShipmentResult, GenerateLabelResult, MasterDownloadResult, PickupCancellationParams, PickupCancellationResult, PickupRegistrationParams, PickupRegistrationResult, ProductCatalogEntry, ProductCatalogResult, ServiceabilityParams, ServiceabilityResult, ShippingProvider, TrackingResult, TransitTimeParams, TransitTimeResult} from '../../interfaces/shipping-provider.interface';
import {mapCourierStatus} from '../../utils/courier-status-mapper';
import {BlueDartApiClient} from './bluedart-api.client';
import {BlueDartAuthService} from './bluedart-auth.service';
import {BlueDartProviderError, LabelGenerationNotSupportedError} from './bluedart-errors';
import {mapAlternateInstructionRequest, mapCancelWaybillRequest, mapMasterDownloadRequest, mapProductsRequest, mapReversePickupRequest, mapServiceabilityRequest, mapTransitTimeRequest, mapWaybillRequest} from './bluedart/mappers';

type Json = Record<string, any>;

const isYes = (value: unknown) => value === 'Y' || value === 'Yes';

const isInvalidPincodeMessage = (value: unknown): boolean => {
  const normalized = String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    'invalidpincode',
    'pincodeinvalid',
    'pincodenotfound',
    'pincodedoesnotexist',
    'invalidpostalcode',
  ].some(message => normalized.includes(message));
};

const toBlueDartPickupTime = (value: string, field: string, operation: string): string => {
  const digits = value.replace(':', '');
  if (!/^\d{4}$/.test(digits)) {
    throw new BlueDartProviderError(`${field} must use HH:mm or HHmm format`, {operation});
  }
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2));
  if (hours > 23 || minutes > 59) {
    throw new BlueDartProviderError(`${field} must contain a valid 24-hour time`, {operation});
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const decodeXml = (value: string): string => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();

const xmlTag = (xml: string, tag: string): string | undefined => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : undefined;
};

const mapBlueDartTrackingStatus = (code: string, description = '') => {
  const text = description.toUpperCase();
  if (text.includes('OUT FOR DELIVERY')) return mapCourierStatus('BlueDart', 'OFD');
  if (text.includes('RETURNED TO ORIGIN') || (text.includes('RETURN') && text.includes('DELIVERED'))) return mapCourierStatus('BlueDart', 'RP');
  if (text.includes('RETURN') || text.includes('RTO')) return mapCourierStatus('BlueDart', 'RTO');
  if (text.includes('DELIVERED')) return mapCourierStatus('BlueDart', 'DL');
  if (text.includes('PICKED UP') || text.includes('PICKUP DONE')) return mapCourierStatus('BlueDart', 'PU');
  if (text.includes('CANCEL')) return mapCourierStatus('BlueDart', 'CN');
  return mapCourierStatus('BlueDart', code);
};

export class BlueDartDeveloperPortalProvider implements ShippingProvider {
  readonly courierName = 'BlueDart';
  readonly providerVersion = 'bluedart-developer-portal';
  constructor(private readonly config: BlueDartConfig = loadBlueDartConfig(), private readonly client: BlueDartApiClient = new BlueDartApiClient(config, new BlueDartAuthService(config))) {}

  private endpoint(name: keyof BlueDartConfig['endpoints']): string {
    const path = this.config.endpoints[name];
    if (!path) throw new BlueDartProviderError(`Blue Dart endpoint ${name} is not configured`, {operation: String(name)});
    return path;
  }
  private text(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }

  /**
   * Some Blue Dart responses (confirmed: Waybill errors, 2026-08-26) nest the
   * real message under `Status[0].StatusInformation` instead of a flat
   * `ErrorMessage` field. Checks both, preferring the flat field.
   */
  private extractErrorMessage(details: Json): string | undefined {
    if (typeof details.ErrorMessage === 'string' && details.ErrorMessage) return details.ErrorMessage;
    const status = Array.isArray(details.Status) ? details.Status[0] : undefined;
    if (status && typeof status.StatusInformation === 'string') {
      return status.StatusCode ? `${status.StatusCode}: ${status.StatusInformation}` : status.StatusInformation;
    }
    return undefined;
  }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const raw = await this.client.post<Json, unknown>(this.config.baseUrl!, this.endpoint('serviceability'), mapServiceabilityRequest(params, this.config), 'checkServiceability');
    // GetServicesforPincode has no isServiceable boolean — it returns a
    // per-service Y/N-flag object. Confirmed via live sandbox response
    // (2026-08-25, pincode 400001): wrapped under `GetServicesforPincodeResult`
    // — NOT `ServiceCenterDetailsReference` as the older field-spec doc implied.
    // Keep both keys plus a raw fallback for resilience across accounts.
    const details: Json = (raw.GetServicesforPincodeResult ?? raw.ServiceCenterDetailsReference ?? raw) as Json;
    if (details.IsError === true || details.IsError === 'True' || details.IsError === 'true') {
      if (isInvalidPincodeMessage(details.ErrorMessage)) {
        return {
          isServiceable: false,
          isCodAvailable: false,
          reason: 'invalid_pincode',
          courierName: this.courierName,
          rawResponse: raw,
        };
      }
      throw new BlueDartProviderError(String(details.ErrorMessage || 'Blue Dart returned an error for this pincode'), {operation: 'checkServiceability'});
    }
    // Which outbound flags count as "serviceable" depends on which Blue Dart
    // product/service Valiarian is contracted for — this defaults to "any
    // standard delivery service is available" and should be verified against
    // the actual account setup (see BLUEDART_PRODUCT_CODE/SERVICE_TYPE).
    // Confirmed account matrix: Bharat Dart Prepaid is A/P with PackType L
    // and uses GroundOutbound; COD is Apex A/C and uses the Air COD flag.
    const surfacePrepaidAvailable = isYes(details.GroundOutbound);
    const surfaceCodAvailable = isYes(details.eTailCODAirOutbound);
    const airPrepaidAvailable = isYes(details.eTailPrePaidAirOutbound);
    const airCodAvailable = isYes(details.eTailCODAirOutbound);
    const domesticPriorityAvailable = isYes(details.DomesticPriorityOutbound);
    const genericServiceable = [details.GroundOutbound, details.DomesticPriorityOutbound, details.ApexOutbound, details.ApexEconomyOutbound].some(isYes);
    const isCodAvailable = [details.eTailCODAirOutbound, details.eTailCODGroundOutbound, details.eTailExpressCODAirOutbound, details.DPCODServiceOutbound].some(isYes);
    let isServiceable = genericServiceable;
    let selectedCodAvailable = isCodAvailable;
    if (params.deliveryMode === 'surface') {
      isServiceable = params.paymentType === 'cod' ? surfaceCodAvailable : surfacePrepaidAvailable;
      selectedCodAvailable = surfaceCodAvailable;
    } else if (params.deliveryMode === 'air') {
      isServiceable = params.paymentType === 'cod' ? airCodAvailable : airPrepaidAvailable;
      selectedCodAvailable = airCodAvailable;
    } else if (params.deliveryMode === 'domestic_priority') {
      isServiceable = domesticPriorityAvailable;
      selectedCodAvailable = false;
    }
    return {
      isServiceable,
      isCodAvailable: selectedCodAvailable,
      reason: isServiceable ? undefined : 'not_serviceable',
      surfacePrepaidAvailable,
      surfaceCodAvailable,
      courierName: this.courierName,
      areaCode: this.text(details.AreaCode),
      rawResponse: raw,
    };
  }

  /**
   * Confirmed sandbox URL (2026-08-26): .../transit/v1/GetDomesticTransitTimeForPinCodeandProduct.
   * Response wrapper unconfirmed until a real sandbox call succeeds — tries
   * the documented `DomesticTranistTimeReference` key (sic, per Blue Dart's
   * own spec typo) plus a raw fallback, mirroring the Finder precedent.
   */
  async getTransitTime(params: TransitTimeParams): Promise<TransitTimeResult> {
    const operation = 'getTransitTime';
    assertBlueDartBaseUrlConfigured(this.config.transitBaseUrl, 'BLUEDART_SANDBOX_TRANSIT_BASE_URL / BLUEDART_PRODUCTION_TRANSIT_BASE_URL', operation);
    const raw = await this.client.post<Json, unknown>(this.config.transitBaseUrl, '/GetDomesticTransitTimeForPinCodeandProduct', mapTransitTimeRequest(params, this.config), operation);
    const details: Json = (raw.GetDomesticTransitTimeForPinCodeandProductResult ?? raw.DomesticTranistTimeReference ?? raw) as Json;
    const isError = details.IsError === true || details.IsError === 'True' || details.IsError === 'true';
    return {
      serviceable: !isError,
      expectedDeliveryDate: this.text(details.ExpectedDateDelivery),
      expectedPodDate: this.text(details.ExpectedDatePOD),
      additionalDays: details.AdditionalDays !== undefined ? Number(details.AdditionalDays) || 0 : undefined,
      areaCode: this.text(details.Area),
      serviceCenter: this.text(details.ServiceCenter),
      isError,
      errorMessage: this.text(details.ErrorMessage),
      rawResponse: raw,
    };
  }

  /** Confirmed sandbox URL (2026-08-26): .../allproduct/v1/GetAllProductsAndSubProducts. */
  async getProductsAndSubProducts(): Promise<ProductCatalogResult> {
    const operation = 'getProductsAndSubProducts';
    assertBlueDartBaseUrlConfigured(this.config.productBaseUrl, 'BLUEDART_SANDBOX_PRODUCT_BASE_URL / BLUEDART_PRODUCTION_PRODUCT_BASE_URL', operation);
    const raw = await this.client.post<Json, unknown>(this.config.productBaseUrl, '/GetAllProductsAndSubProducts', mapProductsRequest(this.config), operation);
    const details: Json = (raw.GetAllProductsAndSubProductsResult ?? raw.GetAllProductsAndSubProductsResponseEntity ?? raw) as Json;
    const isError = details.IsError === true || details.IsError === 'True' || details.IsError === 'true';
    const productList = Array.isArray(details.ProductList) ? details.ProductList : [];
    const products: ProductCatalogEntry[] = productList.map((p: Json) => ({
      productName: String(p.ProductName ?? ''),
      productDescription: String(p.ProductDescription ?? ''),
      subProducts: Array.isArray(p.SubProducts) ? p.SubProducts.map(String) : [],
    }));
    return {products, isError, errorMessage: this.text(details.ErrorMessage), rawResponse: raw};
  }

  /**
   * Confirmed sandbox URL (2026-08-26): .../masterdownload/v1/DownloadPinCodeMaster.
   * This is incremental background/reference master sync — NOT the live
   * checkout serviceability decision (that's checkServiceability/Finder).
   */
  async downloadPinCodeMaster(lastSynchDate: Date): Promise<MasterDownloadResult> {
    const operation = 'downloadPinCodeMaster';
    assertBlueDartBaseUrlConfigured(this.config.masterDownloadBaseUrl, 'BLUEDART_SANDBOX_MASTERDOWNLOAD_BASE_URL / BLUEDART_PRODUCTION_MASTERDOWNLOAD_BASE_URL', operation);
    const raw = await this.client.post<Json, unknown>(this.config.masterDownloadBaseUrl, '/DownloadPinCodeMaster', mapMasterDownloadRequest(lastSynchDate, this.config), operation);
    const records: unknown[] = Array.isArray(raw.DownloadPinCodeMasterResult) ? raw.DownloadPinCodeMasterResult
      : Array.isArray(raw.ServiceCenterDetailsReference) ? raw.ServiceCenterDetailsReference
      : Array.isArray(raw) ? raw : [];
    const firstError = records.find((r: any) => r?.IsError === true || r?.IsError === 'True');
    return {
      records,
      recordCount: records.length,
      isError: Boolean(firstError),
      errorMessage: firstError ? this.text((firstError as Json).ErrorMessage) : undefined,
      rawResponse: raw,
    };
  }

  /**
   * Confirmed sandbox URL (2026-08-26): .../waybill/v1/GenerateWayBill. This is
   * the shipment-creation operation, not merely a label generator — the AWB
   * it returns is the core dependency for tracking/cancellation/instructions.
   * Response wrapper unconfirmed until a real sandbox call succeeds — see the
   * regression-test note in checkServiceability for why this can't be assumed.
   */
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const operation = 'createShipment';
    assertBlueDartBaseUrlConfigured(this.config.waybillBaseUrl, 'BLUEDART_SANDBOX_WAYBILL_BASE_URL / BLUEDART_PRODUCTION_WAYBILL_BASE_URL', operation);
    const raw = await this.client.post<Json, unknown>(this.config.waybillBaseUrl, '/GenerateWayBill', mapWaybillRequest(params, this.config), operation);
    const details: Json = (raw.GenerateWayBillResult ?? raw) as Json;
    const isError = details.IsError === true || details.IsError === 'True';
    if (isError) {
      throw new BlueDartProviderError(this.extractErrorMessage(details) || 'Blue Dart rejected the waybill request', {operation, reconciliationRequired: false});
    }
    const awbNumber = this.text(details.AWBNo ?? details.awbNumber ?? details.WaybillNo);
    if (!awbNumber) throw new BlueDartProviderError('Unsupported waybill response contract — no AWB present in a non-error response', {operation, reconciliationRequired: true});
    return {
      awbNumber,
      courierReferenceNumber: this.text(details.courierReferenceNumber ?? details.ReferenceNumber),
      estimatedDelivery: details.ExpectedDateDelivery ? new Date(details.ExpectedDateDelivery) : undefined,
      chargesUnavailable: this.config.environment === 'sandbox',
      rawResponse: raw,
    };
  }

  /** Confirmed sandbox URL (2026-08-26): .../waybill/v1/CancelWaybill. */
  async cancelShipment(awbNumber: string) {
    const operation = 'cancelShipment';
    assertBlueDartBaseUrlConfigured(this.config.waybillBaseUrl, 'BLUEDART_SANDBOX_WAYBILL_BASE_URL / BLUEDART_PRODUCTION_WAYBILL_BASE_URL', operation);
    const raw = await this.client.post<Json, unknown>(this.config.waybillBaseUrl, '/CancelWaybill', mapCancelWaybillRequest(awbNumber, this.config), operation);
    const details: Json = (raw.CancelWaybillResult ?? raw) as Json;
    const isError = details.IsError === true || details.IsError === 'True';
    return {success: !isError, message: this.extractErrorMessage(details) ?? this.text(details.message), rawResponse: raw};
  }

  /**
   * Official Tracking v1 GET contract; scan=1 returns the complete scan
   * history. Confirmed against Blue Dart's documented example request
   * (2026-09-02): the query string is appended directly to the tracking
   * base URL (".../tracking/v1?handler=tnt&...") with NO sub-path — unlike
   * every other Blue Dart API family, tracking has no separate resource
   * path. Deliberately does not go through this.endpoint('tracking') /
   * BLUEDART_TRACKING_PATH, which previously appended a nonexistent
   * "/shipment" segment and made every tracking call fail with a generic,
   * detail-free HTTP 400 from Apigee's routing layer.
   */
  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const operation = 'trackShipment';
    assertBlueDartBaseUrlConfigured(this.config.trackingBaseUrl, 'BLUEDART_SANDBOX_TRACKING_BASE_URL / BLUEDART_PRODUCTION_TRACKING_BASE_URL', operation);
    const query = new URLSearchParams({
      handler: 'tnt', action: 'custawbquery', loginid: this.config.account.loginId || '',
      awb: 'awb', numbers: awbNumber, format: 'xml',
      lickey: this.config.account.licenceKey || '', verno: '1', scan: '1',
    });
    const raw = await this.client.get<string>(this.config.trackingBaseUrl, `?${query.toString()}`, operation);
    if (typeof raw !== 'string') throw new BlueDartProviderError('Blue Dart tracking response was not XML', {operation});
    const parseTimestamp = (dateValue: unknown, timeValue: unknown): Date => {
      const dateText = String(dateValue || '').trim();
      const timeText = String(timeValue || '').trim();
      const match = dateText.match(/^(\d{1,2})[\s-]([A-Za-z]+)[\s-](\d{4})$/);
      const parsed = match
        ? new Date(`${match[2]} ${match[1]}, ${match[3]} ${timeText}`.trim())
        : new Date(`${dateText} ${timeText}`.trim());
      return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    };
    const scanBlocks = Array.from(raw.matchAll(/<ScanDetail(?:\s[^>]*)?>([\s\S]*?)<\/ScanDetail>/gi), match => match[1]);
    const events = scanBlocks.map(scan => {
      const code = xmlTag(scan, 'ScanType') || xmlTag(scan, 'ScanCode') || '';
      const description = xmlTag(scan, 'Scan') || code;
      return {
        internalStatus: mapBlueDartTrackingStatus(code, description), courierRawCode: code,
        courierDescription: description, description,
        location: xmlTag(scan, 'ScannedLocation') || '',
        timestamp: parseTimestamp(xmlTag(scan, 'ScanDate'), xmlTag(scan, 'ScanTime')),
      };
    }).filter(event => event.courierRawCode && event.timestamp.getTime() > 0);
    const rawCode = xmlTag(raw, 'StatusType') || events[0]?.courierRawCode || '';
    if (!rawCode) throw new BlueDartProviderError(xmlTag(raw, 'Error') || xmlTag(raw, 'Instructions') || 'Blue Dart tracking response did not contain a shipment status', {operation});
    const currentStatus = mapBlueDartTrackingStatus(rawCode, xmlTag(raw, 'Status'));
    const statusTimestamp = parseTimestamp(xmlTag(raw, 'StatusDate'), xmlTag(raw, 'StatusTime'));
    return {
      awbNumber, currentStatus, courierRawStatus: rawCode,
      currentLocation: xmlTag(raw, 'ScannedLocation') || xmlTag(raw, 'Destination'),
      deliveredAt: currentStatus === 'delivered' && statusTimestamp.getTime() > 0 ? statusTimestamp : undefined,
      events, rawResponse: raw,
    };
  }

  async createReversePickup(params: CreateReversePickupParams): Promise<CreateReversePickupResult> {
    const operation = 'createReversePickup';
    assertBlueDartBaseUrlConfigured(this.config.baseUrl, 'BLUEDART_SANDBOX_BASE_URL / BLUEDART_PRODUCTION_BASE_URL', operation);
    assertBlueDartBaseUrlConfigured(this.config.waybillBaseUrl, 'BLUEDART_SANDBOX_WAYBILL_BASE_URL / BLUEDART_PRODUCTION_WAYBILL_BASE_URL', operation);

    const finderRaw = await this.client.post<Json, unknown>(
      this.config.baseUrl,
      '/GetServicesforPincodeAndProduct',
      {pinCode: params.pickupPincode, ProductCode: 'A', SubProductCode: 'P', PackType: '', Feature: 'R', profile: mapServiceabilityRequest({pincode: params.pickupPincode}, this.config).profile},
      operation,
    );
    const finder = (finderRaw.GetServicesforPincodeAndProductResult ?? finderRaw) as Json;
    if (finder.IsError === true || finder.IsError === 'True' || !isYes(finder.PickupService)) {
      throw new BlueDartProviderError(this.extractErrorMessage(finder) || `Blue Dart reverse pickup is unavailable for pincode ${params.pickupPincode}`, {operation});
    }
    const pickupAreaCode = this.text(finder.PickupAreaCode);
    if (!pickupAreaCode) throw new BlueDartProviderError('Blue Dart Finder did not return PickupAreaCode for the reverse pickup', {operation});

    const raw = await this.client.post<Json, unknown>(
      this.config.waybillBaseUrl,
      '/GenerateWayBill',
      mapReversePickupRequest({...params, warehouseOriginArea: pickupAreaCode}, this.config),
      operation,
    );
    const details = (raw.GenerateWayBillResult ?? raw) as Json;
    const awb = this.text(details.AWBNo);
    if (details.IsError === true || details.IsError === 'True' || !awb) {
      throw new BlueDartProviderError(this.extractErrorMessage(details) || 'Blue Dart rejected the reverse waybill request', {operation, reconciliationRequired: Boolean(awb)});
    }
    if (details.IsErrorInPU === true || details.IsErrorInPU === 'True') {
      throw new BlueDartProviderError(this.extractErrorMessage(details) || `Reverse AWB ${awb} was created, but pickup registration failed`, {operation, reconciliationRequired: true});
    }
    return {reverseAwbNumber: awb, courierReferenceNumber: this.text(details.CCRCRDREF), pickupTokenNumber: this.text(details.TokenNumber), pickupDate: this.text(details.ShipmentPickupDate), rawResponse: raw};
  }

  async updateAlternateInstruction(
    params: AlternateInstructionParams,
  ): Promise<AlternateInstructionResult> {
    const operation = 'updateAlternateInstruction';
    assertBlueDartBaseUrlConfigured(
      this.config.alternateInstructionBaseUrl,
      'BLUEDART_SANDBOX_ALT_INSTRUCTION_BASE_URL / BLUEDART_PRODUCTION_ALT_INSTRUCTION_BASE_URL',
      operation,
    );
    const raw = await this.client.post<Json, unknown>(
      this.config.alternateInstructionBaseUrl,
      this.config.endpoints.alternateInstruction || '/CustALTInstructionUpdate',
      mapAlternateInstructionRequest(params, this.config),
      operation,
    );
    const details: Json = (raw.CustALTInstructionUpdateResult ?? raw) as Json;
    const statusContainer = details.Status ?? details.status;
    const statusEntry = Array.isArray(statusContainer)
      ? statusContainer[0]
      : statusContainer?.e ?? statusContainer;
    const isError =
      details.IsError === true ||
      details.IsError === 'True' ||
      details.IsError === 'true';
    const statusCode = this.text(statusEntry?.StatusCode);
    const statusInformation =
      this.text(statusEntry?.StatusInformation) ||
      this.text(details.ErrorMessage);
    if (isError) {
      throw new BlueDartProviderError(
        statusInformation || 'Blue Dart rejected the alternate instruction',
        {operation, providerCode: statusCode},
      );
    }
    const awbNumber = this.text(details.AWBNo) || params.awbNumber;
    return {
      awbNumber,
      accepted: true,
      statusCode,
      statusInformation,
      rawResponse: raw,
    };
  }

  async generateLabel(awbNumber: string): Promise<GenerateLabelResult> {
    if (!this.config.endpoints.label) throw new LabelGenerationNotSupportedError('Blue Dart label generation is not configured', {operation: 'generateLabel'});
    const raw = await this.client.request<any, {awbNumber: string}>({method: 'POST', baseUrl: this.config.baseUrl!, path: this.config.endpoints.label, operation: 'generateLabel', operationType: 'mutation', body: {awbNumber}});
    const encoded = this.text(raw?.base64Pdf ?? raw?.labelBase64);
    if (!encoded) throw new BlueDartProviderError('Unsupported label response contract; documented base64 PDF is required', {operation: 'generateLabel'});
    const pdf = Buffer.from(encoded, 'base64');
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new BlueDartProviderError('Blue Dart label response was not a valid PDF', {operation: 'generateLabel'});
    return {pdf, awbNumber, labelFormat: 'A6'};
  }

  async registerPickup(params: PickupRegistrationParams): Promise<PickupRegistrationResult> {
    if (!params.providerRequestId) throw new BlueDartProviderError('Pickup providerRequestId is required', {operation: 'registerPickup'});
    const operation = 'registerPickup';
    assertBlueDartBaseUrlConfigured(this.config.pickupBaseUrl, 'BLUEDART_SANDBOX_PICKUP_BASE_URL / BLUEDART_PRODUCTION_PICKUP_BASE_URL', operation);
    const pickupTime = toBlueDartPickupTime(params.pickupTime, 'pickupTime', operation);
    const officeCloseTime = toBlueDartPickupTime(params.officeCloseTime, 'officeCloseTime', operation);
    const body = {
      request: {
        // Blue Dart's v0.1 RegisterPickup contract registers a collection
        // request independently of the shipment; its documented value is an
        // array containing one empty string, even after waybill generation.
        AWBNo: [''],
        AreaCode: params.areaCode,
        CISDDN: false,
        ContactPersonName: params.customerName,
        CustomerAddress1: params.addressLine1,
        CustomerAddress2: params.addressLine2 || '',
        CustomerAddress3: params.addressLine3 || '',
        CustomerCode: params.customerCode,
        CustomerName: params.customerName,
        CustomerPincode: params.pincode,
        CustomerTelephoneNumber: params.phone,
        DoxNDox: '1',
        EmailID: '',
        IsForcePickup: false,
        IsReversePickup: false,
        MobileTelNo: params.phone,
        NumberofPieces: params.numberOfPieces,
        OfficeCloseTime: officeCloseTime,
        PackType: '',
        ProductCode: params.productCode,
        ReferenceNo: '',
        Remarks: '',
        RouteCode: '',
        ShipmentPickupDate: `/Date(${params.pickupDate.getTime()})/`,
        ShipmentPickupTime: pickupTime,
        SubProducts: params.subProducts || [],
        VolumeWeight: params.weightKg,
        WeightofShipment: params.weightKg,
        isToPayShipper: false,
      },
      profile: {
        Api_type: 'S',
        LicenceKey: this.config.account.licenceKey,
        LoginID: this.config.account.loginId,
      },
    };
    const raw = await this.client.post<Json, typeof body>(this.config.pickupBaseUrl, this.endpoint('pickupRegistration'), body, operation);
    const detailsValue = raw.RegisterPickupResult ?? raw.PickupRegistrationResponse ?? raw;
    const details: Json = (Array.isArray(detailsValue) ? detailsValue[0] : detailsValue) as Json;
    const isError = details.IsError === true || details.IsError === 'True' || details.IsError === 'true';
    if (isError) throw new BlueDartProviderError(this.extractErrorMessage(details) || 'Blue Dart rejected pickup registration', {operation, reconciliationRequired: false});
    const rawReference = details.TokenNumber ?? details.pickupReference ?? details.pickupId;
    const pickupReference = rawReference === undefined || rawReference === null ? undefined : String(rawReference);
    if (!pickupReference) throw new BlueDartProviderError('Unsupported pickup response contract', {operation: 'registerPickup', reconciliationRequired: true});
    return {pickupReference, rawResponse: raw};
  }
  /**
   * Official Cancel Pickup v1 POST contract. Confirmed against Blue Dart's
   * documented endpoint (2026-09-02): the request posts directly to the
   * cancel-pickup base URL (".../cancel-pickup/v1") with NO sub-path —
   * same pattern as trackShipment(). Deliberately does not go through
   * this.endpoint('pickupCancellation') / BLUEDART_PICKUP_CANCELLATION_PATH,
   * which previously appended a nonexistent "/CancelPickup" segment and
   * made every cancellation fail with a generic, detail-free HTTP 400 from
   * Apigee's routing layer before ever reaching Blue Dart's business logic.
   */
  async cancelPickup(params: PickupCancellationParams): Promise<PickupCancellationResult> {
    const operation = 'cancelPickup';
    const tokenNumber = Number(params.pickupReference);
    if (!Number.isSafeInteger(tokenNumber) || tokenNumber <= 0) {
      throw new BlueDartProviderError('Blue Dart pickup token must be a positive number', {operation});
    }
    assertBlueDartBaseUrlConfigured(this.config.cancelPickupBaseUrl, 'BLUEDART_SANDBOX_CANCEL_PICKUP_BASE_URL / BLUEDART_PRODUCTION_CANCEL_PICKUP_BASE_URL', operation);
    const body = {
      request: {
        PickupRegistrationDate: `/Date(${params.pickupRegistrationDate.getTime()})/`,
        Remarks: params.remarks || '',
        TokenNumber: tokenNumber,
      },
      profile: {
        Api_type: 'S',
        LicenceKey: this.config.account.licenceKey,
        LoginID: this.config.account.loginId,
      },
    };
    const raw = await this.client.post<Json, typeof body>(this.config.cancelPickupBaseUrl, '', body, operation);
    const details: Json = (raw.CancelPickupResult ?? raw.CancelPickupResponseEntity ?? raw) as Json;
    const isError = details.IsError === true || details.IsError === 'True' || details.IsError === 'true';
    return {success: !isError, message: this.extractErrorMessage(details), rawResponse: raw};
  }
}
