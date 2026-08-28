import {inject} from '@loopback/core';
import {get, HttpErrors, param, post, Request, requestBody, RestBindings} from '@loopback/rest';
import {WhatsAppService} from '../services/whatsapp.service';

export class WhatsAppWebhookController {
  constructor(
    @inject('services.whatsapp') private whatsapp: WhatsAppService,
    @inject(RestBindings.Http.REQUEST) private request: Request,
  ) {}

  @get('/api/webhooks/whatsapp')
  verify(
    @param.query.string('hub.mode') mode?: string,
    @param.query.string('hub.verify_token') token?: string,
    @param.query.string('hub.challenge') challenge?: string,
  ): string {
    if (mode !== 'subscribe' || !token || token !== process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      throw new HttpErrors.Forbidden('Webhook verification failed');
    }
    return challenge ?? '';
  }

  @post('/api/webhooks/whatsapp')
  async receive(
    @requestBody({
      required: true,
      content: {'application/json': {schema: {type: 'object'}}},
    })
    body: Record<string, any>,
  ): Promise<{received: true}> {
    const rawBody = (this.request as any).rawBody as Buffer | undefined;
    const signature = this.request.headers['x-hub-signature-256'] as string | undefined;
    if (!rawBody || !this.whatsapp.verifyWebhookSignature(rawBody, signature)) {
      throw new HttpErrors.Unauthorized('Invalid webhook signature');
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const status of value.statuses ?? []) {
          if (['sent', 'delivered', 'read', 'failed'].includes(status.status)) {
            console.log('[WhatsAppWebhook] delivery status', {
              messageId: status.id,
              status: status.status,
              errorCodes: (status.errors ?? []).map((error: any) => error.code),
            });
          }
        }
        if ((value.messages ?? []).length) {
          console.log('[WhatsAppWebhook] inbound message received', {
            count: value.messages.length,
            types: value.messages.map((message: any) => message.type),
          });
        }
      }
    }
    return {received: true};
  }
}
