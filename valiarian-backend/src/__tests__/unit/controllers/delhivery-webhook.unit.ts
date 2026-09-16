/* eslint-disable @typescript-eslint/no-explicit-any */
import {strict as assert} from 'assert';
import {DelhiveryWebhookController} from '../../../controllers/delhivery-webhook.controller';
import {
  parseDelhiveryScanPush,
  verifyDelhiveryWebhookAuthorization,
} from '../../../utils/delhivery-webhook.utils';

const secret = 'delhivery-test-webhook-secret-32-characters';
const payload = {
  Shipment: {
    Status: {
      Status: 'Delivered',
      StatusDateTime: '2026-09-10T17:10:42.767+05:30',
      StatusType: 'DL',
      StatusLocation: 'Mumbai Hub',
      Instructions: 'Delivered to consignee',
    },
    NSLCode: 'EOD-38',
    AWB: '1234567890123',
  },
};

describe('Delhivery Scan Push webhook', () => {
  const previousSecret = process.env.DELHIVERY_WEBHOOK_SECRET;

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.DELHIVERY_WEBHOOK_SECRET;
    else process.env.DELHIVERY_WEBHOOK_SECRET = previousSecret;
  });

  it('verifies the client-defined Bearer credential in constant-length form', () => {
    assert.equal(
      verifyDelhiveryWebhookAuthorization(`Bearer ${secret}`, secret),
      true,
    );
    assert.equal(
      verifyDelhiveryWebhookAuthorization('Bearer wrong-secret', secret),
      false,
    );
    assert.equal(
      verifyDelhiveryWebhookAuthorization(`Token ${secret}`, secret),
      false,
    );
    assert.equal(
      verifyDelhiveryWebhookAuthorization('Bearer short', 'short'),
      false,
    );
  });

  it('parses Delhivery official default Scan Push fields', () => {
    const scan = parseDelhiveryScanPush(payload);
    assert.equal(scan.awbNumber, '1234567890123');
    assert.equal(scan.status, 'Delivered');
    assert.equal(scan.statusType, 'DL');
    assert.equal(scan.statusCode, 'EOD-38');
    assert.equal(scan.internalStatus, 'delivered');
    assert.equal(scan.location, 'Mumbai Hub');
    assert.equal(scan.timestamp.toISOString(), '2026-09-10T11:40:42.767Z');
  });

  it('rejects malformed or incomplete Scan Push payloads', () => {
    assert.throws(() => parseDelhiveryScanPush({}), /invalid AWB/);
    assert.throws(
      () => parseDelhiveryScanPush({
        Shipment: {AWB: '1234567890123', Status: {Status: 'Manifested'}},
      }),
      /invalid status timestamp/,
    );
  });

  it('stores a scan once, updates shipment/order, and acknowledges redelivery', async () => {
    process.env.DELHIVERY_WEBHOOK_SECRET = secret;
    let eventExists = false;
    let eventCreates = 0;
    let shipmentUpdate: any;
    let orderUpdate: any;
    const shipmentRepository = {
      findOne: async () => ({
        id: 'shipment-1',
        orderId: 'order-1',
        courierName: 'Delhivery',
        isReverse: false,
      }),
      updateById: async (_id: string, data: any) => { shipmentUpdate = data; },
    };
    const eventRepository = {
      findOne: async () => eventExists ? {id: 'event-1'} : null,
      create: async () => { eventCreates++; eventExists = true; },
    };
    const orderRepository = {
      updateById: async (_id: string, data: any) => { orderUpdate = data; },
    };
    const request = {headers: {authorization: `Bearer ${secret}`}};
    const controller = new DelhiveryWebhookController(
      shipmentRepository as any,
      eventRepository as any,
      orderRepository as any,
      request as any,
    );

    assert.deepEqual(await controller.receiveScan(payload), {
      success: true,
      duplicate: false,
    });
    assert.equal(eventCreates, 1);
    assert.equal(shipmentUpdate.status, 'delivered');
    assert.equal(orderUpdate.status, 'delivered');
    assert.deepEqual(await controller.receiveScan(payload), {
      success: true,
      duplicate: true,
    });
    assert.equal(eventCreates, 1);
  });

  it('rejects unauthorized pushes before accessing shipment data', async () => {
    process.env.DELHIVERY_WEBHOOK_SECRET = secret;
    let repositoryCalls = 0;
    const controller = new DelhiveryWebhookController(
      {findOne: async () => { repositoryCalls++; }} as any,
      {} as any,
      {} as any,
      {headers: {authorization: 'Bearer invalid'}} as any,
    );
    await assert.rejects(controller.receiveScan(payload), /Invalid Delhivery webhook/);
    assert.equal(repositoryCalls, 0);
  });
});
