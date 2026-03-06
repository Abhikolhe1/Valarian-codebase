import {injectable} from '@loopback/core';
import crypto from 'crypto';
import Razorpay from 'razorpay';

export interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayRefundOptions {
  paymentId: string;
  amount?: number;
  notes?: Record<string, string>;
}

@injectable()
export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.',
      );
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Create a Razorpay order
   * @param amount - Amount in smallest currency unit (paise for INR)
   * @param currency - Currency code (default: INR)
   * @param receipt - Receipt ID for reference
   * @param notes - Optional notes object
   * @returns Razorpay order object
   */
  async createOrder(
    amount: number,
    currency = 'INR',
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<any> {
    try {
      const options: RazorpayOrderOptions = {
        amount,
        currency,
        receipt,
        notes,
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   * @param orderId - Razorpay order ID
   * @param paymentId - Razorpay payment ID
   * @param signature - Razorpay signature
   * @returns True if signature is valid, false otherwise
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        throw new Error('RAZORPAY_KEY_SECRET not configured');
      }

      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * @param body - Webhook request body (raw string)
   * @param signature - Razorpay signature from header
   * @returns True if signature is valid, false otherwise
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET not configured');
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Fetch payment details
   * @param paymentId - Razorpay payment ID
   * @returns Payment object
   */
  async fetchPayment(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Create a refund
   * @param paymentId - Razorpay payment ID
   * @param amount - Amount to refund (optional, full refund if not specified)
   * @param notes - Optional notes object
   * @returns Refund object
   */
  async createRefund(
    paymentId: string,
    amount?: number,
    notes?: Record<string, string>,
  ): Promise<any> {
    try {
      const options: any = {
        notes,
      };

      if (amount) {
        options.amount = amount;
      }

      const refund = await this.razorpay.payments.refund(paymentId, options);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Fetch refund details
   * @param refundId - Razorpay refund ID
   * @returns Refund object
   */
  async fetchRefund(refundId: string): Promise<any> {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund;
    } catch (error) {
      console.error('Error fetching refund:', error);
      throw new Error(`Failed to fetch refund: ${error.message}`);
    }
  }

  /**
   * Fetch all refunds for a payment
   * @param paymentId - Razorpay payment ID
   * @returns Array of refund objects
   */
  async fetchPaymentRefunds(paymentId: string): Promise<any[]> {
    try {
      const refunds = await this.razorpay.payments.fetchMultipleRefund(paymentId);
      return refunds.items || [];
    } catch (error) {
      console.error('Error fetching payment refunds:', error);
      throw new Error(`Failed to fetch payment refunds: ${error.message}`);
    }
  }
}
