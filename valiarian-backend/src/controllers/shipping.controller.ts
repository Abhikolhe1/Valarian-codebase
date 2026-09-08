import {inject} from '@loopback/core';
import {get, HttpErrors, param} from '@loopback/rest';
import {ShippingService} from '../services/shipping.service';
import {PostalPincodeService} from '../services/postal-pincode.service';
import {ServiceabilityResult} from '../interfaces/shipping-provider.interface';
import {selectForwardWaybillService} from '../utils/bluedart-forward-service.utils';
import {DeliveryEligibility, evaluateDeliveryEligibility, isIndianDeliveryAddress} from '../utils/delivery-eligibility';

export class ShippingController {
  constructor(
    @inject('services.shipping')
    public shippingService: ShippingService,
    @inject('services.postal-pincode')
    public postalPincodeService: PostalPincodeService,
  ) {}

  @get('/api/shipping/serviceability')
  async checkServiceability(
    @param.query.string('pincode') pincode: string,
    @param.query.string('paymentMethod') paymentMethod?: string,
  ): Promise<ServiceabilityResult & DeliveryEligibility> {
    if (!pincode || !isIndianDeliveryAddress(pincode)) {
      throw new HttpErrors.BadRequest('Please enter a valid 6-digit Indian PIN code.');
    }

    // Keep postal failures outside the Blue Dart fallback catch.
    await this.postalPincodeService.assertExists(pincode);

    try {
      const forwardService = selectForwardWaybillService(paymentMethod === 'cod');
      const result = await this.shippingService.checkServiceability({
        pincode,
        deliveryMode: forwardService.deliveryMode,
        paymentType: forwardService.paymentType,
      });

      return {
        isServiceable: result.isServiceable,
        isCodAvailable: result.isCodAvailable,
        reason: result.reason,
        courierName: result.courierName,
        estimatedTransitDays: result.estimatedTransitDays,
        areaCode: result.areaCode,
        originArea: result.originArea,
        surfacePrepaidAvailable: result.surfacePrepaidAvailable,
        surfaceCodAvailable: result.surfaceCodAvailable,
        ...evaluateDeliveryEligibility(result, paymentMethod === 'cod'),
      };
    } catch (err) {
      // Full detail (provider, upstream status, sanitized error code) stays
      // server-side only — never forward the raw provider message to an
      // unauthenticated public endpoint.
      console.error('[ShippingController] Serviceability check failed:', {
        pincode,
        operation: err.operation,
        httpStatus: err.httpStatus,
        providerCode: err.providerCode,
        message: err.message,
      });
      return {isServiceable: false, isCodAvailable: false, courierName: 'BlueDart',
        ...evaluateDeliveryEligibility(undefined, paymentMethod === 'cod')};
    }
  }
}
