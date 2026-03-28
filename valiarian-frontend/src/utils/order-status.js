export function formatOrderStatusLabel(value = '') {
  return String(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getOrderDisplayStatus(status, returnStatus) {
  switch (returnStatus) {
    case 'requested':
      return 'return_requested';
    case 'approved':
      return 'return_approved';
    case 'rejected':
      return 'return_rejected';
    case 'picked':
      return 'return_picked';
    case 'completed':
      return 'return_completed';
    default:
      return status;
  }
}

export function getOrderDisplayLabel(status, returnStatus) {
  return formatOrderStatusLabel(getOrderDisplayStatus(status, returnStatus));
}

export function getOrderStatusColor(status) {
  switch (status) {
    case 'return_approved':
    case 'return_picked':
      return 'info';
    case 'return_completed':
    case 'delivered':
    case 'parcel_received':
      return 'success';
    case 'pending':
    case 'return_requested':
      return 'warning';
    case 'confirmed':
    case 'processing':
    case 'packed':
    case 'shipped':
      return 'info';
    case 'return_rejected':
    case 'cancelled':
    case 'refunded':
      return 'error';
    case 'returned':
      return 'default';
    default:
      return 'default';
  }
}

export function getOrderDisplayColor(status, returnStatus) {
  return getOrderStatusColor(getOrderDisplayStatus(status, returnStatus));
}

export function getPaymentStatusColor(status) {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    case 'refunded':
    case 'partially_refunded':
      return 'info';
    default:
      return 'default';
  }
}

export function getReturnStatusColor(status) {
  switch (status) {
    case 'requested':
      return 'warning';
    case 'approved':
    case 'picked':
      return 'info';
    case 'completed':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

export const returnPackagingInstructions = [
  'Keep the product in its original box and outer packaging.',
  'Include all accessories, manuals, tags, invoices, and free gifts.',
  'Make sure the seal is intact and the package is safely packed for pickup.',
  'Hand over the parcel only after the pickup agent confirms the return.',
  'Your refund will be processed after our inspection is completed.',
];
