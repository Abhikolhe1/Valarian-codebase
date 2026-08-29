import {expect} from '@loopback/testlab';
import {
  buildRazorpayEventMarker,
  historyAlreadyContainsMarker,
  isLiveRazorpayMode,
  resolveWebhookRawBody,
} from '../../../utils/razorpay-webhook.utils';

describe('Razorpay webhook utils', () => {
  describe('resolveWebhookRawBody', () => {
    it('returns the raw body as a utf8 string when captured', () => {
      const raw = Buffer.from('{"event":"payment.captured"}');
      expect(resolveWebhookRawBody({rawBody: raw})).to.equal(
        '{"event":"payment.captured"}',
      );
    });

    it('returns null when rawBody was never captured', () => {
      expect(resolveWebhookRawBody({})).to.be.null();
    });

    it('returns null when rawBody is not a Buffer', () => {
      const malformed = {rawBody: 'not-a-buffer'} as unknown as {rawBody?: Buffer};
      expect(resolveWebhookRawBody(malformed)).to.be.null();
    });

    it('returns null for an empty buffer', () => {
      expect(resolveWebhookRawBody({rawBody: Buffer.alloc(0)})).to.be.null();
    });

    it('preserves bytes JSON.stringify(JSON.parse(x)) would not — e.g. large integer precision', () => {
      // A 17-digit integer loses precision through parse/stringify but not
      // through the raw buffer — this is exactly the class of bug the fix
      // avoids: two different "correct-looking" strings, one signable, one not.
      const raw = Buffer.from('{"id":12345678901234567}');
      const viaJsonRoundtrip = JSON.stringify(JSON.parse(raw.toString('utf8')));
      const viaRawBody = resolveWebhookRawBody({rawBody: raw});

      expect(viaRawBody).to.equal(raw.toString('utf8'));
      expect(viaRawBody).to.not.equal(viaJsonRoundtrip);
    });
  });

  describe('buildRazorpayEventMarker', () => {
    it('is deterministic for the same (event, entityId) pair', () => {
      const a = buildRazorpayEventMarker('payment.failed', 'pay_ABC123');
      const b = buildRazorpayEventMarker('payment.failed', 'pay_ABC123');
      expect(a).to.equal(b);
    });

    it('differs for different events on the same entity', () => {
      const captured = buildRazorpayEventMarker('payment.captured', 'pay_ABC123');
      const failed = buildRazorpayEventMarker('payment.failed', 'pay_ABC123');
      expect(captured).to.not.equal(failed);
    });

    it('differs for different entity IDs on the same event', () => {
      const a = buildRazorpayEventMarker('refund.processed', 'rfnd_1');
      const b = buildRazorpayEventMarker('refund.processed', 'rfnd_2');
      expect(a).to.not.equal(b);
    });
  });

  describe('historyAlreadyContainsMarker', () => {
    const marker = buildRazorpayEventMarker('refund.created', 'rfnd_1');

    it('returns false against an empty history', () => {
      expect(historyAlreadyContainsMarker([], marker)).to.be.false();
    });

    it('returns false when no entry contains the marker', () => {
      const entries = [{comment: 'Order confirmed'}, {comment: 'Order packed'}];
      expect(historyAlreadyContainsMarker(entries, marker)).to.be.false();
    });

    it('returns true when a prior delivery already recorded this exact marker', () => {
      const entries = [
        {comment: 'Order confirmed'},
        {comment: `Refund initiated: ₹500 ${marker}`},
      ];
      expect(historyAlreadyContainsMarker(entries, marker)).to.be.true();
    });

    it('ignores entries with a null/undefined comment', () => {
      const entries: Array<{comment?: string | null}> = [
        {comment: null},
        {comment: undefined},
        {},
      ];
      expect(historyAlreadyContainsMarker(entries, marker)).to.be.false();
    });

    it('does not false-positive on a different refund ID for the same event', () => {
      const otherMarker = buildRazorpayEventMarker('refund.created', 'rfnd_2');
      const entries = [{comment: `Refund initiated: ₹500 ${otherMarker}`}];
      expect(historyAlreadyContainsMarker(entries, marker)).to.be.false();
    });
  });

  describe('isLiveRazorpayMode', () => {
    it('is true for a live key', () => {
      expect(isLiveRazorpayMode('rzp_live_TTEGjEYkxOwSHu')).to.be.true();
    });

    it('is false for a test key', () => {
      expect(isLiveRazorpayMode('rzp_test_SUzRTpkNLBlx57')).to.be.false();
    });

    it('is false for undefined/empty', () => {
      expect(isLiveRazorpayMode(undefined)).to.be.false();
      expect(isLiveRazorpayMode('')).to.be.false();
    });

    it('is false for a malformed/unexpected value', () => {
      expect(isLiveRazorpayMode('not-a-razorpay-key')).to.be.false();
    });
  });
});
