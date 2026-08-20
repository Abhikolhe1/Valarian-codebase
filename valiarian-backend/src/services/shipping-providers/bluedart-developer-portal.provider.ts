import {BlueDartConfig, loadBlueDartConfig} from '../../config/bluedart.config';
import {CreateReversePickupParams, CreateReversePickupResult, CreateShipmentParams, CreateShipmentResult, GenerateLabelResult, ServiceabilityParams, ServiceabilityResult, ShippingProvider, TrackingResult} from '../../interfaces/shipping-provider.interface';
import {mapCourierStatus} from '../../utils/courier-status-mapper';
import {BlueDartApiClient} from './bluedart-api.client';
import {BlueDartAuthService} from './bluedart-auth.service';
import {BlueDartConfigurationError, BlueDartProviderError, BlueDartUnsupportedOperationError, LabelGenerationNotSupportedError} from './bluedart-errors';
import {mapCancellationRequest, mapReversePickupRequest, mapServiceabilityRequest, mapTrackingRequest, mapWaybillRequest} from './bluedart/mappers';

type Json = Record<string, any>;
export interface PickupRegistrationRequest { providerRequestId: string; pickupDate: string; pickupLocationCode?: string; shipmentReferences: string[]; }
export interface PickupRegistrationResult { pickupReference: string; rawResponse?: unknown; }
export interface PickupCancellationRequest { pickupReference: string; }
export interface PickupCancellationResult { success: boolean; message?: string; }

export class BlueDartDeveloperPortalProvider implements ShippingProvider {
  readonly courierName = 'BlueDart';
  readonly providerVersion = 'bluedart-developer-portal';
  constructor(private readonly config: BlueDartConfig = loadBlueDartConfig(), private readonly client: BlueDartApiClient = new BlueDartApiClient(config, new BlueDartAuthService(config))) {}

  private endpoint(name: keyof BlueDartConfig['endpoints']): string {
    const path = this.config.endpoints[name];
    if (!path) throw new BlueDartConfigurationError(`Blue Dart endpoint ${name} is not configured`, String(name));
    return path;
  }
  private text(value: unknown): string | undefined { return typeof value === 'string' && value ? value : undefined; }

  async checkServiceability(params: ServiceabilityParams): Promise<ServiceabilityResult> {
    const raw = await this.client.post<Json, unknown>(this.endpoint('serviceability'), mapServiceabilityRequest(params, this.config), 'checkServiceability');
    const serviceable = raw.isServiceable ?? raw.serviceable;
    if (typeof serviceable !== 'boolean') throw new BlueDartProviderError('Unsupported serviceability response contract', {operation: 'checkServiceability'});
    return {isServiceable: serviceable, isCodAvailable: Boolean(raw.isCodAvailable ?? raw.codAvailable), estimatedTransitDays: Number(raw.estimatedTransitDays ?? raw.transitDays) || undefined, courierName: this.courierName, areaCode: this.text(raw.areaCode), originArea: this.text(raw.originArea), rawResponse: raw};
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const raw = await this.client.post<Json, unknown>(this.endpoint('waybill'), mapWaybillRequest(params, this.config), 'createShipment');
    const awbNumber = this.text(raw.awbNumber ?? raw.AWBNo ?? raw.waybillNumber);
    if (!awbNumber) throw new BlueDartProviderError('Unsupported waybill response contract', {operation: 'createShipment', reconciliationRequired: true});
    return {awbNumber, courierReferenceNumber: this.text(raw.courierReferenceNumber ?? raw.referenceNumber), estimatedDelivery: raw.estimatedDelivery ? new Date(raw.estimatedDelivery) : undefined, rawResponse: raw};
  }

  async cancelShipment(awbNumber: string) {
    const raw = await this.client.post<Json, unknown>(this.endpoint('cancelWaybill'), mapCancellationRequest(awbNumber, this.config), 'cancelShipment');
    return {success: Boolean(raw.success ?? raw.cancelled), message: this.text(raw.message ?? raw.statusMessage), rawResponse: raw};
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const raw = await this.client.post<Json, unknown>(this.endpoint('tracking'), mapTrackingRequest(awbNumber, this.config), 'trackShipment');
    const sourceEvents = Array.isArray(raw.events) ? raw.events : [];
    const events = sourceEvents.map((event: Json) => { const code = String(event.code ?? event.statusCode ?? ''); return {internalStatus: mapCourierStatus('BlueDart', code), courierRawCode: code, courierDescription: String(event.description ?? ''), description: String(event.description ?? ''), location: String(event.location ?? ''), timestamp: new Date(event.timestamp)}; });
    const rawCode = String(raw.statusCode ?? events[0]?.courierRawCode ?? '');
    return {awbNumber, currentStatus: mapCourierStatus('BlueDart', rawCode), courierRawStatus: rawCode, currentLocation: this.text(raw.currentLocation), deliveredAt: raw.deliveredAt ? new Date(raw.deliveredAt) : undefined, events, rawResponse: raw};
  }

  async createReversePickup(params: CreateReversePickupParams): Promise<CreateReversePickupResult> {
    const raw = await this.client.post<Json, unknown>(this.endpoint('waybill'), mapReversePickupRequest(params, this.config), 'createReversePickup');
    const reverseAwbNumber = this.text(raw.reverseAwbNumber ?? raw.awbNumber ?? raw.AWBNo);
    if (!reverseAwbNumber) throw new BlueDartProviderError('Unsupported reverse-waybill response contract', {operation: 'createReversePickup', reconciliationRequired: true});
    return {reverseAwbNumber, courierReferenceNumber: this.text(raw.courierReferenceNumber ?? raw.referenceNumber), rawResponse: raw};
  }

  async generateLabel(awbNumber: string): Promise<GenerateLabelResult> {
    if (!this.config.endpoints.label) throw new LabelGenerationNotSupportedError('Blue Dart label generation is not configured', {operation: 'generateLabel'});
    const raw = await this.client.request<any, {awbNumber: string}>({method: 'POST', path: this.config.endpoints.label, operation: 'generateLabel', operationType: 'mutation', body: {awbNumber}});
    const encoded = this.text(raw?.base64Pdf ?? raw?.labelBase64);
    if (!encoded) throw new BlueDartProviderError('Unsupported label response contract; documented base64 PDF is required', {operation: 'generateLabel'});
    const pdf = Buffer.from(encoded, 'base64');
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new BlueDartProviderError('Blue Dart label response was not a valid PDF', {operation: 'generateLabel'});
    return {pdf, awbNumber, labelFormat: 'A6'};
  }

  async registerPickup(request: PickupRegistrationRequest): Promise<PickupRegistrationResult> {
    if (!request.providerRequestId) throw new BlueDartProviderError('Pickup providerRequestId is required', {operation: 'registerPickup'});
    const raw = await this.client.post<Json, PickupRegistrationRequest>(this.endpoint('pickupRegistration'), request, 'registerPickup');
    const pickupReference = this.text(raw.pickupReference ?? raw.pickupId);
    if (!pickupReference) throw new BlueDartProviderError('Unsupported pickup response contract', {operation: 'registerPickup', reconciliationRequired: true});
    return {pickupReference, rawResponse: raw};
  }
  async cancelPickup(request: PickupCancellationRequest): Promise<PickupCancellationResult> { return this.client.post(this.endpoint('pickupCancellation'), request, 'cancelPickup'); }
  async getTransitTime(body: unknown) { if (!this.config.endpoints.transitTime) throw new BlueDartUnsupportedOperationError('Transit-time endpoint is not configured', {operation: 'getTransitTime'}); return this.client.post(this.config.endpoints.transitTime, body, 'getTransitTime'); }
  async getProductsAndSubProducts() { if (!this.config.endpoints.products) throw new BlueDartUnsupportedOperationError('Products endpoint is not configured', {operation: 'getProductsAndSubProducts'}); return this.client.get(this.config.endpoints.products, 'getProductsAndSubProducts'); }
}
