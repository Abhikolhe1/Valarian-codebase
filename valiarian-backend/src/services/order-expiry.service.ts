import {lifeCycleObserver, LifeCycleObserver, inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Order, Payment} from '../models';
import {
  OrderRepository,
  OrderStatusHistoryRepository,
  PaymentRepository,
} from '../repositories';

const DEFAULT_EXPIRY_MINUTES = 30;
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const SYSTEM_ACTOR_ID = 'system:auto-order-expiry';

@lifeCycleObserver('application')
export class OrderExpiryService implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(OrderRepository)
    private orderRepository: OrderRepository,
    @repository(PaymentRepository)
    private paymentRepository: PaymentRepository,
    @repository(OrderStatusHistoryRepository)
    private orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @inject('services.order.expiry.minutes', {optional: true})
    private expiryMinutes: number = DEFAULT_EXPIRY_MINUTES,
    @inject('services.order.expiry.interval.ms', {optional: true})
    private sweepIntervalMs: number = DEFAULT_SWEEP_INTERVAL_MS,
  ) {}

  async start(): Promise<void> {
    await this.expireStaleOrders();

    this.timer = setInterval(() => {
      void this.expireStaleOrders();
    }, this.sweepIntervalMs);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async expireStaleOrders(): Promise<void> {
    const cutoff = new Date(Date.now() - this.expiryMinutes * 60 * 1000);

    const expiredOrders = await this.orderRepository.find({
      where: {
        isDeleted: false,
        paymentMethod: 'razorpay',
        status: 'pending',
        paymentStatus: {inq: ['created', 'pending']} as any,
        createdAt: {lte: cutoff},
      } as any,
    });

    for (const order of expiredOrders) {
      try {
        await this.cancelExpiredOrder(order);
      } catch (error) {
        console.error('[Order Expiry] Failed to auto-cancel stale order', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async cancelExpiredOrder(order: Order): Promise<void> {
    const latestOrder = await this.orderRepository.findById(order.id);

    if (
      latestOrder.status !== 'pending' ||
      !['created', 'pending'].includes(latestOrder.paymentStatus)
    ) {
      return;
    }

    await this.orderRepository.updateById(latestOrder.id, {
      status: 'cancelled',
      paymentStatus: 'failed',
      cancelledAt: new Date(),
      cancellationReason: `Auto-cancelled after ${this.expiryMinutes} minutes without successful payment`,
      updatedAt: new Date(),
    });

    const payment = await this.paymentRepository.findOne({
      where: {orderId: latestOrder.id},
    });

    if (payment && this.canMarkPaymentFailed(payment)) {
      await this.paymentRepository.updateById(payment.id, {
        status: 'failed',
      });
    }

    await this.orderStatusHistoryRepository.createStatusEntry(
      latestOrder.id,
      'cancelled',
      SYSTEM_ACTOR_ID,
      `Order auto-cancelled after ${this.expiryMinutes} minutes without successful payment`,
    );

    console.log('[Order Expiry] Auto-cancelled unpaid order', {
      orderId: latestOrder.id,
      orderNumber: latestOrder.orderNumber,
      paymentStatus: latestOrder.paymentStatus,
    });
  }

  private canMarkPaymentFailed(payment: Payment): boolean {
    return ['created', 'pending'].includes(payment.status);
  }
}
