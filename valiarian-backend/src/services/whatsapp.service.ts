import {BindingScope, injectable} from '@loopback/core';
import axios from 'axios';
import {createHmac, timingSafeEqual} from 'crypto';

export type WhatsAppErrorCategory = 'configuration' | 'authentication' | 'template' | 'recipient' | 'rate_limit' | 'timeout' | 'network' | 'provider';

export class WhatsAppProviderError extends Error {
  constructor(public category: WhatsAppErrorCategory, message: string) {super(message);}
}

interface WhatsAppSendResponse {
  messages?: Array<{id?: string}>;
}

interface AxiosCompatibleError {
  code?: string;
  response?: {
    status: number;
    data?: {
      error?: {
        code?: number;
        type?: string;
      };
    };
  };
}

@injectable({scope: BindingScope.SINGLETON})
export class WhatsAppService {
  private recipient(phone: string): string {return phone.replace(/^\+/, '');}
  private mask(phone: string): string {return `${phone.slice(0, 3)}******${phone.slice(-3)}`;}

  buildAuthenticationTemplatePayload(phone: string, code: string) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.recipient(phone),
      type: 'template',
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE,
        language: {code: process.env.WHATSAPP_TEMPLATE_LANGUAGE},
        components: [
          {type: 'body', parameters: [{type: 'text', text: code}]},
          {type: 'button', sub_type: 'url', index: '0', parameters: [{type: 'text', text: code}]},
        ],
      },
    };
  }

  async sendAuthenticationOtp(phone: string, code: string): Promise<string> {
    const version = process.env.WHATSAPP_GRAPH_API_VERSION;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!version || !phoneNumberId || !token || !process.env.WHATSAPP_OTP_TEMPLATE || !process.env.WHATSAPP_TEMPLATE_LANGUAGE) {
      throw new WhatsAppProviderError('configuration', 'WhatsApp is not configured');
    }
    const started = Date.now();
    try {
      const response = await axios.post<WhatsAppSendResponse>(
        `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
        this.buildAuthenticationTemplatePayload(phone, code),
        {headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, timeout: Number(process.env.WHATSAPP_REQUEST_TIMEOUT_MS ?? 10000)},
      );
      const messageId = response.data?.messages?.[0]?.id;
      if (!messageId) throw new WhatsAppProviderError('provider', 'Meta response did not contain a message ID');
      console.log('[WhatsApp] OTP accepted', {recipient: this.mask(phone), messageId, durationMs: Date.now() - started});
      return messageId;
    } catch (error) {
      if (error instanceof WhatsAppProviderError) throw error;
      const axiosError = error as AxiosCompatibleError;
      const code = axiosError.response?.data?.error?.code;
      const type = axiosError.response?.data?.error?.type;
      let category: WhatsAppErrorCategory = 'provider';
      if (axiosError.code === 'ECONNABORTED') category = 'timeout';
      else if (!axiosError.response) category = 'network';
      else if (axiosError.response.status === 401 || axiosError.response.status === 403 || code === 190) category = 'authentication';
      else if (axiosError.response.status === 429 || code === 4 || code === 80007) category = 'rate_limit';
      else if (code === 132000 || code === 132001 || code === 132012) category = 'template';
      else if (code === 131030 || code === 131026) category = 'recipient';
      console.error('[WhatsApp] OTP rejected', {recipient: this.mask(phone), category, metaCode: code, metaType: type, durationMs: Date.now() - started});
      throw new WhatsAppProviderError(category, 'WhatsApp provider rejected the message');
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signature?: string): boolean {
    const secret = process.env.META_APP_SECRET;
    if (!secret || !signature?.startsWith('sha256=')) return false;
    const received = Buffer.from(signature.slice(7), 'hex');
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}
