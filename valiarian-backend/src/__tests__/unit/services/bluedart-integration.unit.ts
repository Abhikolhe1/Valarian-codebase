import {expect} from '@loopback/testlab';
import {loadBlueDartConfig} from '../../../config/bluedart.config';
import {BlueDartAuthService, parseAuthenticationResponse} from '../../../services/shipping-providers/bluedart-auth.service';
import {BlueDartConfigurationError} from '../../../services/shipping-providers/bluedart-errors';

function developerEnv(): NodeJS.ProcessEnv {
  return {BLUEDART_PROVIDER_MODE: 'developer-portal', BLUEDART_ENVIRONMENT: 'sandbox', BLUEDART_API_KEY: 'test-key', BLUEDART_API_SECRET: 'test-secret', BLUEDART_AUTH_URL: 'https://auth.invalid/token', BLUEDART_BASE_URL: 'https://api.invalid'};
}

describe('Blue Dart Developer Portal safety (unit)', () => {
  it('requires explicit Developer Portal credentials and URLs', () => {
    expect(() => loadBlueDartConfig({BLUEDART_PROVIDER_MODE: 'developer-portal'})).to.throw(BlueDartConfigurationError);
  });

  it('keeps legacy SOAP as the explicit default', () => {
    expect(loadBlueDartConfig({}).providerMode).to.equal('legacy-soap');
  });

  it('prohibits test mocks in production', () => {
    expect(() => loadBlueDartConfig({BLUEDART_ENVIRONMENT: 'production', BLUEDART_ENABLE_TEST_MOCKS: 'true'})).to.throw(BlueDartConfigurationError);
  });

  it('parses common token fields and expires_in', () => {
    const token = parseAuthenticationResponse({access_token: 'header.payload.signature', expires_in: 60}, 900, 1000);
    expect(token.accessToken).to.equal('header.payload.signature');
    expect(token.expiresAt).to.equal(61000);
  });

  it('parses JWT exp without treating decoding as verification', () => {
    const payload = Buffer.from(JSON.stringify({exp: 12345})).toString('base64url');
    expect(parseAuthenticationResponse({jwt: `x.${payload}.x`}).expiresAt).to.equal(12345000);
  });

  it('rejects malformed token responses', () => {
    expect(() => parseAuthenticationResponse({expires_in: 60})).to.throw(/supported token field/);
  });

  it('coalesces concurrent authentication and reuses the cached token', async () => {
    let calls = 0;
    const http = {request: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return {data: {accessToken: 'safe-test-token', expires_in: 3600}}; }} as any;
    const service = new BlueDartAuthService(loadBlueDartConfig(developerEnv()), undefined, http);
    const tokens = await Promise.all([service.getToken(), service.getToken(), service.getToken()]);
    expect(calls).to.equal(1);
    expect(tokens.every(token => token.accessToken === 'safe-test-token')).to.be.true();
    await service.getToken();
    expect(calls).to.equal(1);
  });
});
