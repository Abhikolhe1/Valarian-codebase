import {inject} from '@loopback/core';
import {get, response, ResponseObject} from '@loopback/rest';
import {ValiarianDataSource} from '../datasources';

const HEALTH_RESPONSE: ResponseObject = {
  description: 'Health Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'HealthResponse',
        properties: {
          status: {type: 'string'},
        },
      },
    },
  },
};

/**
 * Deployment health check. Verifies the app has booted and the database is
 * reachable. Intentionally returns nothing beyond a status string — never
 * expose connection details, credentials, or internal error messages here.
 */
export class HealthController {
  constructor(
    @inject('datasources.valiarian') private valiarianDataSource: ValiarianDataSource,
  ) {}

  @get('/health')
  @response(200, HEALTH_RESPONSE)
  async health(): Promise<object> {
    await this.valiarianDataSource.ping();
    return {status: 'ok'};
  }
}
