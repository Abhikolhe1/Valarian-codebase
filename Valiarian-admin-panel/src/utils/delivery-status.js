export function getShippingLabelBlockReason(order) {
  if (!['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order?.status)) {
    return 'Pack the order before printing its shipping label.';
  }
  if (!order.blueDartForwardSkipped && !order.trackingNumber?.trim()) {
    return 'Wait for the Blue Dart AWB before printing its shipping label.';
  }
  return '';
}

export function canSkipBlueDart(order) {
  return order?.blueDartDeliveryStatus === 'available' ||
    (order?.needsManualShipping === true &&
      ['unavailable', 'check_failed'].includes(order?.blueDartDeliveryStatus));
}

export function getPackingStatusOptions(order) {
  if (order.status === 'packed' && order.blueDartForwardSkipped) {
    return ['out_for_delivery', 'delivered', 'cancelled'];
  }
  const options = [];
  if (!canSkipBlueDart(order) || order.blueDartDeliveryStatus === 'available') {
    options.push(order.status === 'processing' ? 'packed' : 'shipped');
  }
  if (canSkipBlueDart(order)) options.push('packed_skip_bluedart');
  return [...options, 'cancelled'];
}

export function getDeliveryStatusLabel(order) {
  if (order?.blueDartForwardSkipped) return 'Self-delivery / external courier selected';
  switch (order?.blueDartDeliveryStatus) {
    case 'available': return 'Blue Dart available';
    case 'unavailable': return 'Blue Dart unavailable — external courier required';
    case 'check_failed': return 'Blue Dart check failed — delivery unconfirmed';
    default: return 'Blue Dart not checked';
  }
}
