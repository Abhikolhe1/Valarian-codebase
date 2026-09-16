import {
  canUseManualDelivery,
  getDeliveryStatusLabel,
  getPackingStatusOptions,
  getProviderStatusLabel,
  getShippingLabelBlockReason,
} from './delivery-status';

describe('Shipping label printing eligibility', () => {
  it.each(['pending', 'processing', 'cancelled', 'returned'])('blocks %s before packing', (status) => {
    expect(getShippingLabelBlockReason({ status, trackingNumber: '123' })).toContain('Pack');
  });
  it('requires an AWB for an API courier', () => {
    expect(getShippingLabelBlockReason({ status: 'packed', selectedShippingProvider: 'delhivery' })).toContain('AWB');
  });
  it('allows an address label for manual delivery after packing', () => {
    expect(getShippingLabelBlockReason({ status: 'packed', selectedShippingProvider: 'manual' })).toBe('');
  });
  it('keeps legacy manual orders printable after packing', () => {
    expect(getShippingLabelBlockReason({ status: 'packed', blueDartForwardSkipped: true })).toBe('');
  });
});

describe('Delhivery-first packing choices', () => {
  it('offers all three choices when both couriers are available', () => {
    expect(getPackingStatusOptions({
      status: 'processing',
      delhiveryDeliveryStatus: 'available',
      blueDartDeliveryStatus: 'available',
    })).toEqual(['packed_delhivery', 'packed_bluedart', 'packed_manual', 'cancelled']);
  });
  it('offers Blue Dart and manual when Delhivery is unavailable', () => {
    expect(getPackingStatusOptions({
      status: 'processing',
      delhiveryDeliveryStatus: 'unavailable',
      blueDartDeliveryStatus: 'available',
    })).toEqual(['packed_delhivery', 'packed_bluedart', 'packed_manual', 'cancelled']);
  });
  it('offers only manual packing when neither API courier is available', () => {
    expect(getPackingStatusOptions({
      status: 'processing',
      delhiveryDeliveryStatus: 'unavailable',
      blueDartDeliveryStatus: 'unavailable',
    })).toEqual(['packed_delhivery', 'packed_bluedart', 'packed_manual', 'cancelled']);
  });
  it('allows manual fulfilment after any recorded courier check', () => {
    expect(canUseManualDelivery({ delhiveryDeliveryStatus: 'check_failed' })).toBe(true);
    expect(canUseManualDelivery({})).toBe(false);
  });
  it('allows manual order progression after packing', () => {
    expect(getPackingStatusOptions({ status: 'packed', selectedShippingProvider: 'manual' }))
      .toEqual(['out_for_delivery', 'delivered', 'cancelled']);
  });
  it.each([
    ['delhivery', 'packed_delhivery'],
    ['bluedart', 'packed_bluedart'],
  ])('offers a %s manifestation retry when packing succeeded without an AWB', (provider, action) => {
    expect(getPackingStatusOptions({ status: 'packed', selectedShippingProvider: provider }))
      .toEqual([action, 'cancelled']);
  });
  it('shows provider selection and availability clearly', () => {
    expect(getDeliveryStatusLabel({ selectedShippingProvider: 'delhivery' })).toBe('Delhivery selected');
    expect(getProviderStatusLabel('delhivery', 'available')).toBe('Delhivery available');
    expect(getProviderStatusLabel('bluedart', 'not_checked')).toBe('Blue Dart not checked');
  });
});
