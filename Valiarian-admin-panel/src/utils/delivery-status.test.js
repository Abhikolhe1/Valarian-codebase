import { canSkipBlueDart, getDeliveryStatusLabel, getPackingStatusOptions, getShippingLabelBlockReason } from './delivery-status';

describe('Shipping label printing eligibility', () => {
  it.each(['pending', 'processing', 'cancelled', 'returned'])('blocks %s even with an AWB', (status) => {
    expect(getShippingLabelBlockReason({ status, trackingNumber: '21102442793' })).toContain('Pack');
  });
  it.each([undefined, '', '   '])('blocks packed Blue Dart orders without an AWB (%s)', (trackingNumber) => {
    expect(getShippingLabelBlockReason({ status: 'packed', trackingNumber })).toContain('AWB');
  });
  it.each(['packed', 'shipped', 'out_for_delivery', 'delivered'])('allows printing/reprinting for %s with an AWB', (status) => {
    expect(getShippingLabelBlockReason({ status, trackingNumber: '21102442793' })).toBe('');
  });
  it('allows an address label for self-delivery only after packing', () => {
    expect(getShippingLabelBlockReason({ status: 'packed', blueDartForwardSkipped: true })).toBe('');
    expect(getShippingLabelBlockReason({ status: 'processing', blueDartForwardSkipped: true })).toContain('Pack');
  });
});

describe('Blue Dart order status', () => {
  it.each(['unavailable', 'check_failed'])('allows external courier for %s', (status) => {
    expect(canSkipBlueDart({ needsManualShipping: true, blueDartDeliveryStatus: status })).toBe(true);
  });
  it('allows self-delivery when Blue Dart is available without requiring fallback', () => {
    expect(canSkipBlueDart({ needsManualShipping: false, blueDartDeliveryStatus: 'available' })).toBe(true);
  });
  it('requires a delivery check for legacy unchecked orders', () => {
    expect(canSkipBlueDart({ needsManualShipping: true })).toBe(false);
  });
  it.each(['processing', 'packed'])('offers both Blue Dart and self-delivery for an available %s order', (status) => {
    expect(getPackingStatusOptions({ status, blueDartDeliveryStatus: 'available' })).toEqual([
      status === 'processing' ? 'packed' : 'shipped', 'packed_skip_bluedart', 'cancelled',
    ]);
  });
  it('keeps external courier fallback for unavailable orders', () => {
    expect(getPackingStatusOptions({ status: 'processing', blueDartDeliveryStatus: 'unavailable', needsManualShipping: true }))
      .toEqual(['packed_skip_bluedart', 'cancelled']);
  });
  it('allows self-delivery progress after skipping without a Blue Dart shipment action', () => {
    expect(getPackingStatusOptions({ status: 'packed', blueDartForwardSkipped: true, blueDartDeliveryStatus: 'available' }))
      .toEqual(['out_for_delivery', 'delivered', 'cancelled']);
  });
  it('does not enable skip without the server fallback flag', () => {
    expect(canSkipBlueDart({ blueDartDeliveryStatus: 'unavailable' })).toBe(false);
  });
  it('distinguishes provider failure from confirmed non-coverage and unchecked orders', () => {
    expect(getDeliveryStatusLabel({ blueDartDeliveryStatus: 'check_failed' })).toContain('unconfirmed');
    expect(getDeliveryStatusLabel({ blueDartDeliveryStatus: 'unavailable' })).toContain('unavailable');
    expect(getDeliveryStatusLabel({})).toBe('Blue Dart not checked');
  });
  it('shows the selected external courier path after skipping', () => {
    expect(getDeliveryStatusLabel({ blueDartForwardSkipped: true })).toBe('Self-delivery / external courier selected');
  });
});
