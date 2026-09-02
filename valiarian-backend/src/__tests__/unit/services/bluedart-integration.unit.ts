import {expect} from '@loopback/testlab';
import {assertBlueDartConfigured, loadBlueDartConfig} from '../../../config/bluedart.config';
import {BlueDartApiClient} from '../../../services/shipping-providers/bluedart-api.client';
import {BlueDartAuthService, parseAuthenticationResponse} from '../../../services/shipping-providers/bluedart-auth.service';
import {BlueDartDeveloperPortalProvider} from '../../../services/shipping-providers/bluedart-developer-portal.provider';
import {BlueDartConfigurationError, BlueDartRateLimitError} from '../../../services/shipping-providers/bluedart-errors';
import {mapAlternateInstructionRequest, mapReversePickupRequest, mapTransitTimeRequest, mapWaybillRequest} from '../../../services/shipping-providers/bluedart/mappers';
import {CreateShipmentParams} from '../../../interfaces/shipping-provider.interface';

function developerEnv(): NodeJS.ProcessEnv {
  return {
    BLUEDART_PROVIDER_MODE: 'developer-portal',
    BLUEDART_ENV: 'sandbox',
    BLUEDART_API_KEY: 'test-key',
    BLUEDART_API_SECRET: 'test-secret',
    BLUEDART_SANDBOX_AUTH_URL: 'https://auth.invalid/token',
    BLUEDART_SANDBOX_BASE_URL: 'https://api.invalid',
  };
}

/** A sandbox-host base URL for tests that exercise BlueDartApiClient — required
 * to pass the "refuse non-sandbox host while BLUEDART_ENV=sandbox" guard. The
 * mocked http layer intercepts before any real network call is made. */
function developerEnvWithSandboxHost(): NodeJS.ProcessEnv {
  return {
    ...developerEnv(),
    BLUEDART_LOGIN_ID: 'test-login',
    BLUEDART_LICENCE_KEY: 'test-licence',
    BLUEDART_SANDBOX_BASE_URL: 'https://apigateway-sandbox.bluedart.com/mock/finder/v1',
    BLUEDART_SERVICEABILITY_PATH: '/GetServicesforPincode',
  };
}

function mockAuthAndBusinessHttp(businessResponseData: unknown) {
  return {
    request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}}; // auth call
      return {data: businessResponseData}; // business call
    },
  } as any;
}

describe('Blue Dart Developer Portal safety (unit)', () => {
  it('never throws from loadBlueDartConfig — incomplete config surfaces as configErrors instead', () => {
    const config = loadBlueDartConfig({BLUEDART_PROVIDER_MODE: 'developer-portal'});
    expect(config.providerMode).to.equal('developer-portal');
    expect(config.configErrors.length).to.be.greaterThan(0);
  });

  it('keeps legacy SOAP as the explicit default, with no config errors', () => {
    const config = loadBlueDartConfig({});
    expect(config.providerMode).to.equal('legacy-soap');
    expect(config.configErrors).to.deepEqual([]);
  });

  it('flags (but does not throw for) test mocks enabled in production', () => {
    const config = loadBlueDartConfig({BLUEDART_ENV: 'production', BLUEDART_ENABLE_TEST_MOCKS: 'true'});
    expect(config.environment).to.equal('production');
    expect(config.configErrors.some(message => /test mocks/i.test(message))).to.be.true();
  });

  it('assertBlueDartConfigured throws a secret-free error only when configErrors is non-empty', () => {
    const incomplete = loadBlueDartConfig({BLUEDART_PROVIDER_MODE: 'developer-portal'});
    expect(() => assertBlueDartConfigured(incomplete, 'authenticate')).to.throw(BlueDartConfigurationError);

    const complete = loadBlueDartConfig(developerEnv());
    expect(complete.configErrors).to.deepEqual([]);
    expect(() => assertBlueDartConfigured(complete, 'authenticate')).to.not.throw();
  });

  it('resolves sandbox vs production URLs from BLUEDART_ENV alone, without touching flat AUTH_URL/BASE_URL vars', () => {
    const sandbox = loadBlueDartConfig({
      BLUEDART_ENV: 'sandbox',
      BLUEDART_SANDBOX_AUTH_URL: 'https://sandbox-auth.invalid',
      BLUEDART_SANDBOX_BASE_URL: 'https://sandbox-base.invalid',
      BLUEDART_PRODUCTION_AUTH_URL: 'https://prod-auth.invalid',
      BLUEDART_PRODUCTION_BASE_URL: 'https://prod-base.invalid',
    });
    expect(sandbox.authUrl).to.equal('https://sandbox-auth.invalid');
    expect(sandbox.baseUrl).to.equal('https://sandbox-base.invalid');

    const production = loadBlueDartConfig({
      BLUEDART_ENV: 'production',
      BLUEDART_SANDBOX_AUTH_URL: 'https://sandbox-auth.invalid',
      BLUEDART_SANDBOX_BASE_URL: 'https://sandbox-base.invalid',
      BLUEDART_PRODUCTION_AUTH_URL: 'https://prod-auth.invalid',
      BLUEDART_PRODUCTION_BASE_URL: 'https://prod-base.invalid',
      BLUEDART_ORIGIN_AREA: 'BOM',
      BLUEDART_PRODUCTION_ORIGIN_AREA: 'NSK',
      BLUEDART_SHIPPER_CITY: 'Mumbai',
      BLUEDART_PRODUCTION_SHIPPER_CITY: 'Nashik',
    });
    expect(production.authUrl).to.equal('https://prod-auth.invalid');
    expect(production.baseUrl).to.equal('https://prod-base.invalid');
    expect(production.account.originArea).to.equal('NSK');
    expect(production.account.shipperCity).to.equal('Nashik');
  });

  it('parses the documented JWTToken response field', () => {
    const token = parseAuthenticationResponse({JWTToken: 'header.payload.signature'}, 900, 1000);
    expect(token.accessToken).to.equal('header.payload.signature');
  });

  it('parses common token fields and expires_in', () => {
    const token = parseAuthenticationResponse({access_token: 'header.payload.signature', expires_in: 60}, 900, 1000);
    expect(token.accessToken).to.equal('header.payload.signature');
    expect(token.expiresAt).to.equal(61000);
  });

  it('parses JWT exp without treating decoding as verification', () => {
    const payload = Buffer.from(JSON.stringify({exp: 12345})).toString('base64url');
    expect(parseAuthenticationResponse({jwt: `x.${payload}.x`}).expiresAt).to.equal(12345000);
  });

  it('rejects malformed token responses', () => {
    expect(() => parseAuthenticationResponse({expires_in: 60})).to.throw(/supported token field/);
  });

  it('coalesces concurrent authentication and reuses the cached token', async () => {
    let calls = 0;
    const http = {request: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return {data: {JWTToken: 'safe-test-token', expires_in: 3600}}; }} as any;
    const service = new BlueDartAuthService(loadBlueDartConfig(developerEnv()), undefined, http);
    const tokens = await Promise.all([service.getToken(), service.getToken(), service.getToken()]);
    expect(calls).to.equal(1);
    expect(tokens.every(token => token.accessToken === 'safe-test-token')).to.be.true();
    await service.getToken();
    expect(calls).to.equal(1);
  });

  it('authenticate() throws a clear, secret-free BlueDartConfigurationError when config is incomplete', async () => {
    const http = {request: async () => { throw new Error('should never be called'); }} as any;
    const config = loadBlueDartConfig({BLUEDART_PROVIDER_MODE: 'developer-portal'});
    const service = new BlueDartAuthService(config, undefined, http);
    await expect(service.getToken()).to.be.rejectedWith(BlueDartConfigurationError);
  });
});

describe('Blue Dart Location Finder response-wrapper regression (unit)', () => {
  // Locks in the 2026-08-25 fix: Blue Dart's real sandbox response wraps the
  // service-flag object under `GetServicesforPincodeResult`, NOT
  // `ServiceCenterDetailsReference` as the older field-spec doc implied.
  // Without this fix, isServiceable/isCodAvailable silently evaluate to
  // false even on a fully successful, deliverable response.

  it('reads isServiceable/isCodAvailable from the real GetServicesforPincodeResult wrapper', async () => {
    const config = loadBlueDartConfig(developerEnvWithSandboxHost());
    const http = mockAuthAndBusinessHttp({
      GetServicesforPincodeResult: {
        IsError: false,
        ErrorMessage: 'Valid',
        GroundOutbound: 'Yes',
        DomesticPriorityOutbound: 'Yes',
        ApexOutbound: 'No',
        eTailCODGroundOutbound: 'Yes',
        AreaCode: 'BOM',
      },
    });
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);
    const provider = new BlueDartDeveloperPortalProvider(config, client);

    const result = await provider.checkServiceability({pincode: '400001'});
    expect(result.isServiceable).to.be.true();
    expect(result.isCodAvailable).to.be.true();
    expect(result.areaCode).to.equal('BOM');
  });

  it('still supports the older ServiceCenterDetailsReference wrapper for backward compatibility', async () => {
    const config = loadBlueDartConfig(developerEnvWithSandboxHost());
    const http = mockAuthAndBusinessHttp({
      ServiceCenterDetailsReference: {
        IsError: false,
        GroundOutbound: 'Y',
        eTailCODAirOutbound: 'Y',
      },
    });
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);
    const provider = new BlueDartDeveloperPortalProvider(config, client);

    const result = await provider.checkServiceability({pincode: '400001'});
    expect(result.isServiceable).to.be.true();
    expect(result.isCodAvailable).to.be.true();
  });

  it('prioritizes GetServicesforPincodeResult when both wrapper keys are somehow present', async () => {
    const config = loadBlueDartConfig(developerEnvWithSandboxHost());
    const http = mockAuthAndBusinessHttp({
      GetServicesforPincodeResult: {IsError: false, GroundOutbound: 'Yes'},
      ServiceCenterDetailsReference: {IsError: true, ErrorMessage: 'stale-key-should-be-ignored'},
    });
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);
    const provider = new BlueDartDeveloperPortalProvider(config, client);

    const result = await provider.checkServiceability({pincode: '400001'});
    expect(result.isServiceable).to.be.true();
  });

  it('throws when Blue Dart reports IsError:true, surfacing the real ErrorMessage', async () => {
    const config = loadBlueDartConfig(developerEnvWithSandboxHost());
    const http = mockAuthAndBusinessHttp({
      GetServicesforPincodeResult: {IsError: true, ErrorMessage: 'UserDoesNotExists'},
    });
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);
    const provider = new BlueDartDeveloperPortalProvider(config, client);

    await expect(provider.checkServiceability({pincode: '400001'})).to.be.rejectedWith(/UserDoesNotExists/);
  });
});

describe('Blue Dart API client sandbox host guard (unit)', () => {
  it('refuses to call a non-sandbox host while BLUEDART_ENV=sandbox', async () => {
    const config = loadBlueDartConfig({...developerEnv(), BLUEDART_LOGIN_ID: 'x', BLUEDART_LICENCE_KEY: 'y'});
    const http = {request: async () => ({data: {}})} as any;
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);
    // developerEnv()'s BLUEDART_SANDBOX_BASE_URL ('https://api.invalid') does
    // not contain the real sandbox host — must be refused, not silently allowed.
    await expect(client.post(config.baseUrl!, '/whatever', {}, 'testOperation')).to.be.rejected();
  });

  it('surfaces HTTP 429 immediately without an internal retry burst', async () => {
    const config = loadBlueDartConfig(developerEnvWithSandboxHost());
    let businessCalls = 0;
    const http = {
      request: async (request: any) => {
        if (!request.baseURL) {
          return {data: {JWTToken: 'test-token', expires_in: 3600}};
        }
        businessCalls++;
        const error: any = new Error('rate limited');
        error.response = {status: 429, data: {title: 'Too Many Requests'}};
        throw error;
      },
    } as any;
    const auth = new BlueDartAuthService(config, undefined, http);
    const client = new BlueDartApiClient(config, auth, http);

    await expect(
      client.get(config.baseUrl!, '/GetServicesforPincode', 'checkServiceability'),
    ).to.be.rejectedWith(BlueDartRateLimitError);
    expect(businessCalls).to.equal(1);
  });
});

function validShipment(overrides: Partial<CreateShipmentParams> = {}): CreateShipmentParams {
  return {
    orderReference: 'order-id', orderNumber: 'ORD-1001',
    receiverName: 'Sandbox Receiver', receiverPhone: '9995554441',
    receiverAddress: 'Receiver address', receiverCity: 'Mumbai', receiverState: 'Maharashtra',
    receiverPincode: '400057', receiverCountry: 'India',
    warehouseAreaCode: 'NSK', warehouseOriginArea: 'NSK', warehousePincode: '422001',
    warehouseName: 'Valiarian Warehouse', warehouseAddressLine1: 'Warehouse address',
    warehouseCity: 'Nashik', warehouseState: 'Maharashtra', warehousePhone: '9996665554',
    weightGrams: 500, lengthCm: 20, breadthCm: 15, heightCm: 10,
    declaredValue: 1000, numberOfPieces: 1, productCode: 'A', subProductCode: 'P', isCod: false,
    ...overrides,
  };
}

describe('Blue Dart confirmed request contracts (unit)', () => {
  const config = loadBlueDartConfig({
    ...developerEnvWithSandboxHost(),
    BLUEDART_CUSTOMER_CODE: '000005', BLUEDART_PRODUCT_CODE: 'A', BLUEDART_SUB_PRODUCT_CODE: 'P',
  });

  it('maps Transit with exact casing, /Date(epoch)/, HHmm, and supplied product pair', () => {
    const request = mapTransitTimeRequest({originPincode: '422001', destinationPincode: '400057', productCode: 'A', subProductCode: 'P', pickupDate: new Date(1700000000000), pickupTime: '1600'}, config);
    expect(request).to.containDeep({pPinCode: '422001', pPinCodeTo: '400057', pProductCode: 'A', pSubProductCode: 'P', pPudate: '/Date(1700000000000)/', pPickupTime: '1600'});
    expect(request.profile).to.containDeep({Api_type: 'S', LoginID: 'test-login', LicenceKey: 'test-licence'});
  });

  it('maps the exact Waybill envelope and field casing for prepaid merchandise', () => {
    const request = mapWaybillRequest(validShipment(), config);
    expect(Object.keys(request.Request)).to.deepEqual(['Consignee', 'Returnadds', 'Services', 'Shipper', 'IsUpdateAPI']);
    expect(request.Request.Shipper.IsToPayCustomer).to.be.false();
    expect(request.Request.Shipper).to.not.have.property('isToPayCustomer');
    expect(request.Request.Services.ProductType).to.equal(0);
    expect(request.Request.Services.Dimensions).to.deepEqual([{Breadth: 15, Count: 1, Height: 10, Length: 20}]);
    expect(request.Request.Services).to.not.have.property('CollectableAmount');
    expect(request.Request.Returnadds.ReturnPincode).to.equal('422001');
    expect(request.Request.Shipper.Sender).to.equal('');
    expect(JSON.stringify(request).includes('undefined')).to.be.false();
  });

  it('rejects malformed Waybill data locally before Blue Dart is called', () => {
    expect(() => mapWaybillRequest(validShipment({weightGrams: 0}), config)).to.throw(/weightGrams/);
    expect(() => mapWaybillRequest(validShipment({warehousePhone: ''}), config)).to.throw(/warehousePhone/);
    expect(() => mapWaybillRequest(validShipment({receiverPincode: '123'}), config)).to.throw(/receiverPincode/);
    expect(() => mapWaybillRequest(validShipment({lengthCm: 0}), config)).to.throw(/lengthCm/);
  });

  it('maps COD only when explicitly requested', () => {
    const request = mapWaybillRequest(validShipment({isCod: true, codAmount: 750, codFavorOf: 'Valiarian LLP'}), config);
    expect(request.Request.Services.CollectableAmount).to.equal(750);
  });

  it('makes CreditReferenceNo unique per order UUID even when orderNumber collides across environments', () => {
    // Regression for 2026-09-01: order numbers are date+sequential *per
    // environment*, so the same literal orderNumber can be produced by both
    // local and UAT on the same day. Blue Dart's duplicate-AWB check is
    // scoped to the account, not the environment, so a bare orderNumber
    // reference let one environment's AWB permanently block the other's.
    const a = mapWaybillRequest(validShipment({orderNumber: 'ORD-20260901-0002', orderReference: 'aaaaaaaa-0000-0000-0000-000000000000'}), config);
    const b = mapWaybillRequest(validShipment({orderNumber: 'ORD-20260901-0002', orderReference: 'bbbbbbbb-1111-1111-1111-111111111111'}), config);
    const refA = a.Request.Services.CreditReferenceNo as string;
    const refB = b.Request.Services.CreditReferenceNo as string;
    expect(refA.length).to.be.lessThanOrEqual(20);
    expect(refB.length).to.be.lessThanOrEqual(20);
    expect(refA).to.not.equal(refB);
  });

  it('uses the exact confirmed Transit endpoint and preserves InvalidOriginPincode as a business result', async () => {
    const calls: any[] = [];
    const liveShapeConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(),
      BLUEDART_SANDBOX_TRANSIT_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/transit/v1',
    });
    const http = {request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}};
      calls.push(cfg);
      return {data: {GetDomesticTransitTimeForPinCodeandProductResult: {IsError: true, ErrorMessage: 'InvalidOriginPincode'}}};
    }} as any;
    const auth = new BlueDartAuthService(liveShapeConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(liveShapeConfig, new BlueDartApiClient(liveShapeConfig, auth, http));
    const result = await provider.getTransitTime({originPincode: '422001', destinationPincode: '400057', productCode: 'A', subProductCode: 'P', pickupDate: new Date(1700000000000), pickupTime: '1600'});
    expect(calls[0].baseURL).to.equal('https://apigateway-sandbox.bluedart.com/in/transportation/transit/v1');
    expect(calls[0].url).to.equal('/GetDomesticTransitTimeForPinCodeandProduct');
    expect(result).to.containDeep({serviceable: false, isError: true, errorMessage: 'InvalidOriginPincode'});
  });

  it('uses the exact confirmed Waybill endpoint and extracts Status[0].StatusInformation', async () => {
    const calls: any[] = [];
    const liveShapeConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(), BLUEDART_CUSTOMER_CODE: '000005',
      BLUEDART_SANDBOX_WAYBILL_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/waybill/v1',
    });
    const http = {request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}};
      calls.push(cfg);
      return {data: {GenerateWayBillResult: {IsError: true, Status: [{StatusCode: 'Invalid', StatusInformation: 'Object reference not set'}]}}};
    }} as any;
    const auth = new BlueDartAuthService(liveShapeConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(liveShapeConfig, new BlueDartApiClient(liveShapeConfig, auth, http));
    await expect(provider.createShipment(validShipment())).to.be.rejectedWith(/Invalid: Object reference not set/);
    expect(calls[0].baseURL).to.equal('https://apigateway-sandbox.bluedart.com/in/transportation/waybill/v1');
    expect(calls[0].url).to.equal('/GenerateWayBill');
  });

  it('uses the official Tracking GET contract and maps XML scan history', async () => {
    const calls: any[] = [];
    const trackingConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(),
      BLUEDART_SANDBOX_TRACKING_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/tracking/v1',
    });
    const xml = '<ShipmentData><Shipment WaybillNo="76662235090"><Destination>GURUGRAM</Destination><Status>SHIPMENT DELIVERED</Status><StatusType>DL</StatusType><StatusDate>30 January 2023</StatusDate><StatusTime>11:41</StatusTime><Scans><ScanDetail><Scan>SHIPMENT DELIVERED</Scan><ScanCode>000</ScanCode><ScanType>DL</ScanType><ScanDate>30-Jan-2023</ScanDate><ScanTime>11:41</ScanTime><ScannedLocation>GURGAON CPC</ScannedLocation></ScanDetail></Scans></Shipment></ShipmentData>';
    const http = {request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}};
      calls.push(cfg);
      return {data: xml};
    }} as any;
    const auth = new BlueDartAuthService(trackingConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(trackingConfig, new BlueDartApiClient(trackingConfig, auth, http));
    const result = await provider.trackShipment('76662235090');
    expect(calls[0].method).to.equal('GET');
    expect(calls[0].url).to.match(/^\?handler=tnt/);
    expect(calls[0].url).to.match(/numbers=76662235090/);
    expect(calls[0].url).to.match(/scan=1/);
    expect(result.currentStatus).to.equal('delivered');
    expect(result.currentLocation).to.equal('GURGAON CPC');
    expect(result.events[0]).to.containDeep({courierRawCode: 'DL', internalStatus: 'delivered'});
  });

  it('uses the official pickup registration and cancellation payloads', async () => {
    const calls: any[] = [];
    const pickupConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(),
      BLUEDART_SANDBOX_PICKUP_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/pickup/v1',
      BLUEDART_SANDBOX_CANCEL_PICKUP_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/cancel-pickup/v1',
      BLUEDART_PICKUP_REGISTRATION_PATH: '/RegisterPickup',
      BLUEDART_PICKUP_CANCELLATION_PATH: '/CancelPickup',
    });
    const http = {request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}};
      calls.push(cfg);
      return cfg.url === '/RegisterPickup'
        ? {data: {RegisterPickupResult: {TokenNumber: 748984, IsError: false}}}
        : {data: {CancelPickupResult: {IsError: false}}};
    }} as any;
    const auth = new BlueDartAuthService(pickupConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(pickupConfig, new BlueDartApiClient(pickupConfig, auth, http));
    const pickupDate = new Date(1700000000000);
    const registered = await provider.registerPickup({providerRequestId: 'pickup:order-1', awbNumber: '76662235090', areaCode: 'NSK', customerCode: '000005', customerName: 'Valiarian Warehouse', addressLine1: 'Building 8', pincode: '422007', phone: '8830800191', numberOfPieces: 2, weightKg: 1.5, pickupDate, pickupTime: '09:00', officeCloseTime: '18:00', productCode: 'A', subProducts: ['E-Tailing']});
    expect(registered.pickupReference).to.equal('748984');
    expect(calls[0].data.request).to.containDeep({
      AWBNo: [''],
      AreaCode: 'NSK',
      ShipmentPickupDate: '/Date(1700000000000)/',
      DoxNDox: '1',
      ProductCode: 'A',
      ReferenceNo: '',
      Remarks: '',
      ShipmentPickupTime: '09:00',
      OfficeCloseTime: '18:00',
      SubProducts: ['E-Tailing'],
    });
    const cancelled = await provider.cancelPickup({pickupReference: registered.pickupReference, pickupRegistrationDate: pickupDate, remarks: 'Admin cancelled'});
    expect(cancelled.success).to.be.true();
    expect(calls[1].data.request).to.containDeep({TokenNumber: 748984, PickupRegistrationDate: '/Date(1700000000000)/'});
  });

  it('uses the official Alt-Instruction RTO and delivery-reattempt contract', async () => {
    const calls: any[] = [];
    const altConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(),
      BLUEDART_SANDBOX_ALT_INSTRUCTION_BASE_URL:
        'https://apigateway-sandbox.bluedart.com/in/transportation/cust-instruction-update/v1',
      BLUEDART_ALT_INSTRUCTION_PATH: '/CustALTInstructionUpdate',
    });
    const reattemptDate = new Date(1700000000000);
    const mappedRto = mapAlternateInstructionRequest(
      {awbNumber: '69501388751', instructionType: 'RTO'},
      altConfig,
    );
    expect(mappedRto).to.containDeep({
      altreq: {AWBNo: '69501388751', AltInstRequestType: 'RTO'},
      profile: {
        LoginID: 'test-login',
        LicenceKey: 'test-licence',
        Api_type: 'S',
        Version: '1.9',
      },
    });
    expect(() =>
      mapAlternateInstructionRequest(
        {awbNumber: '59500670843', instructionType: 'DT'},
        altConfig,
      ),
    ).to.throw(/preferred date/i);

    const http = {
      request: async (cfg: any) => {
        if (!cfg.baseURL) {
          return {data: {JWTToken: 'test-token', expires_in: 3600}};
        }
        calls.push(cfg);
        return {
          data: {
            CustALTInstructionUpdateResult: {
              AWBNo: cfg.data.altreq.AWBNo,
              IsError: false,
              status: {
                e: {
                  StatusCode: 'Valid',
                  StatusInformation: 'AltInstruction Update Successful',
                },
              },
            },
          },
        };
      },
    } as any;
    const auth = new BlueDartAuthService(altConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(
      altConfig,
      new BlueDartApiClient(altConfig, auth, http),
    );
    const result = await provider.updateAlternateInstruction({
      awbNumber: '59500670843',
      instructionType: 'DT',
      preferredDate: reattemptDate,
    });
    expect(result).to.containDeep({
      awbNumber: '59500670843',
      accepted: true,
      statusCode: 'Valid',
    });
    expect(calls[0]).to.containDeep({
      method: 'POST',
      baseURL:
        'https://apigateway-sandbox.bluedart.com/in/transportation/cust-instruction-update/v1',
      url: '/CustALTInstructionUpdate',
    });
    expect(calls[0].data.altreq).to.containDeep({
      AWBNo: '59500670843',
      AltInstRequestType: 'DT',
      PreferDate: '/Date(1700000000000)/',
    });
  });

  it('uses Finder plus the documented Closed RVP Waybill contract for a customer return', async () => {
    const calls: any[] = [];
    const reverseConfig = loadBlueDartConfig({
      ...developerEnvWithSandboxHost(),
      BLUEDART_CUSTOMER_CODE: '000005',
      BLUEDART_SANDBOX_WAYBILL_BASE_URL: 'https://apigateway-sandbox.bluedart.com/in/transportation/waybill/v1',
    });
    const params = {
      originalAwbNumber: '20472264525', orderReference: '6b27113d-02cb-4794-96ff-d3bf3ea93dab',
      pickupName: 'Customer Name', pickupPhone: '9999999999', pickupAddress: 'Andheri East',
      pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupPincode: '400069',
      warehouseAreaCode: 'BOM', warehouseOriginArea: 'IGNORED', warehousePincode: '400069',
      warehouseName: 'VALIARIAN LLP', warehouseAddress: 'Warehouse Address', warehouseCity: 'Mumbai',
      warehouseState: 'Maharashtra', warehousePhone: '8888888888', weightGrams: 600,
      declaredValue: 999,
      itemDescription: 'Crown Line Polo Sand', returnReason: 'Size issue',
    };
    const mapped = mapReversePickupRequest({...params, warehouseOriginArea: 'BOM'}, reverseConfig);
    expect(mapped.Request.Shipper).to.containDeep({CustomerPincode: '400069', OriginArea: 'BOM'});
    expect(mapped.Request.Consignee).to.containDeep({ConsigneePincode: '400069'});
    expect(mapped.Request.Services).to.containDeep({
      IsReversePickup: true, RegisterPickup: true, PickupMode: 'P', PickupType: '',
      ProductCode: 'A', SubProductCode: 'P', ForwardAWBNo: '20472264525',
    });
    expect(mapped.Request.Services.CreditReferenceNo.length).to.be.lessThanOrEqual(20);
    expect(mapped.Request.Services.itemdtl[0].ItemID.length).to.be.lessThanOrEqual(15);
    expect(mapped.Request.Services.DeclaredValue).to.equal(999);
    expect(mapped.Request.Services.itemdtl[0].ItemValue).to.equal(999);

    const http = {request: async (cfg: any) => {
      if (!cfg.baseURL) return {data: {JWTToken: 'test-token', expires_in: 3600}};
      calls.push(cfg);
      if (cfg.url === '/GetServicesforPincodeAndProduct') {
        return {data: {GetServicesforPincodeAndProductResult: {IsError: false, PickupService: 'Yes', PickupAreaCode: 'BOM'}}};
      }
      return {data: {GenerateWayBillResult: {IsError: false, IsErrorInPU: false, AWBNo: '20479990001', CCRCRDREF: 'RVPREF', TokenNumber: '12345', ShipmentPickupDate: '/Date(1700000000000)/'}}};
    }} as any;
    const auth = new BlueDartAuthService(reverseConfig, undefined, http);
    const provider = new BlueDartDeveloperPortalProvider(reverseConfig, new BlueDartApiClient(reverseConfig, auth, http));
    const result = await provider.createReversePickup(params);
    expect(result).to.containDeep({reverseAwbNumber: '20479990001', pickupTokenNumber: '12345'});
    expect(calls.map(call => call.url)).to.deepEqual(['/GetServicesforPincodeAndProduct', '/GenerateWayBill']);
    expect(calls[1].data.Request.Services.IsReversePickup).to.be.true();
    expect(calls[1].data.Request.Services.RegisterPickup).to.be.true();
  });
});
