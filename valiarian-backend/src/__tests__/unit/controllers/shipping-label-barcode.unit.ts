import {strict as assert} from 'assert';
import {Response} from '@loopback/rest';
import {OrderController} from '../../../controllers/order.controller';
import {Order} from '../../../models';
import {InvoicePrintService} from '../../../services/invoice-print.service';

function fixture(trackingNumber?: string, renderFails = false) {
  const order = new Order({id: 'order-1', orderNumber: 'ORDER-INTERNAL-123', status: 'packed',
    trackingNumber, paymentMethod: 'razorpay', total: 100, items: [],
    createdAt: new Date('2026-09-08T00:00:00Z'),
    shippingAddress: {fullName: 'Test Customer', phone: '9999999999',
      address: 'Test Street', city: 'Mumbai', state: 'Maharashtra',
      zipCode: '400001', country: 'India'}});
  const renderedCodes: string[] = [];
  let html = '';
  const controller = Object.assign(Object.create(OrderController.prototype), {
    orderRepository: {findById: async () => order},
    withOrderItems: async () => order,
    invoicePrintService: new InvoicePrintService(),
    barcodeService: {renderBarcodeBuffer: async (code: string) => {
      renderedCodes.push(code);
      if (renderFails) throw new Error('Test rendering failure');
      return Buffer.from('test-barcode-image');
    }},
  }) as OrderController;
  const response = {setHeader: () => undefined, send: (value: string) => {html = value;}} as unknown as Response;
  return {order, controller, response, renderedCodes, html: () => html};
}

describe('Shipping label AWB barcode', () => {
  it('renders the AWB, preserving leading zeros, and keeps the order as text only', async () => {
    const test = fixture(' 00123456789 ');
    await test.controller.getAdminShippingLabelHtml('order-1', test.response);
    assert.deepEqual(test.renderedCodes, ['00123456789']);
    assert.ok(test.html().includes('alt="AWB barcode 00123456789"'));
    assert.ok(test.html().includes('ORDER-INTERNAL-123'));
    assert.ok(!test.html().includes('alt="Order barcode"'));
  });

  for (const missing of [undefined, '', '   ']) {
    it(`does not render an order barcode when AWB is ${JSON.stringify(missing)}`, async () => {
      const test = fixture(missing);
      test.order.blueDartForwardSkipped = true;
      await test.controller.getAdminShippingLabelHtml('order-1', test.response);
      assert.deepEqual(test.renderedCodes, []);
      assert.ok(test.html().includes('AWB pending'));
      assert.ok(!test.html().includes('data:image/png'));
    });
  }

  it('blocks a packed Blue Dart order until an AWB exists', async () => {
    const test = fixture();
    await assert.rejects(() => test.controller.getAdminShippingLabelHtml('order-1', test.response), {statusCode: 409});
    assert.deepEqual(test.renderedCodes, []);
    assert.equal(test.html(), '');
  });

  for (const status of ['pending', 'processing', 'cancelled'] as const) {
    it(`blocks direct printing for ${status} even with an AWB`, async () => {
      const test = fixture('21102442793');
      test.order.status = status;
      await assert.rejects(() => test.controller.getAdminShippingLabelHtml('order-1', test.response), {statusCode: 409});
      assert.deepEqual(test.renderedCodes, []);
    });
  }

  it('does not substitute the order barcode if AWB rendering fails', async () => {
    const test = fixture('21102442793', true);
    await test.controller.getAdminShippingLabelHtml('order-1', test.response);
    assert.deepEqual(test.renderedCodes, ['21102442793']);
    assert.ok(test.html().includes('AWB barcode unavailable'));
    assert.ok(test.html().includes('21102442793'));
    assert.ok(!test.html().includes('data:image/png'));
  });
});
