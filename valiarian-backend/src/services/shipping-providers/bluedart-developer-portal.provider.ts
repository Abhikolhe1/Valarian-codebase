import {assertBlueDartBaseUrlConfigured, BlueDartConfig, loadBlueDartConfig} from '../../config/bluedart.config';
import {CreateReversePickupParams, CreateReversePickupResult, CreateShipmentParams, CreateShipmentResult, GenerateLabelResult, MasterDownloadResult, ProductCatalogEntry, ProductCatalogResult, ServiceabilityParams, ServiceabilityResult, ShippingProvider, TrackingResult, TransitTimeParams, TransitTimeResult} from '../../interfaces/shipping-provider.interface';
import {mapCourierStatus} from '../../utils/courier-status-mapper';
import {BlueDartApiClient} from './bluedart-api.client';
import {BlueDartAuthService} from './bluedart-auth.service';
import {BlueDartProviderError, LabelGenerationNotSupportedError} from './bluedart-errors';
import {mapCancelWaybillRequest, mapMasterDownloadRequest, mapProductsRequest, mapReversePickupRequest, mapServiceabilityRequest, mapTrackingRequest, mapTransitTimeRequest, mapWaybillRequest} from './bluedart/mappers';

type Json = Record<string, any>;
export interface PickupRegistrationRequest { providerRequestId: string; pickupDate: string; pickupLocationCode?: string; shipmentReferences: string[]; }
export interface PickupRegistrationResult { pickupReference: string; rawResponse?: unknown; }
export interface PickupCancellationRequest { pickupReference: string; }
export interface PickupCancellationResult { success: boolean; message?: string; }

const isYes = (value: unknown) => value === 'Y' || value === 'Yes';

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
      throw new BlueDartProviderError(String(details.ErrorMessage || 'Blue Dart returned an error for this pincode'), {operation: 'checkServiceability'});
    }
    // Which outbound flags count as "serviceable" depends on which Blue Dart
    // product/service Valiarian is contracted for — this defaults to "any
    // standard delivery service is available" and should be verified against
    // the actual account setup (see BLUEDART_PRODUCT_CODE/SERVICE_TYPE).
    const isServiceable = [details.GroundOutbound, details.DomesticPriorityOutbound, details.ApexOutbound, details.ApexEconomyOutbound].some(isYes);
    const isCodAvailable = [details.eTailCODAirOutbound, details.eTailCODGroundOutbound, details.eTailExpressCODAirOutbound, details.DPCODServiceOutbound].some(isYes);
    return {isServiceable, isCodAvailable, courierName: this.courierName, areaCode: this.text(details.AreaCode), rawResponse: raw};
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

  // ── Not yet confirmed against official spec — unchanged from prior implementation. ──
  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const raw = await this.client.post<Json, unknown>(this.config.baseUrl!, this.endpoint('tracking'), mapTrackingRequest(awbNumber, this.config), 'trackShipment');
    const sourceEvents = Array.isArray(raw.events) ? raw.events : [];
    const events = sourceEvents.map((event: Json) => { const code = String(event.code ?? event.statusCode ?? ''); return {internalStatus: mapCourierStatus('BlueDart', code), courierRawCode: code, courierDescription: String(event.description ?? ''), description: String(event.description ?? ''), location: String(event.location ?? ''), timestamp: new Date(event.timestamp)}; });
    const rawCode = String(raw.statusCode ?? events[0]?.courierRawCode ?? '');
    return {awbNumber, currentStatus: mapCourierStatus('BlueDart', rawCode), courierRawStatus: rawCode, currentLocation: this.text(raw.currentLocation), deliveredAt: raw.deliveredAt ? new Date(raw.deliveredAt) : undefined, events, rawResponse: raw};
  }

  async createReversePickup(params: CreateReversePickupParams): Promise<CreateReversePickupResult> {
    const raw = await this.client.post<Json, unknown>(this.config.waybillBaseUrl || this.config.baseUrl!, this.endpoint('waybill'), mapReversePickupRequest(params, this.config), 'createReversePickup');
    const reverseAwbNumber = this.text(raw.reverseAwbNumber ?? raw.awbNumber ?? raw.AWBNo);
    if (!reverseAwbNumber) throw new BlueDartProviderError('Unsupported reverse-waybill response contract', {operation: 'createReversePickup', reconciliationRequired: true});
    return {reverseAwbNumber, courierReferenceNumber: this.text(raw.courierReferenceNumber ?? raw.referenceNumber), rawResponse: raw};
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

  async registerPickup(request: PickupRegistrationRequest): Promise<PickupRegistrationResult> {
    if (!request.providerRequestId) throw new BlueDartProviderError('Pickup providerRequestId is required', {operation: 'registerPickup'});
    const raw = await this.client.post<Json, PickupRegistrationRequest>(this.config.baseUrl!, this.endpoint('pickupRegistration'), request, 'registerPickup');
    const pickupReference = this.text(raw.pickupReference ?? raw.pickupId);
    if (!pickupReference) throw new BlueDartProviderError('Unsupported pickup response contract', {operation: 'registerPickup', reconciliationRequired: true});
    return {pickupReference, rawResponse: raw};
  }
  async cancelPickup(request: PickupCancellationRequest): Promise<PickupCancellationResult> { return this.client.post(this.config.baseUrl!, this.endpoint('pickupCancellation'), request, 'cancelPickup'); }
}
