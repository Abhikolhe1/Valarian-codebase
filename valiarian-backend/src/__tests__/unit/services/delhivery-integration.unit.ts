/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
import {strict as assert} from 'assert';
import {loadDelhiveryConfig} from '../../../config/delhivery.config';
import {CreateShipmentParams} from '../../../interfaces/shipping-provider.interface';
import {ShippingService} from '../../../services/shipping.service';
import {DelhiveryApiClient} from '../../../services/shipping-providers/delhivery-api.client';
import {
  DelhiveryProvider,
  mapDelhiveryStatus,
  parseDelhiveryServiceability,
} from '../../../services/shipping-providers/delhivery.provider';

const config = loadDelhiveryConfig({
  DELHIVERY_API_TOKEN: 'test-token',
  DELHIVERY_ENV: 'staging',
});

const shipment: CreateShipmentParams = {
  orderReference: 'order-uuid',
  orderNumber: 'ORD-1',
  receiverName: 'Customer',
  receiverPhone: '9999999999',
  receiverAddress: 'Customer address',
  receiverCity: 'Mumbai',
  receiverState: 'Maharashtra',
  receiverPincode: '400001',
  receiverCountry: 'India',
  warehouseAreaCode: '',
  warehouseOriginArea: '',
  warehousePincode: '422001',
  warehouseName: 'Valiarian Warehouse',
  warehouseCity: 'Nashik',
  warehouseState: 'Maharashtra',
  warehouseAddressLine1: 'Warehouse address',
  warehousePhone: '9999999999',
  weightGrams: 500,
  lengthCm: 20,
  breadthCm: 15,
  heightCm: 5,
  declaredValue: 1000,
  isCod: false,
};

describe('Delhivery B2C integration', () => {
  it('defaults safely to staging and requires a token to be configured', () => {
    const missing = loadDelhiveryConfig({});
    assert.equal(missing.environment, 'staging');
    assert.equal(missing.baseUrl, 'https://staging-express.delhivery.com');
    assert.equal(missing.configured, false);
    assert.equal(config.configured, true);
    assert.equal(loadDelhiveryConfig({NODE_ENV: 'production'}).environment, 'production');
  });

  it('parses serviceability, COD, embargo, and empty results', () => {
    const available = parseDelhiveryServiceability({delivery_codes: [{postal_code: {
      pin: 400001, pre_paid: 'Y', cod: 'Y', remarks: '',
    }}]}, '400001');
    assert.equal(available.isServiceable, true);
    assert.equal(available.isCodAvailable, true);
    assert.equal(parseDelhiveryServiceability({delivery_codes: [{postal_code: {
      pin: 400001, pre_paid: 'Y', cod: 'Y', remarks: 'Embargo',
    }}]}, '400001').isServiceable, false);
    assert.equal(parseDelhiveryServiceability({delivery_codes: []}, '400001').isServiceable, false);
  });

  it('maps common forward, delivery, NDR, cancellation, and RTO states', () => {
    assert.equal(mapDelhiveryStatus('Manifested'), 'created');
    assert.equal(mapDelhiveryStatus('In Transit'), 'in_transit');
    assert.equal(mapDelhiveryStatus('Dispatched'), 'out_for_delivery');
    assert.equal(mapDelhiveryStatus('Delivered', 'DL'), 'delivered');
    assert.equal(mapDelhiveryStatus('Pending', 'UD'), 'exception');
    assert.equal(mapDelhiveryStatus('Canceled', 'CN'), 'cancelled');
    assert.equal(mapDelhiveryStatus('In Transit', 'RT'), 'rto_in_transit');
  });

  it('manifests SPS shipments as URL-encoded data and stores the returned Waybill', async () => {
    let request: any;
    const provider = new DelhiveryProvider(config, {request: async (value: any) => {
      request = value;
      return {success: true, packages: [{status: 'Success', waybill: '1234567890123'}]};
    }} as any);
    const result = await provider.createShipment(shipment);
    assert.equal(result.awbNumber, '1234567890123');
    assert.equal(request.contentType, 'application/x-www-form-urlencoded');
    const form = new URLSearchParams(request.data);
    const payload = JSON.parse(form.get('data') ?? '{}');
    assert.equal(payload.pickup_location.name, shipment.warehouseName);
    assert.equal(payload.shipments[0].payment_mode, 'Prepaid');
    assert.equal(payload.shipments[0].order, shipment.orderReference);
  });

  it('sends the token as a query parameter only for Waybill allocation', async () => {
    let request: any;
    const http: any = {request: async (value: any) => {
      request = value;
      return {data: '1234567890123'};
    }};
    const client = new DelhiveryApiClient(config, http);
    const provider = new DelhiveryProvider(config, client);
    await provider.fetchWaybills();
    assert.equal(request.params.token, 'test-token');
    assert.equal(request.url, '/waybill/api/fetch/json/');

    await provider.checkServiceability({pincode: '400001'});
    assert.equal(request.params.filter_codes, '400001');
    assert.equal(request.params.token, undefined);
  });

  it('extracts the Delhivery NSL code and attempt count used to guard NDR actions', async () => {
    const provider = new DelhiveryProvider(config, {request: async () => ({
      ShipmentData: [{Shipment: {
        Status: {
          Status: 'Pending',
          StatusType: 'UD',
          StatusCode: 'EOD-74',
          AttemptCount: 2,
          StatusDateTime: '2026-09-09T18:00:00+05:30',
        },
        Scans: [],
      }}],
    })} as any);
    const tracking = await provider.trackShipment('1234567890123');
    assert.equal(tracking.currentStatus, 'exception');
    assert.equal(tracking.courierNdrCode, 'EOD-74');
    assert.equal(tracking.attemptNumber, 2);
  });

  it('selects Delhivery first while also recording Blue Dart availability', async () => {
    const service = new ShippingService(undefined, undefined, undefined);
    let blueDartCalls = 0;
    Object.assign(service, {
      delhiveryProvider: {
        courierName: 'Delhivery',
        isConfigured: true,
        checkServiceability: async () => ({isServiceable: true, isCodAvailable: true, courierName: 'Delhivery'}),
      },
      activeProvider: {
        courierName: 'BlueDart',
        checkServiceability: async () => {
          blueDartCalls++;
          return {isServiceable: true, isCodAvailable: true, courierName: 'BlueDart'};
        },
      },
    });
    const result = await service.checkPreferredServiceability({
      pincode: '400001',
      paymentType: 'prepaid',
    }, true);
    assert.equal(result.selectedProvider, 'Delhivery');
    assert.equal(blueDartCalls, 1);
  });

  it('falls through to Blue Dart when Delhivery is unavailable', async () => {
    const service = new ShippingService(undefined, undefined, undefined);
    Object.assign(service, {
      delhiveryProvider: {
        courierName: 'Delhivery',
        isConfigured: true,
        checkServiceability: async () => ({isServiceable: false, isCodAvailable: false, courierName: 'Delhivery'}),
      },
      activeProvider: {
        courierName: 'BlueDart',
        checkServiceability: async () => ({isServiceable: true, isCodAvailable: true, courierName: 'BlueDart'}),
      },
    });
    const result = await service.checkPreferredServiceability({
      pincode: '400001',
      paymentType: 'prepaid',
    }, true);
    assert.equal(result.selectedProvider, 'BlueDart');
    assert.equal(result.delhivery?.isServiceable, false);
    assert.equal(result.blueDart?.isServiceable, true);
  });
});
