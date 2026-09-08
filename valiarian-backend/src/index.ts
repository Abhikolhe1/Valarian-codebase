import * as dotenv from 'dotenv';
import {ApplicationConfig, ValiarianBackendApplication} from './application';
import {validateOtpProviderConfig} from './utils/otp-config';
export * from './application';
dotenv.config();

export async function main(options: ApplicationConfig = {}) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }

  validateOtpProviderConfig();
  const app = new ValiarianBackendApplication(options);
  await app.boot();
  await app.start();
  console.log('port', process.env.PORT);
  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}

if (require.main === module) {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error('CORS_ORIGIN must be configured in production');
  }

  const allowedOrigins = new Set(
    configuredOrigins.length > 0
      ? configuredOrigins
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3030'],
  );
  const trustProxySetting = (() => {
    const value = process.env.TRUST_PROXY?.trim();
    if (!value || value.toLowerCase() === 'false') return false;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
  })();

  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST ?? '0.0.0.0',
      // The `gracePeriodForClose` provides a graceful close for http/https
      // servers with keep-alive clients. The default value is `Infinity`
      // (don't force-close). If you want to immediately destroy all sockets
      // upon stop, set its value to `0`.
      // See https://www.npmjs.com/package/stoppable
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
      // CORS configuration
      cors: {
        origin: (
          origin: string | undefined,
          callback: (error: Error | null, allowed?: boolean) => void,
        ) => {
          if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
            callback(null, true);
            return;
          }
          callback(new Error('Origin is not allowed by CORS'));
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      // Security headers
      expressSettings: {
        'x-powered-by': false,
        'trust proxy': trustProxySetting,
      },
      requestBodyParser: {
        json: {
          limit: '1mb',
          verify: (req: any, _res: any, buffer: Buffer) => {
            req.rawBody = Buffer.from(buffer);
          },
        },
      },
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
