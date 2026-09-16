import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  HttpErrors,
  post,
  Request,
  requestBody,
  RestBindings,
} from '@loopback/rest';
import {OrderRepository, ShipmentEventRepository, ShipmentRepository} from '../repositories';
import {
  parseDelhiveryScanPush,
  verifyDelhiveryWebhookAuthorization,
} from '../utils/delhivery-webhook.utils';

export class DelhiveryWebhookController {
  constructor(
    @repository(ShipmentRepository)
    private shipmentRepository: ShipmentRepository,
    @repository(ShipmentEventRepository)
    private shipmentEventRepository: ShipmentEventRepository,
    @repository(OrderRepository)
    private orderRepository: OrderRepository,
    @inject(RestBindings.Http.REQUEST)
    private request: Request,
  ) {}

  @post('/api/webhooks/delhivery/scans', {
    responses: {
      '200': {
        description: 'Delhivery scan accepted',
        content: {'application/json': {schema: {type: 'object'}}},
      },
    },
  })
  async receiveScan(
    @requestBody({
      required: true,
      content: {'application/json': {schema: {type: 'object'}}},
    })
    payload: object,
  ): Promise<{success: true; duplicate: boolean}> {
    const secret = process.env.DELHIVERY_WEBHOOK_SECRET;
    if (!secret || secret.length < 32) {
      throw new HttpErrors.ServiceUnavailable(
        'Delhivery Scan Push webhook is not configured.',
      );
    }
    const authorization = this.request.headers.authorization;
    if (!verifyDelhiveryWebhookAuthorization(authorization, secret)) {
      throw new HttpErrors.Unauthorized('Invalid Delhivery webhook authorization.');
    }

    let scan;
    try {
      scan = parseDelhiveryScanPush(payload);
    } catch (error) {
      throw new HttpErrors.BadRequest(
        error instanceof Error ? error.message : 'Invalid Delhivery Scan Push payload.',
      );
    }
    const shipment = await this.shipmentRepository.findOne({
      where: {awbNumber: scan.awbNumber, courierName: 'Delhivery'},
    });
    if (!shipment) {
      throw new HttpErrors.NotFound('No Delhivery shipment matches this AWB.');
    }
    const courierRawCode = scan.statusCode || scan.statusType || scan.status;
    const existing = await this.shipmentEventRepository.findOne({
      where: {
        shipmentId: shipment.id,
        courierRawCode,
        timestamp: scan.timestamp,
      },
    });
    if (existing) return {success: true, duplicate: true};

    try {
      await this.shipmentEventRepository.create({
        shipmentId: shipment.id,
        internalStatus: scan.internalStatus,
        courierRawCode,
        courierDescription: scan.status,
        description: scan.instructions ?? scan.status,
        location: scan.location,
        timestamp: scan.timestamp,
        rawData: scan.rawPayload,
        createdAt: new Date(),
      });
    } catch (error) {
      const duplicate = await this.shipmentEventRepository.findOne({
        where: {
          shipmentId: shipment.id,
          courierRawCode,
          timestamp: scan.timestamp,
        },
      });
      if (!duplicate) throw error;
      return {success: true, duplicate: true};
    }

    const now = new Date();
    await this.shipmentRepository.updateById(shipment.id, {
      status: scan.internalStatus,
      courierRawStatus: scan.statusType || scan.status,
      currentLocation: scan.location,
      deliveredAt: scan.internalStatus === 'delivered' ? scan.timestamp : shipment.deliveredAt,
      trackingLastSyncedAt: now,
      rawTrackingData: scan.rawPayload,
      updatedAt: now,
    });

    if (!shipment.isReverse && scan.internalStatus === 'delivered') {
      await this.orderRepository.updateById(shipment.orderId, {
        status: 'delivered',
        deliveredAt: scan.timestamp,
        updatedAt: now,
      });
    } else if (!shipment.isReverse && scan.internalStatus === 'rto_initiated') {
      await this.orderRepository.updateById(shipment.orderId, {
        status: 'rto_initiated',
        rtoStatus: 'initiated',
        rtoInitiatedAt: scan.timestamp,
        updatedAt: now,
      });
    }

    return {success: true, duplicate: false};
  }
}
