import {expect} from '@loopback/testlab';
import {RateLimiterService} from '../../../services/rate-limiter.service';

describe('RateLimiterService (unit)', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    service = new RateLimiterService();
  });

  describe('checkLoginAttempt', () => {
    it('allows first login attempt', () => {
      expect(() => service.checkLoginAttempt('192.168.1.1')).to.not.throw();
    });

    it('allows up to 4 login attempts', () => {
      const ip = '192.168.1.2';
      for (let i = 0; i < 4; i++) {
        expect(() => service.checkLoginAttempt(ip)).to.not.throw();
      }
    });

    it('blocks after 5 login attempts', () => {
      const ip = '192.168.1.3';
      for (let i = 0; i < 4; i++) {
        service.checkLoginAttempt(ip);
      }
      expect(() => service.checkLoginAttempt(ip)).to.throw(/Too many login attempts/);
    });

    it('resets login attempts on successful login', () => {
      const ip = '192.168.1.4';
      service.checkLoginAttempt(ip);
      service.checkLoginAttempt(ip);
      service.resetLoginAttempts(ip);

      // Should allow attempts again
      expect(() => service.checkLoginAttempt(ip)).to.not.throw();
    });
  });

  describe('checkOtpRequest', () => {
    it('allows first OTP request', () => {
      expect(() => service.checkOtpRequest('1234567890')).to.not.throw();
    });

    it('allows up to 2 OTP requests', () => {
      const mobile = '9876543210';
      service.checkOtpRequest(mobile);
      expect(() => service.checkOtpRequest(mobile)).to.not.throw();
    });

    it('blocks after 3 OTP requests', () => {
      const mobile = '5555555555';
      service.checkOtpRequest(mobile);
      service.checkOtpRequest(mobile);
      expect(() => service.checkOtpRequest(mobile)).to.throw(/Too many OTP requests/);
    });
  });

  describe('checkPasswordResetRequest', () => {
    it('allows first password reset request', () => {
      expect(() => service.checkPasswordResetRequest('test@example.com')).to.not.throw();
    });

    it('allows up to 2 password reset requests', () => {
      const email = 'user@example.com';
      service.checkPasswordResetRequest(email);
      expect(() => service.checkPasswordResetRequest(email)).to.not.throw();
    });

    it('blocks after 3 password reset requests', () => {
      const email = 'blocked@example.com';
      service.checkPasswordResetRequest(email);
      service.checkPasswordResetRequest(email);
      expect(() => service.checkPasswordResetRequest(email)).to.throw(/Too many password reset requests/);
    });
  });

  describe('cleanup', () => {
    it('removes expired entries', () => {
      const ip = '192.168.1.5';
      service.checkLoginAttempt(ip);

      // Cleanup should not affect recent entries
      service.cleanup();
      expect(() => service.checkLoginAttempt(ip)).to.not.throw();
    });
  });
});
