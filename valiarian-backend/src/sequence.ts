import {MiddlewareSequence, RequestContext} from '@loopback/rest';

export class MySequence extends MiddlewareSequence {
  async handle(context: RequestContext): Promise<void> {
    const {response} = context;

    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (process.env.NODE_ENV === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    await super.handle(context);
  }
}
