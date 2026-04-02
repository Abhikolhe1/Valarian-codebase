import {lifeCycleObserver, LifeCycleObserver, inject} from '@loopback/core';
import {repository, Where} from '@loopback/repository';
import {PremiumPreorder} from '../models';
import {PremiumPreorderRepository} from '../repositories';
import {RazorpayService} from './razorpay.service';

const DEFAULT_EXPIRY_MINUTES = 60;
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

@lifeCycleObserver('application')
export class PremiumPreorderExpiryService implements LifeCycleObserver {
  private timer?: NodeJS.Timeout;

  constructor(
    @repository(PremiumPreorderRepository)
    private premiumPreorderRepository: PremiumPreorderRepository,
    @inject('services.razorpay')
    private razorpayService: RazorpayService,
    @inject('services.premium.preorder.expiry.minutes', {optional: true})
    private expiryMinutes: number = DEFAULT_EXPIRY_MINUTES,
    @inject('services.premium.preorder.expiry.interval.ms', {optional: true})
    private sweepIntervalMs: number = DEFAULT_SWEEP_INTERVAL_MS,
  ) {}

  private appendNote(existingNotes: unknown, nextNote: string) {
    const normalizedExistingNotes = String(existingNotes ?? '').trim();
    return normalizedExistingNotes
      ? `${normalizedExistingNotes}\n${nextNote}`
      : nextNote;
  }

  private async fetchPaymentWithRetry(paymentId: string, attempts = 2) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.razorpayService.fetchPayment(paymentId);
      } catch (error) {
        lastError = error;
        console.warn('[PREMIUM_FLOW] Failed to fetch Razorpay payment during expiry', {
          paymentId,
          attempt,
          attempts,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw lastError;
  }

  async start(): Promise<void> {
    await this.expireStalePreorders();

    this.timer = setInterval(() => {
      this.expireStalePreorders().catch(error => {
        console.error('[Premium Preorder Expiry] Cron tick failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.sweepIntervalMs);

    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async expireStalePreorders(): Promise<void> {
    const cutoff = new Date(Date.now() - this.expiryMinutes * 60 * 1000);
    const where: Where<PremiumPreorder> = {
      isDeleted: false,
      paymentMethod: 'razorpay',
      status: 'initiated',
      paymentStatus: {inq: ['created', 'pending']},
      createdAt: {lte: cutoff},
    };

    const expiredPreorders = await this.premiumPreorderRepository.find({
      where,
    });

    for (const preorder of expiredPreorders) {
      try {
        await this.cancelExpiredPreorder(preorder);
      } catch (error) {
        console.error('[Premium Preorder Expiry] Failed to auto-cancel stale preorder', {
          preorderId: preorder.id,
          preorderNumber: preorder.preorderNumber,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async cancelExpiredPreorder(preorder: PremiumPreorder): Promise<void> {
    const latestPreorder = await this.premiumPreorderRepository.findById(preorder.id);
    const paymentId = latestPreorder.razorpayPaymentId;

    if (latestPreorder.status === 'cancelled' && paymentId) {
      await this.reconcileCancelledCapturedPayment(latestPreorder);
      return;
    }

    if (
      latestPreorder.status !== 'initiated' ||
      !['created', 'pending'].includes(latestPreorder.paymentStatus)
    ) {
      return;
    }

    if (!paymentId) {
      await this.markCancelled(latestPreorder);
      return;
    }

    try {
      const payment = await this.fetchPaymentWithRetry(paymentId);
      const paymentGatewayStatus = String(payment?.status ?? '').toLowerCase();

      if (paymentGatewayStatus === 'captured') {
        await this.premiumPreorderRepository.updateById(latestPreorder.id, {
          status: 'payment_review',
          paymentStatus: 'paid',
          reviewRequired: true,
          failureReason: 'captured_after_delay',
          notes: this.appendNote(
            latestPreorder.notes,
            'Captured after delay, requires reconciliation',
          ),
          updatedAt: new Date(),
        });
        return;
      }

      if (['authorized', 'pending', 'created'].includes(paymentGatewayStatus)) {
        await this.markCancelled(latestPreorder);
        return;
      }

      await this.markCancelled(
        latestPreorder,
        `Auto-cancelled after delayed payment check returned ${paymentGatewayStatus || 'unknown'}`,
      );
    } catch (error) {
      console.error('[PREMIUM_FLOW] Failed to verify stale premium preorder payment', {
        preorderId: latestPreorder.id,
        preorderNumber: latestPreorder.preorderNumber,
        razorpayPaymentId: paymentId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async markCancelled(
    preorder: PremiumPreorder,
    reason = `Auto-cancelled after ${this.expiryMinutes} minutes without successful payment`,
  ): Promise<void> {
    await this.premiumPreorderRepository.updateById(preorder.id, {
      status: 'cancelled',
      paymentStatus: 'failed',
      failureReason: 'payment_expired',
      reviewRequired: false,
      notes: this.appendNote(preorder.notes, reason),
      updatedAt: new Date(),
    });

    console.log('[Premium Preorder Expiry] Auto-cancelled unpaid preorder', {
      preorderId: preorder.id,
      preorderNumber: preorder.preorderNumber,
      paymentStatus: preorder.paymentStatus,
    });
  }

  private async reconcileCancelledCapturedPayment(preorder: PremiumPreorder): Promise<void> {
    try {
      const payment = await this.fetchPaymentWithRetry(preorder.razorpayPaymentId!);
      const paymentGatewayStatus = String(payment?.status ?? '').toLowerCase();

      if (paymentGatewayStatus !== 'captured') {
        return;
      }

      const refund = await this.razorpayService.createRefund(
        preorder.razorpayPaymentId!,
        Math.round(Number(preorder.total || 0) * 100),
        {
          reason: 'Auto refund for cancelled premium preorder with delayed capture',
          preorderId: preorder.id,
          preorderNumber: preorder.preorderNumber,
          source: 'premium-preorder-expiry-cron',
        },
      );

      await this.premiumPreorderRepository.updateById(preorder.id, {
        status: 'refunded',
        paymentStatus: 'refunded',
        reviewRequired: false,
        failureReason: 'captured_after_cancellation',
        notes: this.appendNote(
          preorder.notes,
          `Refund initiated automatically after delayed capture. Refund ID: ${refund?.id || 'unknown'}`,
        ),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('[PREMIUM_FLOW] Failed to reconcile cancelled premium preorder refund', {
        preorderId: preorder.id,
        preorderNumber: preorder.preorderNumber,
        razorpayPaymentId: preorder.razorpayPaymentId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
