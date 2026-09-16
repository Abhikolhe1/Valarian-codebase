/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
import {strict as assert} from 'assert';
import {loadDelhiveryConfig} from '../../../config/delhivery.config';
import {
  CreateReversePickupParams,
  CreateShipmentParams,
} from '../../../interfaces/shipping-provider.interface';
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

const reversePickup: CreateReversePickupParams = {
  originalAwbNumber: '1234567890123',
  orderReference: 'return-order-1',
  pickupName: 'Customer',
  pickupPhone: '9999999999',
  pickupAddress: 'Customer address',
  pickupCity: 'Mumbai',
  pickupState: 'Maharashtra',
  pickupPincode: '400001',
  warehouseAreaCode: '',
  warehouseOriginArea: '',
  warehousePincode: '422001',
  warehouseName: 'Valiarian Warehouse',
  warehouseAddress: 'Warehouse address',
  warehouseCity: 'Nashik',
  warehouseState: 'Maharashtra',
  warehousePhone: '9999999999',
  weightGrams: 500,
  declaredValue: 1000,
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
    assert.equal(mapDelhiveryStatus('Manifested', 'UD'), 'created');
    assert.equal(mapDelhiveryStatus('In Transit', 'UD'), 'in_transit');
    assert.equal(mapDelhiveryStatus('Pending', 'UD'), 'in_transit');
    assert.equal(mapDelhiveryStatus('Dispatched', 'UD'), 'out_for_delivery');
    assert.equal(mapDelhiveryStatus('Delivered', 'DL'), 'delivered');
    assert.equal(mapDelhiveryStatus('Pending', 'UD', 'EOD-74'), 'exception');
    assert.equal(mapDelhiveryStatus('Scheduled', 'PP'), 'pickup_pending');
    assert.equal(mapDelhiveryStatus('In Transit', 'PU'), 'in_transit');
    assert.equal(mapDelhiveryStatus('DTO', 'DL'), 'delivered');
    assert.equal(mapDelhiveryStatus('Canceled', 'CN'), 'cancelled');
    assert.equal(mapDelhiveryStatus('In Transit', 'RT'), 'rto_in_transit');
    assert.equal(mapDelhiveryStatus('RTO', 'DL'), 'rto_delivered');
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

  it('creates a parametric RVP QC payload using mapped client question IDs', async () => {
    let request: any;
    const provider = new DelhiveryProvider(config, {request: async (value: any) => {
      request = value;
      return {success: true, packages: [{status: 'Success', waybill: '9876543210123'}]};
    }} as any);
    const result = await provider.createReversePickup({
      ...reversePickup,
      qualityCheckItems: [{
        item: 'T-shirt',
        description: 'Blue cotton T-shirt',
        images: ['https://example.com/tshirt.jpg'],
        returnReason: 'Damaged',
        quantity: 1,
        brand: 'Valiarian',
        productCategory: 'apparel',
        questions: [{
          questionId: 'CLIENT-CONDITION-1',
          options: ['Unused', 'Used'],
          values: ['Unused'],
          required: true,
          type: 'multi',
        }],
      }],
    });
    const payload = JSON.parse(new URLSearchParams(request.data).get('data') ?? '{}');
    assert.equal(result.reverseAwbNumber, '9876543210123');
    assert.equal(payload.shipments[0].payment_mode, 'Pickup');
    assert.equal(payload.shipments[0].qc_type, 'param');
    assert.equal(payload.shipments[0].custom_qc[0].questions[0].questions_id, 'CLIENT-CONDITION-1');
    assert.deepEqual(payload.shipments[0].custom_qc[0].questions[0].value, ['Unused']);
  });

  it('rejects RVP QC requests that Delhivery would silently downgrade to non-QC', async () => {
    const provider = new DelhiveryProvider(config, {request: async () => {
      throw new Error('provider must not be called');
    }} as any);
    const question = {
      questionId: 'CLIENT-CONDITION-1',
      options: ['Yes', 'No'],
      values: ['Yes'],
      required: true,
      type: 'multi' as const,
    };
    const item = {
      description: 'T-shirt',
      images: ['https://example.com/tshirt.jpg'],
      quantity: 1,
      questions: [question],
    };
    await assert.rejects(
      provider.createReversePickup({
        ...reversePickup,
        qualityCheckItems: [item, item, item],
      }),
      /between one and two items/,
    );
    await assert.rejects(
      provider.createReversePickup({
        ...reversePickup,
        qualityCheckItems: [{...item, questions: Array(7).fill(question)}],
      }),
      /between one and six questions/,
    );
  });

  it('uses the documented methods and paths for Delhivery operational APIs', async () => {
    const requests: any[] = [];
    const provider = new DelhiveryProvider(config, {request: async (request: any) => {
      requests.push(request);
      if (request.operation === 'registerPickup') return {pickup_id: 'PICKUP-1'};
      return {success: true};
    }} as any);

    await provider.cancelShipment('1234567890123');
    await provider.registerPickup({
      providerRequestId: 'pickup-1',
      awbNumber: '1234567890123',
      areaCode: '',
      customerCode: '',
      customerName: 'Valiarian Warehouse',
      addressLine1: 'Warehouse address',
      pincode: '422001',
      phone: '9999999999',
      numberOfPieces: 2,
      weightKg: 1,
      pickupDate: new Date('2026-09-11T00:00:00.000Z'),
      pickupTime: '11:00',
      officeCloseTime: '18:00',
      productCode: 'S',
    });
    await provider.updateShipment({
      waybill: '1234567890123',
      address: 'Updated address',
      weightGrams: 600,
    });
    await provider.updateEwaybill('1234567890123', 'INV-1', 'EWB-1');
    await provider.calculateShippingCost({
      originPincode: '422001',
      destinationPincode: '400001',
      weightGrams: 500,
      paymentType: 'Pre-paid',
    });
    await provider.fetchWaybills(25);
    await provider.createWarehouse({
      name: 'Valiarian Warehouse',
      phone: '9999999999',
      pin: '422001',
      returnAddress: 'Warehouse address',
    });
    await provider.updateWarehouse(
      'Valiarian Warehouse',
      '422001',
      'Updated warehouse address',
    );
    await provider.downloadDocument('1234567890123', 'EPOD');
    await provider.submitNdr('1234567890123', 'RE-ATTEMPT');
    await provider.getNdrStatus('UPL123456');

    const requestFor = (operation: string) =>
      requests.find(request => request.operation === operation);
    assert.deepEqual(
      [requestFor('cancelShipment').method, requestFor('cancelShipment').path,
        requestFor('cancelShipment').data.cancellation],
      ['POST', '/api/p/edit', 'true'],
    );
    assert.deepEqual(
      [requestFor('registerPickup').method, requestFor('registerPickup').path,
        requestFor('registerPickup').data.expected_package_count],
      ['POST', '/fm/request/new/', 2],
    );
    assert.equal(requestFor('updateShipment').data.add, 'Updated address');
    assert.deepEqual(
      [requestFor('updateEwaybill').method, requestFor('updateEwaybill').path],
      ['PUT', '/api/rest/ewaybill/1234567890123/'],
    );
    assert.equal(requestFor('calculateShippingCost').params.d_pin, '400001');
    assert.equal(requestFor('fetchBulkWaybills').includeTokenQuery, true);
    assert.equal(requestFor('fetchBulkWaybills').params.count, 25);
    assert.equal(requestFor('createWarehouse').path, '/api/backend/clientwarehouse/create/');
    assert.equal(requestFor('updateWarehouse').path, '/api/backend/clientwarehouse/edit/');
    assert.deepEqual(requestFor('downloadDocument').params, {
      waybill: '1234567890123',
      doc_type: 'EPOD',
    });
    assert.deepEqual(requestFor('submitNdr').data, {
      data: [{waybill: '1234567890123', act: 'RE-ATTEMPT'}],
    });
    assert.equal(requestFor('getNdrStatus').path, '/api/cmu/get_bulk_upl/UPL123456');
  });

  it('downloads the official 4R Delhivery label only from an approved HTTPS host', async () => {
    let labelRequest: any;
    let downloadedUrl: string | undefined;
    const provider = new DelhiveryProvider(
      config,
      {request: async (request: any) => {
        labelRequest = request;
        return {packages: [{pdf_download_link: 'https://labels.delhivery.com/label.pdf'}]};
      }} as any,
      {get: async (url: string) => {
        downloadedUrl = url;
        return {data: Buffer.from('%PDF-1.4\nlabel')};
      }} as any,
    );

    const result = await provider.generateLabel('1234567890123');
    assert.equal(labelRequest.path, '/api/p/packing_slip');
    assert.deepEqual(labelRequest.params, {
      wbns: '1234567890123',
      pdf: true,
      pdf_size: '4R',
    });
    assert.equal(downloadedUrl, 'https://labels.delhivery.com/label.pdf');
    assert.equal(result.labelFormat, 'A6');
    assert.equal(result.pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  });

  it('rejects an unapproved official-label URL before downloading it', async () => {
    let downloads = 0;
    const provider = new DelhiveryProvider(
      config,
      {request: async () => ({pdf_download_link: 'https://attacker.example/label.pdf'})} as any,
      {get: async () => {
        downloads++;
        return {data: Buffer.from('%PDF-1.4')};
      }} as any,
    );
    await assert.rejects(
      provider.generateLabel('1234567890123'),
      /unapproved label host/,
    );
    assert.equal(downloads, 0);
  });

  it('rejects a provider label download that is not a PDF', async () => {
    const provider = new DelhiveryProvider(
      config,
      {request: async () => ({pdf_download_link: 'https://labels.delhivery.com/label.pdf'})} as any,
      {get: async () => ({data: Buffer.from('<html>error</html>')})} as any,
    );
    await assert.rejects(
      provider.generateLabel('1234567890123'),
      /not a valid PDF/,
    );
  });
});
