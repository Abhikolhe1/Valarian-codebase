import {strict as assert} from 'assert';
import {securityId, UserProfile} from '@loopback/security';
import {HttpErrors} from '@loopback/rest';
import {OrderController} from '../../../controllers/order.controller';
import {ShippingController} from '../../../controllers/shipping.controller';
import {ServiceabilityResult} from '../../../interfaces/shipping-provider.interface';
import {Order} from '../../../models';
import {ShippingService} from '../../../services/shipping.service';
import {PostalPincodeService} from '../../../services/postal-pincode.service';
import {evaluateDeliveryEligibility, isIndianDeliveryAddress} from '../../../utils/delivery-eligibility';

const available: ServiceabilityResult = {isServiceable: true, isCodAvailable: true, courierName: 'BlueDart'};
const unavailable: ServiceabilityResult = {...available, isServiceable: false, reason: 'not_serviceable'};
const actor = {[securityId]: 'admin', id: 'admin'} as UserProfile;
const postalPincodeService = {assertExists: async () => undefined} as unknown as PostalPincodeService;

function fixture(result: ServiceabilityResult | undefined, initial: Partial<Order> = {}) {
  const order = new Order({id: 'order-1', status: 'processing', paymentMethod: 'razorpay',
    shippingAddress: {fullName: 'Test', phone: '9999999999', address: 'Test Street', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India'},
    ...initial});
  const updates: Partial<Order>[] = [];
  let providerCalls = 0;
  const shippingService = {checkServiceability: async () => {
    providerCalls++;
    if (!result) throw new Error('Provider unavailable');
    return result;
  }, checkPreferredServiceability: async () => {
    providerCalls++;
    return {
      selectedProvider: result?.isServiceable ? 'BlueDart' : 'Manual',
      result,
      blueDart: result,
      delhiveryCheckFailed: true,
      blueDartCheckFailed: !result,
    };
  }} as unknown as ShippingService;
  const controller = Object.assign(Object.create(OrderController.prototype), {
    shippingService,
    postalPincodeService,
    orderRepository: {
      findById: async () => order,
      updateById: async (_id: string, data: Partial<Order>) => {updates.push(data);},
    },
    shipmentRepository: {findOne: async () => null},
    orderStatusHistoryRepository: {createStatusEntry: async () => undefined},
    syncOrderBarcodesForStatus: async () => undefined,
    sendAdminStatusUpdateEmail: async () => undefined,
  }) as OrderController;
  return {controller, shippingService, updates, calls: () => providerCalls};
}

const checkoutRequest: Parameters<OrderController['preparePayment']>[0] = {
  cartItems: [], paymentMethod: 'razorpay', orderNumber: 'TEST-ORDER',
  billingAddress: {fullName: 'Test', phone: '9999999999', address: 'Test Street', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India'},
  shippingAddress: {fullName: 'Test', phone: '9999999999', address: 'Test Street', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India'},
};

describe('Indian checkout and Blue Dart delivery classification', () => {
  for (const error of [new HttpErrors.UnprocessableEntity('Postal PIN not found'), new HttpErrors.ServiceUnavailable('Postal directory unavailable')]) {
    it(`blocks public checkout, prepare-payment and direct creation on postal ${error.statusCode}`, async () => {
      const setup = fixture(available);
      const postal = {assertExists: async () => {throw error;}} as unknown as PostalPincodeService;
      setup.controller.postalPincodeService = postal;
      const shippingController = new ShippingController(setup.shippingService, postal);
      await assert.rejects(() => shippingController.checkServiceability('678956'), {statusCode: error.statusCode});
      await assert.rejects(() => setup.controller.preparePayment(checkoutRequest, actor), {statusCode: error.statusCode});
      await assert.rejects(() => setup.controller.createOrder(checkoutRequest, actor), {statusCode: error.statusCode});
      await assert.rejects(() => setup.controller.adminCheckDelivery('order-1'), {statusCode: error.statusCode});
      assert.equal(setup.calls(), 0);
      assert.equal(setup.updates.length, 0);
    });
  }
  it('admin force refresh bypasses an old cached availability result', async () => {
    const service = new ShippingService(undefined, undefined, undefined);
    let calls = 0;
    Object.assign(service, {activeProvider: {courierName: 'BlueDart', checkServiceability: async () => {
      calls++;
      return calls === 1 ? available : unavailable;
    }}});
    const params = {pincode: '400001'};
    assert.equal((await service.checkServiceability(params)).isServiceable, true);
    assert.equal((await service.checkServiceability(params)).isServiceable, true);
    assert.equal(calls, 1);
    assert.equal((await service.checkServiceability(params, true)).isServiceable, false);
    assert.equal(calls, 2);
  });
  for (const result of [available, unavailable, undefined]) {
    it(`allows prepare-payment for an Indian address with courier result ${result?.isServiceable ?? 'outage'}`, async () => {
      const {controller} = fixture(result);
      let gatewayCalls = 0;
      Object.assign(controller, {
        buildOrderDraft: async () => ({subtotal: 100, discount: 0, shipping: 0, tax: 0, total: 100}),
        razorpayService: {createOrder: async (amount: number) => {
          gatewayCalls++;
          return {id: 'test-payment', amount, currency: 'INR'};
        }},
      });
      const prepared = await controller.preparePayment(checkoutRequest, actor);
      assert.equal(prepared.amount, 10000);
      assert.equal(gatewayCalls, 1);
    });
  }
  it('rejects an invalid PIN before preparing payment', async () => {
    const setup = fixture(available);
    await assert.rejects(() => setup.controller.preparePayment({...checkoutRequest,
      shippingAddress: {...checkoutRequest.shippingAddress, zipCode: '012345'}}, actor), /Indian/);
    assert.equal(setup.calls(), 0);
  });
  for (const [label, serviceResult] of [['available', available], ['unavailable', unavailable], ['check_failed', undefined]] as const) {
    it(`creates a prepaid order and persists its ${label} delivery result`, async () => {
      const {controller} = fixture(serviceResult);
      let created = new Order();
      let committed = false;
      Object.assign(controller, {
        buildOrderDraft: async () => ({orderItems: [], subtotal: 100, discount: 0, shipping: 0, tax: 0, total: 100}),
        razorpayService: {createOrder: async () => ({id: 'test-payment'})},
        dataSource: {beginTransaction: async () => ({commit: async () => {committed = true;}, rollback: async () => undefined})},
        orderRepository: {create: async (data: Partial<Order>) => {created = new Order(data); return created;}},
        orderItemRepository: {createAll: async () => []},
        paymentRepository: {create: async () => ({razorpayOrderId: 'test-payment'})},
        withOrderItems: async (order: Order) => order,
        getOrderWithRelations: async () => created,
      });
      const response = await controller.createOrder(checkoutRequest, actor);
      assert.equal(response.success, true);
      assert.equal(response.order.blueDartDeliveryStatus, label);
      assert.equal(response.order.needsManualShipping, label !== 'available');
      assert.equal(response.amount, 10000);
      assert(committed);
    });
  }
  it('accepts Indian PIN format and country aliases', () => {
    for (const country of ['India', 'IN', 'ind']) assert(isIndianDeliveryAddress('400001', country));
  });
  it('rejects foreign countries and invalid PIN formats independently of courier', () => {
    for (const pin of ['000000', '012345', '40001', '4000011', 'ABC123', '']) assert(!isIndianDeliveryAddress(pin));
    assert(!isIndianDeliveryAddress('400001', 'Singapore'));
  });
  it('allows confirmed Blue Dart delivery', () => {
    assert.deepEqual(evaluateDeliveryEligibility(available, false), {
      checkoutAllowed: true, blueDartDeliveryStatus: 'available',
      delhiveryDeliveryStatus: 'not_checked', selectedShippingProvider: 'bluedart',
      needsManualShipping: false,
      message: 'Blue Dart delivery is available for this order.',
    });
  });
  it('allows prepaid non-coverage and failures with distinct manual fulfilment flags', () => {
    const noCoverage = evaluateDeliveryEligibility(unavailable, false);
    const failed = evaluateDeliveryEligibility(undefined, false);
    assert(noCoverage.checkoutAllowed && noCoverage.needsManualShipping);
    assert(failed.checkoutAllowed && failed.needsManualShipping);
    assert.equal(noCoverage.blueDartDeliveryStatus, 'unavailable');
    assert.equal(failed.blueDartDeliveryStatus, 'check_failed');
  });
  it('rejects explicitly invalid PIN codes even when prepaid', () => {
    assert.equal(evaluateDeliveryEligibility({...unavailable, reason: 'invalid_pincode'}, false).checkoutAllowed, false);
  });
  it('preserves COD cash-collection restrictions', () => {
    assert(evaluateDeliveryEligibility(available, true).checkoutAllowed);
    for (const result of [unavailable, undefined, {...available, isCodAvailable: false}]) {
      assert.equal(evaluateDeliveryEligibility(result, true).checkoutAllowed, false);
    }
  });
  it('public API returns fallback without provider response data', async () => {
    const {shippingService} = fixture({...unavailable, rawResponse: {private: 'provider data'}});
    const result = await new ShippingController(shippingService, postalPincodeService).checkServiceability('400001');
    assert.equal(result.checkoutAllowed, true);
    assert.equal(result.isServiceable, false);
    assert.equal(result.rawResponse, undefined);
  });
  it('public API records a provider outage as unconfirmed rather than serviceable', async () => {
    const {shippingService} = fixture(undefined);
    const result = await new ShippingController(shippingService, postalPincodeService).checkServiceability('400001');
    assert.equal(result.blueDartDeliveryStatus, 'check_failed');
    assert.equal(result.checkoutAllowed, true);
    assert.equal(result.isServiceable, false);
  });
  it('public API rejects malformed PIN before calling the courier', async () => {
    const setup = fixture(available);
    await assert.rejects(() => new ShippingController(setup.shippingService, postalPincodeService).checkServiceability('012345'), /Indian PIN/);
    assert.equal(setup.calls(), 0);
  });
  for (const [label, result] of [['available', available], ['unavailable', unavailable], ['check_failed', undefined]] as const) {
    it(`persists ${label} with a check timestamp on admin recheck`, async () => {
      const {controller, updates} = fixture(result);
      await controller.adminCheckDelivery('order-1');
      assert.equal(updates[0].blueDartDeliveryStatus, label);
      assert(updates[0].blueDartCheckedAt instanceof Date);
      assert.equal(updates[0].needsManualShipping, label !== 'available');
    });
  }
  it('rejects direct API skip for unchecked orders', async () => {
    const {controller, updates} = fixture(available, {needsManualShipping: true});
    await assert.rejects(() => controller.adminUpdateOrderStatus('order-1', {status: 'packed', skipBlueDart: true}, actor), /Check delivery availability/);
    assert.equal(updates.length, 0);
  });
  for (const status of ['processing', 'packed'] as const) {
    it(`allows self-delivery for an available ${status} order without changing courier availability`, async () => {
      const setup = fixture(available, {status, blueDartDeliveryStatus: 'available', delhiveryDeliveryStatus: 'not_checked', needsManualShipping: false});
      await setup.controller.adminUpdateOrderStatus('order-1', {status: 'packed', skipBlueDart: true, carrier: 'Self delivery'}, actor);
      assert.equal(setup.updates[0].blueDartForwardSkipped, true);
      assert.equal(setup.updates[0].carrier, 'Self delivery');
      assert.equal(setup.updates[0].blueDartDeliveryStatus, undefined);
      assert.equal(setup.updates[0].needsManualShipping, undefined);
      assert.equal(setup.calls(), 0);
    });
  }
  it('rejects switching to self-delivery when an active Blue Dart shipment exists', async () => {
    const setup = fixture(available, {status: 'packed', blueDartDeliveryStatus: 'available'});
    Object.assign(setup.controller.shipmentRepository, {findOne: async () => ({id: 'active-shipment'})});
    await assert.rejects(() => setup.controller.adminUpdateOrderStatus('order-1', {status: 'packed', skipBlueDart: true}, actor), /shipment already exists/);
    assert.equal(setup.updates.length, 0);
  });
  it('permits skip for a failed check without creating any courier shipment', async () => {
    const setup = fixture(undefined, {blueDartDeliveryStatus: 'check_failed', delhiveryDeliveryStatus: 'check_failed', needsManualShipping: true});
    const result = await setup.controller.adminUpdateOrderStatus('order-1', {status: 'packed', skipBlueDart: true}, actor);
    assert(result.success);
    assert.equal(setup.updates[0].blueDartForwardSkipped, true);
    assert.equal(setup.calls(), 0);
  });
  it('rejects rechecking a foreign address without querying the courier', async () => {
    const setup = fixture(available, {shippingAddress: {fullName: 'Test', phone: '9999999999', address: 'Test Street', city: 'Singapore', state: 'Singapore', zipCode: '400001', country: 'Singapore'}});
    await assert.rejects(() => setup.controller.adminCheckDelivery('order-1'), /only to Indian/);
    assert.equal(setup.calls(), 0);
    assert.equal(setup.updates.length, 0);
  });
});
