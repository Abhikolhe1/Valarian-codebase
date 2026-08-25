import {inject} from '@loopback/core';
import {get, HttpErrors, param} from '@loopback/rest';
import {ShippingService} from '../services/shipping.service';
import {ServiceabilityResult} from '../interfaces/shipping-provider.interface';

export class ShippingController {
  constructor(
    @inject('services.shipping')
    public shippingService: ShippingService,
  ) {}

  @get('/api/shipping/serviceability')
  async checkServiceability(
    @param.query.string('pincode') pincode: string,
    @param.query.string('paymentMethod') paymentMethod?: string,
  ): Promise<ServiceabilityResult> {
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      throw new HttpErrors.BadRequest('Pincode must be a valid 6-digit number.');
    }

    try {
      const result = await this.shippingService.checkServiceability({
        pincode,
      });

      // Filter/Adjust response based on paymentMethod if requested
      if (paymentMethod === 'cod' && !result.isCodAvailable) {
        return {
          ...result,
          isServiceable: false, // For COD request, make it unserviceable if COD not supported
        };
      }

      return result;
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
      throw new HttpErrors.BadGateway(
        'Unable to verify delivery availability for this pincode right now. Please try again shortly.',
      );
    }
  }
}
