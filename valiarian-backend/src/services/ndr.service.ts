import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {Ndr, NdrStatus, NdrClosureReason} from '../models';
import {NdrRepository, ShipmentRepository, OrderRepository, OrderStatusHistoryRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class NdrService {
  constructor(
    @repository(NdrRepository)
    public ndrRepository: NdrRepository,
    @repository(ShipmentRepository)
    public shipmentRepository: ShipmentRepository,
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(OrderStatusHistoryRepository)
    public orderStatusHistoryRepository: OrderStatusHistoryRepository,
  ) {}

  /**
   * Creates a new Non-Delivery Report (NDR) or increments the attempt counter of an active one.
   */
  async createNdr(params: {
    shipmentId: string;
    orderId: string;
    failureReason?: string;
    courierNdrCode?: string;
    attemptNumber?: number;
  }): Promise<Ndr> {
    const existing = await this.ndrRepository.findOne({
      where: {
        shipmentId: params.shipmentId,
        ndrStatus: {neq: 'closed'},
      },
    });

    if (existing) {
      const updatedAttempt = params.attemptNumber ?? (existing.attemptNumber + 1);
      await this.ndrRepository.updateById(existing.id, {
        attemptNumber: updatedAttempt,
        failureReason: params.failureReason || existing.failureReason,
        courierNdrCode: params.courierNdrCode || existing.courierNdrCode,
        failedAt: new Date(),
        updatedAt: new Date(),
      });
      return this.ndrRepository.findById(existing.id);
    }

    const ndr = new Ndr({
      shipmentId: params.shipmentId,
      orderId: params.orderId,
      ndrStatus: 'pending',
      failureReason: params.failureReason,
      courierNdrCode: params.courierNdrCode,
      attemptNumber: params.attemptNumber || 1,
      failedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    });

    return this.ndrRepository.create(ndr);
  }

  /**
   * Transitions an NDR from one status to another, validating against the transition matrix.
   */
  async transitionNdr(
    ndrId: string,
    toStatus: NdrStatus,
    adminNotes?: string,
    customerResponse?: string,
  ): Promise<Ndr> {
    const ndr = await this.ndrRepository.findById(ndrId);

    const allowed = this.getAllowedTransitions(ndr.ndrStatus);
    if (!allowed.includes(toStatus)) {
      throw new HttpErrors.UnprocessableEntity(
        `NDR status cannot transition from '${ndr.ndrStatus}' to '${toStatus}'. Allowed: [${allowed.join(', ')}]`,
      );
    }

    const updates: Partial<Ndr> = {
      ndrStatus: toStatus,
      adminNotes: adminNotes || ndr.adminNotes,
      updatedAt: new Date(),
    };

    if (toStatus === 'contacted_customer') {
      updates.contactedAt = new Date();
      updates.customerResponse = customerResponse || ndr.customerResponse;
    } else if (toStatus === 'reattempt_requested') {
      updates.reattemptRequestedAt = new Date();
    } else if (toStatus === 'return_requested') {
      updates.returnRequestedAt = new Date();
    } else if (toStatus === 'closed') {
      updates.closedAt = new Date();
    }

    await this.ndrRepository.updateById(ndrId, updates);
    return this.ndrRepository.findById(ndrId);
  }

  /**
   * Closes an active NDR on final delivery or RTO initiation/delivery.
   */
  async closeNdr(ndrId: string, reason: NdrClosureReason): Promise<Ndr> {
    const ndr = await this.ndrRepository.findById(ndrId);
    if (ndr.ndrStatus === 'closed') {
      return ndr;
    }

    await this.ndrRepository.updateById(ndr.id, {
      ndrStatus: 'closed',
      closedAt: new Date(),
      closureReason: reason,
      updatedAt: new Date(),
    });

    return this.ndrRepository.findById(ndr.id);
  }

  /**
   * Auto-escalates pending and contacted_customer NDRs that exceed threshold.
   */
  async escalatePendingNdrs(): Promise<number> {
    const escalationDays = Number(process.env.NDR_AUTO_ESCALATION_DAYS || 3);
    const cutoff = new Date(Date.now() - escalationDays * 24 * 60 * 60 * 1000);

    const activeNdrs = await this.ndrRepository.find({
      where: {
        ndrStatus: {inq: ['pending', 'contacted_customer']},
        isActive: true,
      },
    });

    let escalatedCount = 0;

    for (const ndr of activeNdrs) {
      const referenceDate = ndr.ndrStatus === 'contacted_customer'
        ? (ndr.contactedAt || ndr.createdAt)
        : ndr.createdAt;

      if (new Date(referenceDate) <= cutoff) {
        // Transition NDR
        await this.transitionNdr(
          ndr.id,
          'return_requested',
          `Auto-escalated to return_requested by NdrFollowUpCronJob due to no customer response/action for ${escalationDays} days.`,
        );

        // Update Shipment status
        await this.shipmentRepository.updateById(ndr.shipmentId, {
          status: 'rto_initiated',
          updatedAt: new Date(),
        });

        // Update Order status
        await this.orderRepository.updateById(ndr.orderId, {
          status: 'rto_initiated',
          rtoStatus: 'initiated',
          rtoInitiatedAt: new Date(),
          updatedAt: new Date(),
        });

        await this.orderStatusHistoryRepository.createStatusEntry(
          ndr.orderId,
          'rto_initiated',
          'system:ndr-followup-cron',
          `Order auto-escalated to RTO because NDR was unresolved after ${escalationDays} days.`,
        );

        escalatedCount++;
      }
    }

    return escalatedCount;
  }

  getAllowedTransitions(status: NdrStatus): NdrStatus[] {
    const matrix: Record<NdrStatus, NdrStatus[]> = {
      pending: ['contacted_customer', 'return_requested'],
      contacted_customer: ['reattempt_requested', 'return_requested'],
      reattempt_requested: ['pending', 'closed'],
      return_requested: ['closed'],
      closed: [],
    };
    return matrix[status] || [];
  }
}
