import {HttpErrors} from '@loopback/rest';

export const isMobileAuthEnabled = (): boolean =>
  process.env.MOBILE_AUTH_ENABLED?.trim().toLowerCase() === 'true';

export const assertMobileAuthEnabled = (): void => {
  if (!isMobileAuthEnabled()) {
    throw new HttpErrors.ServiceUnavailable(
      'Mobile authentication is temporarily unavailable.',
    );
  }
};
