import {expect} from '@loopback/testlab';
import {Context, BindingScope} from '@loopback/core';
import {EventEmitter} from 'events';
import {createClient} from 'redis';
import {ValiarianBackendApplication} from '../../../application';
import {CacheService} from '../../../services/cache.service';
import {OtpRateLimitService} from '../../../services/otp-rate-limit.service';
import {RedisConnection} from '../../../services/redis-connection';
import {AuthController} from '../../../controllers/auth.controller';

class FakeClient extends EventEmitter {
  isOpen = false;
  isReady = false;
  connects = 0;
  destroyed = 0;
  complete?: () => void;
  connect(): Promise<this> {
    this.connects++;
    this.isOpen = true;
    return new Promise(resolve => {
      this.complete = () => {this.isReady = true; resolve(this);};
    });
  }
  destroy(): void {this.destroyed++; this.isOpen = false; this.isReady = false;}
}

describe('Redis connection lifecycle', () => {
  it('does not send users to Google when security state cannot be stored', async () => {
    let redirected = false;
    const controller = {
      cacheService: {set: async () => false},
      googleOAuthService: {getAuthorizationUrl: () => {redirected = true; return ''; }},
    };
    await expect(AuthController.prototype.googleAuth.call(controller as unknown as AuthController))
      .to.be.rejectedWith(/temporarily unavailable/);
    expect(redirected).to.be.false();
  });
  it('reuses cache and OTP services across 500 request contexts', async () => {
    const app = new ValiarianBackendApplication();
    for (const key of ['services.cache', 'services.otp.rate-limit']) {
      expect(app.getBinding(key).scope).to.equal(BindingScope.SINGLETON);
      const first = await app.get<CacheService | OtpRateLimitService>(key);
      for (let i = 0; i < 500; i++) {
        const request = new Context(app);
        expect(await request.get(key)).to.equal(first);
        request.close();
      }
      first.stop();
    }
    app.close();
  });

  it('keeps one client during concurrent timeouts and recovers when Redis returns', async () => {
    const client = new FakeClient();
    let created = 0;
    const factory = (() => {created++; return client;}) as unknown as typeof createClient;
    const connection = new RedisConnection('redis://localhost', 'test', 5, factory);
    try {
      const results = await Promise.all(Array.from({length: 100}, () => connection.ready()));
      expect(results.every(result => !result)).to.be.true();
      expect(created).to.equal(1);
      expect(client.connects).to.equal(1);
      expect(await connection.ready()).to.be.false();
      expect(created).to.equal(1);
      client.complete!();
      expect(await connection.ready()).to.be.true();
      // The driver's reconnecting socket is retained, never replaced per request.
      client.isReady = false;
      expect(await connection.ready()).to.be.false();
      client.isReady = true;
      expect(await connection.ready()).to.be.true();
      expect(created).to.equal(1);
    } finally {
      connection.stop();
    }
    expect(client.destroyed).to.equal(1);
    expect(await connection.ready()).to.be.false();
  });

  it('closes an in-progress connection on shutdown', async () => {
    const client = new FakeClient();
    const factory = (() => client) as unknown as typeof createClient;
    const connection = new RedisConnection('redis://localhost', 'test', 5, factory);
    const pending = connection.ready();
    connection.stop();
    expect(await pending).to.be.false();
    expect(client.destroyed).to.equal(1);
  });
});
