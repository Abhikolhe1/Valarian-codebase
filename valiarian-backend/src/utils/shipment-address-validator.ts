import {OrderAddress} from '../models/order.model';

/**
 * Shipment Address Validator
 *
 * Validates the shipping address of an order before AWB generation.
 * Invalid addresses cause Blue Dart SOAP to return hard-to-debug errors.
 * All validation and normalization happens server-side BEFORE the SOAP call.
 *
 * Enforcement point: ShipmentController.createShipment() — step 2.
 * On failure: HTTP 422 with field-level errors array. AWB is NOT generated.
 */

export interface AddressValidationError {
  field: string;    // e.g. "phone"
  message: string;  // human-readable, shown in admin UI
  code: string;     // machine code, e.g. "INVALID_MOBILE"
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: AddressValidationError[];
  /** Normalized address (use this instead of the original for the SOAP call) */
  normalizedAddress?: OrderAddress;
}

// ── Valid Indian States and Union Territories ─────────────────────────────────
const VALID_INDIAN_STATES: Record<string, string> = {
  // Full names (canonical)
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  assam: 'Assam',
  bihar: 'Bihar',
  chhattisgarh: 'Chhattisgarh',
  goa: 'Goa',
  gujarat: 'Gujarat',
  haryana: 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  jharkhand: 'Jharkhand',
  karnataka: 'Karnataka',
  kerala: 'Kerala',
  'madhya pradesh': 'Madhya Pradesh',
  maharashtra: 'Maharashtra',
  manipur: 'Manipur',
  meghalaya: 'Meghalaya',
  mizoram: 'Mizoram',
  nagaland: 'Nagaland',
  odisha: 'Odisha',
  punjab: 'Punjab',
  rajasthan: 'Rajasthan',
  sikkim: 'Sikkim',
  'tamil nadu': 'Tamil Nadu',
  telangana: 'Telangana',
  tripura: 'Tripura',
  'uttar pradesh': 'Uttar Pradesh',
  uttarakhand: 'Uttarakhand',
  'west bengal': 'West Bengal',
  // Union Territories
  'andaman and nicobar islands': 'Andaman and Nicobar Islands',
  chandigarh: 'Chandigarh',
  'dadra and nagar haveli and daman and diu':
    'Dadra and Nagar Haveli and Daman and Diu',
  delhi: 'Delhi',
  'jammu and kashmir': 'Jammu and Kashmir',
  ladakh: 'Ladakh',
  lakshadweep: 'Lakshadweep',
  puducherry: 'Puducherry',
  // Common abbreviations → canonical
  ap: 'Andhra Pradesh',
  ar: 'Arunachal Pradesh',
  as: 'Assam',
  br: 'Bihar',
  cg: 'Chhattisgarh',
  ga: 'Goa',
  gj: 'Gujarat',
  hr: 'Haryana',
  hp: 'Himachal Pradesh',
  jh: 'Jharkhand',
  ka: 'Karnataka',
  kl: 'Kerala',
  mp: 'Madhya Pradesh',
  mh: 'Maharashtra',
  mn: 'Manipur',
  ml: 'Meghalaya',
  mz: 'Mizoram',
  nl: 'Nagaland',
  or: 'Odisha',
  pb: 'Punjab',
  rj: 'Rajasthan',
  sk: 'Sikkim',
  tn: 'Tamil Nadu',
  ts: 'Telangana',
  tr: 'Tripura',
  up: 'Uttar Pradesh',
  uk: 'Uttarakhand',
  wb: 'West Bengal',
  an: 'Andaman and Nicobar Islands',
  ch: 'Chandigarh',
  dd: 'Dadra and Nagar Haveli and Daman and Diu',
  dl: 'Delhi',
  jk: 'Jammu and Kashmir',
  la: 'Ladakh',
  ld: 'Lakshadweep',
  py: 'Puducherry',
};

// ── Placeholder / junk value detection ───────────────────────────────────────
const INVALID_PLACEHOLDER_ADDRESSES = [
  'n/a', 'na', 'test', 'test address', 'address', 'null', 'none', '-', '--',
  'xyz', 'abc', '123',
];

// ── Normalize helper ──────────────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  let normalized = phone.trim();
  // Strip +91 or 0 prefix
  if (normalized.startsWith('+91')) normalized = normalized.slice(3);
  else if (normalized.startsWith('91') && normalized.length === 12)
    normalized = normalized.slice(2);
  else if (normalized.startsWith('0') && normalized.length === 11)
    normalized = normalized.slice(1);
  return normalized.trim();
}

function normalizeCountry(country: string): string {
  const lower = country.toLowerCase().trim();
  if (lower === 'in' || lower === 'india') return 'India';
  return country.trim();
}

function normalizeState(state: string): string {
  const lower = state.toLowerCase().trim();
  return VALID_INDIAN_STATES[lower] ?? state.trim();
}

// ── Main validator ────────────────────────────────────────────────────────────

/**
 * Validate and normalize a shipping address before AWB generation.
 * Normalization is applied first, then validation runs on the normalized values.
 */
export function validateShipmentAddress(
  address: OrderAddress,
): AddressValidationResult {
  const errors: AddressValidationError[] = [];

  // ── Step 1: Normalize ────────────────────────────────────────────────────
  const normalized: OrderAddress = {
    fullName: (address.fullName ?? '').trim(),
    phone: normalizePhone(address.phone ?? ''),
    email: address.email?.trim() ?? undefined,
    address: (address.address ?? '').trim(),
    city: (address.city ?? '').trim(),
    state: normalizeState(address.state ?? ''),
    zipCode: (address.zipCode ?? '').trim(),
    country: normalizeCountry(address.country ?? ''),
  };

  // ── Step 2: Validate fullName ─────────────────────────────────────────────
  if (!normalized.fullName) {
    errors.push({
      field: 'fullName',
      message: 'Customer name is required',
      code: 'MISSING_NAME',
    });
  } else if (normalized.fullName.length < 2 || normalized.fullName.length > 100) {
    errors.push({
      field: 'fullName',
      message: 'Customer name must be 2–100 characters',
      code: 'INVALID_NAME_LENGTH',
    });
  } else if (!/^[a-zA-Z\s.\-']+$/.test(normalized.fullName)) {
    errors.push({
      field: 'fullName',
      message: 'Customer name must contain only letters, spaces, hyphens, or dots',
      code: 'INVALID_NAME_FORMAT',
    });
  }

  // ── Step 3: Validate phone ───────────────────────────────────────────────
  if (!normalized.phone) {
    errors.push({
      field: 'phone',
      message: 'Mobile number is required',
      code: 'MISSING_PHONE',
    });
  } else if (!/^[6-9]\d{9}$/.test(normalized.phone)) {
    errors.push({
      field: 'phone',
      message:
        'Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9',
      code: 'INVALID_MOBILE',
    });
  }

  // ── Step 4: Validate address ─────────────────────────────────────────────
  if (!normalized.address) {
    errors.push({
      field: 'address',
      message: 'Address line is required',
      code: 'MISSING_ADDRESS',
    });
  } else if (
    normalized.address.length < 5 ||
    normalized.address.length > 250
  ) {
    errors.push({
      field: 'address',
      message: 'Address must be 5–250 characters',
      code: 'INVALID_ADDRESS_LENGTH',
    });
  } else if (
    INVALID_PLACEHOLDER_ADDRESSES.includes(normalized.address.toLowerCase())
  ) {
    errors.push({
      field: 'address',
      message:
        'Address appears to be a placeholder or test value. Please enter a valid delivery address.',
      code: 'PLACEHOLDER_ADDRESS',
    });
  }

  // ── Step 5: Validate city ────────────────────────────────────────────────
  if (!normalized.city) {
    errors.push({
      field: 'city',
      message: 'City is required',
      code: 'MISSING_CITY',
    });
  } else if (normalized.city.length < 2 || normalized.city.length > 100) {
    errors.push({
      field: 'city',
      message: 'City must be 2–100 characters',
      code: 'INVALID_CITY_LENGTH',
    });
  } else if (!/^[a-zA-Z\s.\-]+$/.test(normalized.city)) {
    errors.push({
      field: 'city',
      message: 'City must contain only letters and spaces',
      code: 'INVALID_CITY_FORMAT',
    });
  }

  // ── Step 6: Validate state ───────────────────────────────────────────────
  if (!normalized.state) {
    errors.push({
      field: 'state',
      message: 'State is required',
      code: 'MISSING_STATE',
    });
  } else {
    const stateKey = normalized.state.toLowerCase().trim();
    const validStateValues = Object.values(VALID_INDIAN_STATES).map(v =>
      v.toLowerCase(),
    );
    const isValidState = validStateValues.includes(stateKey);
    if (!isValidState) {
      errors.push({
        field: 'state',
        message: `"${normalized.state}" is not a recognized Indian state or UT. Please enter the full state name (e.g. "Maharashtra", not "MH")`,
        code: 'INVALID_STATE',
      });
    }
  }

  // ── Step 7: Validate zipCode ─────────────────────────────────────────────
  if (!normalized.zipCode) {
    errors.push({
      field: 'zipCode',
      message: 'Pincode is required',
      code: 'MISSING_PINCODE',
    });
  } else if (!/^\d{6}$/.test(normalized.zipCode)) {
    errors.push({
      field: 'zipCode',
      message: 'Pincode must be exactly 6 digits',
      code: 'INVALID_PINCODE_FORMAT',
    });
  } else if (normalized.zipCode === '000000') {
    errors.push({
      field: 'zipCode',
      message: 'Pincode cannot be 000000',
      code: 'INVALID_PINCODE_VALUE',
    });
  }

  // ── Step 8: Validate country ─────────────────────────────────────────────
  if (!normalized.country) {
    errors.push({
      field: 'country',
      message: 'Country is required',
      code: 'MISSING_COUNTRY',
    });
  } else if (normalized.country !== 'India') {
    errors.push({
      field: 'country',
      message:
        'Only domestic India shipments are supported. Country must be "India".',
      code: 'UNSUPPORTED_COUNTRY',
    });
  }

  // ── Step 9: Validate email (optional) ───────────────────────────────────
  if (normalized.email && normalized.email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized.email)) {
      errors.push({
        field: 'email',
        message: 'Email address is not valid',
        code: 'INVALID_EMAIL',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedAddress: errors.length === 0 ? normalized : undefined,
  };
}

/**
 * Format validation errors for admin UI display.
 */
export function formatAddressValidationErrors(
  errors: AddressValidationError[],
): string {
  if (errors.length === 0) return '';
  const lines = errors.map(e => `  • ${e.field}: ${e.message}`).join('\n');
  return `⚠ Shipment address has validation errors:\n${lines}\nPlease edit the order shipping address before proceeding.`;
}
