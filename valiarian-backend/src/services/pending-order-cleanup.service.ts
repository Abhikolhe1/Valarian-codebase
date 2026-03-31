import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Order} from '../models';
import {
  OrderRepository,
  OrderStatusHistoryRepository,
  PaymentRepository,
} from '../repositories';
import {EmailService} from './email.service';
import {EmailTemplateService} from './email-template.service';
import {RazorpayService} from './razorpay.service';

const DEFAULT_PENDING_ORDER_AGE_HOURS = 0.01;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;
const SYSTEM_ACTOR_ID = 'system:pending-order-cleanup';

@lifeCycleObserver('application')
export class PendingOrderCleanupService implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(OrderRepository)
    private orderRepository: OrderRepository,
    @repository(PaymentRepository)
    private paymentRepository: PaymentRepository,
    @repository(OrderStatusHistoryRepository)
    private orderStatusHistoryRepository: OrderStatusHistoryRepository,
    @inject('services.razorpay')
    private razorpayService: RazorpayService,
    @inject('services.email')
    private emailService: EmailService,
    @inject('services.email.template')
    private emailTemplateService: EmailTemplateService,
    @inject('services.pending.order.cleanup.hours', {optional: true})
    private pendingOrderAgeHours: number = DEFAULT_PENDING_ORDER_AGE_HOURS,
    @inject('services.pending.order.cleanup.interval.ms', {optional: true})
    private sweepIntervalMs: number = DEFAULT_SWEEP_INTERVAL_MS,
  ) {}

  async start(): Promise<void> {
    console.log('[Pending Order Cleanup] Service started', {
      pendingOrderAgeHours: this.pendingOrderAgeHours,
      sweepIntervalMs: this.sweepIntervalMs,
      startedAt: new Date().toISOString(),
    });

    await this.cleanupExpiredPendingOrders();

    this.timer = setInterval(() => {
      console.log('[Pending Order Cleanup] Cron tick started', {
        runAt: new Date().toISOString(),
      });
      void this.cleanupExpiredPendingOrders();
    }, this.sweepIntervalMs);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async cleanupExpiredPendingOrders(): Promise<void> {
    const cutoff = new Date(
      Date.now() - this.pendingOrderAgeHours * 60 * 60 * 1000,
    );

    console.log('[Pending Order Cleanup] Checking pending orders', {
      runAt: new Date().toISOString(),
      cutoff: cutoff.toISOString(),
      pendingOrderAgeHours: this.pendingOrderAgeHours,
    });

    const orders = await this.orderRepository.find({
      where: {
        isDeleted: false,
        status: 'pending',
        createdAt: {lte: cutoff},
      } as any,
    });

    console.log('[Pending Order Cleanup] Pending orders fetched', {
      count: orders.length,
      orderIds: orders.map(order => order.id),
    });

    for (const order of orders) {
      try {
        console.log('[Pending Order Cleanup] Processing order', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        });
        await this.cancelPendingOrder(order);
      } catch (error) {
        console.error(
          '[Pending Order Cleanup] Failed to process pending order',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            message: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  private async cancelPendingOrder(order: Order): Promise<void> {
    const latestOrder = await this.orderRepository.findById(order.id);

    console.log('[Pending Order Cleanup] Latest order state', {
      orderId: latestOrder.id,
      orderNumber: latestOrder.orderNumber,
      status: latestOrder.status,
      paymentMethod: latestOrder.paymentMethod,
      paymentStatus: latestOrder.paymentStatus,
    });

    if (latestOrder.status !== 'pending') {
      console.log('[Pending Order Cleanup] Skipping order because status changed', {
        orderId: latestOrder.id,
        currentStatus: latestOrder.status,
      });
      return;
    }

    const cancellationReason = `Auto-cancelled by cron after remaining pending for ${this.pendingOrderAgeHours} hours`;
    const updateData: Partial<Order> = {
      status: 'cancelled',
      cancelledAt: latestOrder.cancelledAt || new Date(),
      cancellationReason,
      updatedAt: new Date(),
    };

    if (
      latestOrder.paymentMethod === 'cod' &&
      latestOrder.paymentStatus === 'pending'
    ) {
      updateData.paymentStatus = 'failed';
    }

    await this.orderRepository.updateById(latestOrder.id, updateData);

    await this.orderStatusHistoryRepository.createStatusEntry(
      latestOrder.id,
      'cancelled',
      SYSTEM_ACTOR_ID,
      cancellationReason,
    );

    const autoRefunded = await this.shouldAutoRefund(latestOrder);

    if (autoRefunded) {
      await this.refundPrepaidPendingOrder(latestOrder);
    }

    await this.failPaymentRecordIfPending(latestOrder.id);
    await this.sendCancellationEmail(latestOrder, autoRefunded);

    console.log('[Pending Order Cleanup] Processed pending order', {
      orderId: latestOrder.id,
      orderNumber: latestOrder.orderNumber,
      paymentMethod: latestOrder.paymentMethod,
      paymentStatus: latestOrder.paymentStatus,
    });
  }

  private async shouldAutoRefund(order: Order): Promise<boolean> {
    if (
      order.paymentMethod !== 'razorpay' ||
      !order.razorpayPaymentId ||
      order.refundTransactionId ||
      order.refundInitiatedAt
    ) {
      console.log('[Pending Order Cleanup] Refund not applicable', {
        orderId: order.id,
        paymentMethod: order.paymentMethod,
        hasRazorpayPaymentId: !!order.razorpayPaymentId,
        refundTransactionId: order.refundTransactionId || null,
        refundInitiatedAt: order.refundInitiatedAt || null,
      });
      return false;
    }

    if (['paid', 'success'].includes(order.paymentStatus)) {
      console.log('[Pending Order Cleanup] Refund allowed from local payment status', {
        orderId: order.id,
        paymentStatus: order.paymentStatus,
      });
      return true;
    }

    try {
      const payment = await this.razorpayService.fetchPayment(
        order.razorpayPaymentId,
      );

      const paymentGatewayStatus = String(payment?.status || '').toLowerCase();

      console.log('[Pending Order Cleanup] Razorpay payment fetched', {
        orderId: order.id,
        razorpayPaymentId: order.razorpayPaymentId,
        paymentGatewayStatus,
      });

      return paymentGatewayStatus === 'captured';
    } catch (error) {
      console.warn(
        '[Pending Order Cleanup] Unable to verify Razorpay payment status before refund',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          razorpayPaymentId: order.razorpayPaymentId,
          message: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  private async refundPrepaidPendingOrder(order: Order): Promise<void> {
    let refundId = `cron_refund_${Date.now()}`;

    console.log('[Pending Order Cleanup] Initiating refund', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayPaymentId: order.razorpayPaymentId,
      amount: order.total,
    });

    try {
      const refund = await this.razorpayService.createRefund(
        order.razorpayPaymentId!,
        Math.round(order.total * 100),
        {
          reason: 'Auto refund for pending order cancellation',
          orderId: order.id,
          orderNumber: order.orderNumber,
          source: 'pending-order-cleanup-cron',
        },
      );

      refundId = refund.id;
      console.log('[Pending Order Cleanup] Razorpay refund created', {
        orderId: order.id,
        refundId,
      });
    } catch (razorpayError: any) {
      console.warn(
        '[Pending Order Cleanup] Razorpay refund failed, using fallback refund reference',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: razorpayError?.message,
        },
      );
    }

    await this.orderRepository.updateById(order.id, {
      refundAmount: order.total,
      refundInitiatedAt: order.refundInitiatedAt || new Date(),
      refundCompletedAt: new Date(),
      refundTransactionId: refundId,
      refundMethod: 'original_payment',
      paymentStatus: 'refunded',
      updatedAt: new Date(),
    });

    await this.orderStatusHistoryRepository.createStatusEntry(
      order.id,
      'refund_initiated',
      SYSTEM_ACTOR_ID,
      `Refund initiated automatically for prepaid order that remained pending for ${this.pendingOrderAgeHours} hours`,
    );

    await this.sendRefundEmail(order, refundId);
  }

  private async failPaymentRecordIfPending(orderId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: {orderId},
    });

    if (!payment || !['created', 'pending'].includes(payment.status)) {
      console.log('[Pending Order Cleanup] Payment record not updated', {
        orderId,
        paymentFound: !!payment,
        paymentStatus: payment?.status || null,
      });
      return;
    }

    await this.paymentRepository.updateById(payment.id, {
      status: 'failed',
      updatedAt: new Date(),
    });

    console.log('[Pending Order Cleanup] Payment record marked failed', {
      orderId,
      paymentId: payment.id,
    });
  }

  private async sendCancellationEmail(
    order: Order,
    refunded: boolean,
  ): Promise<void> {
    const recipientEmail =
      order.billingAddress?.email || order.shippingAddress?.email;

    if (!recipientEmail) {
      console.log('[Pending Order Cleanup] Cancellation email skipped, no recipient', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      return;
    }

    try {
      const emailHtml = await this.emailTemplateService.renderTemplate(
        'cancellation-confirmation',
        {
          customerName: order.billingAddress.fullName,
          orderNumber: order.orderNumber,
          cancellationReason: order.cancellationReason,
          orderDate: order.createdAt
            ? order.createdAt.toLocaleDateString()
            : new Date().toLocaleDateString(),
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price || 0).toFixed(2),
          })),
          total: Number(order.total || 0).toFixed(2),
          refundAmount: refunded ? Number(order.total || 0).toFixed(2) : null,
          refundProcessingDays: '5-7',
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );

      await this.emailService.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Order Cancelled - ${order.orderNumber}`,
        html: emailHtml,
      });

      console.log('[Pending Order Cleanup] Cancellation email sent', {
        orderId: order.id,
        to: recipientEmail,
      });
    } catch (error) {
      console.error('[Pending Order Cleanup] Failed to send cancellation email', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendRefundEmail(
    order: Order,
    refundId: string,
  ): Promise<void> {
    const recipientEmail =
      order.billingAddress?.email || order.shippingAddress?.email;

    if (!recipientEmail) {
      console.log('[Pending Order Cleanup] Refund email skipped, no recipient', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      return;
    }

    try {
      const emailHtml = await this.emailTemplateService.renderTemplate(
        'refund-initiated',
        {
          customerName: order.billingAddress.fullName,
          orderNumber: order.orderNumber,
          refundAmount: Number(order.total || 0).toFixed(2),
          refundReason: 'Refund initiated automatically after pending order cancellation',
          refundDate: new Date().toLocaleDateString(),
          refundTransactionId: refundId,
          processingDays: '5-7',
          originalAmount: Number(order.total || 0).toFixed(2),
          deliveryChargeDeductionAmount: null,
          year: new Date().getFullYear(),
          companyName: 'Valiarian',
        },
      );

      await this.emailService.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Refund Initiated - ${order.orderNumber}`,
        html: emailHtml,
      });

      console.log('[Pending Order Cleanup] Refund email sent', {
        orderId: order.id,
        to: recipientEmail,
        refundId,
      });
    } catch (error) {
      console.error('[Pending Order Cleanup] Failed to send refund email', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
