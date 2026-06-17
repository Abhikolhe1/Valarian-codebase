export function formatOrderStatusLabel(value = '') {
  return String(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getOrderStatusColor(status) {
  switch (status) {
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
    case 'cancelled':
    case 'refunded':
      return 'error';
    case 'returned':
      return 'default';
    default:
      return 'default';
  }
}

export function getPaymentStatusColor(status) {
  switch (status) {
    case 'success':
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
