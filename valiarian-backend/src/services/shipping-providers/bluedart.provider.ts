import {HttpErrors} from '@loopback/rest';
import * as soap from 'soap';
import {
  CancelShipmentResult,
  CreateReversePickupParams,
  CreateReversePickupResult,
  CreateShipmentParams,
  CreateShipmentResult,
  GenerateLabelResult,
  ServiceabilityParams,
  ServiceabilityResult,
  ShippingProvider,
  TrackingResult,
} from '../../interfaces/shipping-provider.interface';
import {mapCourierStatus} from '../../utils/courier-status-mapper';

export class BlueDartProvider implements ShippingProvider {
  readonly courierName = 'BlueDart';
  readonly providerVersion = 'bluedart-legacy-soap' as const;

  private getSoapCredentials() {
    return {
      LoginID: process.env.BLUEDART_LOGIN_ID || 'DEMO',
      LicenceKey: process.env.BLUEDART_LICENCE_KEY || 'DEMO_KEY',
      Version: process.env.BLUEDART_API_VERSION || '1.10',
    };
  }

  private isSandbox(): boolean {
    return process.env.BLUEDART_ENV !== 'PROD';
  }

  private testMocksEnabled(): boolean {
    const enabled = process.env.BLUEDART_ENABLE_TEST_MOCKS === 'true';
    const production =
      process.env.BLUEDART_ENVIRONMENT === 'production' ||
      process.env.BLUEDART_ENV === 'PROD';
    if (enabled && production)
      throw new HttpErrors.InternalServerError(
        'Blue Dart test mocks are prohibited in production',
      );
    return enabled;
  }

  private getWsdlUrl(serviceName: string): string {
    const isProd = !this.isSandbox();
    const basePath = isProd
      ? 'https://netconnect.bluedart.com/Ver1.10/EDI'
      : 'https://netconnect.bluedart.com/Ver1.10/Demo/EDI';
    return `${basePath}/${serviceName}.svc?wsdl`;
  }

  /**
   * Helper to invoke soap methods safely with retry/mock safety.
   */
  private async executeSoapCall<T>(
    wsdlUrl: string,
    methodName: string,
    args: object,
    mockFallback: () => T,
  ): Promise<T> {
    if (
      this.isSandbox() &&
      this.testMocksEnabled() &&
      (!process.env.BLUEDART_LOGIN_ID ||
        process.env.BLUEDART_LOGIN_ID === 'DEMO')
    ) {
      // Explicit test-only mock. Never enabled implicitly and never allowed in production.
      return mockFallback();
    }

    try {
      const client = await soap.createClientAsync(wsdlUrl);
      if (!client[methodName]) {
        throw new HttpErrors.InternalServerError(
          `SOAP method ${methodName} does not exist on WSDL ${wsdlUrl}`,
        );
      }
      const response = await new Promise<any>((resolve, reject) => {
        client[methodName](args, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      return response;
    } catch (err) {
      console.error(
        `[BlueDart SOAP Error] Call to ${methodName} failed:`,
        err.message || err,
      );
      // A genuine attempted provider call is never converted into mock success.
      throw new HttpErrors.BadGateway(
        `Blue Dart courier API error: ${err.message || 'Unknown SOAP fault'}`,
      );
    }
  }

  async checkServiceability(
    params: ServiceabilityParams,
  ): Promise<ServiceabilityResult> {
    const wsdl = this.getWsdlUrl('Finder');
    const creds = this.getSoapCredentials();

    const args = {
      profile: {
        ...creds,
        Api_type: 'S',
      },
      pincode: params.pincode,
    };

    const mockResponse = () => ({
      isServiceable: true,
      isCodAvailable: params.pincode !== '110002', // Simulate COD blocking for specific pin
      estimatedTransitDays: 3,
      courierName: this.courierName,
      areaCode: 'MUM',
      originArea: 'BOM',
    });

    const soapResult = await this.executeSoapCall<any>(
      wsdl,
      'GetServicesByPincode',
      args,
      mockResponse,
    );

    // If we got the mock response directly, return it
    if (soapResult.courierName === this.courierName) {
      return soapResult;
    }

    // Otherwise, parse raw SOAP output
    const isServiceable =
      soapResult?.GetServicesByPincodeResult?.IsServiceable === 'true';
    const isCodAvailable =
      soapResult?.GetServicesByPincodeResult?.IsCODAvailable === 'true';
    const transitDays = Number(
      soapResult?.GetServicesByPincodeResult?.TransitTime || 3,
    );
    const areaCode = soapResult?.GetServicesByPincodeResult?.AreaCode || 'MUM';

    return {
      isServiceable,
      isCodAvailable,
      estimatedTransitDays: transitDays,
      courierName: this.courierName,
      areaCode,
      originArea: soapResult?.GetServicesByPincodeResult?.OriginArea || 'BOM',
      rawResponse: soapResult,
    };
  }

  async createShipment(
    params: CreateShipmentParams,
  ): Promise<CreateShipmentResult> {
    const wsdl = this.getWsdlUrl('WayBillGeneration');
    const creds = this.getSoapCredentials();

    const args = {
      Request: {
        licence: {
          ...creds,
          CustomerCode: process.env.BLUEDART_CUSTOMER_CODE || 'DEMO_CUST',
        },
        waybill: {
          ProductCode:
            params.productCode || process.env.BLUEDART_PRODUCT_CODE || 'A',
          SubProductCode:
            params.subProductCode ||
            process.env.BLUEDART_SUB_PRODUCT_CODE ||
            'P',
          ServiceType:
            params.serviceType || process.env.BLUEDART_SERVICE_TYPE || 'A',
          OriginArea: params.warehouseOriginArea,
          AreaCode: params.warehouseAreaCode,
          OrderNo: params.orderNumber,
          RefNo: params.orderReference,
          Shipper: {
            CustomerCode: process.env.BLUEDART_CUSTOMER_CODE || 'DEMO_CUST',
            CustomerName: params.warehouseName,
            CustomerAddress1: 'Origin Warehouse address line 1',
            PinCode: params.warehousePincode,
          },
          Consignee: {
            CustomerName: params.receiverName,
            CustomerAddress1: params.receiverAddress.substring(0, 45),
            CustomerAddress2: params.receiverAddress.substring(45, 90) || '',
            PinCode: params.receiverPincode,
            CustomerMobile: params.receiverPhone,
            CustomerEmailID: params.receiverEmail || '',
          },
          Dimensions: {
            Length: params.lengthCm,
            Breadth: params.breadthCm,
            Height: params.heightCm,
            Weight: params.weightGrams / 1000, // Blue Dart accepts weight in Kg
          },
          IsCOD: params.isCod ? 'true' : 'false',
          CODAmount: params.isCod ? params.codAmount || 0 : 0,
          CODFavorOf: params.isCod ? params.codFavorOf || '' : '',
          ItemDescription: params.itemDescription || 'Products',
        },
      },
    };

    const mockResponse = (): CreateShipmentResult => {
      const randomAwb =
        'TEST-BD-' + Math.floor(100000000 + Math.random() * 900000000);
      const estDelivery = new Date();
      estDelivery.setDate(estDelivery.getDate() + 3);

      return {
        awbNumber: randomAwb,
        courierReferenceNumber: 'REF-' + randomAwb,
        estimatedDelivery: estDelivery,
        shippingCharge: 120.0,
        fuelSurcharge: 18.5,
        codCharge: params.isCod ? 50.0 : 0.0,
        otherCharges: 0.0,
        totalCourierCost: 138.5 + (params.isCod ? 50.0 : 0.0),
        chargesUnavailable: true,
      };
    };

    const soapResult = await this.executeSoapCall<any>(
      wsdl,
      'GenerateWayBill',
      args,
      mockResponse,
    );

    if (soapResult.awbNumber) {
      return soapResult;
    }

    const waybillResult = soapResult?.GenerateWayBillResult;
    if (waybillResult?.IsError === 'true' || !waybillResult?.AWBNo) {
      const errorMsg = waybillResult?.ErrorMessage || 'Failed to generate AWB';
      throw new HttpErrors.UnprocessableEntity(
        `Blue Dart SOAP Error: ${errorMsg}`,
      );
    }

    const charges = waybillResult?.ChargesBreakdown || {};
    const shippingCharge = Number(charges.ShippingCharge || 0);
    const fuelSurcharge = Number(charges.FuelSurcharge || 0);
    const codCharge = Number(charges.CODCharge || 0);
    const otherCharges = Number(charges.OtherCharges || 0);
    const totalCourierCost =
      shippingCharge + fuelSurcharge + codCharge + otherCharges;

    return {
      awbNumber: waybillResult.AWBNo,
      courierReferenceNumber: waybillResult.ReferenceNo || waybillResult.AWBNo,
      estimatedDelivery: waybillResult.ExpectedDeliveryDate
        ? new Date(waybillResult.ExpectedDeliveryDate)
        : undefined,
      shippingCharge,
      fuelSurcharge,
      codCharge,
      otherCharges,
      totalCourierCost,
      rawResponse: soapResult,
    };
  }

  async cancelShipment(awbNumber: string): Promise<CancelShipmentResult> {
    const wsdl = this.getWsdlUrl('CancelWaybill');
    const creds = this.getSoapCredentials();

    const args = {
      Request: {
        licence: {
          ...creds,
          CustomerCode: process.env.BLUEDART_CUSTOMER_CODE || 'DEMO_CUST',
        },
        AWBNo: awbNumber,
      },
    };

    const mockResponse = () => ({
      success: true,
      message: 'Shipment successfully voided (mock)',
    });

    const soapResult = await this.executeSoapCall<any>(
      wsdl,
      'CancelWayBill',
      args,
      mockResponse,
    );

    if (soapResult.success) {
      return soapResult;
    }

    const cancelResult = soapResult?.CancelWayBillResult;
    const isCancelled = cancelResult?.IsCancelled === 'true';

    return {
      success: isCancelled,
      message: cancelResult?.StatusMessage || 'Cancellation request completed',
      rawResponse: soapResult,
    };
  }

  async trackShipment(awbNumber: string): Promise<TrackingResult> {
    const wsdl = this.getWsdlUrl('Tracking');
    const creds = this.getSoapCredentials();

    const args = {
      profile: {
        ...creds,
        Api_type: 'S',
      },
      awbNo: awbNumber,
    };

    const mockResponse = (): TrackingResult => {
      return {
        awbNumber,
        currentStatus: 'in_transit',
        courierRawStatus: 'IT',
        currentLocation: 'Mumbai Hub',
        events: [
          {
            internalStatus: 'in_transit',
            courierRawCode: 'IT',
            courierDescription: 'Consignment in transit',
            description: 'Consignment in transit',
            location: 'Mumbai Hub',
            timestamp: new Date(),
          },
          {
            internalStatus: 'created',
            courierRawCode: 'CR',
            courierDescription: 'Consignment Registered',
            description: 'Consignment Registered',
            location: 'Origin Warehouse',
            timestamp: new Date(Date.now() - 3600000),
          },
        ],
      };
    };

    const soapResult = await this.executeSoapCall<any>(
      wsdl,
      'GetTrackingDetails',
      args,
      mockResponse,
    );

    if (soapResult.awbNumber === awbNumber) {
      return soapResult;
    }

    const trackingData = soapResult?.GetTrackingDetailsResult;
    if (!trackingData || trackingData.IsError === 'true') {
      throw new HttpErrors.NotFound(
        `Tracking details not found for AWB: ${awbNumber}`,
      );
    }

    const rawEvents = trackingData.ScanDetails?.Scan || [];
    const events = rawEvents.map((scan: any) => {
      const rawCode = scan.ScanCode || 'IT';
      return {
        internalStatus: mapCourierStatus('BlueDart', rawCode),
        courierRawCode: rawCode,
        courierDescription: scan.ScanDescription || '',
        description: scan.ScanDescription || '',
        location: scan.ScanLocation || '',
        timestamp: new Date(scan.ScanDate + 'T' + scan.ScanTime),
      };
    });

    // Determine current status from latest event
    let currentStatus: any = 'created';
    let courierRawStatus = 'CR';
    let currentLocation = '';
    let deliveredAt: Date | undefined;

    if (events.length > 0) {
      // Sort descending by timestamp
      events.sort(
        (a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
      currentStatus = events[0].internalStatus;
      courierRawStatus = events[0].courierRawCode;
      currentLocation = events[0].location;

      if (currentStatus === 'delivered') {
        deliveredAt = events[0].timestamp;
      }
    }

    return {
      awbNumber,
      currentStatus,
      courierRawStatus,
      currentLocation,
      deliveredAt,
      events,
      rawResponse: soapResult,
    };
  }

  async generateLabel(awbNumber: string): Promise<GenerateLabelResult> {
    // Label generation endpoint usually uses a direct HTTP POST with HTML/PDF response
    // rather than SOAP. In test, we return a mock PDF buffer.
    if (!this.testMocksEnabled()) {
      throw new HttpErrors.NotImplemented(
        'Blue Dart legacy label generation is not configured',
      );
    }
    const pdfBuffer = Buffer.from('%PDF-1.4 Explicit Test Blue Dart AWB Label');
    return {
      pdf: pdfBuffer,
      awbNumber,
      labelFormat: 'A6',
    };
  }

  async createReversePickup(
    params: CreateReversePickupParams,
  ): Promise<CreateReversePickupResult> {
    const wsdl = this.getWsdlUrl('WayBillGeneration'); // Blue Dart reverse pickups are generated as a separate waybill type
    const creds = this.getSoapCredentials();

    const args = {
      Request: {
        licence: {
          ...creds,
          CustomerCode: process.env.BLUEDART_CUSTOMER_CODE || 'DEMO_CUST',
        },
        waybill: {
          ProductCode: 'A',
          SubProductCode: 'P',
          ServiceType: 'A',
          OriginArea: params.warehouseOriginArea,
          AreaCode: params.warehouseAreaCode,
          OrderNo: params.orderReference,
          Shipper: {
            CustomerName: params.pickupName,
            CustomerAddress1: params.pickupAddress.substring(0, 45),
            PinCode: params.pickupPincode,
            CustomerMobile: params.pickupPhone,
          },
          Consignee: {
            CustomerCode: process.env.BLUEDART_CUSTOMER_CODE || 'DEMO_CUST',
            CustomerName: params.warehouseName,
            CustomerAddress1: 'Warehouse Destination Address',
            PinCode: params.warehousePincode,
          },
          Dimensions: {
            Length: 20,
            Breadth: 15,
            Height: 10,
            Weight: params.weightGrams / 1000,
          },
          IsCOD: 'false',
          ItemDescription:
            params.itemDescription || 'Reverse Pickup Return Items',
        },
      },
    };

    const mockResponse = () => {
      const mockReverseAwb =
        'TEST-BD-R-' + Math.floor(100000000 + Math.random() * 900000000);
      return {
        reverseAwbNumber: mockReverseAwb,
        courierReferenceNumber: 'REF-REV-' + mockReverseAwb,
      };
    };

    const soapResult = await this.executeSoapCall<any>(
      wsdl,
      'GenerateWayBill',
      args,
      mockResponse,
    );

    if (soapResult.reverseAwbNumber) {
      return soapResult;
    }

    const waybillResult = soapResult?.GenerateWayBillResult;
    if (waybillResult?.IsError === 'true' || !waybillResult?.AWBNo) {
      throw new HttpErrors.UnprocessableEntity(
        `Blue Dart Reverse SOAP Error: ${waybillResult?.ErrorMessage || 'Failed to generate AWB'}`,
      );
    }

    return {
      reverseAwbNumber: waybillResult.AWBNo,
      courierReferenceNumber: waybillResult.ReferenceNo || waybillResult.AWBNo,
      rawResponse: soapResult,
    };
  }
}
