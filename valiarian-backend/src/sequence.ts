import {MiddlewareSequence, RequestContext} from '@loopback/rest';

export class MySequence extends MiddlewareSequence {
  async handle(context: RequestContext): Promise<void> {
    const {request} = context;

    if (
      request.path === '/api/categories' ||
      request.path.startsWith('/api/categories/') ||
      request.path === '/api/parent-categories' ||
      request.path.startsWith('/api/parent-categories/') ||
      request.path === '/api/products' ||
      request.path.startsWith('/api/products/')
    ) {
      console.log('REQUEST BODY:', request.body);
    }

    await super.handle(context);
  }
}
