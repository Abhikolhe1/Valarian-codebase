import {expect} from '@loopback/testlab';
import {createHmac} from 'crypto';
import {RazorpayService} from '../../../services/razorpay.service';

function withEnv<T>(vars: Record<string, string>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    process.env[key] = vars[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

describe('RazorpayService signature verification', () => {
  describe('verifyWebhookSignature (RAZORPAY_WEBHOOK_SECRET, HMAC-SHA256)', () => {
    it('accepts a signature computed over the exact raw body with the webhook secret', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
          RAZORPAY_WEBHOOK_SECRET: 'whsec_test_12345',
        },
        () => {
          const service = new RazorpayService();
          const rawBody = '{"event":"payment.captured","payload":{}}';
          const signature = createHmac('sha256', 'whsec_test_12345')
            .update(rawBody)
            .digest('hex');

          expect(service.verifyWebhookSignature(rawBody, signature)).to.be.true();
        },
      );
    });

    it('rejects a signature computed with the wrong secret (proves KEY_SECRET is not silently accepted)', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
          RAZORPAY_WEBHOOK_SECRET: 'whsec_test_12345',
        },
        () => {
          const service = new RazorpayService();
          const rawBody = '{"event":"payment.captured","payload":{}}';
          // Signed with the API key secret instead of the webhook secret —
          // must fail, proving the two are verified independently.
          const wrongSignature = createHmac('sha256', 'dummy-key-secret')
            .update(rawBody)
            .digest('hex');

          expect(service.verifyWebhookSignature(rawBody, wrongSignature)).to.be.false();
        },
      );
    });

    it('rejects when the body has been altered after signing (byte-exactness matters)', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
          RAZORPAY_WEBHOOK_SECRET: 'whsec_test_12345',
        },
        () => {
          const service = new RazorpayService();
          const originalBody = '{"event":"payment.captured","payload":{}}';
          const signature = createHmac('sha256', 'whsec_test_12345')
            .update(originalBody)
            .digest('hex');

          // Same JSON content, different formatting — exactly what
          // JSON.stringify(JSON.parse(x)) risks producing.
          const reformattedBody = '{"event": "payment.captured", "payload": {}}';

          expect(service.verifyWebhookSignature(reformattedBody, signature)).to.be.false();
        },
      );
    });

    it('rejects an empty/garbage signature', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
          RAZORPAY_WEBHOOK_SECRET: 'whsec_test_12345',
        },
        () => {
          const service = new RazorpayService();
          expect(service.verifyWebhookSignature('{}', '')).to.be.false();
          expect(service.verifyWebhookSignature('{}', 'not-a-real-signature')).to.be.false();
        },
      );
    });
  });

  describe('verifyPaymentSignature (RAZORPAY_KEY_SECRET, HMAC-SHA256 of orderId|paymentId)', () => {
    it('accepts a signature computed over orderId|paymentId with the key secret', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
        },
        () => {
          const service = new RazorpayService();
          const orderId = 'order_ABC123';
          const paymentId = 'pay_XYZ789';
          const signature = createHmac('sha256', 'dummy-key-secret')
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

          expect(service.verifyPaymentSignature(orderId, paymentId, signature)).to.be.true();
        },
      );
    });

    it('rejects a signature computed with the webhook secret (proves the two secrets are not interchangeable)', () => {
      withEnv(
        {
          RAZORPAY_KEY_ID: 'rzp_test_dummy',
          RAZORPAY_KEY_SECRET: 'dummy-key-secret',
          RAZORPAY_WEBHOOK_SECRET: 'whsec_test_12345',
        },
        () => {
          const service = new RazorpayService();
          const orderId = 'order_ABC123';
          const paymentId = 'pay_XYZ789';
          const wrongSignature = createHmac('sha256', 'whsec_test_12345')
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

          expect(service.verifyPaymentSignature(orderId, paymentId, wrongSignature)).to.be.false();
        },
      );
    });
  });
});
