/**
 * Courier Abstraction Layer — ShippingProvider Interface
 *
 * Every courier integration (BlueDart, Delhivery, XpressBees, etc.) must
 * implement this interface. Controllers and services always depend on this
 * interface — never on a concrete provider directly.
 */

// ── Internal Standard Shipment Statuses ──────────────────────────────────────
// Raw courier codes are NEVER exposed to frontend or stored as primary status.
// Use CourierStatusMapper to convert raw codes to these internal statuses.
export type InternalShipmentStatus =
  | 'created'
  | 'pickup_pending'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rto_initiated'
  | 'rto_in_transit'
  | 'rto_delivered'
  | 'exception';

// ── Serviceability ────────────────────────────────────────────────────────────
export interface ServiceabilityParams {
  pincode: string;
  weightGrams?: number;
  /** Forward-delivery policy used to keep cache/results service-specific. */
  deliveryMode?: 'configured' | 'surface' | 'air' | 'domestic_priority';
  paymentType?: 'prepaid' | 'cod';
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  isCodAvailable: boolean;
  reason?: 'invalid_pincode' | 'not_serviceable';
  estimatedTransitDays?: number;
  courierName: string;
  areaCode?: string;
  originArea?: string;
  surfacePrepaidAvailable?: boolean;
  surfaceCodAvailable?: boolean;
  rawResponse?: unknown;
}

// ── Shipment Creation ─────────────────────────────────────────────────────────
export interface CreateShipmentParams {
  /** Stable merchant-side request reference used for idempotency/reconciliation. */
  providerRequestId?: string;
  // Order details
  orderReference: string;
  orderNumber: string;

  // Receiver
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverAddress: string;
  receiverCity: string;
  receiverState: string;
  receiverPincode: string;
  receiverCountry: string;

  // Origin / Warehouse
  warehouseAreaCode: string;
  warehouseOriginArea: string;
  warehousePincode: string;
  warehouseName: string;
  warehouseCity?: string;
  warehouseState?: string;
  /** Warehouse street address — required by Blue Dart's Shipper.CustomerAddress1. */
  warehouseAddressLine1?: string;
  /** Warehouse contact phone — Blue Dart's Shipper.CustomerTelephone. */
  warehousePhone?: string;

  // Package
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  declaredValue: number;
  numberOfPieces?: number;

  // Service
  productCode?: string; // e.g. "A" for Air Express
  subProductCode?: string; // e.g. "P"
  /** Blue Dart PackType: "L" for Bharat Dart Prepaid; blank for Apex. */
  packType?: string;
  serviceType?: string; // Application classification, e.g. "surface"
  /** Blue Dart ProductType: 0 for non-document merchandise, 1 for documents. */
  productType?: 0 | 1;

  // COD
  isCod: boolean;
  codAmount?: number;
  codFavorOf?: string; // merchant name on cheque
  codReferenceNumber?: string;

  // Contents
  itemDescription?: string;
}

export interface CreateShipmentResult {
  awbNumber: string;
  courierReferenceNumber?: string;
  estimatedDelivery?: Date;

  // Cost snapshot — parsed from response at creation time, never recalculated
  shippingCharge?: number;
  fuelSurcharge?: number;
  codCharge?: number;
  otherCharges?: number;
  totalCourierCost?: number;
  chargesUnavailable?: boolean; // true in sandbox/test environment

  rawResponse?: unknown;
}

export interface PickupRegistrationParams {
  providerRequestId: string;
  awbNumber: string;
  areaCode: string;
  customerCode: string;
  customerName: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  pincode: string;
  phone: string;
  numberOfPieces: number;
  weightKg: number;
  pickupDate: Date;
  pickupTime: string;
  officeCloseTime: string;
  productCode: string;
  subProducts?: string[];
}

export interface PickupRegistrationResult {
  pickupReference: string;
  rawResponse?: unknown;
}

export interface PickupCancellationParams {
  pickupReference: string;
  pickupRegistrationDate: Date;
  remarks?: string;
}

export interface PickupCancellationResult {
  success: boolean;
  message?: string;
  rawResponse?: unknown;
}

// ── Shipment Cancellation ─────────────────────────────────────────────────────
export interface CancelShipmentResult {
  success: boolean;
  message?: string;
  rawResponse?: unknown;
}

// ── Tracking ──────────────────────────────────────────────────────────────────
export interface TrackingEvent {
  /** Internal standard status — never a raw courier code */
  internalStatus: InternalShipmentStatus;
  /** Raw code from the courier (stored for debugging) */
  courierRawCode: string;
  /** Original description from courier */
  courierDescription: string;
  /** Human-readable mapped description */
  description: string;
  location: string;
  timestamp: Date;
  activityType?: string;
}

export interface TrackingResult {
  awbNumber: string;
  currentStatus: InternalShipmentStatus;
  courierRawStatus: string;
  currentLocation?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  /** NDR failure reason if status = exception */
  failureReason?: string;
  /** NDR code from courier if delivery failed */
  courierNdrCode?: string;
  /** Which attempt this is (1st, 2nd, etc.) */
  attemptNumber?: number;
  events: TrackingEvent[];
  rawResponse?: unknown;
}

// ── Label ─────────────────────────────────────────────────────────────────────
export interface GenerateLabelResult {
  /** PDF buffer */
  pdf: Buffer;
  awbNumber: string;
  labelFormat: 'A5' | 'A6' | 'A4';
}

// ── Transit Time ──────────────────────────────────────────────────────────────
export interface TransitTimeParams {
  originPincode: string;
  destinationPincode: string;
  productCode: string;
  subProductCode?: string;
  /** Pickup date, local calendar date (server converts to Blue Dart's DDMMYYYY). */
  pickupDate: Date;
  /** 24hr "HHmm", e.g. "1300". */
  pickupTime: string;
}

export interface TransitTimeResult {
  serviceable: boolean;
  expectedDeliveryDate?: string;
  expectedPodDate?: string;
  additionalDays?: number;
  areaCode?: string;
  serviceCenter?: string;
  isError: boolean;
  errorMessage?: string;
  rawResponse?: unknown;
}

// ── Product / Sub-Product Catalog ───────────────────────────────────────────────
export interface ProductCatalogEntry {
  productName: string;
  productDescription: string;
  subProducts: string[];
}

export interface ProductCatalogResult {
  products: ProductCatalogEntry[];
  isError: boolean;
  errorMessage?: string;
  rawResponse?: unknown;
}

// ── Master Download (incremental pincode master sync) ───────────────────────────
export interface MasterDownloadResult {
  records: unknown[];
  recordCount: number;
  isError: boolean;
  errorMessage?: string;
  rawResponse?: unknown;
}

// ── Reverse Pickup ────────────────────────────────────────────────────────────
export interface CreateReversePickupParams {
  /** Stable merchant-side request reference used for idempotency/reconciliation. */
  providerRequestId?: string;
  originalAwbNumber: string;
  orderReference: string;

  // Pickup from customer
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupPincode: string;

  // Deliver to warehouse
  warehouseAreaCode: string;
  warehouseOriginArea: string;
  warehousePincode: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseCity: string;
  warehouseState: string;
  warehousePhone: string;

  weightGrams: number;
  declaredValue: number;
  itemDescription?: string;
  returnReason?: string;
}

export interface CreateReversePickupResult {
  reverseAwbNumber: string;
  courierReferenceNumber?: string;
  pickupTokenNumber?: string;
  pickupDate?: string;
  rawResponse?: unknown;
}

export type AlternateInstructionType = 'RTO' | 'DT' | 'ED' | 'LM' | 'AM';

export interface AlternateInstructionParams {
  awbNumber: string;
  instructionType: AlternateInstructionType;
  preferredDate?: Date;
  timeSlot?: string;
  mobileNumber?: string;
  preferredTime?: string;
}

export interface AlternateInstructionResult {
  awbNumber: string;
  accepted: boolean;
  statusCode?: string;
  statusInformation?: string;
  rawResponse?: unknown;
}

// ── ShippingProvider Interface ────────────────────────────────────────────────
export interface ShippingProvider {
  readonly courierName: string;
  readonly providerVersion?:
    | 'bluedart-legacy-soap'
    | 'bluedart-developer-portal';

  /**
   * Check if a destination pincode is serviceable.
   * Results should be cached externally (24h TTL recommended).
   */
  checkServiceability(
    params: ServiceabilityParams,
  ): Promise<ServiceabilityResult>;

  /**
   * Generate an AWB / Waybill for a shipment.
   * This is the primary action that commits inventory to a courier.
   */
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;

  /**
   * Cancel / void an AWB.
   * Only valid for shipments in cancellable states (created, pickup_pending).
   * See Component 24 in the implementation plan for state constraints.
   */
  cancelShipment(awbNumber: string): Promise<CancelShipmentResult>;

  /**
   * Fetch live tracking events for an AWB.
   * Returns pre-mapped internal statuses (raw codes stored in events).
   */
  trackShipment(awbNumber: string): Promise<TrackingResult>;

  /**
   * Generate a thermal-printer-compatible shipping label (PDF buffer).
   */
  generateLabel(awbNumber: string): Promise<GenerateLabelResult>;

  /**
   * Create a reverse pickup / return shipment.
   */
  createReversePickup(
    params: CreateReversePickupParams,
  ): Promise<CreateReversePickupResult>;

  updateAlternateInstruction?(
    params: AlternateInstructionParams,
  ): Promise<AlternateInstructionResult>;

  /** Register already-created AWBs for collection from the warehouse. */
  registerPickup?(
    params: PickupRegistrationParams,
  ): Promise<PickupRegistrationResult>;

  /** Cancel a previously registered warehouse pickup by token number. */
  cancelPickup?(
    params: PickupCancellationParams,
  ): Promise<PickupCancellationResult>;
}
