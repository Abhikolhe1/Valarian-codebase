export const ADDRESS_TYPE_OPTIONS = [
  { label: 'Home', value: 'home' },
  { label: 'Work', value: 'work' },
];

const normalizeAddressInput = (address) => address || {};

export const getAddressTypeLabel = (value) => {
  if (value === 'work') {
    return 'Work';
  }

  return 'Home';
};

const joinAddressParts = (parts = []) =>
  parts
    .map((part) => `${part || ''}`.trim())
    .filter(Boolean)
    .join(', ');

const cleanOptionalValue = (value) => {
  const normalized = `${value || ''}`.trim();
  return normalized || undefined;
};

export const buildAddressFullAddress = (address = {}) => {
  const safeAddress = normalizeAddressInput(address);

  return joinAddressParts([
    safeAddress.addressLine1,
    safeAddress.addressLine2,
    safeAddress.landmark,
    joinAddressParts([safeAddress.city, safeAddress.state, safeAddress.pincode]),
  ]);
};

export const sanitizeAddressPayload = (values = {}) => ({
  fullName: `${values.fullName || ''}`.trim(),
  mobileNumber: `${values.mobileNumber || ''}`.trim(),
  pincode: `${values.pincode || ''}`.trim(),
  state: `${values.state || ''}`.trim(),
  city: `${values.city || ''}`.trim(),
  addressLine1: `${values.addressLine1 || ''}`.trim(),
  addressLine2: cleanOptionalValue(values.addressLine2),
  landmark: cleanOptionalValue(values.landmark),
  addressType: values.addressType === 'work' ? 'work' : 'home',
  isPrimary: Boolean(values.isPrimary),
});

export const getAddressFormDefaultValues = (address = {}, fallbackUser = null) => {
  const safeAddress = normalizeAddressInput(address);

  return {
    fullName: safeAddress.fullName || fallbackUser?.fullName || '',
    mobileNumber: safeAddress.mobileNumber || fallbackUser?.phone || '',
    pincode: safeAddress.pincode || '',
    state: safeAddress.state || '',
    city: safeAddress.city || '',
    addressLine1: safeAddress.addressLine1 || '',
    addressLine2: safeAddress.addressLine2 || '',
    landmark: safeAddress.landmark || '',
    addressType: safeAddress.addressType === 'work' ? 'work' : 'home',
    isPrimary: Boolean(safeAddress.isPrimary),
  };
};

export const mapAddressToDisplay = (address = {}, fallbackUser = null) => {
  const safeAddress = normalizeAddressInput(address);
  const fullName = safeAddress.fullName || fallbackUser?.fullName || fallbackUser?.email || 'Address';
  const mobileNumber = safeAddress.mobileNumber || fallbackUser?.phone || '';

  return {
    ...safeAddress,
    name: fullName,
    fullName,
    phoneNumber: mobileNumber,
    mobileNumber,
    primary: Boolean(safeAddress.isPrimary),
    addressType: getAddressTypeLabel(safeAddress.addressType),
    fullAddress: buildAddressFullAddress(safeAddress),
  };
};

export const mapAddressToCheckoutBilling = (address = {}, fallbackUser = null) => {
  const displayAddress = mapAddressToDisplay(address, fallbackUser);

  return {
    ...displayAddress,
    phone: displayAddress.mobileNumber,
    address: displayAddress.addressLine1,
    zipCode: displayAddress.pincode,
  };
};

export const mapAddressToOrderAddress = (address = {}, fallbackUser = null) => {
  const safeAddress = normalizeAddressInput(address);
  const fullName = safeAddress.fullName || fallbackUser?.fullName || '';
  const mobileNumber = safeAddress.mobileNumber || fallbackUser?.phone || '';

  return {
    fullName,
    mobileNumber,
    phone: mobileNumber,
    email: safeAddress.email || fallbackUser?.email || '',
    pincode: safeAddress.pincode || '',
    zipCode: safeAddress.pincode || '',
    state: safeAddress.state || '',
    city: safeAddress.city || '',
    addressLine1: safeAddress.addressLine1 || '',
    addressLine2: safeAddress.addressLine2 || '',
    landmark: safeAddress.landmark || '',
    addressType: safeAddress.addressType === 'work' ? 'work' : 'home',
    address: joinAddressParts([safeAddress.addressLine1, safeAddress.addressLine2]),
    country: safeAddress.country || 'India',
  };
};
