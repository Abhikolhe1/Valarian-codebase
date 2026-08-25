import {expect} from '@loopback/testlab';
import axios from 'axios';
import {createHmac} from 'crypto';
import {WhatsAppProviderError, WhatsAppService} from '../../../services/whatsapp.service';

describe('WhatsAppService payload', () => {
  it('builds the authentication body and copy-code button parameters', () => {
    process.env.WHATSAPP_OTP_TEMPLATE = 'valiarian_login_otp';
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = 'en';
    const payload = new WhatsAppService().buildAuthenticationTemplatePayload('+918830800191', '482913');
    expect(payload.to).to.equal('918830800191');
    expect(payload.template.name).to.equal('valiarian_login_otp');
    expect(payload.template.components[0].parameters[0].text).to.equal('482913');
    expect(payload.template.components[1].sub_type).to.equal('url');
    expect(payload.template.components[1].parameters[0].text).to.equal('482913');
  });

  it('extracts Meta message ID without exposing the provider response', async () => {
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v-test';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    const original = axios.post;
    (axios as any).post = async () => ({data: {messages: [{id: 'wamid.test'}]}});
    try {
      expect(await new WhatsAppService().sendAuthenticationOtp('+918830800191', '482913')).to.equal('wamid.test');
    } finally {
      (axios as any).post = original;
    }
  });

  it('categorizes Meta authentication, template, and timeout failures', async () => {
    process.env.WHATSAPP_GRAPH_API_VERSION = 'v-test';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    const original = axios.post;
    const failures = [
      [{response: {status: 401, data: {error: {code: 190}}}}, 'authentication'],
      [{response: {status: 400, data: {error: {code: 132001}}}}, 'template'],
      [{code: 'ECONNABORTED'}, 'timeout'],
    ] as const;
    try {
      for (const [failure, category] of failures) {
        (axios as any).post = async () => {throw failure;};
        try {
          await new WhatsAppService().sendAuthenticationOtp('+918830800191', '482913');
          throw new Error('expected send failure');
        } catch (error) {
          expect(error).to.be.instanceOf(WhatsAppProviderError);
          expect((error as WhatsAppProviderError).category).to.equal(category);
        }
      }
    } finally {
      (axios as any).post = original;
    }
  });

  it('verifies webhook signatures against the raw request body', () => {
    process.env.META_APP_SECRET = 'test-secret';
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`;
    const service = new WhatsAppService();
    expect(service.verifyWebhookSignature(body, signature)).to.be.true();
    expect(service.verifyWebhookSignature(Buffer.from('{}'), signature)).to.be.false();
  });
});
