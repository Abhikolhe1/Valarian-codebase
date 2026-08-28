import {expect} from '@loopback/testlab';
import {
  assertMobileAuthEnabled,
  isMobileAuthEnabled,
} from '../../../utils/mobile-auth';

describe('Mobile authentication feature flag (unit)', () => {
  const originalValue = process.env.MOBILE_AUTH_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.MOBILE_AUTH_ENABLED;
    } else {
      process.env.MOBILE_AUTH_ENABLED = originalValue;
    }
  });

  it('defaults to disabled and rejects mobile authentication', () => {
    delete process.env.MOBILE_AUTH_ENABLED;

    expect(isMobileAuthEnabled()).to.be.false();
    expect(() => assertMobileAuthEnabled()).to.throw(
      'Mobile authentication is temporarily unavailable.',
    );
  });

  it('rejects mobile authentication when explicitly disabled', () => {
    process.env.MOBILE_AUTH_ENABLED = 'false';

    expect(isMobileAuthEnabled()).to.be.false();
    expect(() => assertMobileAuthEnabled()).to.throw(
      'Mobile authentication is temporarily unavailable.',
    );
  });

  it('preserves the existing flow when explicitly enabled', () => {
    process.env.MOBILE_AUTH_ENABLED = ' TRUE ';

    expect(isMobileAuthEnabled()).to.be.true();
    expect(() => assertMobileAuthEnabled()).to.not.throw();
  });
});
