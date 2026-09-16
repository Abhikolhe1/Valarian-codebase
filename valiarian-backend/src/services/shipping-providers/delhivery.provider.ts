/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
import axios = require('axios');
import {DelhiveryConfig, loadDelhiveryConfig} from '../../config/delhivery.config';
import {
  CancelShipmentResult,
  CreateReversePickupParams,
  CreateReversePickupResult,
  CreateShipmentParams,
  CreateShipmentResult,
  GenerateLabelResult,
  InternalShipmentStatus,
  PickupRegistrationParams,
  PickupRegistrationResult,
  ReversePickupQualityCheckItem,
  ServiceabilityParams,
  ServiceabilityResult,
  ShippingProvider,
  TrackingEvent,
  TrackingResult,
} from '../../interfaces/shipping-provider.interface';
import {DelhiveryApiClient} from './delhivery-api.client';
import {DelhiveryProviderError, DelhiveryValidationError} from './delhivery-errors';

type JsonRecord = Record<string, any>;

interface DelhiveryLabelHttpClient {
  get<T>(url: string, config: Record<string, unknown>): Promise<{data: T}>;
}

export interface DelhiveryShipmentUpdate {
  waybill: string;
  name?: string;
  phone?: string;
  paymentMode?: 'COD' | 'Prepaid';
  codAmount?: number;
  address?: string;
  productsDescription?: string;
  weightGrams?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
}

export interface DelhiveryShippingCostParams {
  originPincode: string;
  destinationPincode: string;
  weightGrams: number;
  paymentType: 'Pre-paid' | 'COD';
  mode?: 'E' | 'S';
  shipmentStatus?: 'Delivered' | 'RTO' | 'DTO';
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  packageType?: 'box' | 'flyer';
}

export interface DelhiveryWarehouseRequest {
  name: string;
  phone: string;
  pin: string;
  registeredName?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  returnAddress: string;
  returnCity?: string;
  returnPin?: string;
  returnState?: string;
  returnCountry?: string;
}

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' ? (value as JsonRecord) : {};

const firstString = (...values: unknown[]): string | undefined =>
  values.find(value => typeof value === 'string' && value.trim()) as
    | string
    | undefined;

const normalizeBool = (value: unknown): boolean =>
  value === true || ['true', 'yes', 'y', '1', 'success'].includes(String(value).toLowerCase());

function normalizeRvpQualityCheck(
  items: ReversePickupQualityCheckItem[] | undefined,
): JsonRecord[] | undefined {
  if (items === undefined) return undefined;
  if (!Array.isArray(items) || items.length < 1 || items.length > 2) {
    throw new DelhiveryValidationError(
      'Delhivery RVP QC requires between one and two items.',
      {operation: 'createReversePickup'},
    );
  }

  const requiredText = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || !value.trim()) {
      throw new DelhiveryValidationError(
        `Delhivery RVP QC ${field} is required.`,
        {operation: 'createReversePickup'},
      );
    }
    return value.trim();
  };
  const optionalText = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
  const stringList = (
    value: unknown,
    field: string,
    allowEmptyValues = false,
  ): string[] => {
    if (!Array.isArray(value) || value.length === 0 || value.some(entry =>
      typeof entry !== 'string' || (!allowEmptyValues && !entry.trim()))) {
      throw new DelhiveryValidationError(
        `Delhivery RVP QC ${field} must be a non-empty string list.`,
        {operation: 'createReversePickup'},
      );
    }
    return value.map(entry => entry.trim());
  };

  return items.map((item, itemIndex) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new DelhiveryValidationError(
        `Delhivery RVP QC item ${itemIndex + 1} quantity must be a positive integer.`,
        {operation: 'createReversePickup'},
      );
    }
    if (!Array.isArray(item.questions) || item.questions.length < 1 ||
      item.questions.length > 6) {
      throw new DelhiveryValidationError(
        `Delhivery RVP QC item ${itemIndex + 1} requires between one and six questions.`,
        {operation: 'createReversePickup'},
      );
    }
    const questions = item.questions.map((question, questionIndex) => {
      if (question.type !== 'varchar' && question.type !== 'multi') {
        throw new DelhiveryValidationError(
          `Delhivery RVP QC question ${questionIndex + 1} has an unsupported type.`,
          {operation: 'createReversePickup'},
        );
      }
      if (typeof question.required !== 'boolean') {
        throw new DelhiveryValidationError(
          `Delhivery RVP QC question ${questionIndex + 1} required must be boolean.`,
          {operation: 'createReversePickup'},
        );
      }
      const options = stringList(
        question.options,
        `question ${questionIndex + 1} options`,
        question.type === 'varchar',
      );
      if (question.type === 'multi' && !options.some(Boolean)) {
        throw new DelhiveryValidationError(
          `Delhivery RVP QC multi-choice question ${questionIndex + 1} needs at least one option.`,
          {operation: 'createReversePickup'},
        );
      }
      return {
        questions_id: requiredText(
          question.questionId,
          `question ${questionIndex + 1} ID`,
        ),
        options,
        value: stringList(question.values, `question ${questionIndex + 1} values`),
        required: question.required,
        type: question.type,
        ques_images: question.questionImages === undefined
          ? undefined
          : stringList(question.questionImages, `question ${questionIndex + 1} images`),
      };
    });
    return {
      item: optionalText(item.item),
      description: requiredText(item.description, `item ${itemIndex + 1} description`),
      images: stringList(item.images, `item ${itemIndex + 1} images`),
      return_reason: optionalText(item.returnReason),
      quantity: item.quantity,
      brand: optionalText(item.brand),
      product_category: optionalText(item.productCategory),
      questions,
    };
  });
}

export function parseDelhiveryServiceability(
  response: unknown,
  pincode: string,
): ServiceabilityResult {
  const body = asRecord(response);
  const entries = Array.isArray(body.delivery_codes)
    ? body.delivery_codes
    : Array.isArray(body.data)
      ? body.data
      : [];
  const record = asRecord(entries[0]);
  const postal = asRecord(record.postal_code ?? record);
  const returnedPin = String(postal.pin ?? postal.pincode ?? pincode);
  const remark = String(postal.remarks ?? postal.remark ?? '').trim().toLowerCase();
  const embargoed = remark === 'embargo';
  const isServiceable =
    entries.length > 0 && returnedPin === pincode && !embargoed;
  const prepaid = postal.pre_paid ?? postal.prepaid ?? postal.pre_paid_serviceable;
  const cod = postal.cod ?? postal.cash ?? postal.cod_serviceable;
  const prepaidServiceable =
    isServiceable && (prepaid === undefined || normalizeBool(prepaid));

  return {
    isServiceable: prepaidServiceable,
    isCodAvailable: isServiceable && normalizeBool(cod),
    reason: prepaidServiceable ? undefined : 'not_serviceable',
    courierName: 'Delhivery',
    rawResponse: response,
  };
}

export function mapDelhiveryStatus(
  status: string,
  statusType = '',
  statusCode = '',
  instructions = '',
): InternalShipmentStatus {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedType = statusType.trim().toLowerCase();
  const diagnostic = `${statusCode} ${instructions}`.trim().toLowerCase();
  if (normalizedType === 'cn' || /cancel|closed/.test(normalizedStatus)) return 'cancelled';
  if (/rto|returned to origin|return delivered/.test(normalizedStatus)) return 'rto_delivered';
  if (normalizedType === 'rt') return 'rto_in_transit';
  if (/dto|delivered/.test(normalizedStatus) || normalizedType === 'dl') return 'delivered';
  if (normalizedType === 'pp') return 'pickup_pending';
  if (normalizedType === 'pu') {
    if (/picked up|pickup complete|collected/.test(normalizedStatus)) return 'picked_up';
    return 'in_transit';
  }
  if (/out for delivery|dispatched|\bofd\b/.test(normalizedStatus)) return 'out_for_delivery';
  if (/^eod-|undelivered|failed|exception|not delivered/.test(diagnostic)) return 'exception';
  if (/in transit|transit|pending|received at|bagged|connected/.test(normalizedStatus)) return 'in_transit';
  if (/not picked|scheduled|out for pickup|open/.test(normalizedStatus)) return 'pickup_pending';
  return 'created';
}

function packageFromCreation(response: unknown): JsonRecord {
  const body = asRecord(response);
  return asRecord(
    (Array.isArray(body.packages) && body.packages[0]) ||
      (Array.isArray(body.shipments) && body.shipments[0]) ||
      body.package,
  );
}

function assertProviderSuccess(response: unknown, operation: string): void {
  const body = asRecord(response);
  const pkg = packageFromCreation(response);
  const success = body.success ?? pkg.success;
  const error = firstString(body.error, body.rmk, body.remarks, pkg.error, pkg.remarks);
  if (success === false || (Boolean(error) && /fail|error|invalid|not serviceable/i.test(error!))) {
    throw new DelhiveryValidationError(error ?? `${operation} was rejected`, {
      operation,
      providerCode: error,
    });
  }
}

export class DelhiveryProvider implements ShippingProvider {
  readonly courierName = 'Delhivery';
  readonly providerVersion = 'delhivery-b2c-v1' as const;

  constructor(
    private readonly config: DelhiveryConfig = loadDelhiveryConfig(),
    private readonly client = new DelhiveryApiClient(config),
    private readonly labelHttp: DelhiveryLabelHttpClient =
      axios as unknown as DelhiveryLabelHttpClient,
  ) {}

  get isConfigured(): boolean {
    return this.config.configured;
  }

  async checkServiceability(
    params: ServiceabilityParams,
  ): Promise<ServiceabilityResult> {
    if (!/^[1-9]\d{5}$/.test(params.pincode)) {
      return {
        isServiceable: false,
        isCodAvailable: false,
        reason: 'invalid_pincode',
        courierName: this.courierName,
      };
    }
    const response = await this.client.request<unknown>({
      method: 'GET',
      path: '/c/api/pin-codes/json/',
      operation: 'checkServiceability',
      params: {filter_codes: params.pincode},
    });
    return parseDelhiveryServiceability(response, params.pincode);
  }

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const shipment = {
      name: params.receiverName,
      add: params.receiverAddress,
      pin: params.receiverPincode,
      city: params.receiverCity,
      state: params.receiverState,
      country: params.receiverCountry || 'India',
      phone: params.receiverPhone,
      order: params.orderReference,
      payment_mode: params.isCod ? 'COD' : 'Prepaid',
      products_desc: params.itemDescription ?? 'Apparel',
      cod_amount: params.isCod ? params.codAmount ?? params.declaredValue : 0,
      total_amount: params.declaredValue,
      quantity: String(params.numberOfPieces ?? 1),
      shipment_width: params.breadthCm,
      shipment_height: params.heightCm,
      shipment_length: params.lengthCm,
      weight: params.weightGrams,
      shipping_mode: this.config.shippingMode,
      seller_name: params.codFavorOf,
      seller_add: params.warehouseAddressLine1,
      return_add: params.warehouseAddressLine1,
      return_city: params.warehouseCity,
      return_state: params.warehouseState,
      return_pin: params.warehousePincode,
      return_phone: params.warehousePhone,
      return_country: 'India',
    };
    const form = new URLSearchParams({
      format: 'json',
      data: JSON.stringify({
        shipments: [shipment],
        pickup_location: {name: params.warehouseName},
      }),
    }).toString();
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/cmu/create.json',
      operation: 'createShipment',
      mutation: true,
      data: form,
      contentType: 'application/x-www-form-urlencoded',
    });
    assertProviderSuccess(response, 'createShipment');
    const body = asRecord(response);
    const pkg = packageFromCreation(response);
    const awbNumber = firstString(pkg.waybill, pkg.wbn, body.waybill);
    if (!awbNumber) {
      throw new DelhiveryProviderError(
        'Delhivery did not return a Waybill for the manifested shipment',
        {operation: 'createShipment', reconciliationRequired: true},
      );
    }
    return {
      awbNumber,
      courierReferenceNumber: firstString(pkg.refnum, pkg.order, body.upload_wbn),
      chargesUnavailable: true,
      rawResponse: response,
    };
  }

  async cancelShipment(awbNumber: string): Promise<CancelShipmentResult> {
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/p/edit',
      operation: 'cancelShipment',
      mutation: true,
      data: {waybill: awbNumber, cancellation: 'true'},
    });
    assertProviderSuccess(response, 'cancelShipment');
    return {success: true, rawResponse: response};
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const response = await this.client.request<unknown>({
      method: 'GET',
      path: '/api/v1/packages/json/',
      operation: 'trackShipment',
      params: {waybill: awbNumber},
    });
    const body = asRecord(response);
    const shipmentData = Array.isArray(body.ShipmentData) ? body.ShipmentData[0] : undefined;
    const shipment = asRecord(asRecord(shipmentData).Shipment ?? shipmentData);
    if (!shipment || Object.keys(shipment).length === 0) {
      throw new DelhiveryValidationError('Delhivery returned no tracking data for this Waybill', {
        operation: 'trackShipment',
      });
    }
    const current = asRecord(shipment.Status);
    const scans = Array.isArray(shipment.Scans) ? shipment.Scans : [];
    const events: TrackingEvent[] = scans
      .map((entry: unknown) => asRecord(asRecord(entry).ScanDetail ?? entry))
      .map((scan: JsonRecord) => {
        const status = String(scan.Scan ?? scan.Instructions ?? scan.Status ?? 'Unknown');
        const statusType = String(scan.ScanType ?? scan.StatusType ?? scan.StatusCode ?? '');
        return {
          internalStatus: mapDelhiveryStatus(
            status,
            statusType,
            String(scan.StatusCode ?? scan.NSLCode ?? ''),
            String(scan.Instructions ?? ''),
          ),
          courierRawCode: statusType || status,
          courierDescription: status,
          description: status,
          location: String(scan.ScannedLocation ?? scan.StatusLocation ?? ''),
          timestamp: new Date(scan.ScanDateTime ?? scan.StatusDateTime ?? Date.now()),
        };
      })
      .filter((event: TrackingEvent) => !Number.isNaN(event.timestamp.getTime()));
    const currentText = String(current.Status ?? shipment.Status ?? 'Manifested');
    const currentType = String(current.StatusType ?? current.StatusCode ?? '');
    const attemptValue = Number(
      current.AttemptCount ??
      current.Attempts ??
      shipment.DeliveryAttempts ??
      shipment.AttemptCount ??
      shipment.NoOfAttempts,
    );
    const currentInternalStatus = mapDelhiveryStatus(
      currentText,
      currentType,
      String(current.StatusCode ?? shipment.NSLCode ?? ''),
      String(current.Instructions ?? ''),
    );
    const deliveredAt = currentInternalStatus === 'delivered'
      ? new Date(current.StatusDateTime ?? Date.now())
      : undefined;
    return {
      awbNumber,
      currentStatus: currentInternalStatus,
      courierRawStatus: currentType || currentText,
      currentLocation: firstString(current.StatusLocation, shipment.Destination),
      estimatedDelivery: shipment.ExpectedDeliveryDate
        ? new Date(shipment.ExpectedDeliveryDate)
        : undefined,
      deliveredAt,
      failureReason: firstString(current.Instructions),
      courierNdrCode: firstString(current.StatusCode, shipment.NSLCode),
      attemptNumber: Number.isInteger(attemptValue) && attemptValue >= 0
        ? attemptValue
        : undefined,
      events,
      rawResponse: response,
    };
  }

  async generateLabel(awbNumber: string): Promise<GenerateLabelResult> {
    const response = await this.client.request<unknown>({
      method: 'GET',
      path: '/api/p/packing_slip',
      operation: 'generateLabel',
      params: {wbns: awbNumber, pdf: true, pdf_size: this.config.labelSize},
    });
    assertProviderSuccess(response, 'generateLabel');
    const body = asRecord(response);
    const pkg = packageFromCreation(response);
    const url = firstString(
      body.packages?.[0]?.pdf_download_link,
      body.pdf_download_link,
      body.pdf_url,
      body.url,
      pkg.pdf_download_link,
    );
    if (!url) {
      throw new DelhiveryProviderError('Delhivery did not return an official label URL', {
        operation: 'generateLabel',
      });
    }
    const parsed = new URL(url);
    const allowed =
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'delhivery.com' ||
        parsed.hostname.endsWith('.delhivery.com') ||
        parsed.hostname.endsWith('.amazonaws.com'));
    if (!allowed) {
      throw new DelhiveryProviderError('Delhivery returned an unapproved label host', {
        operation: 'generateLabel',
      });
    }
    const download = await this.labelHttp.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: this.config.requestTimeoutMs,
      maxRedirects: 0,
      maxContentLength: 10 * 1024 * 1024,
    } as any);
    const pdf = Buffer.from(download.data);
    if (pdf.length < 5 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new DelhiveryProviderError('Delhivery label download was not a valid PDF', {
        operation: 'generateLabel',
      });
    }
    return {
      pdf,
      awbNumber,
      labelFormat: this.config.labelSize === 'A4' ? 'A4' : 'A6',
    };
  }

  async createReversePickup(
    params: CreateReversePickupParams,
  ): Promise<CreateReversePickupResult> {
    const qualityCheck = normalizeRvpQualityCheck(params.qualityCheckItems);
    const form = new URLSearchParams({
      format: 'json',
      data: JSON.stringify({
        shipments: [{
          name: params.pickupName,
          phone: params.pickupPhone,
          add: params.pickupAddress,
          city: params.pickupCity,
          state: params.pickupState,
          pin: params.pickupPincode,
          country: 'India',
          order: params.orderReference,
          payment_mode: 'Pickup',
          products_desc: params.itemDescription ?? 'Apparel return',
          weight: params.weightGrams,
          total_amount: params.declaredValue,
          return_add: params.warehouseAddress,
          return_city: params.warehouseCity,
          return_state: params.warehouseState,
          return_pin: params.warehousePincode,
          return_phone: params.warehousePhone,
          return_country: 'India',
          qc_type: qualityCheck ? 'param' : undefined,
          custom_qc: qualityCheck,
        }],
        pickup_location: {name: params.warehouseName},
      }),
    }).toString();
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/cmu/create.json',
      operation: 'createReversePickup',
      mutation: true,
      data: form,
      contentType: 'application/x-www-form-urlencoded',
    });
    assertProviderSuccess(response, 'createReversePickup');
    const pkg = packageFromCreation(response);
    const awbNumber = firstString(pkg.waybill, pkg.wbn, asRecord(response).waybill);
    if (!awbNumber) {
      throw new DelhiveryProviderError(
        'Delhivery did not return a Waybill for the reverse pickup',
        {operation: 'createReversePickup', reconciliationRequired: true},
      );
    }
    return {
      reverseAwbNumber: awbNumber,
      courierReferenceNumber: firstString(pkg.refnum, pkg.order),
      rawResponse: response,
    };
  }

  async registerPickup(
    params: PickupRegistrationParams,
  ): Promise<PickupRegistrationResult> {
    const pickupDate = params.pickupDate.toISOString().slice(0, 10);
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/fm/request/new/',
      operation: 'registerPickup',
      mutation: true,
      data: {
        pickup_time: params.pickupTime.length === 5
          ? `${params.pickupTime}:00`
          : params.pickupTime,
        pickup_date: pickupDate,
        pickup_location: params.customerName,
        expected_package_count: params.numberOfPieces,
      },
    });
    assertProviderSuccess(response, 'registerPickup');
    const body = asRecord(response);
    const reference = firstString(
      body.pickup_id,
      body.pickup_reference,
      body.pr_number,
      body.request_id,
    );
    if (!reference) {
      throw new DelhiveryProviderError('Delhivery did not return a pickup request reference', {
        operation: 'registerPickup',
        reconciliationRequired: true,
      });
    }
    return {pickupReference: reference, rawResponse: response};
  }

  async updateShipment(params: DelhiveryShipmentUpdate): Promise<unknown> {
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/p/edit',
      operation: 'updateShipment',
      mutation: true,
      data: {
        waybill: params.waybill,
        name: params.name,
        phone: params.phone,
        pt: params.paymentMode,
        cod: params.codAmount,
        add: params.address,
        products_desc: params.productsDescription,
        gm: params.weightGrams,
        shipment_height: params.heightCm,
        shipment_width: params.widthCm,
        shipment_length: params.lengthCm,
      },
    });
    assertProviderSuccess(response, 'updateShipment');
    return response;
  }

  async updateEwaybill(waybill: string, invoice: string, ewaybill: string): Promise<unknown> {
    const response = await this.client.request<unknown>({
      method: 'PUT',
      path: `/api/rest/ewaybill/${encodeURIComponent(waybill)}/`,
      operation: 'updateEwaybill',
      mutation: true,
      data: {data: [{dcn: invoice, ewbn: ewaybill}]},
    });
    assertProviderSuccess(response, 'updateEwaybill');
    return response;
  }

  async calculateShippingCost(params: DelhiveryShippingCostParams): Promise<unknown> {
    return this.client.request<unknown>({
      method: 'GET',
      path: '/api/kinko/v1/invoice/charges/.json',
      operation: 'calculateShippingCost',
      params: {
        md: params.mode ?? 'S',
        cgm: params.weightGrams,
        o_pin: params.originPincode,
        d_pin: params.destinationPincode,
        ss: params.shipmentStatus ?? 'Delivered',
        pt: params.paymentType,
        l: params.lengthCm,
        b: params.breadthCm,
        h: params.heightCm,
        ipkg_type: params.packageType,
      },
    });
  }

  async fetchWaybills(count?: number): Promise<unknown> {
    return this.client.request<unknown>({
      method: 'GET',
      path: count ? '/waybill/api/bulk/json/' : '/waybill/api/fetch/json/',
      operation: count ? 'fetchBulkWaybills' : 'fetchSingleWaybill',
      params: count ? {count} : undefined,
      includeTokenQuery: true,
    });
  }

  async createWarehouse(params: DelhiveryWarehouseRequest): Promise<unknown> {
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/backend/clientwarehouse/create/',
      operation: 'createWarehouse',
      mutation: true,
      data: {
        name: params.name,
        registered_name: params.registeredName,
        phone: params.phone,
        email: params.email,
        address: params.address,
        city: params.city,
        pin: params.pin,
        country: params.country ?? 'India',
        return_address: params.returnAddress,
        return_city: params.returnCity,
        return_pin: params.returnPin,
        return_state: params.returnState,
        return_country: params.returnCountry ?? 'India',
      },
    });
    assertProviderSuccess(response, 'createWarehouse');
    return response;
  }

  async updateWarehouse(name: string, pin: string, address?: string, phone?: string): Promise<unknown> {
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/backend/clientwarehouse/edit/',
      operation: 'updateWarehouse',
      mutation: true,
      data: {name, pin, address, phone},
    });
    assertProviderSuccess(response, 'updateWarehouse');
    return response;
  }

  async downloadDocument(waybill: string, documentType: string): Promise<unknown> {
    return this.client.request<unknown>({
      method: 'GET',
      path: '/api/rest/fetch/pkg/document/',
      operation: 'downloadDocument',
      params: {waybill, doc_type: documentType},
    });
  }

  async submitNdr(waybill: string, action: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE'): Promise<unknown> {
    const response = await this.client.request<unknown>({
      method: 'POST',
      path: '/api/p/update',
      operation: 'submitNdr',
      mutation: true,
      data: {data: [{waybill, act: action}]},
    });
    assertProviderSuccess(response, 'submitNdr');
    return response;
  }

  async getNdrStatus(requestId: string): Promise<unknown> {
    return this.client.request<unknown>({
      method: 'GET',
      path: `/api/cmu/get_bulk_upl/${encodeURIComponent(requestId)}`,
      operation: 'getNdrStatus',
      params: {verbose: true},
    });
  }
}
