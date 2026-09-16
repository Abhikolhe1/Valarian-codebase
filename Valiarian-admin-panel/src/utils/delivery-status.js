const COURIER_STATUSES = ['available', 'unavailable', 'check_failed', 'not_checked'];

export function getShippingLabelBlockReason(order) {
  if (!['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order?.status)) {
    return 'Pack the order before printing its shipping label.';
  }
  const usesManualShipping =
    order?.selectedShippingProvider === 'manual' || order?.blueDartForwardSkipped;
  if (!usesManualShipping && !order?.trackingNumber?.trim()) {
    return 'Wait for the courier AWB before printing its shipping label.';
  }
  return '';
}

export function canUseManualDelivery(order) {
  return COURIER_STATUSES.includes(order?.delhiveryDeliveryStatus) ||
    COURIER_STATUSES.includes(order?.blueDartDeliveryStatus);
}

export const canSkipBlueDart = canUseManualDelivery;

export function getPackingStatusOptions(order) {
  if (order.status === 'packed' && order.selectedShippingProvider === 'manual') {
    return ['out_for_delivery', 'delivered', 'cancelled'];
  }
  if (order.status === 'packed' && !order.trackingNumber?.trim()) {
    if (order.selectedShippingProvider === 'delhivery') {
      return ['packed_delhivery', 'cancelled'];
    }
    if (order.selectedShippingProvider === 'bluedart') {
      return ['packed_bluedart', 'cancelled'];
    }
  }
  const options = [];
  if (order.status === 'processing') {
    if (canUseManualDelivery(order)) {
      options.push('packed_delhivery', 'packed_bluedart', 'packed_manual');
    }
  } else {
    options.push('shipped');
  }
  return [...options, 'cancelled'];
}

export function getDeliveryStatusLabel(order) {
  if (order?.selectedShippingProvider === 'manual' && order?.status === 'packed') {
    return 'India Post / self-delivery / external courier selected';
  }
  if (order?.selectedShippingProvider === 'delhivery') return 'Delhivery selected';
  if (order?.selectedShippingProvider === 'bluedart') return 'Blue Dart selected';
  return 'Courier availability';
}

export function getProviderStatusLabel(provider, status) {
  const name = provider === 'delhivery' ? 'Delhivery' : 'Blue Dart';
  switch (status) {
    case 'available': return `${name} available`;
    case 'unavailable': return `${name} unavailable`;
    case 'check_failed': return `${name} check failed`;
    default: return `${name} not checked`;
  }
}
