import {inject} from '@loopback/core';
import {get, HttpErrors, param} from '@loopback/rest';
import {ShippingService} from '../services/shipping.service';
import {PostalPincodeService} from '../services/postal-pincode.service';
import {ServiceabilityResult} from '../interfaces/shipping-provider.interface';
import {selectForwardWaybillService} from '../utils/bluedart-forward-service.utils';
import {DeliveryEligibility, evaluatePreferredDeliveryEligibility, isIndianDeliveryAddress} from '../utils/delivery-eligibility';

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
    @param.query.string('deliveryMode') deliveryMode = 'surface',
  ): Promise<ServiceabilityResult & DeliveryEligibility & {
    availableDeliveryModes: Array<'surface' | 'express'>;
    availablePaymentMethods: Array<'razorpay' | 'cod'>;
    codShippingProvider?: 'delhivery' | 'bluedart';
    expectedDeliveryDates?: {surface: string; express: string};
  }> {
    if (!pincode || !isIndianDeliveryAddress(pincode)) {
      throw new HttpErrors.BadRequest('Please enter a valid 6-digit Indian PIN code.');
    }

    // Keep postal failures outside the Blue Dart fallback catch.
    await this.postalPincodeService.assertExists(pincode);

    if (!['surface', 'express'].includes(deliveryMode)) {
      throw new HttpErrors.BadRequest('Delivery mode must be surface or express.');
    }

    try {
      const forwardService = selectForwardWaybillService(paymentMethod === 'cod');
      const params = {
        pincode,
        deliveryMode: deliveryMode === 'express'
          ? 'air' as const
          : forwardService.deliveryMode,
        paymentType: forwardService.paymentType,
      };
      const chain = deliveryMode === 'express'
        ? await this.expressDelhiveryServiceability(params, paymentMethod === 'cod')
        : await this.shippingService.checkPreferredServiceability(params);
      const result = chain.result;
      const eligibility = evaluatePreferredDeliveryEligibility(
        chain,
        paymentMethod === 'cod',
      );

      const availableDeliveryModes: Array<'surface' | 'express'> =
        chain.selectedProvider === 'Delhivery'
          ? ['surface', 'express']
          : chain.selectedProvider === 'BlueDart'
            ? ['surface']
            : paymentMethod === 'cod' ? [] : ['surface'];
      let codShippingProvider: 'delhivery' | 'bluedart' | undefined;
      if (paymentMethod === 'cod' && chain.selectedProvider !== 'Manual') {
        codShippingProvider = chain.selectedProvider.toLowerCase() as
          | 'delhivery'
          | 'bluedart';
      } else if (!paymentMethod) {
        const codParams = {...params, paymentType: 'cod' as const};
        const codChain = deliveryMode === 'express'
          ? await this.expressDelhiveryServiceability(codParams, true)
          : await this.shippingService.checkPreferredServiceability(codParams);
        if (codChain.selectedProvider !== 'Manual') {
          codShippingProvider = codChain.selectedProvider.toLowerCase() as
            | 'delhivery'
            | 'bluedart';
        }
      }
      const availablePaymentMethods: Array<'razorpay' | 'cod'> =
        codShippingProvider ? ['razorpay', 'cod'] : ['razorpay'];
      const surfaceTransitDays = deliveryMode === 'surface' && result?.estimatedTransitDays
        ? result.estimatedTransitDays
        : this.configuredTransitDays('surface');
      const expressTransitDays = deliveryMode === 'express' && result?.estimatedTransitDays
        ? result.estimatedTransitDays
        : this.configuredTransitDays('express');
      const configuredTransitDays = deliveryMode === 'express'
        ? expressTransitDays
        : surfaceTransitDays;
      const estimatedTransitDays = result?.estimatedTransitDays ??
        configuredTransitDays;
      const expectedDeliveryDate = chain.selectedProvider === 'Delhivery'
        ? this.customerExpectedDeliveryDate(estimatedTransitDays)
        : undefined;
      const expectedDeliveryDates = chain.selectedProvider === 'Delhivery'
        ? {
          surface: this.customerExpectedDeliveryDate(surfaceTransitDays)!,
          express: this.customerExpectedDeliveryDate(expressTransitDays)!,
        }
        : undefined;

      return {
        isServiceable: result?.isServiceable ?? false,
        isCodAvailable: result?.isCodAvailable ?? false,
        reason: result?.reason,
        courierName: result?.courierName ?? chain.selectedProvider,
        estimatedTransitDays,
        expectedDeliveryDate,
        expectedDeliveryDates,
        areaCode: result?.areaCode,
        originArea: result?.originArea,
        surfacePrepaidAvailable: result?.surfacePrepaidAvailable,
        surfaceCodAvailable: result?.surfaceCodAvailable,
        availableDeliveryModes,
        availablePaymentMethods,
        codShippingProvider,
        ...eligibility,
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
      const eligibility = evaluatePreferredDeliveryEligibility({
        selectedProvider: 'Manual',
        delhiveryCheckFailed: true,
        blueDartCheckFailed: true,
      }, paymentMethod === 'cod');
      return {isServiceable: false, isCodAvailable: false, courierName: 'Manual',
        availableDeliveryModes: paymentMethod === 'cod' ? [] : ['surface'],
        availablePaymentMethods: ['razorpay'],
        ...eligibility};
    }
  }

  private customerExpectedDeliveryDate(
    estimatedTransitDays?: number,
  ): string | undefined {
    if (!estimatedTransitDays || estimatedTransitDays < 1) return undefined;
    const date = new Date();
    // Add the courier TAT plus one safety day promised by Valiarian.
    date.setDate(date.getDate() + estimatedTransitDays + 1);
    return date.toISOString().slice(0, 10);
  }

  private configuredTransitDays(mode: 'surface' | 'express'): number {
    const value = mode === 'express'
      ? Number(process.env.DELHIVERY_EXPRESS_TRANSIT_DAYS ?? 2)
      : Number(process.env.DELHIVERY_SURFACE_TRANSIT_DAYS ?? 5);
    return Number.isFinite(value) && value > 0 ? value : mode === 'express' ? 2 : 5;
  }

  private async expressDelhiveryServiceability(
    params: Parameters<ShippingService['checkPreferredServiceability']>[0],
    isCod: boolean,
  ) {
    const delhivery = await this.shippingService.checkServiceabilityForProvider(
      'Delhivery',
      params,
    );
    const usable = delhivery.isServiceable && (!isCod || delhivery.isCodAvailable);
    return {
      selectedProvider: usable ? 'Delhivery' as const : 'Manual' as const,
      result: delhivery,
      delhivery,
      delhiveryCheckFailed: false,
      blueDartCheckFailed: false,
    };
  }
}
